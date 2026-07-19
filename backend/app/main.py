from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.models import BestMatch, IdentifyResponse, Schedule
from app.plantnet import PlantNetError, identify
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
    try:
        matches = await run_in_threadpool(identify, images)
    except PlantNetError as exc:
        raise HTTPException(
            status_code=502, detail="Plant identification service unavailable"
        ) from exc

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
