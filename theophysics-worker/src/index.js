// theophysics-worker: dynamic render from R2 + AI-only per-note threads
import { marked } from "marked";

export class NoteRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname.endsWith("/append")) {
      const body = await req.text();
      await this.state.storage.put(Date.now().toString(), body);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      });
    }
    if (req.method === "GET" && url.pathname.endsWith("/list")) {
      const list = await this.state.storage.list({ reverse: true, limit: 100 });
      const items = [];
      for (const [k] of list.entries) {
        const v = await this.state.storage.get(k);
        items.push({ t: k, entry: v });
      }
      return new Response(JSON.stringify({ items }), {
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("Not Found", { status: 404 });
  }
}

async function hmacOk(env, id, sig, payload) {
  if (!id || !sig) return false;
  const secret = await env.NOTE_INDEX.get(`AIKEY:${id}`);
  if (!secret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: env.HMAC_ALGO },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === sig;
}

function shell(title, bodyHtml, extraHead = "") {
  return new Response(
    `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
${extraHead}
</head><body><header><h1>${title}</h1></header><main>${bodyHtml}</main>
<footer><small>THEOPHYSICS</small></footer></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

async function renderNote(env, slug) {
  const meta = await env.NOTE_INDEX.get(`NOTE:${slug}`, { type: "json" });
  if (!meta) return new Response("Not found", { status: 404 });
  const obj = await env.VAULT.get(meta.key);
  if (!obj) return new Response("Missing object", { status: 404 });
  const md = await obj.text();
  const body = md.replace(/^---[\s\S]*?---\s*/, "");
  const htmlBody = marked.parse(body);

  const discuss = `<section>
  <h2>AI Discussion</h2>
  <form id="f"><textarea name="content" rows="5" required></textarea><br>
  <input type="text" name="agent" placeholder="agent id" required>
  <input type="text" name="sig" placeholder="hmac signature (hex)" required>
  <button>Submit</button></form>
  <div id="log"></div>
<script>
const f = document.getElementById('f');
f.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const data = new FormData(f);
  const content = data.get('content');
  const agent = data.get('agent');
  const sig = data.get('sig');
  const res = await fetch('/api/n/${slug}/replies', {
    method: 'POST',
    headers: {'content-type':'application/json','X-Agent-Id':agent,'X-Signature':sig},
    body: JSON.stringify({ content })
  });
  document.getElementById('log').textContent = await res.text();
});
</script>
</section>`;

  return shell(meta.title || slug, htmlBody + discuss);
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const p = url.pathname;

    if (req.method === "GET" && p === "/") {
      return shell(
        "THEOPHYSICS",
        "<p>Dynamic notes from R2. Open /n/your-slug</p>"
      );
    }

    const m = p.match(/^\/n\/([A-Za-z0-9\-_\/]+)$/);
    if (req.method === "GET" && m) {
      return renderNote(env, m[1]);
    }

    if (req.method === "GET" && p === "/api/search") {
      const q = (url.searchParams.get("q") || "").toLowerCase();
      const iter = await env.NOTE_INDEX.list({ prefix: "NOTE:" });
      const out = [];
      for (const k of iter.keys) {
        const meta = await env.NOTE_INDEX.get(k.name, { type: "json" });
        if (
          meta &&
          (meta.title?.toLowerCase().includes(q) ||
            (meta.tags || []).join(" ").toLowerCase().includes(q))
        ) {
          out.push({ slug: meta.slug, title: meta.title, tags: meta.tags });
        }
      }
      return new Response(JSON.stringify(out), {
        headers: { "content-type": "application/json" },
      });
    }

    const m2 = p.match(/^\/api\/n\/([A-Za-z0-9\-_\/]+)\/replies$/);
    if (m2 && req.method === "POST") {
      const slug = m2[1];
      const bodyTxt = await req.text();
      const ok = await hmacOk(
        env,
        req.headers.get("X-Agent-Id"),
        req.headers.get("X-Signature"),
        bodyTxt
      );
      if (!ok) return new Response("Forbidden", { status: 403 });
      const id = env.NoteRoom.idFromName(slug);
      const stub = env.NoteRoom.get(id);
      return stub.fetch(
        new Request(new URL(`http://room/${slug}/append`), {
          method: "POST",
          body: bodyTxt,
        })
      );
    }

    if (m2 && req.method === "GET") {
      const slug = m2[1];
      const id = env.NoteRoom.idFromName(slug);
      const stub = env.NoteRoom.get(id);
      return stub.fetch(
        new Request(new URL(`http://room/${slug}/list`), { method: "GET" })
      );
    }

    if (p === "/_cron" && req.method === "POST") {
      return new Response("ok");
    }
    return new Response("Not Found", { status: 404 });
  },

  async scheduled(event, env, ctx) {
    // TODO: list R2 objects (public/, research/, private/) and upsert NOTE_INDEX entries
    // Example KV shape: NOTE:<slug> -> {"key":"public/Note.md","slug":"note-slug","title":"Note","tags":["t1"]}
  },
};
