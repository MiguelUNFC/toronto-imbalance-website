# Predicting Demand and Station Imbalance in Bike Share Toronto

This repository contains the code and documentation for a Capstone Project focused on predicting station imbalance risk in the Bike Share Toronto system. The project uses temporal, spatial, weather, and large-scale event factors to forecast when stations are likely to become overfull or empty, especially under normal conditions and extreme demand scenarios.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Expected Outcomes](#expected-outcomes)
- [Data Sources & Ingestion](#data-sources--ingestion)
- [Project Structure](#project-structure)
- [Data Pipeline Architecture](#data-pipeline-architecture)
- [SILVER → GOLD Integration Layer](#silver--gold-integration-layer)
- [Exploratory Data Analysis](#exploratory-data-analysis)
- [Feature Engineering & Modeling Preparation](#feature-engineering--modeling-preparation)
- [Modeling Approach](#modeling-approach)
- [Results & Model Performance](#results--model-performance)
- [Dashboards & Visualizations](#dashboards--visualizations)
- [Limitations](#limitations)
- [How to Run](#how-to-run)
- [Team Members](#team-members)

---



## Project Overview

Bike-sharing systems are a vital part of sustainable urban mobility, but they face significant operational challenges from station imbalance, for example, when stations run out of bikes (preventing rentals) or become completely full (preventing returns). This leads to poor user experience for users and high rebalancing costs.
This project develops predictive models to identify high-risk stations and time periods by integrating:
- Historical and real-time bike-share data
- Weather conditions
- Public events
- Temporal and spatial patterns

**Target variable:** Net Flow = Arrivals − Departures per station per hour.

---

## Expected Outcomes

- Identification of key imbalance drivers
- Accurate predictive models for normal and high-demand conditions
- Scenario-based insights for events.
- Interactive dashboards highlighting high-risk stations and periods

---

## Data Sources & Ingestion

### Bike Share – Bronze Dataset
- **Time window:** October 2022 – September 2024 (24 months)
- **Total records:** 12,055,519
- **Format:** Parquet
- **Partitioning:** year / month
- **Storage:** Unity Catalog Volume (Databricks)
- **Path:** `dbfs:/Volumes/workspace/default/dbfs/Projects/Capstone/data/bronze/bikeshare_ridership`

### GBFS Real-Time Data (US06)

- **Source:** Bike Share Toronto GBFS (real-time feeds)
- **Endpoints:** station_information, station_status
- **Access mode:** On-demand (no data persistence)
- **Format:** JSON parsed into Spark DataFrames
- **Usage:** Live querying, validation, and exploratory analysis
- **Output:** Spark DataFrames enriched with retrieval timestamp and source metadata

### Bike Share – Silver Dataset (US09)

- **Source:** Bronze Bike Share Trips
- **Processing scope:**
  - Standardized column names (snake_case)
  - Cleaned null and invalid records
  - Converted timestamps to structured date fields
  - Generated temporal features (day, hour buckets)
  - Filtered duration outliers (≤ 4 hours)
- **Granularity:** Trip-level
- **Format:** Parquet
- **Partitioning:** year / month
- **Path:** `dbfs:/Volumes/workspace/default/dbfs/Projects/Capstone/data/silver/bikeshare_trips`

### Bike Share – Silver Aggregated Dataset (Station Hour Flow)

- **Source:** Silver Bike Share Trips
- **Aggregation level:** Station – Hour
- **Processing scope:**
  - Calculated hourly departures and arrivals per station
  - Generated net_flow metric (arrivals – departures)
  - Created hourly time buckets
  - Data quality validation on key fields
- **Granularity:** station_id × year × month × day × hour
- **Format:** Parquet
- **Partitioning:** year / month
- **Path:** `dbfs:/Volumes/workspace/default/dbfs/Projects/Capstone/data/silver_agg/station_hour_flow`

**Usage:**
Feature base for demand prediction and station imbalance modeling.

---

## Project Structure (REVISAR Y DEFINIR)

```text
project/
│
├── data/
│   ├── raw/
│   ├── processed/
│   └── external/
│
├── src/
│   ├── aggregation/
│   ├── ingestion/
│   ├── preprocessing/
│   ├── features/
│   ├── modeling/
│   └── utils/
│
├── dashboards/
│
├── reports/
│   ├── proposal.pdf
│   ├── eda_report.pdf
│   └── final_report.pdf
│
├── requirements.txt
│
├── README.md
│
└── CONTRIBUTING.md

```

---


## Data Pipeline Architecture

```
Raw (CSV / ZIP)
       ↓
Bronze (Trip-level Parquet)
       ↓
Silver (Clean Trips)
       ↓
Silver_Agg (Station Hour Flow)
       ↓
Gold (Integrated Dataset)
```

---

## SILVER → GOLD Integration Layer

The integration layer consolidates all SILVER datasets into analytically ready GOLD datasets at **station-hour granularity**, which serves as the modeling backbone for station imbalance prediction.

### Objective

To integrate:

- Station-hour flow data (departures, arrivals, net_flow)
- Hourly weather data
- Station geolocation (lat/lon)
- Public events data (daily and spatiotemporal)

while preserving strict uniqueness at:

`station_id × year × month × day × hour`


### GOLD Datasets

#### GOLD_V1 – Daily Event Integration (Baseline)

Includes:
- Flow variables
- Weather variables
- Station metadata
- Daily event indicators

Use case:  
Baseline modeling using calendar-level event effects.


#### GOLD_V2 – Spatiotemporal Event Integration (Enhanced)

Extends GOLD_V1 by incorporating:

- Event-hour filtering (only during active event hours)
- Spatial filtering using Haversine distance
- Nearby event indicators
- Event attendance aggregation per station-hour
- Distance-weighted event intensity
- Operational event impact categories

Use case:  
Advanced imbalance prediction under localized demand shocks.

> **Recommended dataset for modeling:** GOLD_V2, as it captures temporal, weather, spatial, and event intensity effects in a unified dataset.

---

## Exploratory Data Analysis

The full exploratory data analysis for the Bike Share Toronto demand imbalance project can be found in:

`reports/eda/EDA.ipynb`

This notebook explores:
- Trip-level system behavior
- Station-hour operational flows
- Station imbalance patterns
- Extreme imbalance scenarios
- Weather impact on system dynamics
- Public event impact on system dynamics

---


## Feature Engineering & Modeling Preparation

Feature engineering and target definition were implemented to prepare the dataset for predictive modeling.

This stage includes:

- Definition of the imbalance prediction target
- Net flow metric construction
- Station-level filtering and preparation of the modeling dataset

Notebook available in:

`src/features/Modeling Preparation & Feature Engineering.ipynb`

---

## Initial Modeling

This phase includes the initial benchmarking of multiple models:

- Baseline (lag-based)
- Linear Regression
- Random Forest (arrivals/departures → derived net flow)
- LightGBM (initial runs)
- XGBoost (early validation)

The objective was to compare performance (MAE, RMSE) and evaluate modeling strategies before transitioning to direct net flow prediction.

This stage serves as a foundation for the final modeling approach.

Notebook available in:

`src/features/modeling/initial

---

## Modeling Approach

- **Target variable:** Net Flow (Arrivals − Departures) per station per hour
- **Models evaluated:** XGBoost, LightGBM
- **Baseline:** Lag-1 (previous hour persistence)
- **Validation strategy:** Rolling time-series cross-validation (23 iterations)
  - Training window: 90 days
  - Test window: 1 month (next month prediction)
- **Evaluation metrics:** MAE, RMSE

This rolling strategy simulates real forecasting conditions and prevents data leakage.

---




# Results & Model Performance

Models were evaluated across 23 rolling time-series iterations.

| Model | MAE | Improvement vs. Baseline (Lag-1) |
|---|---|---|
| **XGBoost** | ~1.50 bikes/hour | ~30.60% |
| LightGBM | — | ~30.43% |
| Baseline (Lag-1) | — | — |


**Key findings:**
- XGBoost achieved the best overall performance across all rolling iterations.
- External features (weather + events) consistently improved prediction accuracy over the baseline.
- Demand patterns are highly cyclical and station-dependent.
- Event effects are localized and increase short-term variability in net flow.


> **Conclusion:** Models consistently outperform the Lag-1 baseline, confirming that temporal, spatial, weather, and event features significantly improve station imbalance prediction.

---


## Dashboards & Visualizations

This project includes three complementary visualization layers:

| Tool | Description |
|---|---|
| **Databricks (Python)** | Exploratory and pipeline visualizations embedded in analysis notebooks |
| **Power BI** | Operational dashboard for station imbalance monitoring and reporting |
| **Web App (HTML/CSS/JS)** | Interactive frontend for real-time station risk display |

Screenshots for all dashboards are available in the [`dashboards/`](./dashboards/) folder.

---


## Limitations

- Limited cost data availability for operational optimization.
- Model performance depends on data quality (weather & events).
- No real-time retraining implemented.
- External disruptions (e.g., infrastructure changes, outages) are not fully captured.

---
## How to Run

> **Note:** The full pipeline runs on **Databricks**. The steps below assume access to a Databricks workspace with Unity Catalog enabled.

### 1. Clone the repository
```bash
git clone https://github.com/<your-org>/<your-repo>.git
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the pipeline in order

| Step | Location |
|---|---|
| Data ingestion | `src/ingestion/` |
| Preprocessing | `src/preprocessing/` |
| Aggregation | `src/aggregation/` |
| EDA | `reports/eda/EDA.ipynb` |
| Feature engineering | `src/features/Modeling Preparation & Feature Engineering.ipynb` |
| Modeling | `src/modeling/` |


### 4. View dashboards

Open screenshots in [`dashboards/`](./dashboards/) or run the web app locally by opening `dashboards/index.html` in a browser.

---

## Team Members

| Name | 
|---|
| Jesus Ricardo Vizcarra Vargas |
| Jose Miguel Osorio Davila |
| Liliana Marcela Camargo Mojica |
| Teddy Fabrizio Baeny Vargas |

---

*DAMO-699-9: Capstone Project — Group 3 | Winter 2026 | Professor: Hany Osman | University of Niagara Falls* 
