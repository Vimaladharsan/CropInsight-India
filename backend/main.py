from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from pathlib import Path
import joblib
import json
from schemas import PredictRequest

app = FastAPI(title="CropInsight India API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
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


# ── Overview ──────────────────────────────────────────────────────────────────

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


# ── Dashboard ─────────────────────────────────────────────────────────────────

@app.get("/api/top-states")
def top_states(n: int = 10, year_min: int = 1997, year_max: int = 2015):
    if df is None:
        raise HTTPException(503, "Dataset not loaded")
    filtered = df[(df["Crop_Year"] >= year_min) & (df["Crop_Year"] <= year_max)]
    result = (
        filtered.groupby("State_Name")["Production"]
        .sum().nlargest(n).reset_index()
        .rename(columns={"Production": "total_production"})
    )
    return result.to_dict(orient="records")


@app.get("/api/top-crops")
def top_crops(n: int = 10, year_min: int = 1997, year_max: int = 2015):
    if df is None:
        raise HTTPException(503, "Dataset not loaded")
    filtered = df[(df["Crop_Year"] >= year_min) & (df["Crop_Year"] <= year_max)]
    result = (
        filtered.groupby("Crop")["Production"]
        .sum().nlargest(n).reset_index()
        .rename(columns={"Production": "total_production"})
    )
    return result.to_dict(orient="records")


@app.get("/api/season-breakdown")
def season_breakdown(year_min: int = 1997, year_max: int = 2015):
    if df is None:
        raise HTTPException(503, "Dataset not loaded")
    filtered = df[(df["Crop_Year"] >= year_min) & (df["Crop_Year"] <= year_max)]
    result = (
        filtered.groupby("Season")
        .agg(total_production=("Production", "sum"), avg_yield=("Yield", "mean"), records=("Production", "count"))
        .reset_index().round(2)
    )
    return result.to_dict(orient="records")


@app.get("/api/yearly-trend")
def yearly_trend():
    if df is None:
        raise HTTPException(503, "Dataset not loaded")
    result = (
        df.groupby("Crop_Year")
        .agg(total_production=("Production", "sum"), total_area=("Area", "sum"), avg_yield=("Yield", "mean"))
        .reset_index().round(2)
    )
    return result.to_dict(orient="records")


# ── Map ───────────────────────────────────────────────────────────────────────

@app.get("/api/state-map")
def state_map():
    if df is None:
        raise HTTPException(503, "Dataset not loaded")
    result = (
        df.groupby("State_Name")
        .agg(total_production=("Production", "sum"), avg_yield=("Yield", "mean"))
        .reset_index().round(2)
    )
    return result.to_dict(orient="records")


# ── EDA ───────────────────────────────────────────────────────────────────────

@app.get("/api/yield-by-season")
def yield_by_season():
    if df is None:
        raise HTTPException(503, "Dataset not loaded")
    result = df.groupby("Season")["Yield"].describe().reset_index().round(4)
    return result.to_dict(orient="records")


@app.get("/api/heatmap")
def heatmap():
    if df is None:
        raise HTTPException(503, "Dataset not loaded")
    top_states_list = df.groupby("State_Name")["Production"].sum().nlargest(15).index.tolist()
    pivot = (
        df[df["State_Name"].isin(top_states_list)]
        .groupby(["State_Name", "Season"])["Yield"].mean()
        .unstack(fill_value=0).round(2)
    )
    result = []
    for state in pivot.index:
        row = {"state": state}
        for season in pivot.columns:
            row[season] = float(pivot.loc[state, season])
        result.append(row)
    return {"data": result, "seasons": pivot.columns.tolist()}


@app.get("/api/efficiency")
def efficiency():
    if df is None:
        raise HTTPException(503, "Dataset not loaded")
    result = (
        df.groupby("State_Name")
        .agg(
            total_production=("Production", "sum"),
            total_area=("Area", "sum"),
            avg_yield=("Yield", "mean"),
            crops_count=("Crop", "nunique"),
        )
        .reset_index()
    )
    result["efficiency_score"] = (result["avg_yield"] / result["avg_yield"].max() * 100).round(1)
    return result.round(2).to_dict(orient="records")


# ── Districts ─────────────────────────────────────────────────────────────────

@app.get("/api/district-analysis")
def district_analysis(state: str, n: int = 15):
    if df is None:
        raise HTTPException(503, "Dataset not loaded")
    filtered = df[df["State_Name"] == state]
    if filtered.empty:
        raise HTTPException(404, f"State '{state}' not found")
    result = (
        filtered.groupby("District_Name")
        .agg(
            total_production=("Production", "sum"),
            avg_yield=("Yield", "mean"),
            total_area=("Area", "sum"),
            records=("Production", "count"),
        )
        .nlargest(n, "total_production")
        .reset_index().round(2)
    )
    top_crops = (
        filtered.groupby("Crop")["Production"].sum()
        .nlargest(8).reset_index()
        .rename(columns={"Production": "total_production"})
    )
    yearly = (
        filtered.groupby("Crop_Year")
        .agg(total_production=("Production", "sum"), avg_yield=("Yield", "mean"))
        .reset_index().round(2)
    )
    return {
        "state": state,
        "districts": result.to_dict(orient="records"),
        "top_crops": top_crops.to_dict(orient="records"),
        "yearly_trend": yearly.to_dict(orient="records"),
        "summary": {
            "total_production": round(float(filtered["Production"].sum()), 2),
            "avg_yield": round(float(filtered["Yield"].mean()), 4),
            "district_count": int(filtered["District_Name"].nunique()),
            "crop_count": int(filtered["Crop"].nunique()),
        },
    }


# ── Compare ───────────────────────────────────────────────────────────────────

@app.get("/api/compare")
def compare(type: str = "crop", a: str = "Rice", b: str = "Wheat"):
    if df is None:
        raise HTTPException(503, "Dataset not loaded")

    def crop_stats(name):
        d = df[df["Crop"] == name]
        if d.empty:
            raise HTTPException(404, f"Crop '{name}' not found")
        yearly = (
            d.groupby("Crop_Year")
            .agg(total_production=("Production", "sum"), avg_yield=("Yield", "mean"), total_area=("Area", "sum"))
            .reset_index().round(2)
        )
        season_b = d.groupby("Season")["Production"].sum().reset_index().rename(columns={"Production": "total_production"})
        return {
            "name": name,
            "total_production": round(float(d["Production"].sum()), 2),
            "avg_yield": round(float(d["Yield"].mean()), 4),
            "total_area": round(float(d["Area"].sum()), 2),
            "states_count": int(d["State_Name"].nunique()),
            "records": len(d),
            "yearly_trend": yearly.to_dict(orient="records"),
            "season_breakdown": season_b.to_dict(orient="records"),
        }

    def state_stats(name):
        d = df[df["State_Name"] == name]
        if d.empty:
            raise HTTPException(404, f"State '{name}' not found")
        yearly = (
            d.groupby("Crop_Year")
            .agg(total_production=("Production", "sum"), avg_yield=("Yield", "mean"), total_area=("Area", "sum"))
            .reset_index().round(2)
        )
        top_crops = d.groupby("Crop")["Production"].sum().nlargest(5).reset_index().rename(columns={"Production": "total_production"})
        return {
            "name": name,
            "total_production": round(float(d["Production"].sum()), 2),
            "avg_yield": round(float(d["Yield"].mean()), 4),
            "total_area": round(float(d["Area"].sum()), 2),
            "crops_count": int(d["Crop"].nunique()),
            "records": len(d),
            "yearly_trend": yearly.to_dict(orient="records"),
            "top_crops": top_crops.to_dict(orient="records"),
        }

    if type == "crop":
        return {"type": "crop", "a": crop_stats(a), "b": crop_stats(b)}
    else:
        return {"type": "state", "a": state_stats(a), "b": state_stats(b)}


# ── Forecast ──────────────────────────────────────────────────────────────────

@app.get("/api/forecast")
def forecast(crop: str = "Rice", horizon: int = 5):
    if df is None:
        raise HTTPException(503, "Dataset not loaded")
    filtered = df[df["Crop"] == crop]
    if filtered.empty:
        raise HTTPException(404, f"Crop '{crop}' not found")
    yearly = filtered.groupby("Crop_Year")["Production"].sum().reset_index()
    years = yearly["Crop_Year"].values.astype(float)
    prod = yearly["Production"].values.astype(float)
    coeffs = np.polyfit(years, prod, 1)
    max_year = int(years.max())
    forecast_years = list(range(max_year + 1, max_year + horizon + 1))
    forecast_prod = [max(0.0, float(np.polyval(coeffs, y))) for y in forecast_years]
    ci = float(np.std(prod - np.polyval(coeffs, years)) * 1.96)
    historical = [{"year": int(r["Crop_Year"]), "production": float(r["Production"]), "type": "historical"} for _, r in yearly.iterrows()]
    future = [{"year": y, "production": round(p, 2), "ci_lower": round(max(0.0, p - ci), 2), "ci_upper": round(p + ci, 2), "type": "forecast"} for y, p in zip(forecast_years, forecast_prod)]
    trend_pct = round((coeffs[0] / prod.mean()) * 100, 2) if prod.mean() > 0 else 0
    return {
        "crop": crop,
        "historical": historical,
        "forecast": future,
        "trend_pct_per_year": trend_pct,
        "slope": round(float(coeffs[0]), 2),
        "direction": "growing" if coeffs[0] > 0 else "declining",
        "ci_band": round(ci, 2),
    }


# ── Predict ───────────────────────────────────────────────────────────────────

@app.get("/api/options")
def options():
    if df is None:
        raise HTTPException(503, "Dataset not loaded")
    return {
        "states": sorted(df["State_Name"].unique().tolist()),
        "seasons": sorted(df["Season"].unique().tolist()),
        "crops": sorted(df["Crop"].unique().tolist()),
    }


@app.get("/api/model-insights")
def model_insights():
    if model is None:
        return {"trained": False}
    fi = model.feature_importances_
    feature_names = ["Area", "Year", "Season", "State", "Crop"]
    importances = [{"feature": n, "importance": round(float(v), 6)} for n, v in sorted(zip(feature_names, fi), key=lambda x: -x[1])]
    result = {
        "trained": True,
        "feature_importances": importances,
        "rf": {"n_estimators": model.n_estimators},
    }
    model_meta_path = Path("../model/metrics.json")
    if model_meta_path.exists():
        metrics = json.loads(model_meta_path.read_text())
        result["rf"].update(metrics.get("rf", {}))
        result["lr"] = metrics.get("lr")
    return result


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
