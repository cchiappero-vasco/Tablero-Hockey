import { getSession, json, checkPw, hashPw, saveUsers, sleep } from './_lib.js';

export async function GET(request) {
  const s = await getSession(request);
  if (!s) return json({ error: 'No autenticado' }, 401);
  return json({ name: s.name, role: s.role });
}

// Cambiar la propia clave
export async function PUT(request) {
  const s = await getSession(request);
  if (!s) return json({ error: 'No autenticado' }, 401);
  let b; try { b = await request.json(); } catch { return json({ error: 'Solicitud inválida' }, 400); }
  const cur = String(b.current || ''), next = String(b.password || '');
  if (next.length < 4) return json({ error: 'La clave nueva debe tener al menos 4 caracteres' }, 400);
  if (!checkPw(cur, s.users[s.key].hash)) { await sleep(700); return json({ error: 'La clave actual no es correcta' }, 403); }
  s.users[s.key].hash = hashPw(next);
  await saveUsers(s.users);
  return json({ ok: true });
}
