"""
Configuration file for Fake News Detection System
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Application configuration"""
    
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.environ.get('DEBUG', 'True').lower() == 'true'
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5000))
    
    # API Configuration
    ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
    
    # Text Processing Configuration
    MIN_TEXT_LENGTH = 50
    MAX_TEXT_LENGTH = 5000
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS = 10
    RATE_LIMIT_PERIOD = 60  # seconds
    
    # Request Timeout
    REQUEST_TIMEOUT = 5  # seconds
    
    # History Configuration
    MAX_HISTORY_ENTRIES = 10
    
    # Language Configuration
    SUPPORTED_LANGUAGES = {
        'en': {'name': 'English', 'flag': '🇬🇧'},
        'te': {'name': 'Telugu', 'flag': '🇮🇳'},
        'hi': {'name': 'Hindi', 'flag': '🇮🇳'},
        'ta': {'name': 'Tamil', 'flag': '🇮🇳'},
        'mr': {'name': 'Marathi', 'flag': '🇮🇳'}
    }
    
    DEFAULT_LANGUAGE = 'en'
    
    # Database Configuration
    DB_PATH = os.environ.get('DB_PATH', 'fake_news.db')
    
    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = os.environ.get('LOG_FILE', 'app.log')
    
    # CORS Configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
