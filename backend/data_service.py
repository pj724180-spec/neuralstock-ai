"""
Financial Data Service
Fetches live and historical price data via yfinance with in-memory caching and fallback synthetic generator.
"""

import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

try:
    import yfinance as yf
except ImportError:
    yf = None

# In-memory cache: key -> { 'timestamp': float, 'data': Any }
_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 300  # 5 minutes cache

POPULAR_TICKERS = [
    {"symbol": "NVDA", "name": "NVIDIA Corporation", "sector": "Technology", "category": "Tech Giants"},
    {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology", "category": "Tech Giants"},
    {"symbol": "TSLA", "name": "Tesla, Inc.", "sector": "Consumer Cyclical", "category": "EV / Auto"},
    {"symbol": "MSFT", "name": "Microsoft Corporation", "sector": "Technology", "category": "Tech Giants"},
    {"symbol": "GOOGL", "name": "Alphabet Inc.", "sector": "Communication Services", "category": "Tech Giants"},
    {"symbol": "AMZN", "name": "Amazon.com, Inc.", "sector": "Consumer Cyclical", "category": "E-Commerce"},
    {"symbol": "META", "name": "Meta Platforms, Inc.", "sector": "Communication Services", "category": "Social Media"},
    {"symbol": "AMD", "name": "Advanced Micro Devices", "sector": "Technology", "category": "Semiconductors"},
    {"symbol": "BTC-USD", "name": "Bitcoin USD", "sector": "Cryptocurrency", "category": "Crypto"},
    {"symbol": "ETH-USD", "name": "Ethereum USD", "sector": "Cryptocurrency", "category": "Crypto"},
    {"symbol": "SPY", "name": "SPDR S&P 500 ETF Trust", "sector": "ETF", "category": "Indices"},
    {"symbol": "QQQ", "name": "Invesco QQQ Trust", "sector": "ETF", "category": "Indices"},
    {"symbol": "RELIANCE.NS", "name": "Reliance Industries Ltd", "sector": "Energy", "category": "Indian Market"},
    {"symbol": "TCS.NS", "name": "Tata Consultancy Services", "sector": "Technology", "category": "Indian Market"},
    {"symbol": "INFY.NS", "name": "Infosys Limited", "sector": "Technology", "category": "Indian Market"},
]


def _get_from_cache(key: str) -> Optional[Any]:
    cached = _CACHE.get(key)
    if cached:
        if time.time() - cached["timestamp"] < CACHE_TTL_SECONDS:
            return cached["data"]
        else:
            del _CACHE[key]
    return None


def _set_cache(key: str, data: Any) -> None:
    _CACHE[key] = {
        "timestamp": time.time(),
        "data": data
    }


def generate_synthetic_data(symbol: str, period: str = "1y") -> pd.DataFrame:
    """
    Generate realistic geometric Brownian motion historical data if yfinance is unavailable or fails.
    """
    days_map = {"1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "2y": 730, "5y": 1825}
    num_days = days_map.get(period, 365)

    end_date = datetime.now()
    start_date = end_date - timedelta(days=num_days)
    dates = pd.date_range(start=start_date, end=end_date, freq="B")  # Business days
    n = len(dates)

    # Base price based on symbol hash for deterministic consistency
    hash_val = sum(ord(c) for c in symbol)
    base_price = 50.0 + (hash_val % 300)
    mu = 0.0005  # daily drift
    sigma = 0.018  # daily volatility

    np.random.seed(hash_val % 10000)
    returns = np.random.normal(mu, sigma, n)
    price_multipliers = np.cumprod(1 + returns)
    closes = base_price * price_multipliers

    highs = closes * (1 + np.random.uniform(0.002, 0.025, n))
    lows = closes * (1 - np.random.uniform(0.002, 0.025, n))
    opens = lows + (highs - lows) * np.random.uniform(0.2, 0.8, n)
    volumes = np.random.randint(1_000_000, 25_000_000, n).astype(float)

    df = pd.DataFrame(
        {
            "Open": opens,
            "High": highs,
            "Low": lows,
            "Close": closes,
            "Volume": volumes,
        },
        index=dates,
    )
    df.index.name = "Date"
    return df


def fetch_stock_history(symbol: str, period: str = "1y") -> Dict[str, Any]:
    """
    Fetch historical stock data for a given ticker symbol.
    Returns cleaned dataframe and metadata.
    """
    symbol = symbol.strip().upper()
    cache_key = f"hist_{symbol}_{period}"
    cached = _get_from_cache(cache_key)
    if cached is not None:
        return cached

    df = None
    is_live = False

    if yf is not None:
        try:
            ticker = yf.Ticker(symbol)
            raw_df = ticker.history(period=period, auto_adjust=True)
            if raw_df is not None and not raw_df.empty and len(raw_df) > 10:
                df = raw_df[["Open", "High", "Low", "Close", "Volume"]].copy()
                if hasattr(df.index, "tz_localize") and df.index.tz is not None:
                    df.index = df.index.tz_convert(None)
                df.index = pd.to_datetime(df.index)
                is_live = True
        except Exception as e:
            print(f"[DataService] yfinance fetch failed for {symbol}: {e}. Using fallback synthetic.")

    if df is None or df.empty or len(df) < 10:
        df = generate_synthetic_data(symbol, period=period)
        is_live = False

    result = {
        "df": df,
        "symbol": symbol,
        "period": period,
        "is_live": is_live,
    }

    _set_cache(cache_key, result)
    return result


def fetch_company_info(symbol: str) -> Dict[str, Any]:
    """
    Fetch company profile, market cap, and key metrics quickly using fast_info.
    Avoids slow network scrapes of ticker.info.
    """
    symbol = symbol.strip().upper()
    cache_key = f"info_{symbol}"
    cached = _get_from_cache(cache_key)
    if cached is not None:
        return cached

    matched = next((p for p in POPULAR_TICKERS if p["symbol"] == symbol), None)
    company_name = matched["name"] if matched else f"{symbol} Inc."
    sector = matched["sector"] if matched else "Global Markets"

    info_dict = {
        "symbol": symbol,
        "name": company_name,
        "sector": sector,
        "industry": "Capital Markets",
        "currency": "USD" if not symbol.endswith(".NS") else "INR",
        "exchange": "NASDAQ" if not symbol.endswith(".NS") else "NSE",
        "market_cap": 1_200_000_000_000,
        "pe_ratio": 32.5,
        "fifty_two_week_high": None,
        "fifty_two_week_low": None,
        "regular_market_price": None,
        "beta": 1.25,
    }

    if yf is not None:
        try:
            ticker = yf.Ticker(symbol)
            fi = getattr(ticker, "fast_info", None)
            if fi:
                info_dict["currency"] = getattr(fi, "currency", info_dict["currency"])
                info_dict["exchange"] = getattr(fi, "exchange", info_dict["exchange"])
                info_dict["market_cap"] = getattr(fi, "market_cap", info_dict["market_cap"])
                info_dict["fifty_two_week_high"] = getattr(fi, "year_high", None)
                info_dict["fifty_two_week_low"] = getattr(fi, "year_low", None)
                info_dict["regular_market_price"] = getattr(fi, "last_price", None)
        except Exception as e:
            print(f"[DataService] fast_info lookup note for {symbol}: {e}")

    _set_cache(cache_key, info_dict)
    return info_dict


def search_tickers(query: str) -> List[Dict[str, str]]:
    """
    Search matching popular tickers or format custom ticker.
    """
    query = query.strip().upper()
    if not query:
        return POPULAR_TICKERS[:8]

    matches = [
        item for item in POPULAR_TICKERS
        if query in item["symbol"] or query in item["name"].upper()
    ]

    # If user types a specific symbol not in popular list, offer it as primary option
    if not any(item["symbol"] == query for item in matches):
        matches.insert(0, {
            "symbol": query,
            "name": f"{query} Asset",
            "sector": "Market Equities",
            "category": "Custom Search"
        })

    return matches[:10]
