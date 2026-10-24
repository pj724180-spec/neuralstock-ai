"""
Recommendation & Trading Intelligence Engine
Synthesizes technical analysis indicators and AI machine learning forecasts
into actionable trading signals, sentiment scores, and price targets.
"""

from typing import Dict, Any, List
import pandas as pd


def generate_recommendation(
    df: pd.DataFrame,
    forecasts: List[Dict[str, Any]],
    metrics: Dict[str, Any],
    support_resistance: Dict[str, float],
) -> Dict[str, Any]:
    """
    Synthesize all analytical signals into a single trading recommendation report.
    """
    current_price = float(df["Close"].iloc[-1])
    rsi = float(df["RSI_14"].iloc[-1]) if "RSI_14" in df.columns else 50.0
    macd = float(df["MACD"].iloc[-1]) if "MACD" in df.columns else 0.0
    macd_signal = float(df["MACD_Signal"].iloc[-1]) if "MACD_Signal" in df.columns else 0.0
    macd_hist = float(df["MACD_Hist"].iloc[-1]) if "MACD_Hist" in df.columns else 0.0
    sma_20 = float(df["SMA_20"].iloc[-1]) if "SMA_20" in df.columns else current_price
    sma_50 = float(df["SMA_50"].iloc[-1]) if "SMA_50" in df.columns else current_price
    sma_200 = float(df["SMA_200"].iloc[-1]) if "SMA_200" in df.columns else current_price
    bb_upper = float(df["BB_Upper"].iloc[-1]) if "BB_Upper" in df.columns else current_price * 1.05
    bb_lower = float(df["BB_Lower"].iloc[-1]) if "BB_Lower" in df.columns else current_price * 0.95
    volatility = float(df["Volatility_21d"].iloc[-1]) if "Volatility_21d" in df.columns else 0.015

    # Forecast projected returns
    next_day_forecast = forecasts[0] if forecasts else {}
    next_day_change = next_day_forecast.get("expected_change_pct", 0.0)

    # 7-day or last available forecast
    horizon_forecast = forecasts[min(6, len(forecasts) - 1)] if forecasts else {}
    horizon_change = horizon_forecast.get("expected_change_pct", 0.0)

    # Scoring algorithm: accumulate points from -100 to +100
    score = 0
    reasons = []
    signals = []

    # 1. AI Forecast Contribution (up to +/- 35 points)
    if horizon_change > 3.0:
        score += 35
        reasons.append(f"AI ensemble model projects strong upside of +{horizon_change:.1f}% over the forecast horizon.")
        signals.append({"name": "AI Ensemble Forecast", "status": "Strongly Bullish", "type": "bullish"})
    elif horizon_change > 0.8:
        score += 20
        reasons.append(f"AI ensemble model indicates moderate upward trajectory (+{horizon_change:.1f}%).")
        signals.append({"name": "AI Ensemble Forecast", "status": "Bullish", "type": "bullish"})
    elif horizon_change < -3.0:
        score -= 35
        reasons.append(f"AI ensemble model forecasts notable downward pressure (-{abs(horizon_change):.1f}%).")
        signals.append({"name": "AI Ensemble Forecast", "status": "Strongly Bearish", "type": "bearish"})
    elif horizon_change < -0.8:
        score -= 20
        reasons.append(f"AI ensemble model anticipates slight softening (-{abs(horizon_change):.1f}%).")
        signals.append({"name": "AI Ensemble Forecast", "status": "Bearish", "type": "bearish"})
    else:
        score += 0
        reasons.append("AI ensemble model predicts neutral/range-bound consolidation.")
        signals.append({"name": "AI Ensemble Forecast", "status": "Neutral", "type": "neutral"})

    # 2. RSI Momentum (up to +/- 20 points)
    if rsi < 30:
        score += 20
        reasons.append(f"RSI is oversold at {rsi:.1f}, signaling potential mean-reversion rebound.")
        signals.append({"name": "RSI (14)", "status": f"Oversold ({rsi:.1f})", "type": "bullish"})
    elif rsi > 70:
        score -= 20
        reasons.append(f"RSI is overbought at {rsi:.1f}, indicating elevated risk of pullback.")
        signals.append({"name": "RSI (14)", "status": f"Overbought ({rsi:.1f})", "type": "bearish"})
    elif 45 <= rsi <= 60:
        score += 10
        reasons.append(f"RSI is in healthy accumulation territory at {rsi:.1f}.")
        signals.append({"name": "RSI (14)", "status": f"Healthy Momentum ({rsi:.1f})", "type": "bullish"})
    else:
        signals.append({"name": "RSI (14)", "status": f"Neutral ({rsi:.1f})", "type": "neutral"})

    # 3. Moving Average Trend Alignment (up to +/- 25 points)
    ma_bullish = current_price > sma_50 and sma_50 > sma_200
    ma_bearish = current_price < sma_50 and sma_50 < sma_200

    if ma_bullish:
        score += 25
        reasons.append("Price is trading above key 50-day and 200-day moving averages (Golden trend structure).")
        signals.append({"name": "Trend Structure", "status": "Bullish Trend (Above 50/200 SMA)", "type": "bullish"})
    elif ma_bearish:
        score -= 25
        reasons.append("Price is below 50-day and 200-day moving averages (Death trend structure).")
        signals.append({"name": "Trend Structure", "status": "Bearish Trend (Below 50/200 SMA)", "type": "bearish"})
    elif current_price > sma_20:
        score += 10
        reasons.append("Short-term momentum is positive with price holding above 20-day SMA.")
        signals.append({"name": "Short-term Trend", "status": "Above 20-day SMA", "type": "bullish"})
    else:
        score -= 10
        reasons.append("Short-term momentum is subdued below 20-day SMA.")
        signals.append({"name": "Short-term Trend", "status": "Below 20-day SMA", "type": "bearish"})

    # 4. MACD Momentum (up to +/- 20 points)
    if macd_hist > 0 and macd > macd_signal:
        score += 20
        reasons.append("MACD histogram is positive with bullish crossover intact.")
        signals.append({"name": "MACD", "status": "Bullish Crossover", "type": "bullish"})
    elif macd_hist < 0 and macd < macd_signal:
        score -= 20
        reasons.append("MACD histogram is negative indicating ongoing bearish momentum.")
        signals.append({"name": "MACD", "status": "Bearish Crossover", "type": "bearish"})
    else:
        signals.append({"name": "MACD", "status": "Neutral / Converging", "type": "neutral"})

    # Map score (-100 to +100) into 0-100 Bullish Sentiment Meter
    bullish_sentiment = int(round(max(0, min(100, (score + 100) / 2))))

    # Categorize final recommendation
    if bullish_sentiment >= 75:
        recommendation = "STRONG BUY"
        color = "#10B981"  # Emerald
    elif bullish_sentiment >= 58:
        recommendation = "BUY"
        color = "#34D399"  # Light green
    elif bullish_sentiment <= 25:
        recommendation = "STRONG SELL"
        color = "#EF4444"  # Crimson
    elif bullish_sentiment <= 42:
        recommendation = "SELL"
        color = "#F87171"  # Light red
    else:
        recommendation = "HOLD"
        color = "#FBBF24"  # Amber

    # Stop Loss & Take Profit suggestions
    atr_val = float(df["ATR_14"].iloc[-1]) if "ATR_14" in df.columns else current_price * 0.02
    stop_loss = round(max(0.01, current_price - (2.0 * atr_val)), 2)
    take_profit = round(current_price + (2.5 * atr_val), 2)

    return {
        "rating": recommendation,
        "rating_color": color,
        "sentiment_score": bullish_sentiment,  # 0 to 100
        "sentiment_label": "Bullish" if bullish_sentiment >= 55 else ("Bearish" if bullish_sentiment <= 45 else "Neutral"),
        "key_reasons": reasons[:4],
        "signals": signals,
        "risk_levels": {
            "stop_loss_suggested": stop_loss,
            "take_profit_suggested": take_profit,
            "support": support_resistance.get("support_1", round(current_price * 0.95, 2)),
            "resistance": support_resistance.get("resistance_1", round(current_price * 1.05, 2)),
            "current_price": round(current_price, 2),
            "volatility_daily": round(volatility * 100, 2),
        },
    }
