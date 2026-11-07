# CropInsight India

India is one of the world's largest agricultural economies, with over 60% of its rural population dependent on farming. Yet the relationship between crop choice, season, geography, and actual yield remains complex and data-sparse for most farmers and policymakers. CropInsight India is a full-stack data science project that digs into 18 years of government crop production records to surface patterns that are otherwise buried in spreadsheets.

The aim is straightforward: take raw agricultural data and turn it into something you can actually read, compare, and act on — whether you are a data scientist exploring the dataset, a researcher studying regional yield gaps, or a developer studying how to build an end-to-end ML product.

---

## What Does It Analyse?

The dataset covers **~246,000 crop-season-district records** across **25 Indian states**, **50+ crops**, and **5 growing seasons** from 1997 to 2015.

The project answers questions like:

- Which states dominate India's crop production, and by how much?
- Has agricultural yield in India improved over the last two decades?
- Is there a statistically significant difference in yield between Kharif and Rabi seasons?
- Which state-season combinations are most productive per hectare?
- Can a machine learning model accurately predict crop production given farm parameters?
- How do crops like Rice and Wheat compare in terms of area, yield, and growth trend?
- What does the production forecast look like for the next 5–10 years if current trends continue?

These are answered through EDA, statistical hypothesis testing, clustering, regression modelling, and an interactive dashboard — all connected end-to-end.

---

## About Indian Crop Production

Indian agriculture runs on two major cropping seasons:

- **Kharif** — sown in June–July with the monsoon (rice, maize, cotton, soybean)
- **Rabi** — sown in October–November after the monsoon (wheat, mustard, barley)

Along with Zaid, Whole Year, and Summer seasons, these make up the complete cycle. Production is measured in **tonnes** and area in **hectares**, making yield (tonnes per hectare) the primary efficiency metric. States like Uttar Pradesh, Andhra Pradesh, and Punjab consistently lead production, but yield efficiency tells a different story — smaller states often produce more per hectare than the high-volume giants.

The data comes from the Indian government's agricultural ministry records, aggregated at the district level and published on Kaggle.

---

## What the App Does

The application has 8 views, each addressing a different angle of the data:

| Page | Purpose |
|---|---|
| **Overview** | National KPIs, production trend 1997–2015, top states and crops, season share |
| **Explore** | Deep EDA — yield trends, area cultivated, season analysis, insight badges |
| **Map** | India choropleth map coloured by state production, hover tooltips, zoom and pan |
| **Districts** | Drill into any state — top producing districts, top crops, historical trend |
| **Rainfall** | Pearson correlation between IMD rainfall and crop yield — scatter, yearly dual-axis trend, per-state correlation leaderboard |
| **Compare** | Head-to-head: any crop vs crop or state vs state across all metrics |
| **Forecast** | ARIMA time-series forecast with 95% confidence interval, up to 10-year horizon |
| **Predict** | Random Forest model inference — input farm parameters, get production estimate + SHAP feature contributions |
| **Recommend** | Crop Recommender — enter state, season and area to get the top crops ranked by predicted yield |
| **Model** | Feature importance, R²/RMSE/MAE, model comparison with Linear Regression baseline |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Data Analysis | Python · pandas · NumPy · SciPy · scikit-learn |
| Notebook | Jupyter |
| Backend API | FastAPI · uvicorn · joblib |
| Frontend | React 18 · Vite · Recharts · react-simple-maps |

---

## Project Structure

```
CropInsight-India/
├── data/                        ← place crop_production.csv here
├── notebooks/
│   └── CropInsight_Analysis.ipynb   ← full DS pipeline
├── backend/
│   ├── main.py                  ← FastAPI (14 endpoints)
│   ├── schemas.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/               ← 8 pages
│   │   ├── components/
│   │   ├── hooks/
│   │   └── ThemeContext.jsx
│   └── package.json
└── model/                       ← rf_model.pkl · encoders.pkl · metrics.json
```

---

## Datasets

**1. Indian Agriculture Crop Production** — Kaggle  
Search: `Indian Agriculture Crop Production abhinand`  
Download `crop_production.csv` → place in `data/`

**2. Rainfall in India 1901–2015** — Kaggle *(required for Rainfall page)*  
Search: `rainfall in india 1901 2015`  
Download `rainfall in india 1901-2015.csv` → rename to `rainfall_in_india_1901-2015.csv` → place in `data/`

---

## How to Run

### 1. Backend

```bash
cd backend
pip install -r requirements.txt --only-binary :all:
python -m uvicorn main:app --reload --port 8001
```

### 2. Train the Model (once)

```bash
jupyter notebook notebooks/CropInsight_Analysis.ipynb
```

Run all cells — saves `rf_model.pkl`, `encoders.pkl`, and `metrics.json` into `model/`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:3000`

---

## License

MIT
