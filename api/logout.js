import { clearCookie, json } from './_lib.js';
export async function POST() {
  return json({ ok: true }, 200, { 'set-cookie': clearCookie() });
}
