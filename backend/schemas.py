from pydantic import BaseModel, Field

class PredictRequest(BaseModel):
    state: str
    season: str
    crop: str
    area: float = Field(gt=0)
    year: int = Field(ge=1997, le=2030)
