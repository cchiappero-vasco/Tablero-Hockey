import { loadUsers, checkPw, makeToken, cookieFor, json, sleep } from './_lib.js';

export async function POST(request) {
  let b; try { b = await request.json(); } catch { return json({ error: 'Solicitud inválida' }, 400); }
  const key = String(b.user || '').trim().toLowerCase();
  const pw = String(b.password || '');
  const users = await loadUsers();
  const u = users[key];
  if (!u || !checkPw(pw, u.hash)) {
    await sleep(700); // frena intentos por fuerza bruta
    return json({ error: 'Usuario o clave incorrectos' }, 401);
  }
  return json({ ok: true, name: u.name, role: u.role }, 200, { 'set-cookie': cookieFor(makeToken(key)) });
}
