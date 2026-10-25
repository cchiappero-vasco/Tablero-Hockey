import { getSession, json, hashPw, saveUsers, validUser } from './_lib.js';

async function admin(request) {
  const s = await getSession(request);
  if (!s) return [null, json({ error: 'No autenticado' }, 401)];
  if (s.role !== 'admin') return [null, json({ error: 'Solo el administrador puede hacer esto' }, 403)];
  return [s, null];
}
const body = async (r) => { try { return await r.json(); } catch { return {}; } };
const admins = (users) => Object.values(users).filter((u) => u.role === 'admin').length;

export async function GET(request) {
  const [s, err] = await admin(request); if (err) return err;
  const list = Object.entries(s.users).map(([k, u]) => ({ key: k, name: u.name, role: u.role, created: u.created }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return json({ users: list, me: s.key });
}

export async function POST(request) {
  const [s, err] = await admin(request); if (err) return err;
  const b = await body(request);
  const name = String(b.user || '').trim(), pw = String(b.password || '');
  const role = b.role === 'admin' ? 'admin' : 'common';
  if (!validUser(name)) return json({ error: 'Usuario: 2 a 30 caracteres (letras, números, . _ -)' }, 400);
  if (pw.length < 4) return json({ error: 'La clave debe tener al menos 4 caracteres' }, 400);
  const key = name.toLowerCase();
  if (s.users[key]) return json({ error: 'Ese usuario ya existe' }, 409);
  s.users[key] = { name, hash: hashPw(pw), role, created: Date.now() };
  await saveUsers(s.users);
  return json({ ok: true });
}

export async function PUT(request) {
  const [s, err] = await admin(request); if (err) return err;
  const b = await body(request);
  const key = String(b.user || '').toLowerCase();
  const u = s.users[key];
  if (!u) return json({ error: 'Usuario inexistente' }, 404);
  if (b.password !== undefined && b.password !== '') {
    if (String(b.password).length < 4) return json({ error: 'La clave debe tener al menos 4 caracteres' }, 400);
    u.hash = hashPw(String(b.password));
  }
  if (b.role && b.role !== u.role) {
    const role = b.role === 'admin' ? 'admin' : 'common';
    if (u.role === 'admin' && role !== 'admin' && admins(s.users) <= 1) return json({ error: 'Debe quedar al menos un administrador' }, 400);
    u.role = role;
  }
  await saveUsers(s.users);
  return json({ ok: true });
}

export async function DELETE(request) {
  const [s, err] = await admin(request); if (err) return err;
  const key = String(new URL(request.url).searchParams.get('user') || '').toLowerCase();
  if (!s.users[key]) return json({ error: 'Usuario inexistente' }, 404);
  if (key === s.key) return json({ error: 'No podés borrar tu propio usuario' }, 400);
  if (s.users[key].role === 'admin' && admins(s.users) <= 1) return json({ error: 'Debe quedar al menos un administrador' }, 400);
  delete s.users[key];
  await saveUsers(s.users);
  return json({ ok: true });
}
