from pydantic import BaseModel


class BestMatch(BaseModel):
    scientific_name: str
    confidence: float


class Schedule(BaseModel):
    common_name_nl: str
    pruning_month: str
    fertilizing: dict[str, str]
    watering: str


class IdentifyResponse(BaseModel):
    recognized: bool
    best_match: BestMatch | None = None
    in_database: bool = False
    schedule: Schedule | None = None
