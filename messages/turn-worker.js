// Cloudflare Worker: hands out short-lived TURN credentials to signed-in Aperture users only.
// Secrets (Worker → Settings → Variables and Secrets, type "Secret"):
//   TURN_KEY_ID, TURN_KEY_API_TOKEN
// Optional plain variable: ALLOWED_ORIGIN (e.g. https://yoursite.com) — defaults to any origin.
const FIREBASE_API_KEY = 'AIzaSyCbd2HWWpJoqF0Ted1GQyTylQZX2UHBXAI'; // public web key, same as chat.html

export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Cache-Control': 'no-store',
      'Vary': 'Origin',
    };
    const out = (body, status) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const idToken = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!idToken) return out({ error: 'unauthorized' }, 401);

    // Verify the Firebase sign-in with Google (rejects expired/forged tokens).
    const v = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
    });
    if (!v.ok) return out({ error: 'unauthorized' }, 401);

    // Admin switch (Administration → Calls). Off by default: no flag, no credentials.
    const f = await fetch('https://aperture-5c3af-default-rtdb.firebaseio.com/aperture-messages/config/turn.json?auth=' + encodeURIComponent(idToken));
    if (!f.ok || (await f.json()) !== true) return out({ error: 'relay_off' }, 403);

    const r = await fetch('https://rtc.live.cloudflare.com/v1/turn/keys/' + env.TURN_KEY_ID + '/credentials/generate-ice-servers', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.TURN_KEY_API_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 43200 }),   // 12 hours
    });
    if (!r.ok) return out({ error: 'turn_unavailable' }, 502);
    return out(await r.json(), 200);
  },
};
