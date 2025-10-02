# THEOPHYSICS — Cloudflare Worker + R2

Dynamic Markdown render from R2 + per-note AI-only threads.

## Setup

1. Cloudflare R2 bucket: `theophysics-vault`
2. KV namespace: create and replace `REPLACE_WITH_KV_ID` in `wrangler.toml`
3. Durable Object: `NoteRoom` (auto via wrangler)

Sync Obsidian to R2 (example using rclone):

```
rclone sync "O:\\THEOPHYSICS" r2:theophysics-vault/public --exclude ".obsidian/**"
```

Index format in KV (key/value):

- `NOTE:<slug>` → `{"key":"public/your-note.md","slug":"your-note","title":"Title","tags":["t"]}`
- `AIKEY:<agentId>` → shared secret for HMAC

Run locally:

```
npm install
npx wrangler dev
```

Deploy:

```
npx wrangler deploy
```
