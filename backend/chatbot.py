"""
AI Financial Chatbot & Copilot Engine
Provides live conversational financial analysis, context-aware stock intelligence,
technical indicator interpretation, and optional integration with Gemini/OpenAI LLMs.
"""

import os
import re
import json
from typing import Dict, Any, List, Optional
import requests

from backend.data_service import fetch_stock_history, fetch_company_info, POPULAR_TICKERS
from backend.indicators import add_all_indicators, calculate_support_resistance
from backend.predictor import StockEnsemblePredictor
from backend.recommendation import generate_recommendation


SYSTEM_PERSONA = (
    "You are NeuralStock Copilot, an elite quantitative finance and algorithmic market analyst. "
    "You provide clear, objective, data-driven insights on equities, technical indicators, "
    "machine learning price projections, risk management (stop-loss / take-profit), and market trends. "
    "Always maintain a professional, sharp, yet accessible tone with structured markdown formatting."
)


def extract_mentioned_ticker(message: str) -> Optional[str]:
    """Extract stock ticker mentioned in the prompt."""
    # Look for known tickers or uppercase words of 1-5 letters
    words = re.findall(r"\b[A-Za-z0-9\.\-=]{1,12}\b", message)
    popular_symbols = [p["symbol"].upper() for p in POPULAR_TICKERS]
    popular_names = {p["name"].upper(): p["symbol"] for p in POPULAR_TICKERS}

    msg_upper = message.upper()
    for name, sym in popular_names.items():
        if name in msg_upper:
            return sym

    # Check for direct symbol matches
    for w in words:
        w_up = w.upper()
        if w_up in popular_symbols:
            return w_up

    # Check for words prefixed with $
    cash_tag = re.search(r"\$([A-Za-z]{1,6})", message)
    if cash_tag:
        return cash_tag.group(1).upper()

    return None


def get_live_ticker_summary(symbol: str) -> Dict[str, Any]:
    """Fetch live data, indicators, and predictions for a ticker."""
    hist = fetch_stock_history(symbol, period="6mo")
    df = hist["df"]
    df_enriched = add_all_indicators(df)
    sr = calculate_support_resistance(df_enriched)
    company = fetch_company_info(symbol)

    predictor = StockEnsemblePredictor()
    fit_res = predictor.fit_predict(df_enriched, test_size=0.2)
    forecasts = predictor.forecast_future(df_enriched, horizon_days=14, resid_std=fit_res["resid_std"])
    rec = generate_recommendation(df_enriched, forecasts, fit_res["metrics"], sr)

    current_price = float(df["Close"].iloc[-1])
    rsi = float(df_enriched["RSI_14"].iloc[-1])
    macd_hist = float(df_enriched["MACD_Hist"].iloc[-1])
    sma_50 = float(df_enriched["SMA_50"].iloc[-1])

    return {
        "symbol": symbol,
        "company": company,
        "current_price": round(current_price, 2),
        "rsi": round(rsi, 2),
        "macd_hist": round(macd_hist, 2),
        "sma_50": round(sma_50, 2),
        "recommendation": rec,
        "forecast_1d": forecasts[0] if forecasts else {},
        "forecast_14d": forecasts[-1] if forecasts else {},
        "metrics": fit_res["metrics"],
        "support_res": sr,
    }


def call_gemini_api(api_key: str, prompt: str, context_str: str) -> Optional[str]:
    """Invoke Google Gemini API if user has configured an API key."""
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{SYSTEM_PERSONA}\n\nCurrent Real-Time Market Context:\n{context_str}\n\nUser Question:\n{prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 800,
            }
        }
        resp = requests.post(url, json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "")
    except Exception as e:
        print(f"[Chatbot] Gemini call error: {e}")
    return None


def call_openai_api(api_key: str, messages: List[Dict[str, str]], context_str: str) -> Optional[str]:
    """Invoke OpenAI API if user has configured an API key."""
    try:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        formatted_messages = [
            {"role": "system", "content": f"{SYSTEM_PERSONA}\n\nCurrent Real-Time Market Context:\n{context_str}"}
        ]
        for m in messages[-5:]:
            formatted_messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})

        payload = {
            "model": "gpt-4o-mini",
            "messages": formatted_messages,
            "temperature": 0.3,
            "max_tokens": 800,
        }
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            choices = data.get("choices", [])
            if choices:
                return choices[0].get("message", {}).get("content", "")
    except Exception as e:
        print(f"[Chatbot] OpenAI call error: {e}")
    return None


class FinancialCopilot:
    """
    Intelligent built-in quantitative financial reasoning engine.
    Delivers deep analytical insights and answers questions regarding
    market conditions, ML models, price targets, risk management, and indicators.
    """

    @classmethod
    def answer(
        cls,
        user_message: str,
        current_context: Optional[Dict[str, Any]] = None,
        chat_history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        msg = user_message.lower().strip()
        api_key_gemini = os.getenv("GEMINI_API_KEY")
        api_key_openai = os.getenv("OPENAI_API_KEY")

        # Determine target symbol: check if user mentioned a specific ticker, else use current context ticker
        mentioned_ticker = extract_mentioned_ticker(user_message)
        active_symbol = mentioned_ticker or (current_context.get("symbol") if current_context else "NVDA")

        # Gather real-time data for the active symbol
        try:
            stock_info = get_live_ticker_summary(active_symbol)
        except Exception as e:
            stock_info = None

        # Build context summary string
        context_str = ""
        if stock_info:
            rec = stock_info["recommendation"]
            sr = stock_info["support_res"]
            f1 = stock_info["forecast_1d"]
            f14 = stock_info["forecast_14d"]
            context_str = (
                f"Active Ticker: {stock_info['symbol']} ({stock_info['company'].get('name', '')})\n"
                f"Current Price: ${stock_info['current_price']}\n"
                f"AI Consensus Rating: {rec.get('rating')} ({rec.get('sentiment_score')}% Bullish)\n"
                f"RSI (14): {stock_info['rsi']} | MACD Hist: {stock_info['macd_hist']} | 50 SMA: ${stock_info['sma_50']}\n"
                f"Next Day Target: ${f1.get('predicted_price')} ({f1.get('expected_change_pct')}%\n"
                f"14-Day Target: ${f14.get('predicted_price')} ({f14.get('expected_change_pct')}%\n"
                f"Support 1: ${sr.get('support_1')} | Resistance 1: ${sr.get('resistance_1')}\n"
                f"Suggested Stop Loss: ${rec.get('risk_levels', {}).get('stop_loss_suggested')} | "
                f"Take Profit: ${rec.get('risk_levels', {}).get('take_profit_suggested')}\n"
            )

        # If user configured external LLM API key, invoke it
        if api_key_gemini:
            resp = call_gemini_api(api_key_gemini, user_message, context_str)
            if resp:
                return resp
        elif api_key_openai:
            resp = call_openai_api(api_key_openai, chat_history or [{"role": "user", "content": user_message}], context_str)
            if resp:
                return resp

        # Fallback to Built-in Financial Analyst Brain
        return cls._generate_expert_response(msg, user_message, stock_info, active_symbol)

    @classmethod
    def _generate_expert_response(
        cls,
        msg: str,
        raw_msg: str,
        stock_info: Optional[Dict[str, Any]],
        symbol: str,
    ) -> str:
        # Check if asking to compare two stocks
        tickers = re.findall(r"\b[A-Z]{2,6}\b", raw_msg)
        if len(tickers) >= 2 and ("compare" in msg or "vs" in msg or "or" in msg or "better" in msg):
            return cls._handle_comparison(tickers[0], tickers[1])

        if not stock_info:
            return (
                f"I'm currently unable to retrieve live financial data for **{symbol}**. "
                "Please verify the ticker symbol or try one of the popular assets like `NVDA`, `AAPL`, `TSLA`, or `BTC-USD`."
            )

        sym = stock_info["symbol"]
        price = stock_info["current_price"]
        rec = stock_info["recommendation"]
        rating = rec.get("rating", "HOLD")
        sentiment = rec.get("sentiment_score", 50)
        risk = rec.get("risk_levels", {})
        f1 = stock_info["forecast_1d"]
        f14 = stock_info["forecast_14d"]
        sr = stock_info["support_res"]
        rsi = stock_info["rsi"]
        macd_hist = stock_info["macd_hist"]

        # 1. Buy / Sell / Recommendation Question
        if any(w in msg for w in ["buy", "sell", "hold", "should i", "invest", "recommend", "rating", "verdict"]):
            reasons_bullet = "\n".join([f"- {r}" for r in rec.get("key_reasons", [])])
            return (
                f"### 🎯 AI Consensus Rating for **{sym}**: `{rating}`\n\n"
                f"**Current Price**: `${price}` &middot; **Bullish Sentiment Score**: `{sentiment}%`\n\n"
                f"**Key Algorithmic Rationale**:\n{reasons_bullet}\n\n"
                f"**Strategic Takeaway**:\n"
                f"- **Projected 14-Day Trajectory**: Target of **`${f14.get('predicted_price')}`** "
                f"({f14.get('expected_change_pct'):+0.2f}% expected return).\n"
                f"- **Risk Guardrails**: Place a defensive stop-loss near **`${risk.get('stop_loss_suggested')}`** "
                f"and aim for initial take-profit around **`${risk.get('take_profit_suggested')}`**.\n\n"
                f"> *Note: Algorithmic model projection based on ensemble gradient boosting & random forest backtesting.*"
            )

        # 2. Target / Forecast / Future Question
        if any(w in msg for w in ["target", "forecast", "predict", "future", "going", "projection", "will it", "price in"]):
            return (
                f"### 📈 AI Multi-Horizon Forecast for **{sym}**\n\n"
                f"The ensemble machine learning model has computed the following projections:\n\n"
                f"| Horizon | Target Price | Expected Move | 95% Confidence Range |\n"
                f"| :--- | :--- | :--- | :--- |\n"
                f"| **Next Day** | **`${f1.get('predicted_price')}`** | `{f1.get('expected_change_pct'):+0.2f}%` | `${f1.get('lower_bound')}` &ndash; `${f1.get('upper_bound')}` |\n"
                f"| **14 Days** | **`${f14.get('predicted_price')}`** | `{f14.get('expected_change_pct'):+0.2f}%` | `${f14.get('lower_bound')}` &ndash; `${f14.get('upper_bound')}` |\n\n"
                f"**Forecast Dynamics**:\n"
                f"- **Directional Accuracy**: The model achieved **`{stock_info['metrics']['directional_accuracy']}%`** on the recent test split.\n"
                f"- **Top Driving Feature**: `{stock_info['metrics'].get('test_samples')} test trading sessions analyzed`.\n"
                f"- **Confidence Cone**: Uncertainty widens as horizon extends, reflecting potential volatility shocks."
            )

        # 3. Stop-Loss, Support, Resistance, Risk
        if any(w in msg for w in ["stop loss", "support", "resistance", "risk", "level", "take profit", "floor", "ceiling"]):
            return (
                f"### 🛡️ Risk Management & Key Price Levels for **{sym}**\n\n"
                f"- **Current Price**: `${price}`\n"
                f"- **Immediate Support (Floor)**: **`${sr.get('support_1')}`** (20-day swing low & pivot)\n"
                f"- **Key Resistance (Ceiling)**: **`${sr.get('resistance_1')}`** (20-day high supply zone)\n"
                f"- **Calculated Pivot Point**: `${sr.get('pivot_point')}`\n\n"
                f"**Suggested Execution Parameters**:\n"
                f"- **Stop-Loss Level**: **`${risk.get('stop_loss_suggested')}`** (calculated via 2.0x ATR to give room for market noise).\n"
                f"- **Take-Profit Target**: **`${risk.get('take_profit_suggested')}`** (2.5x ATR reward ratio).\n"
                f"- **Risk-Reward Ratio**: Approximately `1 : 1.25` based on daily volatility."
            )

        # 4. Technical Indicators (RSI, MACD, Bollinger Bands, Moving Averages)
        if any(w in msg for w in ["rsi", "macd", "bollinger", "indicator", "technical", "sma", "moving average"]):
            rsi_status = "Oversold (Rebound likely)" if rsi < 30 else ("Overbought (Pullback risk)" if rsi > 70 else "Neutral Accumulation")
            macd_status = "Bullish momentum (Histogram positive)" if macd_hist > 0 else "Bearish momentum (Histogram negative)"
            trend_status = "Trading above 50-day SMA (Upward structural bias)" if price > stock_info["sma_50"] else "Trading below 50-day SMA (Downward pressure)"

            return (
                f"### 📊 Technical Indicator Deep-Dive for **{sym}**\n\n"
                f"1. **RSI (14-Period)**: **`{rsi}`** &mdash; *{rsi_status}*\n"
                f"   - Standard readings: `<30` oversold, `>70` overbought. Current value indicates balanced momentum.\n\n"
                f"2. **MACD Divergence**: **`{macd_hist}`** &mdash; *{macd_status}*\n"
                f"   - Gauges acceleration between short-term (12) and long-term (26) exponential moving averages.\n\n"
                f"3. **50-Day Moving Average**: **`${stock_info['sma_50']}`** &mdash; *{trend_status}*\n\n"
                f"4. **Volatility Structure**: 21-day annualized volatility is running at approximately `{risk.get('volatility_daily', 1.5)}%` per session."
            )

        # 5. General summary / Analysis
        return (
            f"### ⚡ Market Intelligence Brief for **{sym}**\n\n"
            f"- **Asset**: {stock_info['company'].get('name', sym)} (`{sym}`)\n"
            f"- **Current Quote**: **`${price}`**\n"
            f"- **AI Rating**: `{rating}` ({sentiment}% Bullish sentiment)\n"
            f"- **14-Day Model Target**: **`${f14.get('predicted_price')}`** ({f14.get('expected_change_pct'):+0.2f}%)\n"
            f"- **Key Support**: `${sr.get('support_1')}` | **Resistance**: `${sr.get('resistance_1')}`\n\n"
            f"You can ask me specific questions like:\n"
            f"- *\"Where should I set my stop loss?\"*\n"
            f"- *\"Explain what the RSI is indicating\"*\n"
            f"- *\"Compare {sym} vs TSLA\"*\n"
            f"- *\"What is the model's accuracy on {sym}?\"*"
        )

    @classmethod
    def _handle_comparison(cls, sym1: str, sym2: str) -> str:
        """Compare two stocks side by side."""
        try:
            info1 = get_live_ticker_summary(sym1)
            info2 = get_live_ticker_summary(sym2)
        except Exception:
            return f"I tried analyzing both **{sym1}** and **{sym2}**, but encountered an issue retrieving one of the data feeds. Please try searching each individual ticker."

        rec1 = info1["recommendation"]
        rec2 = info2["recommendation"]

        winner = sym1 if rec1.get("sentiment_score", 0) >= rec2.get("sentiment_score", 0) else sym2

        return (
            f"### ⚖️ Head-to-Head Comparison: **{sym1}** vs **{sym2}**\n\n"
            f"| Metric | **{sym1}** | **{sym2}** |\n"
            f"| :--- | :--- | :--- |\n"
            f"| **Current Price** | `${info1['current_price']}` | `${info2['current_price']}` |\n"
            f"| **AI Recommendation** | `{rec1.get('rating')}` | `{rec2.get('rating')}` |\n"
            f"| **Bullish Sentiment** | `{rec1.get('sentiment_score')}%` | `{rec2.get('sentiment_score')}%` |\n"
            f"| **14-Day Expected Return** | `{info1['forecast_14d'].get('expected_change_pct'):+0.2f}%` | `{info2['forecast_14d'].get('expected_change_pct'):+0.2f}%` |\n"
            f"| **RSI (14)** | `{info1['rsi']}` | `{info2['rsi']}` |\n"
            f"| **Model Directional Acc.** | `{info1['metrics']['directional_accuracy']}%` | `{info2['metrics']['directional_accuracy']}%` |\n\n"
            f"**Algorithmic Edge**: **{winner}** holds the stronger quantitative setup right now based on ensemble return projections and momentum alignment."
        )
