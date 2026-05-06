"""
LLM Analyzer Module
Core intelligence module for fake news detection using LLM
"""

import json
import time
import anthropic
import config
from typing import Dict, List


class LLMAnalyzer:
    """LLM-based analyzer for fake news detection and bias analysis"""
    
    def __init__(self):
        """Initialize the LLMAnalyzer"""
        self.api_key = config.Config.ANTHROPIC_API_KEY
        self.client = None
        
        if self.api_key:
            try:
                self.client = anthropic.Anthropic(api_key=self.api_key)
            except Exception as e:
                print(f"Failed to initialize Anthropic client: {e}")
    
    def classify_fake_news(self, cleaned_text: str, language: str) -> Dict:
        """
        Classify text as FAKE, REAL, or UNCERTAIN
        
        Args:
            cleaned_text: Preprocessed text to analyze
            language: Detected language code
            
        Returns:
            Dictionary with classification results
        """
        if not self.client:
            return self._rule_based_classification(cleaned_text)
        
        try:
            prompt = f"""Analyze the following news text and classify it as FAKE, REAL, or UNCERTAIN.

Consider these factors:
- Extraordinary claims without evidence
- Contradictions with known facts
- Presence of clickbait patterns
- Source credibility assessment
- Logical fallacies

Text: {cleaned_text}
Language: {language}

Respond in JSON format only:
{{
    "prediction": "FAKE/REAL/UNCERTAIN",
    "confidence": 0-100,
    "reasoning": "Brief reasoning for the classification"
}}"""

            message = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = message.content[0].text
            result = self._extract_json(response_text)
            
            return {
                'prediction': result.get('prediction', 'UNCERTAIN'),
                'confidence': result.get('confidence', 50),
                'reasoning': result.get('reasoning', '')
            }
            
        except Exception as e:
            print(f"LLM classification error: {e}")
            return self._rule_based_classification(cleaned_text)
    
    def generate_explanation(self, cleaned_text: str, classification: Dict) -> str:
        """
        Generate human-readable explanation for the classification
        
        Args:
            cleaned_text: Preprocessed text
            classification: Classification result dictionary
            
        Returns:
            Explanation string (2-4 sentences)
        """
        if not self.client:
            return self._rule_based_explanation(cleaned_text, classification)
        
        try:
            prompt = f"""Generate a 2-4 sentence explanation for why this news article is classified as {classification['prediction']}.

Text: {cleaned_text}
Prediction: {classification['prediction']}
Confidence: {classification['confidence']}%

The explanation should:
- Explain WHY the article is fake/real/uncertain
- Include specific red flags or positive indicators
- Use simple, non-technical language
- Be factual and objective

Respond with only the explanation text, no JSON."""

            message = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}]
            )
            
            explanation = message.content[0].text.strip()
            return explanation
            
        except Exception as e:
            print(f"LLM explanation error: {e}")
            return self._rule_based_explanation(cleaned_text, classification)
    
    def detect_bias(self, cleaned_text: str) -> Dict:
        """
        Detect bias type in the text
        
        Args:
            cleaned_text: Preprocessed text to analyze
            
        Returns:
            Dictionary with bias detection results:
            {
                "bias_type": "POLITICAL/EMOTIONAL/NEUTRAL",
                "confidence": 0-100,
                "bias_phrases": ["phrase1", "phrase2"]
            }
        """
        if not self.client:
            return self._rule_based_bias_detection(cleaned_text)
        
        try:
            prompt = f"""Analyze the following text for bias and classify it as POLITICAL, EMOTIONAL, or NEUTRAL.

POLITICAL BIAS indicators:
- Partisan language favoring specific ideology/party
- One-sided arguments
- Stereotyping
- Words like "obviously," "clearly," "everyone knows"

EMOTIONAL BIAS indicators:
- Excessive emotional language designed to manipulate
- Fear-mongering
- Outrage-inducing language
- Sensationalism
- Words like "shocking," "unbelievable," "devastating"

NEUTRAL indicators:
- Factual, balanced tone
- Citations
- Multiple perspectives
- Measured language

Text: {cleaned_text}

Respond in JSON format only:
{{
    "bias_type": "POLITICAL/EMOTIONAL/NEUTRAL",
    "confidence": 0-100,
    "bias_phrases": ["phrase1", "phrase2"]
}}"""

            message = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = message.content[0].text
            result = self._extract_json(response_text)
            
            return {
                'bias_type': result.get('bias_type', 'NEUTRAL'),
                'confidence': result.get('confidence', 50),
                'bias_phrases': result.get('bias_phrases', [])
            }
            
        except Exception as e:
            print(f"LLM bias detection error: {e}")
            return self._rule_based_bias_detection(cleaned_text)
    
    def analyze_complete(self, cleaned_text: str, language: str) -> Dict:
        """
        Perform complete analysis combining all functions
        
        Args:
            cleaned_text: Preprocessed text
            language: Detected language code
            
        Returns:
            Complete analysis dictionary:
            {
                "prediction": "FAKE/REAL/UNCERTAIN",
                "confidence": 89,
                "explanation": "Explanation text...",
                "bias_type": "POLITICAL/EMOTIONAL/NEUTRAL",
                "bias_confidence": 76,
                "bias_phrases": ["phrase1", "phrase2"],
                "analysis_time": 1.2
            }
        """
        start_time = time.time()
        
        # Perform classification
        classification = self.classify_fake_news(cleaned_text, language)
        
        # Generate explanation
        explanation = self.generate_explanation(cleaned_text, classification)
        
        # Detect bias
        bias_result = self.detect_bias(cleaned_text)
        
        analysis_time = time.time() - start_time
        
        return {
            'prediction': classification['prediction'],
            'confidence': classification['confidence'],
            'explanation': explanation,
            'bias_type': bias_result['bias_type'],
            'bias_confidence': bias_result['confidence'],
            'bias_phrases': bias_result['bias_phrases'],
            'analysis_time': round(analysis_time, 2)
        }
    
    def _extract_json(self, text: str) -> Dict:
        """
        Extract JSON from LLM response
        
        Args:
            text: Response text from LLM
            
        Returns:
            Parsed JSON dictionary
        """
        try:
            start = text.find('{')
            end = text.rfind('}') + 1
            if start != -1 and end > start:
                json_str = text[start:end]
                return json.loads(json_str)
            else:
                return {}
        except json.JSONDecodeError:
            return {}
    
    def _rule_based_classification(self, text: str) -> Dict:
        """
        Rule-based classification as fallback
        
        Args:
            text: Text to classify
            
        Returns:
            Classification dictionary
        """
        text_lower = text.lower()
        
        fake_indicators = [
            'shocking', 'you won\'t believe', 'secret', 'banned',
            'conspiracy', 'mainstream media won\'t tell', 'truth revealed',
            'they don\'t want you to know', 'exclusive', 'breaking news',
            'miracle', 'cure', 'instant', 'guaranteed'
        ]
        
        real_indicators = [
            'according to', 'reported', 'stated', 'official',
            'sources say', 'confirmed', 'announced', 'data shows',
            'research', 'study', 'published', 'peer-reviewed'
        ]
        
        fake_score = sum(1 for indicator in fake_indicators if indicator in text_lower)
        real_score = sum(1 for indicator in real_indicators if indicator in text_lower)
        
        if fake_score > real_score:
            prediction = "FAKE"
            confidence = min(70 + fake_score * 5, 95)
        elif real_score > fake_score:
            prediction = "REAL"
            confidence = min(70 + real_score * 5, 95)
        else:
            prediction = "UNCERTAIN"
            confidence = 50
        
        return {
            'prediction': prediction,
            'confidence': confidence,
            'reasoning': f'Found {fake_score} fake indicators and {real_score} credibility indicators'
        }
    
    def _rule_based_explanation(self, text: str, classification: Dict) -> str:
        """
        Rule-based explanation generation as fallback
        
        Args:
            text: Input text
            classification: Classification result
            
        Returns:
            Explanation string
        """
        prediction = classification['prediction']
        
        if prediction == "FAKE":
            return "This article contains multiple indicators of fake news including sensational language and extraordinary claims without credible evidence. The text lacks proper sourcing and verification."
        elif prediction == "REAL":
            return "This article demonstrates characteristics of credible journalism including factual language, proper sourcing, and verifiable claims. The content aligns with established reporting standards."
        else:
            return "This article mixes elements of both credible and questionable content, making it difficult to determine overall reliability. Further verification from multiple sources is recommended."
    
    def _rule_based_bias_detection(self, text: str) -> Dict:
        """
        Rule-based bias detection as fallback
        
        Args:
            text: Text to analyze
            
        Returns:
            Bias detection dictionary
        """
        text_lower = text.lower()
        
        political_words = [
            'government', 'political', 'party', 'election', 'policy',
            'president', 'minister', 'congress', 'senate', 'democrat',
            'republican', 'left', 'right', 'conservative', 'liberal',
            'obviously', 'clearly', 'everyone knows'
        ]
        
        emotional_words = [
            'shocking', 'terrible', 'amazing', 'horrifying', 'incredible',
            'devastating', 'unbelievable', 'outrageous', 'disgusting',
            'terrifying', 'heartbreaking', '!', '!!!'
        ]
        
        political_count = sum(1 for word in political_words if word in text_lower)
        emotional_count = sum(1 for word in emotional_words if word in text_lower)
        
        # Find bias phrases
        bias_phrases = []
        for word in political_words:
            if word in text_lower:
                bias_phrases.append(word)
        for word in emotional_words:
            if word in text_lower:
                bias_phrases.append(word)
        
        if political_count > emotional_count and political_count > 0:
            bias_type = "POLITICAL"
            confidence = min(60 + political_count * 5, 85)
        elif emotional_count > political_count and emotional_count > 0:
            bias_type = "EMOTIONAL"
            confidence = min(60 + emotional_count * 5, 85)
        else:
            bias_type = "NEUTRAL"
            confidence = 70
        
        return {
            'bias_type': bias_type,
            'confidence': confidence,
            'bias_phrases': bias_phrases[:5]  # Limit to 5 phrases
        }
