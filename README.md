---
title: AEROLYTICS
emoji: ✈️
colorFrom: gray
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# AEROLYTICS

Remaining useful life (RUL) prediction for turbofan engines, built on NASA C-MAPSS FD001.
A FastAPI backend serves the real trained models. The website is a React and Tailwind app (source in `frontend/`),
already built into `dist/`, with a light and a dark theme.

## Run it

```bash
pip install -r requirements.txt
./run.sh            # or: python3 -m uvicorn main:app --port 8000
```

Open http://localhost:8000. Interactive API docs are at `/api/docs`.
No Node.js is needed to run the site: the built website is included in `dist/`.

**macOS:** XGBoost needs the OpenMP library. If you see `libomp.dylib could not be loaded`, run `brew install libomp` and start the server again.

## Pages

| Page | What it does |
|---|---|
| `/` Home | Overview, live demo prediction, method summary |
| `/dataset` | Real FD001 data: engine explorer, operating conditions, correlation heatmap, searchable raw table |
| `/predict` | Prediction lab: sliders plus number boxes (8 main, 9 advanced), real-engine examples, CSV upload |
| `/models` | Workflow, validation vs test, experiments, tuning, feature importance |
| `/results` | Official test scores, predicted vs actual, error analysis, ablation |
| `/about` | Problem, dataset, method, limitations |

## What is real

* `bundle/` is the Stage 6 prediction bundle, unchanged: `predict.py`, the three model files, the fitted scaler
  and `ui_config.json`. Every prediction on the site comes from `POST /api/predict` or `POST /api/predict-csv`,
  which call it. Feature order and preprocessing are never re-implemented in the web layer.
* `data/` holds the original FD001 CSVs and the saved experiment tables from Stages 2 to 5.
  Charts read these files through the API. Nothing is generated at random.
* Checked: running all 100 test engines through `/api/predict-csv` reproduces the Stage 4 test predictions exactly.

## API

| Route | Purpose |
|---|---|
| `POST /api/predict` | `{"inputs": {"sensor_4": 1408.0, ...}}`. Missing inputs use training medians. |
| `POST /api/predict-csv` | Multipart file upload, up to 5 MB and 20,000 rows. |
| `GET /api/sample-csv` | Sample engine history in the expected format. |
| `GET /api/examples` | Three real test-engine presets with their true RUL. |
| `GET /api/config` | Slider ranges, defaults, status thresholds, test metrics. |
| `GET /api/results` | Saved experiment and test tables. |
| `GET /api/dataset/*` | Summary, engines, engine series, correlation, settings, paged table. |

CSV columns required: `cycle`, `setting_1`, `setting_2`, `sensor_2`, `sensor_3`, `sensor_4`, `sensor_7`, `sensor_8`,
`sensor_9`, `sensor_11`, `sensor_12`, `sensor_13`, `sensor_14`, `sensor_15`, `sensor_17`, `sensor_20`, `sensor_21`.
An optional `unit` column allows several engines in one file.

## Deploy

The app needs a Python host (it is not a static site).

* **Render**: New Web Service from the repository. Build command `pip install -r requirements.txt`,
  start command `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`, or choose the Docker runtime and use the `Dockerfile`.
* **Hugging Face Spaces**: create a Docker Space and push this folder. The included `Dockerfile` uses port 7860.
* Keep the pinned versions in `requirements.txt`. The model files were saved with them, and a different
  scikit-learn or XGBoost version can fail to load them.

The model and data files total about 12 MB, which fits free tiers. Free instances sleep when idle, so the first
request after a pause can take a few seconds while the models load.

## Working on the website (React and Tailwind)

The source is in `frontend/` (Vite, React 18, React Router, Tailwind CSS 4, Chart.js). Node.js 18 or newer is needed
only for this.

```bash
cd frontend
npm install
npm run dev        # live reload on http://localhost:5173, API calls go to a FastAPI server on port 8000
npm run build      # writes the site into ../dist, which FastAPI serves
```

After changing anything in `frontend/`, run `npm run build` and commit the updated `dist/` folder, because the
deployment uses the built files.

* **Colours and themes:** every colour is a variable at the top of `frontend/src/index.css`. The dark values are
  in `:root`, the light values in `[data-theme="light"]`. The toggle in the nav saves the choice in the browser.
* **Loading states:** a splash screen while the app starts, a thin bar at the top of the page when the server is slow,
  grey shimmer placeholders while data and charts load, and a shimmer for images (`LazyImage`).
* **Hero photograph (optional):** put a photo named `hero.jpg`, `hero.png` or `hero.webp` in `frontend/src/assets/`
  and run `npm run build`. It replaces the drawn fan, keeps the 125-tick ring, and shows a shimmer until it loads.
* Fonts (Archivo, IBM Plex Sans and Mono) are self-hosted and Chart.js is bundled, so the site makes no
  third-party requests.

## Notes

* The data is simulated. Estimates are not guarantees and this is not a certified maintenance tool.
