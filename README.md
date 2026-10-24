# 📈 NeuralStock AI - AI Stock Predictor & Market Intelligence Platform

A full-stack, machine learning-powered stock market prediction platform with a real-time FastAPI backend and a dark-mode fintech dashboard.

![NeuralStock AI Architecture](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi)
![ML Models](https://img.shields.io/badge/ML-Ensemble%20(GBDT%20%2B%20RF%20%2B%20Ridge)-blueviolet)
![Data Feed](https://img.shields.io/badge/Data-Yahoo%20Finance%20Live-10B981)

---

## 🌟 Key Features

1. **Multi-Model Machine Learning Ensemble**:
   - Blends **Histogram-based Gradient Boosting (`HistGradientBoostingRegressor`)**, **Random Forest (`RandomForestRegressor`)**, and **L2-Regularized Linear Drift (`Ridge`)**.
   - Feature engineering on stationary log returns, avoiding unit-root and non-stationarity pitfalls of raw price regression.
   - Computes dynamic **95% Confidence Interval Cones** ($\pm 1.96 \times \sigma_{\text{resid}} \times \sqrt{t}$) modeling uncertainty expansion over multi-day forecast horizons.

2. **Automated Trading Recommendation & Consensus Engine**:
   - Synthesizes technical indicators with AI forecast trajectories into actionable signals: `STRONG BUY`, `BUY`, `HOLD`, `SELL`, `STRONG SELL`.
   - Bullish / Bearish sentiment score (0% to 100%).
   - Dynamic price targets for **Next Day**, **7-Day**, and **30-Day** horizons.
   - Adaptive ATR-based **Stop Loss** and **Take Profit** risk levels.

3. **Comprehensive Technical Indicator Engine**:
   - Relative Strength Index (RSI 14-period with Wilder's smoothing)
   - Moving Average Convergence Divergence (MACD, Signal line, Histogram)
   - Bollinger Bands (20-day SMA, Upper/Lower bands, Bandwidth, %B)
   - Moving Averages (10, 20, 50, 200 SMA, and 12, 26, 50 EMA)
   - Average True Range (ATR 14) and 21-day rolling volatility
   - Support & Resistance pivot levels and 20-day swing extrema

4. **Model Diagnostics & Holdout Backtesting**:
   - Directional Accuracy % (rate of correctly predicting up/down market movements).
   - Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and $R^2$ Score.
   - Top Predictive Drivers (feature importance ranking from tree ensembles).
   - Visual Backtesting Chart comparing model predictions against actual market prices.

5. **Live & Fallback Financial Data**:
   - Fetches live market data for US equities, ETFs, Cryptocurrencies, and Global exchanges (e.g. `NVDA`, `AAPL`, `TSLA`, `MSFT`, `BTC-USD`, `RELIANCE.NS`, `TCS.NS`).
   - In-memory caching with TTL (5 minutes) for speed and rate-limit prevention.
   - Built-in synthetic geometric Brownian motion simulator if offline or when testing exotic symbols.

6. **Interactive Dark Fintech Terminal Dashboard**:
   - Chart.js interactive multi-series canvas with zoom and hover inspection.
   - Timeframe toggles (`1M`, `3M`, `6M`, `1Y`, `2Y`, `5Y`).
   - Forecast horizon slider (3 to 30 days).
   - Ticker search with instant autocomplete dropdown.
   - Persistent Watchlist saved in browser `localStorage`.

7. **Live Context-Aware AI Financial Copilot (Chatbot)**:
   - Floating conversational assistant embedded directly into the terminal dashboard.
   - **Context Awareness**: Streams live data, AI recommendation ratings, indicators (RSI, MACD, SMAs), and multi-horizon price targets for the currently selected asset.
   - **Voice Interaction**: Includes real-time **Microphone Speech-to-Text 🎙️** (click and speak) and **Text-to-Speech Voice Narration 🔊** (reads out market intelligence).
   - **Intelligent Financial Q&A**: Answers trade feasibility questions ("Should I buy now?"), risk management queries ("Where should I set stop-loss?"), technical indicators ("Explain the RSI"), and head-to-head stock comparisons ("Compare NVDA vs TSLA").
   - **Plug-and-Play LLM Support**: Operates out-of-the-box via built-in quantitative finance engine, with automatic optional upgrade to Google Gemini (`GEMINI_API_KEY`) or OpenAI (`OPENAI_API_KEY`) when an API key is detected.

8. **Live Financial News & AI Sentiment Analysis**:
   - Real-time market headlines for the active ticker with automated NLP sentiment scoring.
   - Computes **Bullish**, **Bearish**, and **Neutral** sentiment percentages and overall market narrative index.

9. **AI Market Screener & Heatmap**:
   - Algorithmic scanner monitoring 10+ top global assets (NVDA, AAPL, TSLA, MSFT, GOOGL, AMZN, META, AMD, BTC-USD, RELIANCE.NS).
   - Real-time comparison table with prices, 24h moves, AI consensus ratings, sentiment gauges, RSI levels, and 14-day forecasts with 1-click loading.

10. **Virtual Paper Trading Simulator ($100k Starting Capital)**:
   - Built-in paper trading engine with virtual portfolio balance.
   - Execute instant virtual Buy and Sell orders at live market prices with position sizing.
   - Tracks portfolio Net Worth, Cash, Unrealized P&L ($ and %), and active holdings.

11. **Price Alerts & Report Export**:
   - Set custom price threshold alerts with live condition monitoring and pop-up notifications.
   - Download comprehensive quantitative intelligence reports with one click (`Export Report`).

---

## 🚀 Quick Start Guide

### 1. Launch with One Click (Windows)
Double-click `run.bat` or run in PowerShell:
```powershell
.\run.ps1
```
This automatically starts the FastAPI server and opens `http://localhost:8000` in your default web browser.

### 2. Manual Command Line Startup
```bash
# Install the dependencies
python -m pip install -r backend/requirements.txt

# Start the FastAPI server with Uvicorn
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

### Run from a GitHub clone
```bash
git clone https://github.com/<OWNER>/<REPOSITORY>.git
cd <REPOSITORY>
python -m venv .venv
```

Activate the virtual environment, then install dependencies and start the app:

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

```bash
# macOS / Linux
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

The SQLite database is created locally under `data/` when authentication is used. It is intentionally excluded from Git. Set `NEURALSTOCK_DB_PATH` to store it at a different location. Optional Gemini and OpenAI integrations read `GEMINI_API_KEY` and `OPENAI_API_KEY` from environment variables; never commit API keys.

### Deploy the full application on Render
The repository includes a `render.yaml` Blueprint for deploying the FastAPI backend and dashboard together. After pushing the repository to GitHub, create a new Blueprint on Render and select the GitHub repository. Render will build the Python service and use `/api/health` for its health check.

Set `GEMINI_API_KEY` and/or `OPENAI_API_KEY` in the Render service environment only if you want to enable those optional integrations. Do not put API keys in `render.yaml` or commit them.

> **Data note:** The included Render free-service configuration uses an ephemeral filesystem. Registered accounts and sessions stored in SQLite can be lost when the service restarts or redeploys. Do not use this setup for real accounts or sensitive data; durable storage requires a separately configured persistent database or disk. If you attach a persistent disk, set `NEURALSTOCK_DB_PATH` to a path on its mount.

> **Hosting note:** GitHub Pages cannot run this FastAPI backend. It can host static files only; use a Python-capable host such as Render for the complete application.

---

## 📁 Project Architecture

```
neuralstock-ai/
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI server, REST routes & static mounting
│   ├── data_service.py      # yfinance live quote fetcher, caching & fallback
│   ├── indicators.py        # Technical indicators (RSI, MACD, Bollinger, SMA, ATR)
│   ├── predictor.py         # ML Ensemble (GBDT + RF + Ridge), forecast & backtesting
│   ├── recommendation.py    # Consensus rating, sentiment meter & price targets
│   ├── chatbot.py           # Financial copilot
│   ├── news_service.py      # Financial news and sentiment
│   ├── screener.py          # Multi-asset market screener
│   ├── auth.py              # Authentication and local SQLite storage
│   └── requirements.txt     # Python dependencies
├── static/
│   ├── index.html           # Dark-theme fintech trading dashboard
│   ├── css/
│   │   └── style.css        # Glassmorphic styles, neon gauges, responsive layout
│   └── js/
│       └── app.js           # Client controller, Chart.js logic & reactive state
├── run.bat                  # Windows batch launcher
├── run.ps1                  # PowerShell launcher
├── test_pipeline.py         # End-to-end pipeline checks (uses live data)
├── .gitignore
└── README.md                # Documentation
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check & system status |
| `GET` | `/api/search?q={query}` | Autocomplete search for ticker symbols |
| `GET` | `/api/stock/{ticker}?period={period}` | Historical candles, company info & technical indicators |
| `POST` | `/api/predict` | Trains ML ensemble, returns multi-day forecast, backtest & signals |
| `POST` | `/api/chat` | Real-time AI Financial Copilot conversational query endpoint |
| `GET` | `/api/news/{ticker}` | Live financial news headlines & AI sentiment polarity breakdown |
| `GET` | `/api/screener` | Multi-asset algorithmic market scanner & heatmap data |
| `GET` | `/docs` | Interactive Swagger / OpenAPI documentation |

### Example Prediction Request (`POST /api/predict`)
```json
{
  "symbol": "AAPL",
  "period": "1y",
  "horizon_days": 14
}
```

---

## 🛠️ Tech Stack
- **Backend**: FastAPI, Uvicorn, Pydantic, Python 3.14
- **Machine Learning**: Scikit-Learn, NumPy, Pandas, SciPy
- **Market Data**: Yahoo Finance (`yfinance`) with TTL cache
- **Frontend**: HTML5, Modern CSS Glassmorphism, Vanilla JS, Chart.js 4.4
