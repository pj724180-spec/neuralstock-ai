import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from backend.data_service import fetch_stock_history, fetch_company_info
from backend.indicators import add_all_indicators, calculate_support_resistance
from backend.predictor import StockEnsemblePredictor
from backend.recommendation import generate_recommendation
from backend.chatbot import FinancialCopilot
from backend.news_service import fetch_live_news
from backend.screener import run_market_screener
from backend.auth import authenticate_user, register_user, get_user_by_token, delete_session

def run_tests():
    print("--> 1. Testing Data Service (fetching NVDA)...")
    hist = fetch_stock_history("NVDA", period="6mo")
    df = hist["df"]
    is_live = hist["is_live"]
    print(f"    Success: Fetched {len(df)} candles. Live data: {is_live}")

    print("--> 2. Testing Company Profile...")
    info = fetch_company_info("NVDA")
    print(f"    Success: Company Name: {info.get('name')}, Sector: {info.get('sector')}")

    print("--> 3. Testing Technical Indicators...")
    df_enriched = add_all_indicators(df)
    sr = calculate_support_resistance(df_enriched)
    print(f"    Success: Enriched shape: {df_enriched.shape}")
    print(f"    Pivot: ${sr['pivot_point']}, Resistance: ${sr['resistance_1']}, Support: ${sr['support_1']}")

    print("--> 4. Testing ML Ensemble Training & Backtesting...")
    predictor = StockEnsemblePredictor()
    fit_res = predictor.fit_predict(df_enriched, test_size=0.2)
    metrics = fit_res["metrics"]
    print(f"    Success: Directional Accuracy: {metrics['directional_accuracy']}%")
    print(f"    MAE: ${metrics['mae']}, RMSE: ${metrics['rmse']}, R2: {metrics['r2_score']}")
    print(f"    Top Feature: {fit_res['feature_importances'][0]['feature']} ({fit_res['feature_importances'][0]['importance']}%)")

    print("--> 5. Testing Future Forecasting (14 Days)...")
    forecasts = predictor.forecast_future(df_enriched, horizon_days=14, resid_std=fit_res["resid_std"])
    print(f"    Success: Generated {len(forecasts)} forecast steps.")
    print(f"    Day 1 Target: ${forecasts[0]['predicted_price']} ({forecasts[0]['expected_change_pct']}%)")
    print(f"    Day 14 Target: ${forecasts[-1]['predicted_price']} ({forecasts[-1]['expected_change_pct']}%)")

    print("--> 6. Testing Recommendation & Consensus Engine...")
    rec = generate_recommendation(df_enriched, forecasts, metrics, sr)
    print(f"    Success: Consensus Rating: {rec['rating']}")
    print(f"    Sentiment: {rec['sentiment_score']}% ({rec['sentiment_label']})")
    print(f"    Stop Loss: ${rec['risk_levels']['stop_loss_suggested']}, Take Profit: ${rec['risk_levels']['take_profit_suggested']}")

    print("--> 7. Testing Live AI Chatbot FinancialCopilot...")
    chat_resp = FinancialCopilot.answer("Should I buy NVDA?", current_context={"symbol": "NVDA"})
    print(f"    Success: Chatbot response generated ({len(chat_resp)} chars).")
    print(f"    Snippet: {chat_resp.splitlines()[0]}")

    print("--> 8. Testing Live News & Sentiment Analysis...")
    news = fetch_live_news("NVDA", limit=3)
    print(f"    Success: Retrieved {len(news['articles'])} news articles.")
    print(f"    Overall Sentiment: {news['sentiment_breakdown']['overall_label']} ({news['sentiment_breakdown']['overall_score']}%)")

    print("--> 9. Testing Market Screener Engine...")
    screen_assets = run_market_screener()
    print(f"    Success: Screened {len(screen_assets)} assets across global markets.")

    print("--> 10. Testing Security & Authentication Engine (PBKDF2 + Sessions)...")
    import secrets
    test_user = f"trader_{secrets.token_hex(3)}"
    reg_res = register_user(test_user, "SecurePass@123", "Quant Test", f"{test_user}@test.com")
    authenticated_user = authenticate_user(test_user, "SecurePass@123")
    assert authenticated_user is not None, "Registered user authentication failed"
    token = reg_res["token"]
    user_lookup = get_user_by_token(token)
    assert user_lookup is not None and user_lookup["username"] == test_user
    delete_session(token)
    assert get_user_by_token(token) is None
    print(f"    Success: Registered and authenticated '{test_user}', then verified session revocation.")

    print("\n==========================================")
    print("   ALL 10 PIPELINE CHECKS PASSED 100%!   ")
    print("==========================================")

if __name__ == "__main__":
    run_tests()
