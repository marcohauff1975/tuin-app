from fastapi import FastAPI

app = FastAPI(title="Tuin-app Backend PoC")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
