"""
Technical Indicators Calculation Engine
Computes standard financial indicators for technical analysis and machine learning features.
"""

from typing import Dict, Any
import numpy as np
import pandas as pd


def calculate_sma(series: pd.Series, window: int) -> pd.Series:
    """Calculate Simple Moving Average."""
    return series.rolling(window=window, min_periods=1).mean()


def calculate_ema(series: pd.Series, span: int) -> pd.Series:
    """Calculate Exponential Moving Average."""
    return series.ewm(span=span, adjust=False).mean()


def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Calculate Relative Strength Index (RSI)."""
    delta = series.diff()
    gain = (delta.where(delta > 0, 0.0)).copy()
    loss = (-delta.where(delta < 0, 0.0)).copy()

    # Wilder's Exponential Smoothing
    avg_gain = gain.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()

    rs = avg_gain / (avg_loss + 1e-10)
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return rsi.bfill().fillna(50.0)


def calculate_macd(
    series: pd.Series,
    fast: int = 12,
    slow: int = 26,
    signal: int = 9,
) -> Dict[str, pd.Series]:
    """Calculate Moving Average Convergence Divergence (MACD)."""
    ema_fast = calculate_ema(series, span=fast)
    ema_slow = calculate_ema(series, span=slow)
    macd_line = ema_fast - ema_slow
    signal_line = calculate_ema(macd_line, span=signal)
    histogram = macd_line - signal_line

    return {
        "macd": macd_line,
        "macd_signal": signal_line,
        "macd_hist": histogram,
    }


def calculate_bollinger_bands(
    series: pd.Series, window: int = 20, num_std: float = 2.0
) -> Dict[str, pd.Series]:
    """Calculate Bollinger Bands (Upper, Middle, Lower, Bandwidth, %B)."""
    middle = calculate_sma(series, window=window)
    std = series.rolling(window=window, min_periods=1).std().fillna(0.0)
    upper = middle + (std * num_std)
    lower = middle - (std * num_std)

    bandwidth = (upper - lower) / (middle + 1e-10)
    percent_b = (series - lower) / ((upper - lower) + 1e-10)

    return {
        "bb_middle": middle,
        "bb_upper": upper,
        "bb_lower": lower,
        "bb_bandwidth": bandwidth,
        "bb_percent_b": percent_b,
    }


def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Calculate Average True Range (ATR)."""
    high = df["High"]
    low = df["Low"]
    close = df["Close"]

    prev_close = close.shift(1)
    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()

    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    return atr.bfill().fillna(0.0)


def add_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Enrich historical price dataframe with a comprehensive set of technical indicators.
    Assumes standard columns: 'Open', 'High', 'Low', 'Close', 'Volume'.
    """
    df = df.copy()
    close = df["Close"]

    # Moving Averages
    df["SMA_10"] = calculate_sma(close, 10)
    df["SMA_20"] = calculate_sma(close, 20)
    df["SMA_50"] = calculate_sma(close, 50)
    df["SMA_200"] = calculate_sma(close, 200)

    df["EMA_12"] = calculate_ema(close, 12)
    df["EMA_26"] = calculate_ema(close, 26)
    df["EMA_50"] = calculate_ema(close, 50)

    # Momentum / RSI
    df["RSI_14"] = calculate_rsi(close, 14)

    # MACD
    macd_data = calculate_macd(close)
    df["MACD"] = macd_data["macd"]
    df["MACD_Signal"] = macd_data["macd_signal"]
    df["MACD_Hist"] = macd_data["macd_hist"]

    # Bollinger Bands
    bb = calculate_bollinger_bands(close)
    df["BB_Upper"] = bb["bb_upper"]
    df["BB_Middle"] = bb["bb_middle"]
    df["BB_Lower"] = bb["bb_lower"]
    df["BB_Bandwidth"] = bb["bb_bandwidth"]
    df["BB_Percent_B"] = bb["bb_percent_b"]

    # Volatility / ATR
    df["ATR_14"] = calculate_atr(df, 14)

    # Price Returns
    df["Return_1d"] = close.pct_change(1).fillna(0.0)
    df["Return_3d"] = close.pct_change(3).fillna(0.0)
    df["Return_5d"] = close.pct_change(5).fillna(0.0)
    df["Return_10d"] = close.pct_change(10).fillna(0.0)
    df["Return_21d"] = close.pct_change(21).fillna(0.0)

    # Rolling Volatility (21 days)
    df["Volatility_21d"] = (
        df["Return_1d"].rolling(window=21, min_periods=5).std().fillna(0.0)
    )

    # Volume Analysis
    if "Volume" in df.columns:
        df["Volume_SMA_20"] = calculate_sma(df["Volume"], 20)
        df["Volume_Ratio"] = df["Volume"] / (df["Volume_SMA_20"] + 1e-10)
    else:
        df["Volume_SMA_20"] = 0
        df["Volume_Ratio"] = 1.0

    # Fill any remaining NaNs gracefully
    df = df.bfill().ffill().fillna(0.0)

    return df


def calculate_support_resistance(df: pd.DataFrame, window: int = 20) -> Dict[str, float]:
    """Calculate key support and resistance levels from recent price action."""
    recent = df.tail(window)
    current_price = float(df["Close"].iloc[-1])

    # Recent highs and lows
    resistance_1 = float(recent["High"].max())
    support_1 = float(recent["Low"].min())

    # Classical pivot point
    last_high = float(df["High"].iloc[-1])
    last_low = float(df["Low"].iloc[-1])
    last_close = current_price
    pivot = (last_high + last_low + last_close) / 3.0

    r1_pivot = (2 * pivot) - last_low
    s1_pivot = (2 * pivot) - last_high

    return {
        "current_price": round(current_price, 2),
        "pivot_point": round(pivot, 2),
        "resistance_1": round(max(resistance_1, r1_pivot), 2),
        "support_1": round(min(support_1, s1_pivot), 2),
        "recent_high_20d": round(resistance_1, 2),
        "recent_low_20d": round(support_1, 2),
    }
