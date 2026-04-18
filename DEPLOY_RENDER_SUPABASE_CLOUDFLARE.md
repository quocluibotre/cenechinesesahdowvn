# Deploy Guide: Render + Supabase + Cloudflare Pages

## 1) Supabase (Database)

You already created Supabase DB, so only verify schema/data:

1. Open Supabase SQL Editor.
2. Run one of these files from repo root:
- `database_supabase_with_admin.sql` (schema + default admin)
- `database_supabase_empty.sql` (schema only)
3. Confirm tables are created.

If you used `database_supabase_with_admin.sql`, default admin is:
- Email: `admin@cineshadow.com`
- Password: `Admin@123456`

## 2) Render (Backend)

### Create service

1. Go to Render -> New -> Web Service.
2. Connect GitHub repo.
3. Root Directory: `backend`
4. Build Command: `npm install`
5. Start Command: `npm start`

### Required environment variables

Set these in Render -> Environment:

- `PORT=3000`
- `DB_CLIENT=postgres`
- `DATABASE_URL=postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres`
- `DB_SSL=true`
- `JWT_SECRET=<strong-random-secret>`

And keep your existing app variables:
- `R2_ENDPOINT`
- `R2_BUCKET`
- `R2_ACCESS_KEY`
- `R2_SECRET_KEY`
- `R2_PUBLIC_URL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional, default already works)

Optional for YouTube subtitle extraction stability on Render:
- `YOUTUBE_PROXY_URL=http://<user>:<pass>@<proxy-host>:<proxy-port>`
- If password has special characters like `@`, `#`, `%`, `:` prefer URL-encoding or use format without scheme (`user:pass@host:port`) because backend now supports tolerant parsing.
- `YOUTUBE_API_KEY` is optional for metadata and does not solve server IP/rate-limit/region blocking for transcript extraction.
- Do not keep placeholder values like `proxy-host` or `<proxy-host>` in production env.

CORS variable (set after you have Cloudflare URL):
- `CORS_ORIGINS=https://<your-project>.pages.dev`

Notes:
- Backend already supports dynamic `PORT`.
- Backend already supports PostgreSQL via `DB_CLIENT=postgres`.
- Backend allows `*.pages.dev` requests by code, but `CORS_ORIGINS` is still recommended.

## 3) Cloudflare Pages (Frontend)

### Create project

1. Go to Cloudflare -> Pages -> Create project.
2. Connect same GitHub repo.
3. Project settings:
- Framework preset: `Vite`
- Root directory: `frontend`
- Build command: `npm run build`
- Build output directory: `dist`

### Required environment variable

- `VITE_API_URL=https://<your-render-service>.onrender.com/api`

Then deploy.

## 4) Verify integration

1. Open frontend URL `https://<your-project>.pages.dev`.
2. Try login/register.
3. Load Library and Player pages.
4. In browser devtools, verify API calls go to Render URL.

## 5) Common errors

### CORS blocked

- Ensure `VITE_API_URL` points to Render backend with `/api` suffix.
- Ensure `CORS_ORIGINS` contains your Pages domain.
- Redeploy backend after updating env vars.

### PostgreSQL SSL error on Render

- Ensure `DB_SSL=true`.
- Ensure `DATABASE_URL` is exactly from Supabase (no extra spaces/quotes).

### Backend starts but cannot query DB

- Check `DB_CLIENT=postgres`.
- Re-check table creation in Supabase SQL Editor.

### YouTube subtitle translate says server IP/rate-limit/region blocked

- Configure `YOUTUBE_PROXY_URL` in Render Environment.
- Redeploy backend and retry the same video.

### No budget fallback (không cần proxy trả phí)

If server cannot fetch YouTube captions, import captions from your local machine (where YouTube is accessible):

1. Ensure backend deployed with latest code.
2. From local repo:
	- `cd backend`
	- `npm run subtitles:import-local -- --api https://<your-render-service>.onrender.com/api --video-id <DB_VIDEO_ID> --youtube-id <YOUTUBE_ID>`
3. Script will:
	- fetch transcript locally,
	- call `/api/youtube/subtitles/import`,
	- then auto call `/api/youtube/subtitles/retranslate` in rounds.

Optional: local AI translation with Ollama (better quality, no paid API)

1. Install Ollama and pull model:
	- `ollama pull qwen2.5:7b`
2. Run import using local AI translation:
	- `npm run subtitles:import-local -- --api https://<your-render-service>.onrender.com/api --video-id <DB_VIDEO_ID> --youtube-id <YOUTUBE_ID> --local-ai --ollama-model qwen2.5:7b`
3. If you still want server re-translate after local AI:
	- add `--with-retranslate`

Bulk mode for many videos with missing subtitles:

- `cd backend`
- Dry-run first:
	- `powershell -ExecutionPolicy Bypass -File .\\scripts\\import_missing_subtitles.ps1 -Api https://<your-render-service>.onrender.com/api -DryRun`
- Run real import:
	- `powershell -ExecutionPolicy Bypass -File .\\scripts\\import_missing_subtitles.ps1 -Api https://<your-render-service>.onrender.com/api -MaxRounds 6`
- Run real import with local AI in one command:
	- `powershell -ExecutionPolicy Bypass -File .\\scripts\\import_missing_subtitles.ps1 -Api https://<your-render-service>.onrender.com/api -LocalAi -OllamaModel qwen2.5:7b -OllamaChunkSize 6`
- Run local AI + server re-translate (optional):
	- `powershell -ExecutionPolicy Bypass -File .\\scripts\\import_missing_subtitles.ps1 -Api https://<your-render-service>.onrender.com/api -LocalAi -OllamaModel qwen2.5:7b -OllamaChunkSize 6 -WithRetranslate -MaxRounds 2`

Note: bulk script now auto-targets videos with broken subtitle timing (extreme duration) for repair, not only missing subtitles.

## 6) Optional custom domain (later)

After everything works on `.pages.dev`, add custom domain in Cloudflare Pages.
Then append domain to Render `CORS_ORIGINS`.
