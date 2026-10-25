import { createHmac, scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { get, put } from '@vercel/blob';

const PATH = 'hk/users.json';
const COOKIE = 'hk_session';
const TTL = 7 * 24 * 3600; // segundos

export function hashPw(pw) {
  const salt = randomBytes(16);
  return salt.toString('hex') + ':' + scryptSync(pw, salt, 64).toString('hex');
}
export function checkPw(pw, stored) {
  try {
    const [s, h] = stored.split(':');
    const calc = scryptSync(pw, Buffer.from(s, 'hex'), 64);
    const hb = Buffer.from(h, 'hex');
    return hb.length === calc.length && timingSafeEqual(hb, calc);
  } catch { return false; }
}

// ---------- almacenamiento de usuarios ----------
async function readStore() {
  if (process.env.LOCAL_STORE) {
    try { return JSON.parse(await readFile(process.env.LOCAL_STORE, 'utf8')); } catch { return null; }
  }
  const r = await get(PATH, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}
export async function saveUsers(users) {
  const body = JSON.stringify(users);
  if (process.env.LOCAL_STORE) return writeFile(process.env.LOCAL_STORE, body);
  await put(PATH, body, { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' });
}
export async function loadUsers() {
  const cur = await readStore();
  if (cur) return cur;
  // primer uso: sembrar usuarios iniciales desde la variable INIT_USERS (solo hashes)
  const users = {};
  for (const u of JSON.parse(process.env.INIT_USERS || '[]')) {
    users[u.user.toLowerCase()] = { name: u.user, hash: u.hash, role: u.role, created: Date.now() };
  }
  if (Object.keys(users).length) await saveUsers(users);
  return users;
}

// ---------- sesión (cookie firmada) ----------
const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error('AUTH_SECRET no configurado');
  return s;
};
const sign = (p) => createHmac('sha256', secret()).update(p).digest('base64url');
export function makeToken(key) {
  const p = Buffer.from(JSON.stringify({ u: key, e: Math.floor(Date.now() / 1000) + TTL })).toString('base64url');
  return p + '.' + sign(p);
}
export function cookieFor(token) {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${TTL}`;
}
export const clearCookie = () => `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;

// Devuelve {key, name, role, users} o null. Revalida contra la base (usuario borrado => sin acceso).
export async function getSession(request) {
  const m = (request.headers.get('cookie') || '').match(new RegExp(COOKIE + '=([^;]+)'));
  if (!m) return null;
  const [p, sig] = m[1].split('.');
  if (!p || !sig) return null;
  const good = sign(p);
  if (sig.length !== good.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  let d; try { d = JSON.parse(Buffer.from(p, 'base64url').toString()); } catch { return null; }
  if (!d.e || d.e < Date.now() / 1000) return null;
  const users = await loadUsers();
  const u = users[d.u];
  if (!u) return null;
  return { key: d.u, name: u.name, role: u.role, users };
}

export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const validUser = (s) => /^[A-Za-z0-9._-]{2,30}$/.test(s || '');
