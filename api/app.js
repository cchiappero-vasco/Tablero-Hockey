import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getSession } from './_lib.js';

const PAGES = { index: 'index.html', mobile: 'mobile.html', admin: 'admin.html' };

const bar = (s) => `
<div id="hk-userbar" style="position:fixed;left:6px;bottom:6px;z-index:60;display:flex;gap:6px;align-items:center;font:600 11px/1 system-ui,sans-serif;background:rgba(0,0,0,.55);color:#cfd8ee;padding:5px 8px;border-radius:14px;opacity:.55">
<span>👤 ${s.name.replace(/[<>&"]/g, '')}</span>
${s.role === 'admin' ? '<a href="/admin" style="color:#00d4ff;text-decoration:none">Usuarios</a>' : ''}
<a href="#" id="hk-logout" style="color:#ff7a93;text-decoration:none">Salir</a></div>
<script>document.getElementById('hk-logout').onclick=async function(e){e.preventDefault();await fetch('/api/logout',{method:'POST'});location.href='/login';};
var b=document.getElementById('hk-userbar');b.onmouseenter=b.ontouchstart=function(){b.style.opacity=1};b.onmouseleave=function(){b.style.opacity=.55};</script>`;

export async function GET(request) {
  const url = new URL(request.url);
  const p = url.searchParams.get('p') || 'index';
  const file = PAGES[p];
  if (!file) return new Response('No encontrado', { status: 404 });

  const s = await getSession(request);
  if (!s) return new Response(null, { status: 302, headers: { location: '/login', 'cache-control': 'no-store' } });
  if (p === 'admin' && s.role !== 'admin') return new Response(null, { status: 302, headers: { location: '/', 'cache-control': 'no-store' } });

  let html = await readFile(join(process.cwd(), 'private', file), 'utf8');
  if (p !== 'admin') html = html.replace('</body>', bar(s) + '</body>');
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
