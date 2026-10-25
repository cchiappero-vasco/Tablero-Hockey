import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getSession } from './_lib.js';
import { chipHtml } from './_chip.js';

const PAGES = { index: 'index.html', mobile: 'mobile.html', admin: 'admin.html' };

export async function GET(request) {
  const url = new URL(request.url);
  const p = url.searchParams.get('p') || 'index';
  const file = PAGES[p];
  if (!file) return new Response('No encontrado', { status: 404 });

  const s = await getSession(request);
  if (!s) return new Response(null, { status: 302, headers: { location: '/login', 'cache-control': 'no-store' } });
  if (p === 'admin' && s.role !== 'admin') return new Response(null, { status: 302, headers: { location: '/', 'cache-control': 'no-store' } });

  // Los teléfonos van a la versión celular (con ?desktop=1 se puede forzar la de escritorio)
  const ua = request.headers.get('user-agent') || '';
  if (p === 'index' && !url.searchParams.has('desktop') && /Android.*Mobile|iPhone|iPod|Windows Phone/i.test(ua)) {
    return new Response(null, { status: 302, headers: { location: '/mobile.html', 'cache-control': 'no-store' } });
  }

  let html = await readFile(join(process.cwd(), 'private', file), 'utf8');
  if (p !== 'admin') html = html.replace('</body>', chipHtml(s.name, s.role === 'admin') + '</body>');
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
