"""
Flask Application for Fake News Detection System
Main application with API endpoints
"""

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import config
from modules import TextPreprocessor, LanguageDetector, LLMAnalyzer, Utils
import logging

# Setup logging
Utils.setup_logging()
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = config.Config.SECRET_KEY

# Enable CORS
CORS(app, origins=config.Config.CORS_ORIGINS)

# Setup rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=[f"{config.Config.RATE_LIMIT_REQUESTS} per {config.Config.RATE_LIMIT_PERIOD} seconds"]
)

# Initialize modules
preprocessor = TextPreprocessor(max_length=config.Config.MAX_TEXT_LENGTH)
language_detector = LanguageDetector()
llm_analyzer = LLMAnalyzer()

# In-memory history storage (for session-based history)
analysis_history = []


@app.route('/')
def home():
    """Render the main page"""
    return render_template('index.html')


@app.route('/chat')
def chat():
    """Render the chat interface"""
    return render_template('chat.html')


@app.route('/api/analyze', methods=['POST'])
@limiter.limit(f"{config.Config.RATE_LIMIT_REQUESTS} per {config.Config.RATE_LIMIT_PERIOD} seconds")
def analyze():
    """
    Analyze text for fake news detection
    
    Request JSON:
    {
        "text": "news article text",
        "language": "en" (optional, auto-detect if not provided)
    }
    
    Response JSON:
    {
        "success": true,
        "data": {
            "prediction": "FAKE",
            "confidence": 89,
            "explanation": "...",
            "bias_type": "EMOTIONAL",
            "bias_confidence": 76,
            "bias_phrases": ["phrase1", "phrase2"],
            "detected_language": "English",
            "analysis_time": 1.1
        },
        "error": null
    }
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data:
            return Utils.create_error_response("Invalid JSON data", 400)
        
        text = data.get('text', '')
        language_override = data.get('language', None)
        
        # Validate input
        is_valid, error_msg = Utils.validate_text_length(text)
        if not is_valid:
            return Utils.create_error_response(error_msg, 400)
        
        # Sanitize input
        text = Utils.sanitize_input(text)
        
        # Log request
        Utils.log_request({
            'text_length': len(text),
            'language_override': language_override
        })
        
        # Preprocess text
        cleaned_text, metadata = preprocessor.preprocess(text)
        logger.info(f"Text preprocessed: {metadata}")
        
        # Detect language
        if language_override and language_detector.is_supported_language(language_override):
            lang_info = {
                'language': language_detector.get_language_name(language_override),
                'code': language_override,
                'confidence': 1.0,
                'flag': config.Config.SUPPORTED_LANGUAGES[language_override]['flag']
            }
        else:
            lang_info = language_detector.detect_language(cleaned_text)
        
        # Perform complete analysis
        analysis_result = llm_analyzer.analyze_complete(cleaned_text, lang_info['code'])
        
        # Prepare response data
        response_data = {
            'prediction': analysis_result['prediction'],
            'confidence': analysis_result['confidence'],
            'explanation': analysis_result['explanation'],
            'bias_type': analysis_result['bias_type'],
            'bias_confidence': analysis_result['bias_confidence'],
            'bias_phrases': analysis_result['bias_phrases'],
            'detected_language': lang_info['language'],
            'language_flag': lang_info['flag'],
            'analysis_time': analysis_result['analysis_time']
        }
        
        # Add to history
        history_entry = {
            'text': Utils.truncate_text(text, 100),
            'prediction': response_data['prediction'],
            'confidence': response_data['confidence'],
            'bias_type': response_data['bias_type'],
            'detected_language': response_data['detected_language'],
            'timestamp': Utils.get_timestamp()
        }
        analysis_history.insert(0, history_entry)
        
        # Limit history size
        if len(analysis_history) > config.Config.MAX_HISTORY_ENTRIES:
            analysis_history.pop()
        
        logger.info(f"Analysis completed: {response_data['prediction']} with {response_data['confidence']}% confidence")
        
        return Utils.create_success_response(response_data)
        
    except Exception as e:
        Utils.log_error(e, "analyze endpoint")
        return Utils.create_error_response("An error occurred during analysis", 500)


@app.route('/api/history', methods=['GET'])
def get_history():
    """
    Get analysis history
    
    Response JSON:
    {
        "success": true,
        "data": {
            "history": [...],
            "metrics": {...}
        },
        "error": null
    }
    """
    try:
        metrics = Utils.calculate_metrics(analysis_history)
        
        response_data = {
            'history': analysis_history,
            'metrics': metrics
        }
        
        return Utils.create_success_response(response_data)
        
    except Exception as e:
        Utils.log_error(e, "history endpoint")
        return Utils.create_error_response("Failed to retrieve history", 500)


@app.route('/api/clear-history', methods=['POST'])
def clear_history():
    """
    Clear analysis history
    
    Response JSON:
    {
        "success": true,
        "data": {
            "message": "History cleared successfully"
        },
        "error": null
    }
    """
    try:
        global analysis_history
        analysis_history = []
        
        logger.info("History cleared")
        
        return Utils.create_success_response({
            'message': 'History cleared successfully'
        })
        
    except Exception as e:
        Utils.log_error(e, "clear-history endpoint")
        return Utils.create_error_response("Failed to clear history", 500)


@app.errorhandler(429)
def ratelimit_handler(e):
    """Handle rate limit errors"""
    return Utils.create_error_response("Rate limit exceeded. Please try again later.", 429)


@app.errorhandler(404)
def not_found_handler(e):
    """Handle 404 errors"""
    return Utils.create_error_response("Endpoint not found", 404)


@app.errorhandler(500)
def internal_error_handler(e):
    """Handle 500 errors"""
    Utils.log_error(e, "internal server error")
    return Utils.create_error_response("Internal server error", 500)


if __name__ == '__main__':
    logger.info(f"Starting Flask application on {config.Config.HOST}:{config.Config.PORT}")
    app.run(
        debug=config.Config.DEBUG,
        host=config.Config.HOST,
        port=config.Config.PORT
    )
