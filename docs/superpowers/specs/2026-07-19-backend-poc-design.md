# Ontwerp — Tuin-app Backend PoC

**Datum:** 2026-07-19
**Status:** Goedgekeurd, klaar voor implementatieplan

## Doel

Een werkende Proof of Concept van de Tuin-app-backend: een gebruiker uploadt één of meer foto's van een plant, de backend herkent de soort via Pl@ntNet en geeft een onderhoudsschema terug op basis van vaste regels per soort (~10 soorten).

Dit valideert de kernaanname van het project — herkenning → onderhoudsadvies — zonder de volledige MVP te bouwen.

## Scope

**Wel in de PoC:**
- Foto-upload (één of meer foto's per verzoek).
- Echte Pl@ntNet-koppeling, met een mock-modus voor tests/ontwikkeling.
- Statische onderhoudsregels per soort (~10 soorten) in een databestand.
- Een kleine HTTP-API met automatische documentatie.

**Bewust NIET in de PoC (YAGNI — hoort bij de MVP):**
- Database, gebruikersaccounts.
- Video-input en frame-sampling.
- Notificaties / pushmeldingen.
- Weerdata-integratie.
- Concrete kalenderdatums (alleen generieke tijdvakken zoals "snoeien in maart").

## Architectuur

Drie losse, onafhankelijk testbare onderdelen:

### 1. Pl@ntNet-client (`plantnet.py`)
- **Doet:** neemt één of meer afbeeldingen, stuurt ze naar Pl@ntNet, geeft een lijst `[(wetenschappelijke naam, confidence)]` terug (gesorteerd op confidence).
- **Gebruik:** één functie/klasse met een `identify(images)`-interface.
- **Afhankelijkheden:** Pl@ntNet API (`https://my-api.plantnet.org/v2/identify/all`), API-key uit environment.
- **Modi:** `real` (echte API-call) en `mock` (vaste testrespons, geen netwerk), gekozen via een env-variabele (bijv. `PLANTNET_MODE`). Zo verbruiken tests geen quota.

### 2. Soort-matcher + onderhoudsregels (`species.py` + `data/species.json`)
- **Doet:** matcht een herkende Pl@ntNet-soortnaam tegen de ~10 ondersteunde soorten en levert het bijbehorende onderhoudsschema. Geeft "niet in database" terug als de soort onbekend is.
- **Gebruik:** `get_schedule(scientific_name)` → onderhoudsregels of `None`; `list_species()` → alle ondersteunde soorten.
- **Afhankelijkheden:** `data/species.json`.

### 3. API-laag (`main.py`, FastAPI)
- **Doet:** knoopt de client en de matcher aan elkaar en biedt de HTTP-endpoints.
- **Afhankelijkheden:** onderdeel 1 en 2.

## API-endpoints

| Methode | Pad | Doel |
|---------|-----|------|
| `POST` | `/identify` | Upload één of meer foto's → herkende soort + confidence + onderhoudsschema, of "niet herkend / niet in database". |
| `GET` | `/species` | Lijst van alle ondersteunde soorten. |
| `GET` | `/health` | Healthcheck. |

FastAPI levert automatisch Swagger UI op `/docs` — handig om de PoC te demonstreren.

## Datamodel

Per soort in `data/species.json`:

```json
{
  "scientific_name": "Lavandula angustifolia",
  "common_name_nl": "Lavendel",
  "pruning_month": "maart",
  "fertilizing": { "lente": "eenmalig organisch", "zomer": "niet nodig" },
  "watering": "matig, 1x per week bij droogte"
}
```

De `scientific_name` is de sleutel waarop gematcht wordt tegen de Pl@ntNet-respons.

## Responsvorm `/identify` (schets)

```json
{
  "recognized": true,
  "best_match": { "scientific_name": "Lavandula angustifolia", "confidence": 0.92 },
  "in_database": true,
  "schedule": {
    "common_name_nl": "Lavendel",
    "pruning_month": "maart",
    "fertilizing": { "lente": "eenmalig organisch", "zomer": "niet nodig" },
    "watering": "matig, 1x per week bij droogte"
  }
}
```

Wanneer de soort wel herkend is maar niet in de database staat: `in_database: false`, `schedule: null`. Wanneer niets herkend is: `recognized: false`.

## Tooling & tests

- **uv** — dependency- en venv-beheer.
- **ruff** — linting en formatting.
- **pytest** — tests draaien met de Pl@ntNet-client in mock-modus (geen netwerk, geen quota). Dekking op: soort-matching (bekend/onbekend), scheduleopbouw, en de `/identify`-flow end-to-end met mock.
- **`.env`** — Pl@ntNet API-key en `PLANTNET_MODE`, buiten git via `.gitignore`.

## Repo-structuur

De backend krijgt een eigen top-level map, zodat Bernard's UI-voorstellen in `frontend/` geen padconflicten geven.

```
tuin-app/
├── backend/          # Python-backend (FastAPI, tests, data)
│   ├── app/
│   ├── data/species.json
│   ├── tests/
│   ├── pyproject.toml
│   └── README.md
├── frontend/         # ruimte voor Bernard's UI (README als placeholder)
├── docs/
└── README.md
```

## Samenwerking

- Repo `marcohauff1975/tuin-app` (public), gedeeld met Bernard ([BernardAJ](https://github.com/BernardAJ), write-collaborator).
- Werk wordt **vaak en snel** naar GitHub gepusht na elke betekenisvolle stap, zodat Bernard altijd de laatste stand heeft.
- Backend en frontend blijven in gescheiden mappen om merge-conflicten te voorkomen.
