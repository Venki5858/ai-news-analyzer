# Multilingual Fake News Detection System

A comprehensive web application that detects fake news, generates explanations, and identifies bias in multilingual text using Transformer-based LLMs.

## Features

- **Fake News Detection**: Classifies news articles as FAKE, REAL, or UNCERTAIN with confidence scores
- **Bias Detection**: Identifies three types of bias: POLITICAL, EMOTIONAL, and NEUTRAL with detected phrases
- **Multilingual Support**: Supports English, Telugu (తెలుగు), Hindi (हिन्दी), Tamil (தமிழ்), and Marathi (मराठी)
- **Explainable AI**: Provides human-readable explanations for predictions
- **Real-time Validation**: Character counter and input validation (50-5000 characters)
- **Language Selection**: Auto-detection or manual language selection
- **Analysis History**: Session-based history with localStorage persistence
- **Copy Results**: One-click copy of analysis results to clipboard
- **Expandable Explanations**: Click to expand/collapse detailed explanations
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices (320px - 1920px)
- **Rate Limiting**: 10 requests per minute per IP address
- **CORS Enabled**: Cross-origin resource sharing support

## Technology Stack

- **Backend**: Python Flask 2.3.0
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **AI/NLP**: Claude API (Anthropic) with sophisticated rule-based fallback
- **Language Detection**: langdetect library
- **Security**: Input sanitization, rate limiting, CORS
- **Production**: Gunicorn WSGI server
- **Configuration**: python-dotenv for environment variables

## Project Structure

```
fake_news/
├── app.py                 # Flask application with API endpoints
├── config.py              # Configuration settings
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── README.md             # Project documentation
├── modules/              # Core modules
│   ├── __init__.py      # Module initialization
│   ├── preprocessor.py  # Text preprocessing and cleaning
│   ├── language_detector.py  # Language detection
│   ├── llm_analyzer.py  # LLM integration and analysis
│   └── utils.py         # Utility functions
├── templates/
│   └── index.html        # Main HTML template
└── static/
    ├── css/
    │   └── style.css     # Modern styling with animations
    ├── js/
    │   └── script.js     # Frontend JavaScript logic
    └── images/          # Static images directory
```

## Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Setup Steps

1. **Navigate to the project directory**:
   ```bash
   cd c:/Users/naren/OneDrive/Desktop/fake_news
   ```

2. **Create a virtual environment** (recommended):
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**:
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file and add your configuration:
   ```env
   SECRET_KEY=your-secret-key-here
   ANTHROPIC_API_KEY=your-anthropic-api-key-here
   DEBUG=True
   PORT=5000
   ```

6. **Set up Claude API Key** (optional but recommended for better accuracy):
   - Get your API key from [Anthropic Console](https://console.anthropic.com/)
   - Add it to your `.env` file as `ANTHROPIC_API_KEY`
   - **Note**: Without the API key, the system will use a sophisticated rule-based fallback analysis

## Running the Application

### Development Mode

```bash
python app.py
```

### Production Mode

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

Open your web browser and navigate to:
```
http://localhost:5000
```

## Usage

### Analyzing News Text

1. Open the application in your browser
2. Paste or type the news article/text in the text area (minimum 50 characters, maximum 5000)
3. Optionally select a language from the dropdown (or leave as "Auto-detect")
4. Click the **"Analyze"** button (or press Ctrl+Enter)
5. View the results including:
   - Prediction badge (FAKE/REAL/UNCERTAIN)
   - Confidence score with animated progress bar
   - Detected language
   - Bias type with detected phrases
   - Expandable explanation section
   - Analysis time

### Managing History

1. Recent analyses appear in the sidebar automatically
2. History persists in localStorage across sessions
3. Click the trash icon to clear all history
4. History shows up to 10 most recent analyses

### Copying Results

1. After analysis, click the 📋 icon in the results header
2. Results are copied to clipboard in a formatted text format
3. Paste into any document or application

## API Endpoints

### POST `/api/analyze`
Analyzes the provided text for fake news detection.

**Request Body**:
```json
{
  "text": "Your news text here (50-5000 characters)",
  "language": "en" (optional, auto-detect if not provided)
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "prediction": "FAKE",
    "confidence": 89,
    "explanation": "This article makes extraordinary claims without citing peer-reviewed scientific evidence...",
    "bias_type": "EMOTIONAL",
    "bias_confidence": 76,
    "bias_phrases": ["shocking", "unbelievable"],
    "detected_language": "English",
    "language_flag": "🇬🇧",
    "analysis_time": 1.2
  },
  "error": null
}
```

### GET `/api/history`
Retrieves recent analysis history with metrics.

**Response**:
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "text": "News text preview...",
        "prediction": "FAKE",
        "confidence": 89,
        "bias_type": "EMOTIONAL",
        "detected_language": "English",
        "timestamp": "2026-05-05T19:00:00"
      }
    ],
    "metrics": {
      "total_analyses": 10,
      "fake_count": 4,
      "real_count": 5,
      "uncertain_count": 1,
      "average_confidence": 82.5
    }
  },
  "error": null
}
```

### POST `/api/clear-history`
Clears the analysis history.

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "History cleared successfully"
  },
  "error": null
}
```

## How It Works

### Text Preprocessing

The `TextPreprocessor` module:
- Converts text to lowercase
- Removes HTML tags and special characters
- Normalizes Unicode for multilingual support
- Tokenizes text into words
- Trims text to 5000 character limit
- Returns cleaned text with metadata

### Language Detection

The `LanguageDetector` module:
- Automatically detects language using langdetect
- Supports English, Telugu, Hindi, Tamil, and Marathi
- Returns language code, name, confidence, and flag emoji
- Falls back to English if detection fails

### LLM Analysis

The `LLMAnalyzer` module provides:

**Fake News Classification**:
- Analyzes text using Claude API
- Classifies as FAKE, REAL, or UNCERTAIN
- Considers extraordinary claims, contradictions, clickbait patterns
- Provides confidence scores (0-100%)

**Explanation Generation**:
- Generates 2-4 sentence human-readable explanations
- Explains WHY the article is fake/real/uncertain
- Includes specific red flags or positive indicators
- Uses simple, non-technical language

**Bias Detection**:
- POLITICAL: Partisan language, one-sided arguments, stereotyping
- EMOTIONAL: Fear-mongering, outrage-inducing language, sensationalism
- NEUTRAL: Factual, balanced tone with citations
- Returns bias type, confidence, and detected phrases

### Rule-Based Fallback

When the Claude API is unavailable, the system uses sophisticated keyword-based analysis:
- Analyzes fake news indicators (e.g., "shocking", "secret", "conspiracy", "miracle")
- Analyzes credibility indicators (e.g., "according to", "reported", "official", "research")
- Detects bias by analyzing political and emotional keywords
- Provides confidence scores based on indicator counts
- Generates contextual explanations

## Configuration

Edit `config.py` or use environment variables in `.env`:

```python
# Flask Configuration
SECRET_KEY = 'your-secret-key'
DEBUG = True
HOST = '0.0.0.0'
PORT = 5000

# API Configuration
ANTHROPIC_API_KEY = 'your-api-key'

# Text Processing
MIN_TEXT_LENGTH = 50
MAX_TEXT_LENGTH = 5000

# Rate Limiting
RATE_LIMIT_REQUESTS = 10
RATE_LIMIT_PERIOD = 60

# History
MAX_HISTORY_ENTRIES = 10
```

## Customization

### Adding More Languages

Modify `config.py`:
```python
SUPPORTED_LANGUAGES = {
    'en': {'name': 'English', 'flag': '🇬🇧'},
    'te': {'name': 'Telugu', 'flag': '🇮🇳'},
    'hi': {'name': 'Hindi', 'flag': '🇮🇳'},
    'ta': {'name': 'Tamil', 'flag': '🇮🇳'},
    'mr': {'name': 'Marathi', 'flag': '🇮🇳'},
    'es': {'name': 'Spanish', 'flag': '🇪🇸'},  # Add new language
}
```

### Adjusting Sensitivity

Modify the confidence calculation in `modules/llm_analyzer.py` in the `_rule_based_*` functions.

### Custom Styling

Edit `static/css/style.css` to customize:
- Color scheme (CSS variables at the top)
- Layout and spacing
- Responsive breakpoints
- Animations and transitions

## Performance Requirements

- Response time: < 1.5 seconds per analysis
- Accuracy: ≥ 90% (with Claude API)
- Support 5000+ character texts
- Handle concurrent requests gracefully
- UI load time: < 2 seconds
- Mobile responsive (320px - 1920px)

## Security & Validation

- Input validation (50-5000 characters)
- HTML/script sanitization
- Rate limiting (10 requests/min per IP)
- Timeout protection (5 seconds per request)
- Error handling without stack traces
- CORS enabled for API access

## Troubleshooting

### Port Already in Use
Modify the port in `.env` file:
```env
PORT=5001
```

### Claude API Errors
- Verify your API key is correct
- Check your API credits/billing
- The system automatically falls back to rule-based analysis

### Language Detection Issues
- Ensure text is at least 10 characters
- System works best with paragraphs, not single words

### Rate Limit Errors
Wait 60 seconds before making more requests (10 requests per minute limit)

## License

This project is for educational and research purposes.

## Credits

Built with:
- Flask web framework
- Anthropic Claude API
- langdetect library
- Modern web technologies
- Modular architecture

## Future Enhancements

Potential improvements:
- User authentication and authorization
- Batch analysis for multiple texts
- Export results to PDF/CSV
- Advanced analytics dashboard
- Integration with fact-checking APIs
- Real-time news feed monitoring
- Support for more languages
- Dark mode support
- Redis caching for performance
