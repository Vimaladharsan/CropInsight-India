from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from pathlib import Path
import joblib
from schemas import PredictRequest

app = FastAPI(title="CropInsight India API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = Path("../data/crop_production.csv")
MODEL_PATH = Path("../model/rf_model.pkl")
ENCODER_PATH = Path("../model/encoders.pkl")

df: pd.DataFrame = None
model = None
encoders: dict = None


@app.on_event("startup")
def load_resources():
    global df, model, encoders
    if DATA_PATH.exists():
        raw = pd.read_csv(DATA_PATH)
        raw = raw.dropna(subset=["Production"])
        raw = raw[raw["Area"] > 0]
        raw["Yield"] = raw["Production"] / raw["Area"]
        raw["Season"] = raw["Season"].str.strip()
        df = raw
    if MODEL_PATH.exists():
        model = joblib.load(MODEL_PATH)
    if ENCODER_PATH.exists():
        encoders = joblib.load(ENCODER_PATH)


@app.get("/")
def root():
    return {"status": "ok", "dataset_loaded": df is not None, "model_loaded": model is not None}


@app.get("/api/overview")
def overview():
    if df is None:
        raise HTTPException(503, "Dataset not loaded. Add crop_production.csv to /data/")
    return {
        "total_records": len(df),
        "states": int(df["State_Name"].nunique()),
        "crops": int(df["Crop"].nunique()),
        "districts": int(df["District_Name"].nunique()),
        "year_range": {"min": int(df["Crop_Year"].min()), "max": int(df["Crop_Year"].max())},
        "total_production_MT": round(float(df["Production"].sum()) / 1e6, 2),
        "avg_yield": round(float(df["Yield"].mean()), 4),
    }


@app.get("/api/top-states")
def top_states(n: int = 10):
    if df is None:
        raise HTTPException(503, "Dataset not loaded")
    result = (
        df.groupby("State_Name")["Production"]
        .sum()
        .nlargest(n)
        .reset_index()
        .rename(columns={"Production": "total_production"})
    )
    return result.to_dict(orient="records")


@app.get("/api/top-crops")
def top_crops(n: int = 10):
    if df is None:
        raise HTTPException(503, "Dataset not loaded")
    result = (
        df.groupby("Crop")["Production"]
        .sum()
        .nlargest(n)
        .reset_index()
        .rename(columns={"Production": "total_production"})
    )
    return result.to_dict(orient="records")


@app.get("/api/season-breakdown")
def season_breakdown():
    if df is None:
        raise HTTPException(503, "Dataset not loaded")
    result = (
        df.groupby("Season")
        .agg(total_production=("Production", "sum"), avg_yield=("Yield", "mean"), records=("Production", "count"))
        .reset_index()
        .round(2)
    )
    return result.to_dict(orient="records")


@app.get("/api/yearly-trend")
def yearly_trend():
    if df is None:
        raise HTTPException(503, "Dataset not loaded")
    result = (
        df.groupby("Crop_Year")
        .agg(total_production=("Production", "sum"), total_area=("Area", "sum"), avg_yield=("Yield", "mean"))
        .reset_index()
        .round(2)
    )
    return result.to_dict(orient="records")


@app.get("/api/state-map")
def state_map():
    if df is None:
        raise HTTPException(503, "Dataset not loaded")
    result = (
        df.groupby("State_Name")
        .agg(total_production=("Production", "sum"), avg_yield=("Yield", "mean"))
        .reset_index()
        .round(2)
    )
    return result.to_dict(orient="records")


@app.get("/api/yield-by-season")
def yield_by_season():
    if df is None:
        raise HTTPException(503, "Dataset not loaded")
    result = df.groupby("Season")["Yield"].describe().reset_index().round(4)
    return result.to_dict(orient="records")


@app.get("/api/options")
def options():
    if df is None:
        raise HTTPException(503, "Dataset not loaded")
    return {
        "states": sorted(df["State_Name"].unique().tolist()),
        "seasons": sorted(df["Season"].unique().tolist()),
        "crops": sorted(df["Crop"].unique().tolist()),
    }


@app.post("/api/predict")
def predict(req: PredictRequest):
    if model is None or encoders is None:
        raise HTTPException(503, "Model not trained yet. Run the Jupyter notebook first.")
    try:
        state_enc = encoders["state"].transform([req.state])[0]
        season_enc = encoders["season"].transform([req.season])[0]
        crop_enc = encoders["crop"].transform([req.crop])[0]
        X = [[req.area, req.year, season_enc, state_enc, crop_enc]]
        log_pred = model.predict(X)[0]
        production = float(np.expm1(log_pred))
        return {
            "predicted_production": round(production, 2),
            "predicted_yield": round(production / req.area, 4),
            "unit": "tonnes",
            "inputs": req.dict(),
        }
    except ValueError as e:
        raise HTTPException(400, f"Encoding error: {e}. Check state/season/crop names match the dataset.")
