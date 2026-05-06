"""
Language Detector Module
Detects language from input text with confidence scores
"""

from langdetect import detect, DetectorFactory
from langdetect.lang_detect_exception import LangDetectException
from typing import Dict
import config

# Set seed for reproducibility
DetectorFactory.seed = 0


class LanguageDetector:
    """Language detection class with support for multiple languages"""
    
    def __init__(self):
        """Initialize the LanguageDetector"""
        self.supported_languages = config.Config.SUPPORTED_LANGUAGES
        self.default_language = config.Config.DEFAULT_LANGUAGE
    
    def detect_language(self, text: str) -> Dict:
        """
        Detect language from input text
        
        Args:
            text: Input text to analyze
            
        Returns:
            Dictionary with language information:
            {
                'language': 'English',
                'code': 'en',
                'confidence': 0.95,
                'flag': '🇬🇧'
            }
        """
        if not text or len(text.strip()) < 10:
            return self._get_default_language()
        
        try:
            # Detect language code
            lang_code = detect(text)
            
            # Check if language is supported
            if not self.is_supported_language(lang_code):
                lang_code = self.default_language
            
            # Get language name and flag
            lang_info = self.supported_languages.get(lang_code, 
                self.supported_languages[self.default_language])
            
            # Calculate confidence (simplified - langdetect doesn't provide direct confidence)
            confidence = self._calculate_confidence(text, lang_code)
            
            return {
                'language': lang_info['name'],
                'code': lang_code,
                'confidence': confidence,
                'flag': lang_info['flag']
            }
            
        except LangDetectException:
            # Fallback to default if detection fails
            return self._get_default_language()
    
    def get_language_name(self, code: str) -> str:
        """
        Get language name from language code
        
        Args:
            code: Language code (e.g., 'en', 'te', 'hi')
            
        Returns:
            Language name (e.g., 'English', 'Telugu', 'Hindi')
        """
        lang_info = self.supported_languages.get(code, 
            self.supported_languages[self.default_language])
        return lang_info['name']
    
    def is_supported_language(self, code: str) -> bool:
        """
        Check if language is supported
        
        Args:
            code: Language code to check
            
        Returns:
            True if supported, False otherwise
        """
        return code in self.supported_languages
    
    def _get_default_language(self) -> Dict:
        """
        Get default language information
        
        Returns:
            Dictionary with default language information
        """
        lang_info = self.supported_languages[self.default_language]
        return {
            'language': lang_info['name'],
            'code': self.default_language,
            'confidence': 0.5,
            'flag': lang_info['flag']
        }
    
    def _calculate_confidence(self, text: str, lang_code: str) -> float:
        """
        Calculate confidence score for language detection
        
        Args:
            text: Input text
            lang_code: Detected language code
            
        Returns:
            Confidence score between 0 and 1
        """
        # Simple confidence calculation based on text length
        # Longer texts generally have higher confidence
        text_length = len(text.strip())
        
        if text_length < 50:
            return 0.6
        elif text_length < 100:
            return 0.75
        elif text_length < 500:
            return 0.85
        else:
            return 0.95
