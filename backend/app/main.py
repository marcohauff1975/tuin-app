from fastapi import FastAPI, File, UploadFile

from app.models import BestMatch, IdentifyResponse, Schedule
from app.plantnet import identify
from app.species import get_schedule, list_species

app = FastAPI(title="Tuin-app Backend PoC")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/species")
def species() -> list[dict]:
    return list_species()


@app.post("/identify", response_model=IdentifyResponse)
async def identify_endpoint(files: list[UploadFile] = File(...)) -> IdentifyResponse:  # noqa: B008
    images = [await f.read() for f in files]
    matches = identify(images)
    if not matches:
        return IdentifyResponse(recognized=False)

    best = matches[0]
    record = get_schedule(best.scientific_name)
    return IdentifyResponse(
        recognized=True,
        best_match=BestMatch(scientific_name=best.scientific_name, confidence=best.confidence),
        in_database=record is not None,
        schedule=Schedule(**{k: record[k] for k in Schedule.model_fields}) if record else None,
    )
