"""
Utils Module
Helper functions for formatting, logging, and response handling
"""

import logging
from datetime import datetime
from typing import Dict, Any
import config


class Utils:
    """Utility class for helper functions"""
    
    @staticmethod
    def format_confidence(score: float) -> str:
        """
        Format confidence score as percentage
        
        Args:
            score: Confidence score (0-100)
            
        Returns:
            Formatted string with percentage
        """
        return f"{round(score)}%"
    
    @staticmethod
    def format_analysis_time(seconds: float) -> str:
        """
        Format analysis time for display
        
        Args:
            seconds: Time in seconds
            
        Returns:
            Formatted time string
        """
        if seconds < 1:
            return f"{round(seconds * 1000)}ms"
        else:
            return f"{round(seconds, 2)}s"
    
    @staticmethod
    def create_success_response(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a standardized success response
        
        Args:
            data: Response data
            
        Returns:
            Standardized response dictionary
        """
        return {
            'success': True,
            'data': data,
            'error': None
        }
    
    @staticmethod
    def create_error_response(message: str, status_code: int = 400) -> Dict[str, Any]:
        """
        Create a standardized error response
        
        Args:
            message: Error message
            status_code: HTTP status code
            
        Returns:
            Standardized error response dictionary
        """
        return {
            'success': False,
            'data': None,
            'error': message
        }, status_code
    
    @staticmethod
    def setup_logging():
        """Setup application logging"""
        log_level = getattr(logging, config.Config.LOG_LEVEL.upper(), logging.INFO)
        
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(config.Config.LOG_FILE),
                logging.StreamHandler()
            ]
        )
    
    @staticmethod
    def log_request(request_data: Dict[str, Any]):
        """
        Log request information
        
        Args:
            request_data: Request data dictionary
        """
        logging.info(f"Request: {request_data}")
    
    @staticmethod
    def log_error(error: Exception, context: str = ""):
        """
        Log error information
        
        Args:
            error: Exception object
            context: Additional context information
        """
        logging.error(f"Error in {context}: {str(error)}", exc_info=True)
    
    @staticmethod
    def validate_text_length(text: str) -> tuple[bool, str]:
        """
        Validate text length requirements
        
        Args:
            text: Input text
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not text or len(text.strip()) == 0:
            return False, "Text cannot be empty"
        
        if len(text) < config.Config.MIN_TEXT_LENGTH:
            return False, f"Text must be at least {config.Config.MIN_TEXT_LENGTH} characters"
        
        if len(text) > config.Config.MAX_TEXT_LENGTH:
            return False, f"Text cannot exceed {config.Config.MAX_TEXT_LENGTH} characters"
        
        return True, ""
    
    @staticmethod
    def sanitize_input(text: str) -> str:
        """
        Sanitize user input to prevent injection attacks
        
        Args:
            text: Input text
            
        Returns:
            Sanitized text
        """
        if not text:
            return ""
        
        # Remove potentially dangerous characters
        text = text.replace('<', '&lt;').replace('>', '&gt;')
        text = text.replace('"', '&quot;').replace("'", '&#x27;')
        
        return text
    
    @staticmethod
    def truncate_text(text: str, max_length: int = 100) -> str:
        """
        Truncate text to maximum length with ellipsis
        
        Args:
            text: Input text
            max_length: Maximum length
            
        Returns:
            Truncated text
        """
        if len(text) <= max_length:
            return text
        
        return text[:max_length - 3] + "..."
    
    @staticmethod
    def get_timestamp() -> str:
        """
        Get current timestamp as string
        
        Returns:
            Timestamp string in ISO format
        """
        return datetime.now().isoformat()
    
    @staticmethod
    def calculate_metrics(analysis_history: list) -> Dict[str, Any]:
        """
        Calculate analysis metrics from history
        
        Args:
            analysis_history: List of analysis results
            
        Returns:
            Dictionary with metrics
        """
        if not analysis_history:
            return {
                'total_analyses': 0,
                'fake_count': 0,
                'real_count': 0,
                'uncertain_count': 0,
                'average_confidence': 0
            }
        
        total = len(analysis_history)
        fake_count = sum(1 for a in analysis_history if a.get('prediction') == 'FAKE')
        real_count = sum(1 for a in analysis_history if a.get('prediction') == 'REAL')
        uncertain_count = sum(1 for a in analysis_history if a.get('prediction') == 'UNCERTAIN')
        
        avg_confidence = sum(a.get('confidence', 0) for a in analysis_history) / total
        
        return {
            'total_analyses': total,
            'fake_count': fake_count,
            'real_count': real_count,
            'uncertain_count': uncertain_count,
            'average_confidence': round(avg_confidence, 2)
        }
