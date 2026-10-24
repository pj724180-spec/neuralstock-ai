"""
FastAPI Backend Application for AI Stock Predictor
Serves REST API endpoints and static frontend dashboard.
"""

import os
from typing import Optional, List
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend.data_service import fetch_stock_history, fetch_company_info, search_tickers
from backend.indicators import add_all_indicators, calculate_support_resistance
from backend.predictor import StockEnsemblePredictor
from backend.recommendation import generate_recommendation
from backend.chatbot import FinancialCopilot
from backend.news_service import fetch_live_news
from backend.screener import run_market_screener
from backend.auth import (
    authenticate_user,
    register_user,
    get_user_by_token,
    delete_session,
    create_session,
)

app = FastAPI(
    title="AI Stock Predictor API",
    description="Machine Learning Powered Stock Market Forecasting & Technical Intelligence API",
    version="1.0.0",
)

# Enable Cross-Origin Resource Sharing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"


class PredictionRequest(BaseModel):
    symbol: str = Field(..., example="AAPL")
    period: str = Field("1y", example="1y")
    horizon_days: int = Field(14, ge=1, le=60, example=14)


class LoginRequest(BaseModel):
    username: str = Field(..., example="your-username")
    password: str = Field(..., example="your-password")


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=30, example="trader_john")
    password: str = Field(..., min_length=6, example="Choose-a-strong-password")
    name: Optional[str] = Field("", example="John Doe")
    email: Optional[str] = Field("", example="john@example.com")


# ==========================================
# AUTHENTICATION & SECURITY ENDPOINTS
# ==========================================

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    """Authenticates username/password and creates a secure session."""
    user = authenticate_user(req.username, req.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username/email or password. Please try again."
        )

    token = create_session(user["id"])
    return {
        "status": "success",
        "message": f"Welcome back, {user['name']}!",
        "token": token,
        "user": user
    }


@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    """Registers a new trader account with PBKDF2 hashed credentials."""
    try:
        res = register_user(
            username=req.username,
            password=req.password,
            name=req.name or req.username,
            email=req.email or ""
        )
        return {
            "status": "success",
            "message": f"Account successfully created! Welcome, {res['user']['name']}.",
            "token": res["token"],
            "user": res["user"]
        }
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(exc)}")


@app.get("/api/auth/me")
async def get_current_user(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None)
):
    """Validates session token and returns active user profile."""
    auth_token = None
    if authorization and authorization.startswith("Bearer "):
        auth_token = authorization.split(" ")[1].strip()
    elif token:
        auth_token = token.strip()

    if not auth_token:
        raise HTTPException(status_code=401, detail="Authentication token required.")

    user = get_user_by_token(auth_token)
    if not user:
        raise HTTPException(status_code=401, detail="Session expired or invalid. Please sign in again.")

    return {
        "status": "success",
        "user": user
    }


@app.post("/api/auth/logout")
async def logout(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None)
):
    """Invalidates active session token."""
    auth_token = None
    if authorization and authorization.startswith("Bearer "):
        auth_token = authorization.split(" ")[1].strip()
    elif token:
        auth_token = token.strip()

    if auth_token:
        delete_session(auth_token)

    return {"status": "success", "message": "Signed out successfully."}


@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "service": "AI Stock Predictor Engine",
        "version": "1.0.0",
        "timestamp": os.getenv("CURRENT_TIME", "")
    }


@app.get("/api/search")
async def search(q: str = Query("", description="Ticker symbol or company name")):
    return search_tickers(q)


@app.get("/api/stock/{ticker}")
async def get_stock_data(
    ticker: str,
    period: str = Query("1y", pattern="^(1mo|3mo|6mo|1y|2y|5y)$")
):
    ticker = ticker.strip().upper()
    try:
        hist_result = fetch_stock_history(ticker, period=period)
        df = hist_result["df"]
        if df.empty or len(df) < 10:
            raise HTTPException(status_code=404, detail=f"No price data available for ticker '{ticker}'")

        df_enriched = add_all_indicators(df)
        company_info = fetch_company_info(ticker)
        support_res = calculate_support_resistance(df_enriched)

        # Prepare formatted price records
        records = []
        for dt, row in df_enriched.iterrows():
            date_str = dt.strftime("%Y-%m-%d")
            records.append({
                "date": date_str,
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]) if "Volume" in row else 0,
                "sma_20": round(float(row["SMA_20"]), 2),
                "sma_50": round(float(row["SMA_50"]), 2),
                "sma_200": round(float(row["SMA_200"]), 2),
                "ema_12": round(float(row["EMA_12"]), 2),
                "ema_26": round(float(row["EMA_26"]), 2),
                "rsi_14": round(float(row["RSI_14"]), 2),
                "macd": round(float(row["MACD"]), 2),
                "macd_signal": round(float(row["MACD_Signal"]), 2),
                "macd_hist": round(float(row["MACD_Hist"]), 2),
                "bb_upper": round(float(row["BB_Upper"]), 2),
                "bb_middle": round(float(row["BB_Middle"]), 2),
                "bb_lower": round(float(row["BB_Lower"]), 2),
                "volatility": round(float(row["Volatility_21d"]), 4),
            })

        latest_close = records[-1]["close"]
        prev_close = records[-2]["close"] if len(records) > 1 else latest_close
        price_change = round(latest_close - prev_close, 2)
        price_change_pct = round(((latest_close - prev_close) / prev_close) * 100, 2)

        # Period (Timeframe) return and range
        first_close = records[0]["close"] if records else latest_close
        period_change = round(latest_close - first_close, 2)
        period_change_pct = round(((latest_close - first_close) / (first_close + 1e-10)) * 100, 2)
        period_high = round(max(r["high"] for r in records), 2) if records else latest_close
        period_low = round(min(r["low"] for r in records), 2) if records else latest_close

        period_labels = {
            "1mo": "Past Month",
            "3mo": "Past 3 Months",
            "6mo": "Past 6 Months",
            "1y": "Past Year",
            "2y": "Past 2 Years",
            "5y": "Past 5 Years"
        }
        period_label = period_labels.get(period, "Selected Period")

        return {
            "symbol": ticker,
            "period": period,
            "is_live": hist_result.get("is_live", False),
            "company": company_info,
            "latest_price": {
                "close": latest_close,
                "change": price_change,
                "change_percent": price_change_pct,
                "period": period,
                "period_label": period_label,
                "period_change": period_change,
                "period_change_percent": period_change_pct,
                "period_high": period_high,
                "period_low": period_low,
                "currency": company_info.get("currency", "USD"),
            },
            "support_resistance": support_res,
            "history": records,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stock data: {str(e)}")


@app.post("/api/predict")
async def predict_stock(request: PredictionRequest):
    ticker = request.symbol.strip().upper()
    try:
        hist_result = fetch_stock_history(ticker, period=request.period)
        df = hist_result["df"]
        if df.empty or len(df) < 25:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient historical data for symbol '{ticker}' to train machine learning models.",
            )

        # 1. Feature Engineering & Indicator Calculation
        df_enriched = add_all_indicators(df)
        support_res = calculate_support_resistance(df_enriched)
        company_info = fetch_company_info(ticker)

        # 2. Train Ensemble Model and Run Backtesting
        predictor = StockEnsemblePredictor()
        fit_results = predictor.fit_predict(df_enriched, test_size=0.2)

        # 3. Multi-Step Future Horizon Forecast with 95% Confidence Intervals
        forecasts = predictor.forecast_future(
            df_enriched,
            horizon_days=request.horizon_days,
            resid_std=fit_results.get("resid_std", 0.015),
        )

        # 4. Generate AI Investment Recommendation & Technical Signals
        recommendation = generate_recommendation(
            df=df_enriched,
            forecasts=forecasts,
            metrics=fit_results["metrics"],
            support_resistance=support_res,
        )

        latest_close = round(float(df["Close"].iloc[-1]), 2)
        prev_close = round(float(df["Close"].iloc[-2]), 2) if len(df) > 1 else latest_close

        return {
            "symbol": ticker,
            "company": company_info,
            "is_live": hist_result.get("is_live", False),
            "current_price": latest_close,
            "change": round(latest_close - prev_close, 2),
            "change_percent": round(((latest_close - prev_close) / prev_close) * 100, 2),
            "forecast_horizon_days": request.horizon_days,
            "forecast": forecasts,
            "metrics": fit_results["metrics"],
            "feature_importances": fit_results["feature_importances"],
            "backtest": fit_results["backtest"][-40:],  # Recent 40 test days for chart
            "recommendation": recommendation,
            "support_resistance": support_res,
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Prediction pipeline failed: {str(e)}")


class ChatMessage(BaseModel):
    role: str = "user"
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., example="What is the price target for NVDA?")
    symbol: Optional[str] = Field("NVDA", example="NVDA")
    history: Optional[List[ChatMessage]] = []


@app.post("/api/chat")
async def chat_with_copilot(request: ChatRequest):
    """
    Real-time AI Financial Copilot conversation endpoint.
    Provides context-aware analysis, technical explanations, and price projections.
    """
    try:
        context = {"symbol": request.symbol.strip().upper() if request.symbol else "NVDA"}
        history_dicts = [{"role": m.role, "content": m.content} for m in (request.history or [])]
        
        reply = FinancialCopilot.answer(
            user_message=request.message,
            current_context=context,
            chat_history=history_dicts
        )
        return {
            "response": reply,
            "symbol": context["symbol"],
            "status": "success"
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Chatbot failed: {str(e)}")


@app.get("/api/news/{ticker}")
async def get_stock_news(ticker: str):
    """
    Fetch live financial news headlines and AI sentiment polarity.
    """
    try:
        return fetch_live_news(ticker)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch news: {str(e)}")


@app.get("/api/screener")
async def get_market_screener():
    """
    Scan top global assets with ML prediction & technical scores for screener and heatmap.
    """
    try:
        return run_market_screener()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run screener: {str(e)}")


# Mount static assets if the folder exists
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

    @app.get("/")
    async def serve_index():
        index_path = STATIC_DIR / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path))
        return {"message": "AI Stock Predictor API Running. Frontend index.html not found."}
