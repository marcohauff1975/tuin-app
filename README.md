# Tuin-app 🌿

> Van video tot persoonlijk onderhoudsschema — herken de planten in je tuin met één video en krijg automatisch een snoei-, bemestings- en watersschema op maat.

Freemium mobiele app: de gebruiker filmt de tuin, de app herkent de planten en genereert een persoonlijk onderhoudsschema in de kalender.

## Kernflow

1. **Video opnemen** — gebruiker filmt de tuin, de app coacht live ("kom dichterbij", "focus op het blad").
2. **Automatische herkenning** — frames worden geanalyseerd en gematcht tegen soorten, met een confidence score.
3. **Persoonlijk onderhoudsschema** — snoei-, bemestings- en watermomenten verschijnen automatisch in de kalender.

Het "aha moment" zit in de gratis versie — dat verkoopt de upgrade naar premium.

## Technische architectuur (drie pijlers)

- **A. Videoherkenning** — frame-sampling uit video, computer-vision model per frame, close-up sturing voor kleine planten en gras.
- **B. Plantendatabase + onderhoudsregels** — snoeiperiode/-type per soort, bemestingsschema per seizoen, watervraag per grondsoort en klimaatzone.
- **C. Planning- en notificatie-engine** — koppelt plant + locatie + weerdata, genereert concrete taken, stuurt pushmeldingen op het juiste moment.

## Databronnen (hybride aanpak)

| Bron | Rol | Dekking / kosten |
|------|-----|------------------|
| **Pl@ntNet API** | Visuele identificatie uit videobeeld | 78.795 soorten, gratis tot 500 queries/dag, Pro vanaf €1.000/jaar (200k requests) |
| **Trefle API** | Aanvullende taxonomie en basisdata | 400.000+ soorten, gratis en open source |
| **Eigen database** | Snoei-, bemestings- en waterregels | Start met 150–300 meest voorkomende NL-tuinsoorten, opgebouwd met tuinbouwexperts |

> **Onderscheidend vermogen:** de eigen botanische onderhoudsdatabase is de kernasset — geen enkele externe bron dekt onderhoudsdata.

## Roadmap

| Fase | Duur | Inhoud |
|------|------|--------|
| 0 — Validatie | 4–6 weken | Mockup testen bij 20–30 tuinbezitters, zonder code |
| 1 — MVP | 3–4 maanden | Video + Pl@ntNet + 150 soorten + simpele kalender |
| 2 — Besloten beta | 2 maanden | 200–500 gebruikers, nauwkeurigheid meten en corrigeren |
| 3 — Publieke launch | 1 maand | Gratis versie live, organische groei via content |
| 4/5 — Groei en schaal | doorlopend | Premium laag, meer soorten, weerintegratie, sensoren |

## Freemium businessmodel

**Gratis:** tuin in kaart via video · basisherkenning · eenvoudige onderhoudskalender met generieke tijdvakken ("snoeien in maart").

**Premium:** gepersonaliseerd op postcode/klimaatzone en grondsoort · realtime weerintegratie · meerdere tuinen · expert chat/video-consult · groeitracking en export · prioriteitsmeldingen bij plagen en ziektes.

Omslagpunt: na 2–3 seizoenen loopt generiek advies tegen zijn grenzen aan.

## Risico's en mitigaties

- **Herkenningsnauwkeurigheid in het echt** → strenge opname-instructies + correctiemechanisme dat de dataset verbetert.
- **Privacy** (huis, buren, kentekens in video) → expliciete consent-flow, lokale blur-opties, AVG-conform beleid.
- **API-kosten bij schaal** → kosten per request vanaf dag 1 verwerken in premium-pricing.
- **Wijzigende datalicenties** → voorwaarden structureel herchecken bij elke opschaling.

## Concrete eerste stappen

1. Valideer de aanname met 20 tuinbezitters vóórdat er code wordt geschreven.
2. Sluit een tuinbouw- of botanisch expert aan voor de onderhoudsdatabase.
3. Bouw een proof of concept: 10 soorten, Pl@ntNet gekoppeld, handmatig schema.
4. Test de video-opname UX apart van de herkenning.

## Documentatie

- [`docs/tuinapp_projectplan.pptx`](docs/tuinapp_projectplan.pptx) — volledig projectplan.
