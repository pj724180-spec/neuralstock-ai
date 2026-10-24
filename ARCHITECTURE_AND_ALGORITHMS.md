# NeuralStock AI — System Architecture, Flowcharts & Core Algorithms

---

## 1. Executive System Overview

**NeuralStock AI** is an enterprise-grade financial intelligence and predictive modeling platform designed to forecast equity and cryptocurrency trajectories, quantify market risk, and provide real-time AI-assisted analysis. 

### High-Level Tech Stack
* **Backend Core**: Python 3.14 + FastAPI (high-throughput asynchronous REST API).
* **Machine Learning Ensemble**: Scikit-Learn (`HistGradientBoostingRegressor`, `RandomForestRegressor`, `Ridge Regression`, `StandardScaler`).
* **Financial Data & Quant Indicators**: `yfinance` with TTL memory caching, Vectorized Pandas/NumPy technical indicators (RSI, MACD, Bollinger Bands, ATR, Volatility).
* **Security & Auth**: PBKDF2-HMAC-SHA256 (100,000 iterations) with cryptographic random salts, 32-byte URL-safe session tokens, and SQLite persistence.
* **Frontend Dashboard**: Semantic HTML5, CSS3 Custom Properties (Light Professional & Dark Cyberpunk themes), vanilla JavaScript reactive state engine, and Chart.js financial canvas with dynamic contrast scaling.

---

## 2. End-to-End System Architecture Flowchart

```mermaid
flowchart TD
    subgraph Client ["Client Presentation Layer (Browser)"]
        UI["Dashboard UI (Light / Dark)"]
        Canvas["Chart.js Financial Canvas"]
        CopilotUI["AI Financial Copilot Widget"]
        AuthUI["Security & Auth Modal"]
        Tabs["7 Analytical Tabs (Screener, Paper Trading, Alerts, News...)"]
    end

    subgraph Gateway ["FastAPI Gateway & Security Layer"]
        Router["FastAPI Application Router"]
        AuthEngine["Auth Module (PBKDF2 + Sessions)"]
        UsersDB[("SQLite Database (users.db)")]
    end

    subgraph DataLayer ["Data & News Ingestion Layer"]
        YF["Yahoo Finance Engine (fast_info + history)"]
        TTLCache["In-Memory TTL Cache (15m Expire)"]
        NewsRSS["Live Financial News RSS Scraper"]
        SentimentNLP["VADER / Lexical Polarity NLP Engine"]
    end

    subgraph QuantEngine ["Quantitative Indicator & Feature Layer"]
        Calc["Indicators Engine (RSI, MACD, BB, ATR, Volatility)"]
        Pivots["Support / Resistance Pivot Calculator"]
        FeatEng["Stationary Feature Engineering (17 Indicators)"]
    end

    subgraph MLEnsemble ["Machine Learning Tri-Model Ensemble"]
        Scaler["StandardScaler Normalization"]
        GBDT["HistGradientBoostingRegressor (Weight: 45%)"]
        RF["RandomForestRegressor (Weight: 40%)"]
        RidgeModel["Ridge Linear L2 Regressor (Weight: 15%)"]
        Backtest["Time-Series Out-of-Fold Backtesting Engine"]
        ConeGen["Multi-Step Future Cone Generator (95% CI)"]
    end

    subgraph DecisionLayer ["Consensus & Copilot Layer"]
        Scorer["Consensus Rating & Sentiment Meter Engine"]
        RiskCalc["ATR Stop-Loss & Take-Profit Synthesizer"]
        Copilot["Context-Aware Financial Copilot"]
    end

    %% Interactions
    UI -->|REST / JSON| Router
    CopilotUI -->|POST /api/chat| Router
    AuthUI -->|POST /api/auth/login / register| AuthEngine
    AuthEngine <--> UsersDB

    Router --> AuthEngine
    Router --> YF
    YF <--> TTLCache
    Router --> NewsRSS
    NewsRSS --> SentimentNLP

    YF --> Calc
    Calc --> Pivots
    Calc --> FeatEng

    FeatEng --> Scaler
    Scaler --> GBDT
    Scaler --> RF
    Scaler --> RidgeModel
    GBDT & RF & RidgeModel --> Backtest
    GBDT & RF & RidgeModel --> ConeGen

    ConeGen & Pivots & Calc --> Scorer
    Calc --> RiskCalc
    Scorer & RiskCalc --> Router
    Scorer & RiskCalc & NewsRSS --> Copilot
    Copilot --> Router

    Router --> Canvas
    Router --> Tabs
```

---

## 3. Core Algorithms & Mathematical Specifications

### Algorithm 1: Data Ingestion & Caching Pipeline
```mermaid
flowchart LR
    A["User selects Ticker (e.g. NVDA)"] --> B{"Is in TTL Cache (< 15 mins)?"}
    B -- Yes --> C["Return Cached DataFrame & Meta"]
    B -- No --> D["yfinance download(period)"]
    D --> E{"Is DataFrame Valid (>= 10 rows)?"}
    E -- Yes --> F["Enrich with fast_info & Store in Cache"]
    E -- No --> G["Generate Deterministic Synthetic Data Fallback"]
    G --> H["Flag is_live = False"]
    F --> I["Flag is_live = True"]
    H & I --> J["Send to Quantitative Feature Engine"]
```

1. **Ticker Sanitization**: The symbol is stripped and converted to uppercase.
2. **Cache Validation**: An in-memory cache indexed by `(symbol, period)` is probed against current timestamp $\tau$. If $\tau - \tau_{\text{cached}} < 900\text{s}$, data is returned in $<1\text{ms}$.
3. **Optimized Metadata**: Fetches price and fundamental statistics instantly via `ticker.fast_info` avoiding costly multi-second HTML scraping.
4. **Fallback Circuit**: If network access is offline or rate-limited, a synthetic Geometric Brownian Motion (GBM) simulation generates price candles preserving realistic statistical properties.

---

### Algorithm 2: Quantitative Technical Indicators & Pivots

Given historical price series with vectors for Open ($O$), High ($H$), Low ($L$), Close ($C$), and Volume ($V$):

#### A. Relative Strength Index (RSI - 14 Days)
Price change $\Delta C_t = C_t - C_{t-1}$.
* Gain $U_t = \max(\Delta C_t, 0)$, Loss $D_t = \max(-\Delta C_t, 0)$.
* Smoothed averages using Wilder's Exponential Smoothing:
  $$\overline{U}_t = \alpha U_t + (1 - \alpha)\overline{U}_{t-1}, \quad \alpha = \frac{1}{14}$$
* Relative Strength ($RS$) and $RSI$:
  $$RS_t = \frac{\overline{U}_t}{\overline{D}_t + 10^{-10}}, \quad RSI_t = 100 - \frac{100}{1 + RS_t}$$

#### B. Moving Average Convergence Divergence (MACD)
* Exponential Moving Averages ($EMA_k$ with smoothing factor $\beta = \frac{2}{k+1}$):
  $$EMA_{k, t} = \beta C_t + (1 - \beta)EMA_{k, t-1}$$
* MACD Line:
  $$\text{MACD}_t = EMA_{12, t} - EMA_{26, t}$$
* Signal Line (9-day EMA of MACD):
  $$\text{Signal}_t = EMA_{9}(\text{MACD})_t$$
* Histogram:
  $$\text{Hist}_t = \text{MACD}_t - \text{Signal}_t$$

#### C. Bollinger Bands & %B
* 20-day Simple Moving Average: $\mu_{20, t} = \frac{1}{20}\sum_{i=0}^{19} C_{t-i}$.
* 20-day Sample Standard Deviation: $\sigma_{20, t} = \sqrt{\frac{1}{20}\sum_{i=0}^{19}(C_{t-i} - \mu_{20, t})^2}$.
* Upper & Lower Bands:
  $$BB_{\text{Upper}} = \mu_{20} + 2\sigma_{20}, \quad BB_{\text{Lower}} = \mu_{20} - 2\sigma_{20}$$
* Normalized Percentage B ($\%B$):
  $$\%B_t = \frac{C_t - BB_{\text{Lower}, t}}{BB_{\text{Upper}, t} - BB_{\text{Lower}, t} + 10^{-10}}$$

#### D. Average True Range (ATR - 14 Days)
* True Range ($TR_t$):
  $$TR_t = \max\left(H_t - L_t, \; |H_t - C_{t-1}|, \; |L_t - C_{t-1}|\right)$$
* $ATR_{14}$ is the 14-period exponential moving average of $TR_t$.

#### E. Classical Support, Resistance & Pivot Points
Using the latest completed bar $(H, L, C)$:
$$\text{Pivot Point } (P) = \frac{H + L + C}{3}$$
$$R_1 = 2P - L, \quad S_1 = 2P - H$$
$$R_2 = P + (H - L), \quad S_2 = P - (H - L)$$

---

### Algorithm 3: Machine Learning Tri-Model Ensemble Forecasting

```mermaid
flowchart TD
    A["Raw Enriched Price History DataFrame"] --> B["Build Stationary Features (17 Features)"]
    B --> C["Compute Target Variable: Next-Day Fractional Return Y"]
    C --> D["Time-Series Split (80% Train, 20% Hold-Out Test)"]
    D --> E["StandardScaler: Fit on Train, Transform Test"]
    
    subgraph ParallelTrain ["Tri-Model Parallel Ensemble Fitting"]
        E --> M1["HistGradientBoostingRegressor (GBDT)
        • max_iter: 120
        • learning_rate: 0.04
        • min_samples_leaf: 12"]
        E --> M2["RandomForestRegressor (RF)
        • n_estimators: 80
        • max_depth: 6
        • min_samples_split: 6"]
        E --> M3["Ridge Regression
        • alpha: 1.5 (L2 Regularization)"]
    end

    M1 --> W1["Weight: 0.45"]
    M2 --> W2["Weight: 0.40"]
    M3 --> W3["Weight: 0.15"]

    W1 & W2 & W3 --> WSum["Weighted Ensemble Return:
    R_pred = 0.45*R_gbdt + 0.40*R_rf + 0.15*R_ridge"]

    WSum --> BacktestEval["Hold-Out Backtest Diagnostics
    • Directional Accuracy %
    • MAE, RMSE, R² Score
    • Residual Volatility (resid_std)"]

    WSum --> Refit["Refit Models on 100% Historical Data"]
    Refit --> MultiStep["Recursive Future Cone Generator
    (1 to Horizon Days with Decay & 95% CI)"]
```

#### 1. Feature Stationarity Transformation
To prevent spurious regression on non-stationary raw price levels, all 17 features are transformed into bounded, stationary variables:
1. $r_{1d}, r_{3d}, r_{5d}, r_{10d}, r_{21d}$: Fractional log/momentum returns.
2. $\widetilde{RSI} = \frac{RSI - 50}{50} \in [-1, 1]$.
3. $\widetilde{\text{MACD}} = \frac{\text{MACD}}{C_t}$, $\widetilde{\text{Hist}} = \frac{\text{Hist}}{C_t}$.
4. $\%B$ and $\text{Bandwidth} = \frac{BB_{\text{Upper}} - BB_{\text{Lower}}}{\mu_{20}}$.
5. Distance to Moving Averages: $\frac{C_t}{SMA_k} - 1.0$ for $k \in \{10, 20, 50, 200\}$.
6. 21-day Return Volatility $\sigma_{21d}$ and Volume Ratio $\frac{V_t}{\overline{V}_{20}}$.
7. Day-of-week seasonality $\frac{\text{weekday}}{4} \in [0.0, 1.0]$.

#### 2. Model Weighting & Prediction
The ensemble synthesizes non-linear tree-based gradient boosting, bagging with random forests, and convex linear regularization:
$$\hat{r}_t = 0.45 \cdot \hat{r}_{\text{GBDT}, t} + 0.40 \cdot \hat{r}_{\text{RF}, t} + 0.15 \cdot \hat{r}_{\text{Ridge}, t}$$

#### 3. Hold-Out Backtest Validation Metrics
Evaluated on the chronological last 20% hold-out window:
* **Directional Accuracy**:
  $$\text{DA} = \frac{1}{N_{\text{test}}} \sum_{i=1}^{N_{\text{test}}} \mathbb{I}\left(\text{sgn}(\hat{r}_i) == \text{sgn}(r_i)\right) \times 100\%$$
* **Mean Absolute Error (MAE)** & **Root Mean Squared Error (RMSE)** on price:
  $$\text{MAE} = \frac{1}{N}\sum |C_{\text{pred}} - C_{\text{actual}}|, \quad \text{RMSE} = \sqrt{\frac{1}{N}\sum (C_{\text{pred}} - C_{\text{actual}})^2}$$

#### 4. Multi-Step Future Trajectory with Expanding 95% Confidence Cone
For step $k \in \{1, 2, \dots, H\}$ business days ahead:
1. **Mean Reversion Dampening**:
   $$r_k = \hat{r}_{\text{base}} \cdot e^{-0.04 \cdot k}$$
2. **Projected Mean Price**:
   $$P_k = P_{k-1} \cdot (1 + r_k)$$
3. **Expanding 95% Uncertainty Cone**:
   $$\text{Uncertainty}_k = P_k \cdot \left(1.96 \cdot \sigma_{\text{vol}} \cdot \sqrt{k}\right)$$
   $$\text{Upper}_k = P_k + \text{Uncertainty}_k, \quad \text{Lower}_k = \max\left(0.01, \; P_k - \text{Uncertainty}_k\right)$$
   Where $\sigma_{\text{vol}} = \max(\sigma_{\text{residuals}}, \sigma_{21d}, 0.012)$.

---

### Algorithm 4: Multi-Factor Consensus Rating & Dynamic Risk Engine

```mermaid
flowchart LR
    F1["AI Ensemble Forecast (+/- 35 pts)"] --> Aggregator["Score Accumulator
    [-100 to +100]"]
    F2["RSI Momentum (+/- 20 pts)"] --> Aggregator
    F3["SMA Trend Structure (+/- 25 pts)"] --> Aggregator
    F4["MACD Crossover (+/- 20 pts)"] --> Aggregator

    Aggregator --> SentimentCalc["Bullish Sentiment % = (Score + 100) / 2"]
    SentimentCalc --> Classifier{"Sentiment % Classification"}
    
    Classifier -->|>= 75%| SB["STRONG BUY (Emerald)"]
    Classifier -->|58% - 74%| B["BUY (Light Green)"]
    Classifier -->|43% - 57%| H["HOLD (Amber)"]
    Classifier -->|26% - 42%| S["SELL (Light Red)"]
    Classifier -->|<= 25%| SS["STRONG SELL (Crimson)"]

    ATR["14-Day ATR"] --> StopLoss["Stop-Loss = Close - (2.0 * ATR)"]
    ATR --> TakeProfit["Take-Profit = Close + (2.5 * ATR)"]
```

* **Consensus Rating Score Calculation**:
  $$\text{Score} = S_{\text{Forecast}} + S_{\text{RSI}} + S_{\text{Trend}} + S_{\text{MACD}} \in [-100, +100]$$
* **Sentiment Meter**:
  $$\text{Sentiment}_{\text{Bullish}} = \text{round}\left(\frac{\text{Score} + 100}{2}\right) \in [0\%, 100\%]$$
* **Dynamic Volatility-Adjusted Risk Boundaries**:
  $$\text{Stop-Loss} = \max\left(0.01, \; C_{\text{latest}} - 2.0 \cdot ATR_{14}\right)$$
  $$\text{Take-Profit} = C_{\text{latest}} + 2.5 \cdot ATR_{14}$$

---

### Algorithm 5: Security & Cryptographic Authentication Engine

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as Frontend (app.js)
    participant Server as FastAPI (main.py)
    participant Auth as Auth Module (auth.py)
    participant DB as SQLite (users.db)

    User->>Client: Enters Username & Password
    Client->>Server: POST /api/auth/login {username, password}
    Server->>Auth: authenticate_user(username, password)
    Auth->>DB: Query user by username or email
    DB-->>Auth: Returns user row (salt$hash)
    Note over Auth: Compute PBKDF2-HMAC-SHA256<br/>(100,000 iterations with stored salt)<br/>Constant-time secrets.compare_digest
    Auth-->>Server: User verified
    Auth->>DB: Generate 32-byte session token & store with 30-day expiry
    Server-->>Client: Returns 200 OK + {token, user_profile}
    Client->>Client: Save token to localStorage & update UI to Authenticated
```

* **Password Hashing Specification**:
  $$\text{Salt} = \text{secrets.token\_bytes}(16)$$
  $$\text{Key} = \text{PBKDF2-HMAC-SHA256}(\text{password}, \; \text{Salt}, \; 100000)$$
  $$\text{Storage Format} = \text{Salt}_{\text{hex}} \;\|\; \text{"\$"} \;\|\; \text{Key}_{\text{hex}}$$
* **Timing-Attack Protection**:
  $$\text{verify}(\text{pwd}, \text{stored}) \equiv \text{secrets.compare\_digest}(\text{Key}_{\text{expected}}, \text{Key}_{\text{actual}})$$

---

### Algorithm 6: Real-Time Execution Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Trader as Trader / User
    participant Browser as Frontend (app.js)
    participant API as FastAPI Server
    participant Quant as Data & Quant Engine
    participant ML as ML Ensemble (HistGB + RF + Ridge)
    participant LLM as Financial Copilot

    Trader->>Browser: Selects Ticker (NVDA) & Clicks "Run AI Forecast"
    Browser->>API: GET /api/stock/NVDA?period=1y
    API->>Quant: Fetch candles & calculate 17 indicators
    Quant-->>API: Returns enriched technical dataset
    API-->>Browser: Fast initial render (Asset banner, Candlesticks, SMA/BB)

    Browser->>API: POST /api/predict {symbol: "NVDA", horizon: 14}
    API->>ML: fit_predict(df) & forecast_future(14d)
    Note over ML: Trains HistGB + RF + Ridge<br/>Calculates out-of-fold metrics<br/>Projects 14-day 95% confidence cone
    ML-->>API: Returns forecast, metrics & consensus
    API-->>Browser: Updates Chart with AI Cone & Intelligence sidebar

    Trader->>Browser: Clicks AI Copilot: "What is the 14-day target?"
    Browser->>API: POST /api/chat {message, context: {price, forecast, rating}}
    API->>LLM: Formulate context-aware financial response
    LLM-->>API: Returns formatted analytical insights
    API-->>Browser: Displays reply & speaks audio narration
```

---

## 4. Verification & Diagnostics Matrix

| Subsystem | Test Harness | Validation Result | Performance |
| :--- | :--- | :--- | :--- |
| **Data Ingestion** | `test_pipeline.py` (Step 1-2) | 127 candles + fast_info profile | $< 120\text{ms}$ |
| **Quant Indicators** | `test_pipeline.py` (Step 3) | 30 enriched features, pivots, ATR | $< 15\text{ms}$ |
| **ML Ensemble Training** | `test_pipeline.py` (Step 4) | Directional accuracy, MAE, RMSE, $R^2$ | $< 250\text{ms}$ |
| **Future Cone Generator** | `test_pipeline.py` (Step 5) | 14-day expanding confidence intervals | $< 20\text{ms}$ |
| **Consensus Engine** | `test_pipeline.py` (Step 6) | Rating (`HOLD`), Sentiment (52%), Risk Limits | $< 5\text{ms}$ |
| **AI Copilot** | `test_pipeline.py` (Step 7) | Multi-turn financial advice synthesis | $< 10\text{ms}$ |
| **News Sentiment** | `test_pipeline.py` (Step 8) | Live RSS parsing + NLP sentiment | $< 350\text{ms}$ |
| **Market Screener** | `test_pipeline.py` (Step 9) | 10 multi-asset screening | $< 400\text{ms}$ |
| **Security & Auth** | `test_pipeline.py` (Step 10) | PBKDF2 hashing, token lookup & logout | $< 30\text{ms}$ |
| **Frontend Rendering** | `node -c app.js` | 0 syntax errors, valid DOM tree | 60 FPS canvas |
