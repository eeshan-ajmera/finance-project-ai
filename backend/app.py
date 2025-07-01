from flask import Flask, request, jsonify
from flask_cors import CORS
import yfinance as yf
import datetime
import traceback
import logging

from stock_colab import run_full_pipeline

app = Flask(__name__)
CORS(app)

# Constants
MODEL_PATH = "stock_model.keras"
WINDOW_SIZE = 60
PREDICTION_DAYS = 1

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("backend.log"),
        logging.StreamHandler()
    ]
)

def get_stock_symbol(name_or_symbol: str) -> str:
    """
    Try to interpret input as symbol.
    If invalid, try to search ticker by company name.
    Returns uppercase symbol or raises Exception if not found.
    """
    name_or_symbol = name_or_symbol.strip().upper()
    
    # Try direct symbol lookup first
    try:
        ticker = yf.Ticker(name_or_symbol)
        hist = ticker.history(period="1d")
        if not hist.empty:
            logging.info(f"Symbol resolved directly: {name_or_symbol}")
            return name_or_symbol
    except Exception as e:
        logging.warning(f"Direct symbol lookup failed for {name_or_symbol}: {e}")

    # If direct lookup fails, try common mappings
    common_mappings = {
        'APPLE': 'AAPL',
        'GOOGLE': 'GOOGL',
        'MICROSOFT': 'MSFT',
        'AMAZON': 'AMZN',
        'TESLA': 'TSLA',
        'META': 'META',
        'NETFLIX': 'NFLX',
        'NVIDIA': 'NVDA',
        'ADOBE': 'ADBE',
        'SALESFORCE': 'CRM'
    }
    
    if name_or_symbol in common_mappings:
        logging.info(f"Symbol resolved from mapping: {name_or_symbol} -> {common_mappings[name_or_symbol]}")
        return common_mappings[name_or_symbol]
    
    logging.error(f"Could not find a ticker symbol for '{name_or_symbol}'.")
    raise ValueError(f"Could not find a ticker symbol for '{name_or_symbol}'. Please try a valid stock symbol like AAPL, GOOGL, etc.")


@app.route('/predict', methods=['POST'])
def predict_stock():
    data = request.json or {}
    user_input = data.get('stock', '').strip()

    if not user_input:
        return jsonify({"error": "Stock input required"}), 400

    try:
        # Resolve symbol
        symbol = get_stock_symbol(user_input)
        
        # Get current stock info for summary
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # Run prediction pipeline
        pipeline_result = run_full_pipeline(
            symbol,
            window_size=WINDOW_SIZE,
            prediction_days=PREDICTION_DAYS
        )

        # Create a simple summary
        current_price = info.get('currentPrice', pipeline_result['actual_last_close'])
        company_name = info.get('longName', symbol)
        
        summary = f"{company_name} ({symbol}) is currently trading at ${current_price:.2f}. "
        if pipeline_result['predicted_next_day_close'] > current_price:
            summary += f"The model predicts a potential increase to ${pipeline_result['predicted_next_day_close']:.2f} tomorrow."
        else:
            summary += f"The model predicts a potential decrease to ${pipeline_result['predicted_next_day_close']:.2f} tomorrow."

        # Build and return JSON
        response = {
            "symbol": symbol,
            **pipeline_result,
            "summary": summary,
            "current_price": current_price
        }
        logging.info(f"Prediction complete for {symbol}: Predicted ${pipeline_result['predicted_next_day_close']}, Actual ${pipeline_result['actual_last_close']}")
        return jsonify(response)

    except Exception as e:
        logging.error(f"Error in /predict route: {e}\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "Backend is running"})


if __name__ == "__main__":
    logging.info("🚀 Starting Finance Project Backend...")
    logging.info("📊 TensorFlow and ML models ready")
    logging.info("🌐 Server will be available at http://localhost:8000")
    app.run(debug=True, host='0.0.0.0', port=8000)
