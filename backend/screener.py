"""
AI Market Screener & Heatmap Engine
Scans and evaluates top assets using the machine learning ensemble and technical indicators.
"""

import time
from typing import Dict, Any, List
import pandas as pd

from backend.data_service import fetch_stock_history, fetch_company_info
from backend.indicators import add_all_indicators, calculate_support_resistance
from backend.predictor import StockEnsemblePredictor
from backend.recommendation import generate_recommendation

SCREENER_TICKERS = [
    "NVDA", "AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "META", "AMD", "BTC-USD", "RELIANCE.NS"
]

_SCREENER_CACHE: Dict[str, Any] = {"timestamp": 0, "data": []}
SCREENER_TTL = 300  # 5 minutes


def run_market_screener() -> List[Dict[str, Any]]:
    """
    Run algorithmic scan across key assets, returning structured metrics for screener & heatmap.
    """
    now = time.time()
    if _SCREENER_CACHE["data"] and (now - _SCREENER_CACHE["timestamp"] < SCREENER_TTL):
        return _SCREENER_CACHE["data"]

    results = []

    for sym in SCREENER_TICKERS:
        try:
            hist = fetch_stock_history(sym, period="3mo")
            df = hist["df"]
            if df.empty or len(df) < 15:
                continue

            df_enriched = add_all_indicators(df)
            company = fetch_company_info(sym)
            sr = calculate_support_resistance(df_enriched)

            current_price = float(df["Close"].iloc[-1])
            prev_price = float(df["Close"].iloc[-2]) if len(df) > 1 else current_price
            change = current_price - prev_price
            change_pct = ((current_price - prev_price) / prev_price) * 100

            rsi = float(df_enriched["RSI_14"].iloc[-1])
            volatility = float(df_enriched["Volatility_21d"].iloc[-1])

            # Quick predictor rollout
            predictor = StockEnsemblePredictor()
            fit_res = predictor.fit_predict(df_enriched, test_size=0.2)
            forecasts = predictor.forecast_future(df_enriched, horizon_days=14, resid_std=fit_res["resid_std"])
            rec = generate_recommendation(df_enriched, forecasts, fit_res["metrics"], sr)

            f14 = forecasts[-1] if forecasts else {}

            results.append({
                "symbol": sym,
                "name": company.get("name", sym),
                "sector": company.get("sector", "Tech"),
                "currency": company.get("currency", "USD"),
                "price": round(current_price, 2),
                "change": round(change, 2),
                "change_percent": round(change_pct, 2),
                "rating": rec.get("rating", "HOLD"),
                "rating_color": rec.get("rating_color", "#F59E0B"),
                "sentiment_score": rec.get("sentiment_score", 50),
                "rsi": round(rsi, 1),
                "target_14d": round(f14.get("predicted_price", current_price), 2),
                "expected_return_pct": round(f14.get("expected_change_pct", 0.0), 2),
                "directional_accuracy": fit_res["metrics"].get("directional_accuracy", 65.0),
            })
        except Exception as e:
            print(f"[Screener] Failed to screen {sym}: {e}")

    _SCREENER_CACHE["timestamp"] = now
    _SCREENER_CACHE["data"] = results
    return results
