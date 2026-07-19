# Tuinapp Frontend (PoC)

Mobiel-eerst webapp in de stijl "Fris & botanisch" (design: `docs/design/`).
Foto kiezen → herkenning via de backend → onderhoudsschema, "Mijn tuin" en een weektakenlijst.

Geen build-stap: plain HTML/CSS/JS.

## Draaien

1. Start de backend (in `../backend/`):
   ```
   uv run uvicorn app.main:app --reload
   ```
2. Serveer de frontend:
   ```
   cd frontend
   python3 -m http.server 5173
   ```
3. Open http://localhost:5173

De frontend verwacht de backend op `http://127.0.0.1:8000`. Ander adres? Zet in de
browserconsole: `localStorage.setItem('tuinapp_api', 'http://ander-adres:poort')`.

## Wat zit erin

- **Fotoflow** — foto('s) kiezen of maken (mobiel: camera), upload naar `POST /identify`.
- **Analysescherm** — stappen zoals in het design (uploaden → Pl@ntNet → schema).
- **Resultaat** — soort + confidence-balk (oranje waarschuwing onder 75%), onderhoudsschema
  als de soort in de database staat, nette melding als dat niet zo is.
- **Mijn tuin** — toegevoegde planten (localStorage).
- **Taken** — weektaken afgeleid uit de schema's (water altijd, snoei in de snoeimaand,
  bemesting per seizoen), afvinkbaar.
- **Premium-banner + sheet** — uit het design, ter demo van het freemium-model.

Video-opname, echte kalenderdata, accounts en notificaties zijn bewust MVP-werk (zie
`docs/superpowers/specs/`).
