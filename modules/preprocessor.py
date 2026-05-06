"""
Text Preprocessor Module
Handles text cleaning, normalization, and preprocessing for multilingual text
"""

import re
import unicodedata
from typing import Dict, List, Tuple
import html


class TextPreprocessor:
    """Text preprocessing class for cleaning and normalizing text"""
    
    def __init__(self, max_length: int = 5000):
        """
        Initialize the TextPreprocessor
        
        Args:
            max_length: Maximum allowed text length
        """
        self.max_length = max_length
    
    def clean_text(self, text: str) -> str:
        """
        Clean and normalize text
        
        Args:
            text: Input text to clean
            
        Returns:
            Cleaned text
        """
        if not text:
            return ""
        
        # Remove HTML tags
        text = self.remove_html(text)
        
        # Normalize unicode
        text = self.normalize_unicode(text)
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove extra whitespace
        text = self._remove_extra_whitespace(text)
        
        # Remove special characters but keep essential punctuation
        text = self._remove_special_characters(text)
        
        # Trim to max length
        text = text[:self.max_length]
        
        return text.strip()
    
    def tokenize(self, text: str) -> List[str]:
        """
        Tokenize text into words
        
        Args:
            text: Input text to tokenize
            
        Returns:
            List of tokens
        """
        if not text:
            return []
        
        # Split on whitespace and punctuation
        tokens = re.findall(r'\b\w+\b', text.lower())
        return tokens
    
    def remove_html(self, text: str) -> str:
        """
        Remove HTML tags from text
        
        Args:
            text: Input text with HTML
            
        Returns:
            Text without HTML tags
        """
        if not text:
            return ""
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Decode HTML entities
        text = html.unescape(text)
        
        return text
    
    def normalize_unicode(self, text: str) -> str:
        """
        Normalize unicode characters for multilingual support
        
        Args:
            text: Input text
            
        Returns:
            Normalized text
        """
        if not text:
            return ""
        
        # Normalize to NFKC form
        normalized = unicodedata.normalize('NFKC', text)
        
        return normalized
    
    def get_metadata(self, original_text: str, cleaned_text: str) -> Dict:
        """
        Get metadata about the preprocessing
        
        Args:
            original_text: Original input text
            cleaned_text: Cleaned text
            
        Returns:
            Dictionary with metadata
        """
        return {
            'original_length': len(original_text),
            'cleaned_length': len(cleaned_text),
            'token_count': len(self.tokenize(cleaned_text)),
            'was_truncated': len(original_text) > self.max_length
        }
    
    def _remove_extra_whitespace(self, text: str) -> str:
        """
        Remove extra whitespace from text
        
        Args:
            text: Input text
            
        Returns:
            Text with normalized whitespace
        """
        # Replace multiple spaces with single space
        text = re.sub(r'\s+', ' ', text)
        
        # Remove leading/trailing whitespace
        text = text.strip()
        
        return text
    
    def _remove_special_characters(self, text: str) -> str:
        """
        Remove special characters but keep essential punctuation
        
        Args:
            text: Input text
            
        Returns:
            Text with special characters removed
        """
        # Keep letters, numbers, spaces, and essential punctuation (. , ! ? : ; -)
        pattern = r'[^a-zA-Z0-9\s.,!?;\-]'
        text = re.sub(pattern, '', text)
        
        return text
    
    def preprocess(self, text: str) -> Tuple[str, Dict]:
        """
        Complete preprocessing pipeline
        
        Args:
            text: Input text
            
        Returns:
            Tuple of (cleaned_text, metadata)
        """
        original_text = text
        cleaned_text = self.clean_text(text)
        metadata = self.get_metadata(original_text, cleaned_text)
        
        return cleaned_text, metadata
