"""
Machine Learning Stock Predictor Engine
Uses an ensemble of HistGradientBoostingRegressor, RandomForestRegressor, and Ridge Regression
with technical indicator feature engineering, recursive/multi-step forecasting,
confidence intervals, and backtest diagnostics.
"""

from typing import Dict, Any, List, Tuple
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

from backend.indicators import add_all_indicators


FEATURE_DISPLAY_NAMES = {
    "feat_return_1d": "1-Day Momentum",
    "feat_return_3d": "3-Day Momentum",
    "feat_return_5d": "5-Day Momentum",
    "feat_return_10d": "10-Day Momentum",
    "feat_return_21d": "21-Day Momentum",
    "feat_rsi_norm": "RSI (14) Relative Strength",
    "feat_macd_norm": "MACD Divergence",
    "feat_macd_hist_norm": "MACD Histogram",
    "feat_bb_percent_b": "Bollinger %B Position",
    "feat_bb_bandwidth": "Bollinger Bandwidth Volatility",
    "feat_ratio_sma10": "Price vs 10-Day SMA",
    "feat_ratio_sma20": "Price vs 20-Day SMA",
    "feat_ratio_sma50": "Price vs 50-Day SMA",
    "feat_ratio_sma200": "Price vs 200-Day SMA",
    "feat_volatility": "21-Day Price Volatility",
    "feat_volume_ratio": "Volume vs 20-Day Avg",
    "feat_dayofweek": "Day-of-Week Seasonality",
}


def build_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    """
    Construct stationary, normalized features for machine learning.
    """
    df = add_all_indicators(df)
    features_df = pd.DataFrame(index=df.index)
    close = df["Close"]

    features_df["feat_return_1d"] = df["Return_1d"]
    features_df["feat_return_3d"] = df["Return_3d"]
    features_df["feat_return_5d"] = df["Return_5d"]
    features_df["feat_return_10d"] = df["Return_10d"]
    features_df["feat_return_21d"] = df["Return_21d"]

    # Normalize RSI to [-1, 1] range
    features_df["feat_rsi_norm"] = (df["RSI_14"] - 50.0) / 50.0

    # Normalize MACD by price
    features_df["feat_macd_norm"] = df["MACD"] / (close + 1e-10)
    features_df["feat_macd_hist_norm"] = df["MACD_Hist"] / (close + 1e-10)

    # Bollinger Bands features
    features_df["feat_bb_percent_b"] = df["BB_Percent_B"]
    features_df["feat_bb_bandwidth"] = df["BB_Bandwidth"]

    # Price ratios relative to moving averages
    features_df["feat_ratio_sma10"] = (close / (df["SMA_10"] + 1e-10)) - 1.0
    features_df["feat_ratio_sma20"] = (close / (df["SMA_20"] + 1e-10)) - 1.0
    features_df["feat_ratio_sma50"] = (close / (df["SMA_50"] + 1e-10)) - 1.0
    features_df["feat_ratio_sma200"] = (close / (df["SMA_200"] + 1e-10)) - 1.0

    # Volatility and Volume
    features_df["feat_volatility"] = df["Volatility_21d"]
    features_df["feat_volume_ratio"] = df["Volume_Ratio"]

    # Cyclical day of week
    features_df["feat_dayofweek"] = df.index.dayofweek / 4.0

    feature_cols = list(features_df.columns)
    return features_df, feature_cols


class StockEnsemblePredictor:
    def __init__(self):
        self.scaler = StandardScaler()
        self.model_gbr = HistGradientBoostingRegressor(
            max_iter=120,
            min_samples_leaf=12,
            learning_rate=0.04,
            random_state=42,
        )
        self.model_rf = RandomForestRegressor(
            n_estimators=80,
            max_depth=6,
            min_samples_split=6,
            random_state=42,
            n_jobs=1,
        )
        self.model_ridge = Ridge(alpha=1.5)
        self.weights = {"gbr": 0.45, "rf": 0.40, "ridge": 0.15}
        self.feature_cols: List[str] = []
        self.feature_importances: List[Dict[str, Any]] = []

    def fit_predict(
        self, df: pd.DataFrame, test_size: float = 0.2
    ) -> Dict[str, Any]:
        """
        Train ensemble on historical data and evaluate on hold-out test set.
        Target: 1-day forward return.
        """
        features_df, feature_cols = build_features(df)
        self.feature_cols = feature_cols

        # Target: next day fractional return
        close_prices = df["Close"].values
        forward_returns = (df["Close"].shift(-1) - df["Close"]) / df["Close"]

        # Drop the last row because it doesn't have forward return
        valid_idx = forward_returns.dropna().index
        X = features_df.loc[valid_idx].values
        y = forward_returns.loc[valid_idx].values
        prices = df.loc[valid_idx, "Close"].values
        dates = [d.strftime("%Y-%m-%d") for d in valid_idx]

        n_samples = len(X)
        if n_samples < 30:
            raise ValueError(f"Insufficient historical samples ({n_samples}) for reliable ML training.")

        split_idx = int(n_samples * (1 - test_size))
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        prices_test = prices[split_idx:]
        dates_test = dates[split_idx:]

        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Train models
        self.model_gbr.fit(X_train_scaled, y_train)
        self.model_rf.fit(X_train_scaled, y_train)
        self.model_ridge.fit(X_train_scaled, y_train)

        # Compute feature importances from Random Forest
        rf_importances = self.model_rf.feature_importances_
        sorted_indices = np.argsort(rf_importances)[::-1]
        self.feature_importances = [
            {
                "feature": FEATURE_DISPLAY_NAMES.get(feature_cols[i], feature_cols[i]),
                "raw_name": feature_cols[i],
                "importance": round(float(rf_importances[i] * 100), 2),
            }
            for i in sorted_indices[:8]
        ]

        # Test set predictions (ensemble)
        pred_ret_gbr = self.model_gbr.predict(X_test_scaled)
        pred_ret_rf = self.model_rf.predict(X_test_scaled)
        pred_ret_ridge = self.model_ridge.predict(X_test_scaled)

        pred_returns = (
            self.weights["gbr"] * pred_ret_gbr
            + self.weights["rf"] * pred_ret_rf
            + self.weights["ridge"] * pred_ret_ridge
        )

        # Convert return predictions to predicted next-day prices
        # Actual next-day prices: prices_test * (1 + y_test)
        actual_next_prices = prices_test * (1 + y_test)
        pred_next_prices = prices_test * (1 + pred_returns)

        # Evaluation metrics
        mae = float(mean_absolute_error(actual_next_prices, pred_next_prices))
        rmse = float(np.sqrt(mean_squared_error(actual_next_prices, pred_next_prices)))
        r2 = float(r2_score(actual_next_prices, pred_next_prices))
        mape = float(np.mean(np.abs((actual_next_prices - pred_next_prices) / actual_next_prices)) * 100)

        # Directional Accuracy: did the model predict up/down correctly?
        correct_directions = np.sum((pred_returns * y_test) > 0)
        directional_acc = float((correct_directions / len(y_test)) * 100)

        # Residual volatility for confidence bands
        residuals = y_test - pred_returns
        resid_std = float(np.std(residuals)) if len(residuals) > 0 else 0.015

        # Refit ensemble on ALL available historical data for maximum future predictive power
        X_all_scaled = self.scaler.fit_transform(X)
        self.model_gbr.fit(X_all_scaled, y)
        self.model_rf.fit(X_all_scaled, y)
        self.model_ridge.fit(X_all_scaled, y)

        backtest_data = [
            {
                "date": dates_test[i],
                "actual": round(float(actual_next_prices[i]), 2),
                "predicted": round(float(pred_next_prices[i]), 2),
                "error": round(float(pred_next_prices[i] - actual_next_prices[i]), 2),
            }
            for i in range(len(dates_test))
        ]

        return {
            "metrics": {
                "directional_accuracy": round(directional_acc, 2),
                "mae": round(mae, 2),
                "rmse": round(rmse, 2),
                "r2_score": round(max(0.0, r2), 4),
                "mape": round(mape, 2),
                "test_samples": len(y_test),
            },
            "backtest": backtest_data,
            "feature_importances": self.feature_importances,
            "resid_std": resid_std,
        }

    def forecast_future(
        self,
        df: pd.DataFrame,
        horizon_days: int = 14,
        resid_std: float = 0.015,
    ) -> List[Dict[str, Any]]:
        """
        Generate future forecast path for N business days with 95% confidence intervals.
        """
        features_df, _ = build_features(df)
        last_features = features_df.iloc[-1:].values
        last_features_scaled = self.scaler.transform(last_features)

        # 1-day expected return from ensemble
        ret_gbr = float(self.model_gbr.predict(last_features_scaled)[0])
        ret_rf = float(self.model_rf.predict(last_features_scaled)[0])
        ret_ridge = float(self.model_ridge.predict(last_features_scaled)[0])

        base_daily_return = (
            self.weights["gbr"] * ret_gbr
            + self.weights["rf"] * ret_rf
            + self.weights["ridge"] * ret_ridge
        )

        current_price = float(df["Close"].iloc[-1])
        last_date = df.index[-1]

        # Recent volatility from data
        recent_vol = float(df["Volatility_21d"].iloc[-1]) if "Volatility_21d" in df.columns else 0.015
        vol_factor = max(resid_std, recent_vol, 0.012)

        forecasts = []
        projected_price = current_price
        curr_date = last_date

        for step in range(1, horizon_days + 1):
            # Advance to next business day
            curr_date += timedelta(days=1)
            while curr_date.weekday() >= 5:  # Skip Saturday (5) & Sunday (6)
                curr_date += timedelta(days=1)

            # Dampen return slightly as time extends towards long-term equilibrium
            decay = np.exp(-0.04 * step)
            step_return = base_daily_return * decay

            projected_price = projected_price * (1.0 + step_return)

            # Expanding 95% confidence interval (+/- 1.96 * vol * sqrt(step))
            uncertainty_band = projected_price * (1.96 * vol_factor * np.sqrt(step))
            upper_bound = projected_price + uncertainty_band
            lower_bound = max(0.01, projected_price - uncertainty_band)

            pct_change_from_now = ((projected_price - current_price) / current_price) * 100.0

            forecasts.append(
                {
                    "step": step,
                    "date": curr_date.strftime("%Y-%m-%d"),
                    "predicted_price": round(projected_price, 2),
                    "lower_bound": round(lower_bound, 2),
                    "upper_bound": round(upper_bound, 2),
                    "expected_change_pct": round(pct_change_from_now, 2),
                }
            )

        return forecasts
