# Deploy — Tuin-app op Render (gratis)

De hele app draait als **één web-service**: de FastAPI-backend serveert ook de frontend
(zelfde origin). Je deployt dus maar één ding. De Pl@ntNet-key blijft server-side als secret
en staat nooit in de repo.

## Wat er al klaar staat in de repo

- `Dockerfile` — bouwt de service (backend + frontend in één image).
- `.dockerignore` — houdt `.env` (met de key) en lokale venv uit de image.
- `render.yaml` — Render Blueprint: web-service, health check op `/health`, en
  `PLANTNET_API_KEY` als secret (`sync: false`).

## Deploy-stappen (eenmalig, ~5 min)

1. Maak een gratis account op **https://render.com** (kan met "Sign in with GitHub").
2. Klik **New +** → **Blueprint**.
3. Kies deze repository (`marcohauff1975/tuin-app`). Render leest automatisch `render.yaml`.
4. Render vraagt om de waarde van **`PLANTNET_API_KEY`** — plak daar je Pl@ntNet-key.
   (`PLANTNET_MODE` staat al op `real`.)
5. Klik **Apply** / **Create**. Render bouwt de Docker-image en deployt.
6. Na de build krijg je een URL zoals `https://tuin-app.onrender.com`.
   - App: `https://tuin-app.onrender.com/`
   - API-docs: `https://tuin-app.onrender.com/docs`
   - Health: `https://tuin-app.onrender.com/health`

Deel die URL met Bernard — hij heeft geen lokale backend meer nodig.

## Auto-deploy

Elke push naar `main` triggert automatisch een nieuwe deploy. De frontend praat in
productie met dezelfde origin, dus er is niets te configureren aan de kant van Bernard.

## Goed om te weten

- **Free plan slaapt bij inactiviteit.** De eerste aanroep na een tijd stil kan ~30–50s
  duren (cold start); daarna is het snel.
- **Publieke `/identify` verbruikt je Pl@ntNet-quota** (500/dag gratis) en is voor iedereen
  aanroepbaar. Voor een demo prima; wil je het afschermen, voeg dan later een simpele
  toegangssleutel of rate-limiting toe.
- **Key roteren?** Verander alleen de env-var `PLANTNET_API_KEY` in het Render-dashboard —
  geen code-wijziging nodig.

## Lokaal testen zoals in productie

Zonder aparte frontend-server (backend serveert de frontend zelf):

```
cd backend
uv run uvicorn app.main:app --port 8000
# open http://127.0.0.1:8000/
```

Voor lokale split-dev (frontend los op 5173) blijft de oude flow werken; de frontend
kiest dan automatisch de backend op `127.0.0.1:8000`.
