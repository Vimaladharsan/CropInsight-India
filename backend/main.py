from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from pathlib import Path
import joblib
import json
from schemas import PredictRequest

try:
    import shap as shap_lib
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

try:
    from statsmodels.tsa.arima.model import ARIMA
    ARIMA_AVAILABLE = True
except ImportError:
    ARIMA_AVAILABLE = False

try:
    from scipy.stats import pearsonr
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

app = FastAPI(title="CropInsight India API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = Path("../data/crop_production.csv")
MODEL_PATH = Path("../model/rf_model.pkl")
ENCODER_PATH = Path("../model/encoders.pkl")
XGB_MODEL_PATH = Path("../model/xgb_model.pkl")

df: pd.DataFrame = None
model = None
encoders: dict = None
shap_explainer = None
xgb_model = None

FEATURE_NAMES = ["Area", "Year", "Season", "State", "Crop"]


@app.on_event("startup")
def load_resources():
    global df, model, encoders, shap_explainer, xgb_model
    if DATA_PATH.exists():
        raw = pd.read_csv(DATA_PATH)
        raw = raw.dropna(subset=["Production"])
        raw = raw[raw["Area"] > 0]
        raw["Yield"] = raw["Production"] / raw["Area"]
        raw["Season"] = raw["Season"].str.strip()
        df = raw
    if MODEL_PATH.exists():
        model = joblib.load(MODEL_PATH)
        if SHAP_AVAILABLE:
            try:
                shap_explainer = shap_lib.TreeExplainer(model)
            except Exception:
                shap_explainer = None
    if ENCODER_PATH.exists():
        encoders = joblib.load(ENCODER_PATH)
    if XGB_MODEL_PATH.exists():
        try:
            xgb_model = joblib.load(XGB_MODEL_PATH)
        except Exception:
            xgb_model = None


@app.get("/")
def root():
    return {
        "status": "ok",
        "dataset_loaded": df is not None,
        "model_loaded": model is not None,
        "shap_available": SHAP_AVAILABLE and shap_explainer is not None,
        "arima_available": ARIMA_AVAILABLE,
    }


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


# ── Forecast (ARIMA) ──────────────────────────────────────────────────────────

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
    max_year = int(years.max())
    forecast_years = list(range(max_year + 1, max_year + horizon + 1))

    model_name = "OLS"
    forecast_prod = []
    ci_lower_list = []
    ci_upper_list = []

    if ARIMA_AVAILABLE and len(prod) >= 5:
        try:
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                arima_mdl = ARIMA(prod, order=(1, 1, 0))
                fitted = arima_mdl.fit()
                fc = fitted.get_forecast(steps=horizon)
                mean_fc = fc.predicted_mean
                ci_df = fc.conf_int(alpha=0.05)
                forecast_prod = [max(0.0, float(v)) for v in mean_fc]
                ci_lower_list = [max(0.0, float(v)) for v in ci_df.iloc[:, 0]]
                ci_upper_list = [max(0.0, float(v)) for v in ci_df.iloc[:, 1]]
                model_name = "ARIMA(1,1,0)"
        except Exception:
            pass

    if not forecast_prod:
        coeffs = np.polyfit(years, prod, 1)
        forecast_prod = [max(0.0, float(np.polyval(coeffs, y))) for y in forecast_years]
        residual_std = float(np.std(prod - np.polyval(coeffs, years)))
        ci = residual_std * 1.96
        ci_lower_list = [max(0.0, p - ci) for p in forecast_prod]
        ci_upper_list = [p + ci for p in forecast_prod]
        model_name = "OLS"

    # derive slope from first + last forecast vs historical range
    slope = (forecast_prod[-1] - prod[-1]) / horizon if horizon > 0 else 0.0
    trend_pct = round((slope / prod.mean()) * 100, 2) if prod.mean() > 0 else 0.0

    historical = [
        {"year": int(r["Crop_Year"]), "production": float(r["Production"]), "type": "historical"}
        for _, r in yearly.iterrows()
    ]
    future = [
        {
            "year": y,
            "production": round(p, 2),
            "ci_lower": round(cl, 2),
            "ci_upper": round(cu, 2),
            "type": "forecast",
        }
        for y, p, cl, cu in zip(forecast_years, forecast_prod, ci_lower_list, ci_upper_list)
    ]

    return {
        "crop": crop,
        "historical": historical,
        "forecast": future,
        "trend_pct_per_year": trend_pct,
        "slope": round(float(slope), 2),
        "direction": "growing" if slope > 0 else "declining",
        "model": model_name,
    }


# ── Predict + SHAP ────────────────────────────────────────────────────────────

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
    importances = [
        {"feature": n, "importance": round(float(v), 6)}
        for n, v in sorted(zip(FEATURE_NAMES, fi), key=lambda x: -x[1])
    ]
    result = {
        "trained": True,
        "feature_importances": importances,
        "rf": {"n_estimators": model.n_estimators},
        "xgb_loaded": xgb_model is not None,
    }
    model_meta_path = Path("../model/metrics.json")
    if model_meta_path.exists():
        metrics = json.loads(model_meta_path.read_text())
        result["rf"].update(metrics.get("rf", {}))
        result["lr"] = metrics.get("lr")
        if "xgb" in metrics:
            result["xgb"] = metrics["xgb"]
            if xgb_model is not None:
                result["xgb"]["n_estimators"] = xgb_model.n_estimators
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

        shap_values = None
        if shap_explainer is not None:
            try:
                sv = shap_explainer.shap_values(X)
                raw = sv[0] if hasattr(sv[0], '__len__') else sv
                total_abs = sum(abs(v) for v in raw) or 1.0
                shap_values = [
                    {
                        "feature": name,
                        "shap": round(float(v), 6),
                        "pct": round(abs(float(v)) / total_abs * 100, 1),
                        "direction": "positive" if v >= 0 else "negative",
                    }
                    for name, v in sorted(zip(FEATURE_NAMES, raw), key=lambda x: -abs(x[1]))
                ]
            except Exception:
                shap_values = None

        return {
            "predicted_production": round(production, 2),
            "predicted_yield": round(production / req.area, 4),
            "unit": "tonnes",
            "inputs": req.dict(),
            "shap_values": shap_values,
        }
    except ValueError as e:
        raise HTTPException(400, f"Encoding error: {e}. Check state/season/crop names match the dataset.")


# ── Recommend ─────────────────────────────────────────────────────────────────

@app.get("/api/recommend")
def recommend(state: str, season: str, area: float = 1000.0, year: int = 2015, top_n: int = 5):
    if model is None or encoders is None:
        raise HTTPException(503, "Model not trained yet. Run the Jupyter notebook first.")
    if df is None:
        raise HTTPException(503, "Dataset not loaded")

    season_stripped = season.strip()
    valid_crops = df[
        (df["State_Name"] == state) & (df["Season"] == season_stripped)
    ]["Crop"].unique().tolist()

    if not valid_crops:
        valid_crops = df[df["State_Name"] == state]["Crop"].unique().tolist()

    if not valid_crops:
        raise HTTPException(404, f"No crops found for state '{state}'")

    try:
        state_enc = encoders["state"].transform([state])[0]
        season_enc = encoders["season"].transform([season_stripped])[0]
    except ValueError as e:
        raise HTTPException(400, f"Encoding error: {e}")

    results = []
    for crop in valid_crops:
        try:
            crop_enc = encoders["crop"].transform([crop])[0]
            X = [[area, year, season_enc, state_enc, crop_enc]]
            log_pred = model.predict(X)[0]
            production = float(np.expm1(log_pred))
            yield_val = production / area
            # get historical avg yield for this crop+state+season for context
            hist = df[
                (df["Crop"] == crop) & (df["State_Name"] == state) & (df["Season"] == season_stripped)
            ]
            hist_yield = round(float(hist["Yield"].mean()), 4) if not hist.empty else None
            results.append({
                "crop": crop,
                "predicted_production": round(production, 2),
                "predicted_yield": round(yield_val, 4),
                "historical_avg_yield": hist_yield,
                "records_in_dataset": len(hist),
            })
        except Exception:
            continue

    results.sort(key=lambda x: -x["predicted_yield"])
    top = results[:top_n]

    # add rank and relative score
    if top:
        max_yield = top[0]["predicted_yield"] or 1.0
        for i, r in enumerate(top):
            r["rank"] = i + 1
            r["score_pct"] = round(r["predicted_yield"] / max_yield * 100, 1)

    return {
        "state": state,
        "season": season_stripped,
        "area": area,
        "year": year,
        "recommendations": top,
        "crops_evaluated": len(results),
    }


# ── Rainfall Correlation ──────────────────────────────────────────────────────

RAINFALL_PATH = Path("../data/rainfall_in_india_1901-2015.csv")

# Meteorological subdivision → state name in crop dataset
SUBDIVISION_MAP = {
    "COASTAL ANDHRA PRADESH": "Andhra Pradesh",
    "RAYALASEEMA": "Andhra Pradesh",
    "TELANGANA": "Andhra Pradesh",
    "ANDHRA PRADESH": "Andhra Pradesh",
    "ARUNACHAL PRADESH": "Arunachal Pradesh",
    "ASSAM & MEGHALAYA": "Assam",
    "BIHAR": "Bihar",
    "CHHATTISGARH": "Chhattisgarh",
    "GUJARAT REGION": "Gujarat",
    "SAURASHTRA KUTCH & DIU": "Gujarat",
    "HARYANA DELHI & CHANDIGARH": "Haryana",
    "HIMACHAL PRADESH": "Himachal Pradesh",
    "JAMMU & KASHMIR": "Jammu and Kashmir",
    "JHARKHAND": "Jharkhand",
    "COASTAL KARNATAKA": "Karnataka",
    "NORTH INTERIOR KARNATAKA": "Karnataka",
    "SOUTH INTERIOR KARNATAKA": "Karnataka",
    "INTERIOR KARNATAKA": "Karnataka",
    "KERALA": "Kerala",
    "KONKAN & GOA": "Goa",
    "EAST MADHYA PRADESH": "Madhya Pradesh",
    "WEST MADHYA PRADESH": "Madhya Pradesh",
    "MADHYA MAHARASHTRA": "Maharashtra",
    "MARATHWADA": "Maharashtra",
    "VIDARBHA": "Maharashtra",
    "NAGA MANI MIZO TRIPURA": "Manipur",
    "ORISSA": "Odisha",
    "PUNJAB": "Punjab",
    "EAST RAJASTHAN": "Rajasthan",
    "WEST RAJASTHAN": "Rajasthan",
    "GANGETIC WEST BENGAL": "West Bengal",
    "SUBHIMALAYAN BENGAL & SIKKIM": "West Bengal",
    "SHBS": "West Bengal",
    "SUB HIMALAYAN BENGAL AND SIKKIM": "West Bengal",
    "TAMIL NADU": "Tamil Nadu",
    "UTTARAKHAND": "Uttarakhand",
    "EAST UTTAR PRADESH": "Uttar Pradesh",
    "WEST UTTAR PRADESH": "Uttar Pradesh",
}


def _load_rainfall():
    if not RAINFALL_PATH.exists():
        return None
    rain = pd.read_csv(RAINFALL_PATH)
    rain.columns = [c.strip().upper() for c in rain.columns]
    rain = rain.rename(columns={"SUBDIVISION": "SUBDIVISION"})
    rain["SUBDIVISION"] = rain["SUBDIVISION"].str.strip().str.upper()
    rain["State"] = rain["SUBDIVISION"].map(SUBDIVISION_MAP)
    rain = rain.dropna(subset=["State"])
    monsoon_cols = [c for c in ["JUN", "JUL", "AUG", "SEP"] if c in rain.columns]
    if monsoon_cols:
        rain["MONSOON"] = rain[monsoon_cols].sum(axis=1)
    if "ANNUAL" not in rain.columns and all(m in rain.columns for m in ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"]):
        rain["ANNUAL"] = rain[["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"]].sum(axis=1)
    keep = ["State", "YEAR", "ANNUAL"] + (["MONSOON"] if "MONSOON" in rain.columns else [])
    rain = rain[[c for c in keep if c in rain.columns]]
    # average across subdivisions that map to same state+year
    rain = rain.groupby(["State", "YEAR"]).mean(numeric_only=True).reset_index()
    return rain


@app.get("/api/rainfall")
def rainfall_correlation():
    if df is None:
        raise HTTPException(503, "Dataset not loaded")

    rain = _load_rainfall()
    if rain is None:
        return {
            "available": False,
            "message": "Rainfall data not found. Download 'rainfall in india 1901-2015.csv' from Kaggle and place it in the data/ folder.",
        }

    # crop yield per state+year
    crop_yearly = (
        df.groupby(["State_Name", "Crop_Year"])
        .agg(avg_yield=("Yield", "mean"), total_production=("Production", "sum"), total_area=("Area", "sum"))
        .reset_index()
        .rename(columns={"State_Name": "State", "Crop_Year": "YEAR"})
    )

    merged = pd.merge(crop_yearly, rain, on=["State", "YEAR"])
    merged = merged[(merged["YEAR"] >= 1997) & (merged["YEAR"] <= 2015)]

    if merged.empty:
        return {"available": False, "message": "No overlapping state+year pairs found after merging. Check state name mapping."}

    has_monsoon = "MONSOON" in merged.columns

    # overall Pearson r
    annual_r, annual_p = (None, None)
    monsoon_r, monsoon_p = (None, None)
    if SCIPY_AVAILABLE and len(merged) >= 3:
        annual_r, annual_p = pearsonr(merged["ANNUAL"].fillna(0), merged["avg_yield"])
        annual_r = round(float(annual_r), 4)
        annual_p = round(float(annual_p), 6)
        if has_monsoon:
            monsoon_r, monsoon_p = pearsonr(merged["MONSOON"].fillna(0), merged["avg_yield"])
            monsoon_r = round(float(monsoon_r), 4)
            monsoon_p = round(float(monsoon_p), 6)

    # state-level aggregates for scatter
    state_agg = (
        merged.groupby("State")
        .agg(avg_yield=("avg_yield", "mean"), avg_rainfall=("ANNUAL", "mean"),
             avg_monsoon=("MONSOON", "mean") if has_monsoon else ("ANNUAL", "mean"))
        .reset_index()
    )

    # per-state correlation across years
    state_corr = []
    for state_name, grp in merged.groupby("State"):
        if len(grp) < 4:
            continue
        try:
            if SCIPY_AVAILABLE:
                r, p = pearsonr(grp["ANNUAL"].fillna(0), grp["avg_yield"])
                state_corr.append({
                    "state": state_name,
                    "pearson_r": round(float(r), 4),
                    "p_value": round(float(p), 6),
                    "years": len(grp),
                    "avg_yield": round(float(grp["avg_yield"].mean()), 4),
                    "avg_rainfall": round(float(grp["ANNUAL"].mean()), 1),
                })
        except Exception:
            continue

    state_corr.sort(key=lambda x: -x["pearson_r"])

    # national yearly avg
    yearly = (
        merged.groupby("YEAR")
        .agg(avg_yield=("avg_yield", "mean"), avg_rainfall=("ANNUAL", "mean"),
             avg_monsoon=("MONSOON", "mean") if has_monsoon else ("ANNUAL", "mean"))
        .reset_index()
        .rename(columns={"YEAR": "year"})
        .round(3)
    )

    scatter = state_agg.round(4).to_dict(orient="records")

    return {
        "available": True,
        "pearson_r_annual": annual_r,
        "p_value_annual": annual_p,
        "pearson_r_monsoon": monsoon_r if has_monsoon else None,
        "p_value_monsoon": monsoon_p if has_monsoon else None,
        "scatter": scatter,
        "state_correlations": state_corr,
        "yearly": yearly.to_dict(orient="records"),
        "pairs_count": len(merged),
        "states_count": int(merged["State"].nunique()),
    }
