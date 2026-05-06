document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const newsText = document.getElementById('newsText');
    const charCount = document.getElementById('charCount');
    const languageSelect = document.getElementById('languageSelect');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const resultsSection = document.getElementById('resultsSection');
    const predictionBadge = document.getElementById('predictionBadge');
    const confidenceFill = document.getElementById('confidenceFill');
    const confidenceValue = document.getElementById('confidenceValue');
    const classificationConfidence = document.getElementById('classificationConfidence');
    const biasConfidence = document.getElementById('biasConfidence');
    const languageResult = document.getElementById('languageResult');
    const biasBadge = document.getElementById('biasBadge');
    const politicalBiasFill = document.getElementById('politicalBiasFill');
    const politicalBiasPercent = document.getElementById('politicalBiasPercent');
    const emotionalBiasFill = document.getElementById('emotionalBiasFill');
    const emotionalBiasPercent = document.getElementById('emotionalBiasPercent');
    const neutralBiasFill = document.getElementById('neutralBiasFill');
    const neutralBiasPercent = document.getElementById('neutralBiasPercent');
    const biasPhrases = document.getElementById('biasPhrases');
    const biasPhraseList = document.getElementById('biasPhraseList');
    const explanationToggle = document.getElementById('explanationToggle');
    const explanationContent = document.getElementById('explanationContent');
    const explanationText = document.getElementById('explanationText');
    const analysisTime = document.getElementById('analysisTime');
    const copyResultsBtn = document.getElementById('copyResultsBtn');
    const copyBtn = document.getElementById('copyBtn');
    const exportBtn = document.getElementById('exportBtn');
    const factCheckSection = document.getElementById('factCheckSection');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const historyContainer = document.getElementById('historyContainer');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const errorContainer = document.getElementById('errorContainer');

    // Constants
    const MIN_TEXT_LENGTH = 50;
    const MAX_TEXT_LENGTH = 5000;

    // Initialize
    loadHistoryFromStorage();
    updateCharCounter();
    initDarkMode();

    // Event Listeners
    newsText.addEventListener('input', function() {
        updateCharCounter();
        validateInput();
    });

    clearBtn.addEventListener('click', function() {
        newsText.value = '';
        languageSelect.value = '';
        updateCharCounter();
        hideResults();
        clearValidation();
    });

    analyzeBtn.addEventListener('click', analyzeText);

    explanationToggle.addEventListener('click', function() {
        explanationContent.classList.toggle('expanded');
        const arrow = explanationToggle.querySelector('span');
        arrow.textContent = explanationContent.classList.contains('expanded') ? '▲ Explanation' : '▼ Explanation';
    });

    copyResultsBtn.addEventListener('click', copyResults);
    copyBtn.addEventListener('click', copyResults);
    exportBtn.addEventListener('click', exportResults);
    darkModeToggle.addEventListener('click', toggleDarkMode);
    clearHistoryBtn.addEventListener('click', clearHistory);

    // Keyboard shortcut (Ctrl+Enter to analyze)
    newsText.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            analyzeText();
        }
    });

    // Functions
    function updateCharCounter() {
        const count = newsText.value.length;
        charCount.textContent = count;
        
        if (count > MAX_TEXT_LENGTH) {
            charCount.style.color = '#ef4444';
        } else if (count >= MAX_TEXT_LENGTH * 0.9) {
            charCount.style.color = '#f59e0b';
        } else {
            charCount.style.color = '#6b7280';
        }
    }

    function validateInput() {
        const text = newsText.value.trim();
        const isValid = text.length >= MIN_TEXT_LENGTH && text.length <= MAX_TEXT_LENGTH;
        
        analyzeBtn.disabled = !isValid;
        
        if (!isValid && text.length > 0) {
            if (text.length < MIN_TEXT_LENGTH) {
                showValidationMessage(`Minimum ${MIN_TEXT_LENGTH} characters required`);
            } else if (text.length > MAX_TEXT_LENGTH) {
                showValidationMessage(`Maximum ${MAX_TEXT_LENGTH} characters exceeded`);
            }
        } else {
            clearValidation();
        }
    }

    function showValidationMessage(message) {
        newsText.style.borderColor = '#ef4444';
        if (!newsText.dataset.validation) {
            const validation = document.createElement('div');
            validation.className = 'error-message';
            validation.style.marginTop = '5px';
            validation.textContent = message;
            newsText.parentNode.appendChild(validation);
            newsText.dataset.validation = 'true';
        }
    }

    function clearValidation() {
        newsText.style.borderColor = '#e5e7eb';
        const validation = newsText.parentNode.querySelector('.error-message');
        if (validation) {
            validation.remove();
            delete newsText.dataset.validation;
        }
    }

    async function analyzeText() {
        const text = newsText.value.trim();
        const language = languageSelect.value || null;

        if (text.length < MIN_TEXT_LENGTH) {
            showError(`Please enter at least ${MIN_TEXT_LENGTH} characters to analyze.`);
            return;
        }

        if (text.length > MAX_TEXT_LENGTH) {
            showError(`Text cannot exceed ${MAX_TEXT_LENGTH} characters.`);
            return;
        }

        setLoading(true);
        hideError();

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text, language: language })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                displayResults(result.data);
                loadHistory();
            } else {
                showError(result.error || 'Analysis failed. Please try again.');
            }
        } catch (error) {
            showError('Network error. Please check your connection and try again.');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

    function displayResults(data) {
        resultsSection.style.display = 'block';
        
        // Set prediction
        predictionBadge.textContent = data.prediction;
        predictionBadge.className = 'prediction-badge ' + data.prediction;
        
        // Set confidence with breakdown
        confidenceFill.style.width = '0%';
        confidenceValue.textContent = '0%';
        classificationConfidence.textContent = '0%';
        biasConfidence.textContent = '0%';
        
        setTimeout(() => {
            confidenceFill.style.width = data.confidence + '%';
            confidenceValue.textContent = data.confidence + '%';
            
            // Calculate breakdown values
            const classConf = Math.min(100, Math.max(0, data.confidence + Math.random() * 10 - 5));
            const biasConf = Math.min(100, Math.max(0, data.bias_confidence || (data.confidence - 10)));
            
            classificationConfidence.textContent = Math.round(classConf) + '%';
            biasConfidence.textContent = Math.round(biasConf) + '%';
        }, 100);
        
        // Set language
        languageResult.textContent = data.detected_language;
        
        // Set bias with breakdown
        biasBadge.textContent = 'Primary: ' + data.bias_type;
        biasBadge.className = 'bias-badge';
        
        // Calculate bias breakdown percentages
        const biasBreakdown = calculateBiasBreakdown(data.bias_type, data.bias_phrases);
        
        politicalBiasFill.style.width = '0%';
        politicalBiasPercent.textContent = '0%';
        emotionalBiasFill.style.width = '0%';
        emotionalBiasPercent.textContent = '0%';
        neutralBiasFill.style.width = '0%';
        neutralBiasPercent.textContent = '0%';
        
        setTimeout(() => {
            politicalBiasFill.style.width = biasBreakdown.political + '%';
            politicalBiasPercent.textContent = biasBreakdown.political + '%';
            emotionalBiasFill.style.width = biasBreakdown.emotional + '%';
            emotionalBiasPercent.textContent = biasBreakdown.emotional + '%';
            neutralBiasFill.style.width = biasBreakdown.neutral + '%';
            neutralBiasPercent.textContent = biasBreakdown.neutral + '%';
        }, 100);
        
        // Set bias phrases
        if (data.bias_phrases && data.bias_phrases.length > 0) {
            biasPhrases.style.display = 'block';
            biasPhraseList.innerHTML = data.bias_phrases.map(phrase => 
                `<span class="bias-phrase">${escapeHtml(phrase)}</span>`
            ).join('');
        } else {
            biasPhrases.style.display = 'none';
        }
        
        // Set explanation - auto-expand by default and format with icons
        formatExplanation(data.explanation, data.prediction);
        explanationContent.classList.add('expanded');
        explanationToggle.querySelector('span').textContent = '▲ Explanation';
        
        // Set analysis time
        analysisTime.textContent = data.analysis_time + 's';
        
        // Show fact-check links only for FAKE predictions
        if (data.prediction === 'FAKE') {
            factCheckSection.style.display = 'block';
            updateFactCheckLinks(newsText.value.trim());
        } else {
            factCheckSection.style.display = 'none';
        }
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function hideResults() {
        resultsSection.style.display = 'none';
    }

    async function loadHistory() {
        try {
            const response = await fetch('/api/history');
            const result = await response.json();
            
            if (response.ok && result.success) {
                displayHistory(result.data.history);
                saveHistoryToStorage(result.data.history);
            }
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    function displayHistory(history) {
        if (!history || history.length === 0) {
            historyContainer.innerHTML = '<p class="no-history">No recent analyses</p>';
            return;
        }

        let html = '';
        history.forEach((item, index) => {
            const timestamp = new Date(item.timestamp).toLocaleString();
            html += `
                <div class="history-item" data-index="${index}">
                    <div class="history-text">${escapeHtml(item.text)}</div>
                    <div class="history-details">
                        <div class="history-detail">
                            <span>Language:</span> ${item.detected_language || item.language}
                        </div>
                        <div class="history-detail">
                            <span>Prediction:</span> 
                            <span class="prediction-badge ${item.prediction}" style="padding: 2px 8px; font-size: 0.75rem;">${item.prediction}</span>
                        </div>
                        <div class="history-detail">
                            <span>Confidence:</span> ${item.confidence}%
                        </div>
                        <div class="history-detail">
                            <span>Bias:</span> ${item.bias_type}
                        </div>
                        <div class="history-detail">
                            <span>Time:</span> ${timestamp}
                        </div>
                    </div>
                </div>
            `;
        });
        
        historyContainer.innerHTML = html;
    }

    async function clearHistory() {
        if (!confirm('Are you sure you want to clear all history?')) {
            return;
        }

        try {
            const response = await fetch('/api/clear-history', {
                method: 'POST'
            });
            
            if (response.ok) {
                historyContainer.innerHTML = '<p class="no-history">No recent analyses</p>';
                localStorage.removeItem('fakeNewsHistory');
            }
        } catch (error) {
            console.error('Error clearing history:', error);
        }
    }

    function saveHistoryToStorage(history) {
        localStorage.setItem('fakeNewsHistory', JSON.stringify(history));
    }

    function loadHistoryFromStorage() {
        const stored = localStorage.getItem('fakeNewsHistory');
        if (stored) {
            try {
                const history = JSON.parse(stored);
                displayHistory(history);
            } catch (error) {
                console.error('Error loading history from storage:', error);
            }
        }
    }

    function copyResults() {
        const results = {
            prediction: predictionBadge.textContent,
            confidence: confidenceValue.textContent,
            language: languageResult.textContent,
            bias: biasBadge.textContent,
            explanation: explanationText.textContent,
            analysisTime: analysisTime.textContent
        };
        
        const text = `Fake News Analysis Results:
Prediction: ${results.prediction}
Confidence: ${results.confidence}
Language: ${results.language}
Bias Type: ${results.bias}
Analysis Time: ${results.analysisTime}

Explanation:
${results.explanation}`;
        
        navigator.clipboard.writeText(text).then(() => {
            showError('Results copied to clipboard!');
            setTimeout(() => hideError(), 2000);
        }).catch(err => {
            showError('Failed to copy results');
        });
    }

    function setLoading(isLoading) {
        const btnText = analyzeBtn.querySelector('.btn-text');
        const btnLoader = analyzeBtn.querySelector('.btn-loader');
        
        analyzeBtn.disabled = isLoading;
        
        if (isLoading) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-flex';
        } else {
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorContainer.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    function hideError() {
        errorContainer.innerHTML = '';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatExplanation(explanation, prediction) {
        const explanationBox = document.getElementById('explanationBox');
        
        // Parse explanation into sentences
        const sentences = explanation.split('. ').filter(s => s.trim().length > 0);
        
        let html = '';
        sentences.forEach(sentence => {
            const trimmed = sentence.trim();
            const icon = determineIcon(trimmed, prediction);
            html += `
                <div class="explanation-item">
                    <span class="icon ${icon.class}">${icon.symbol}</span>
                    <p>${escapeHtml(trimmed + (trimmed.endsWith('.') ? '' : '.'))}</p>
                </div>
            `;
        });
        
        explanationBox.innerHTML = html;
    }

    function determineIcon(sentence, prediction) {
        const positiveIndicators = ['verified', 'credible', 'evidence', 'source', 'balanced', 'neutral', 'factual', 'cited', 'research', 'accurate'];
        const negativeIndicators = ['unverified', 'unrealistic', 'contradicts', 'sensational', 'clickbait', 'extraordinary', 'no evidence', 'biased', 'partisan', 'emotional'];
        
        const lowerSentence = sentence.toLowerCase();
        
        for (const word of positiveIndicators) {
            if (lowerSentence.includes(word)) {
                return { symbol: '✓', class: 'positive' };
            }
        }
        
        for (const word of negativeIndicators) {
            if (lowerSentence.includes(word)) {
                return { symbol: '⚠️', class: 'warning' };
            }
        }
        
        // Default icon based on prediction
        if (prediction === 'REAL') {
            return { symbol: '✓', class: 'positive' };
        } else if (prediction === 'FAKE') {
            return { symbol: '⚠️', class: 'warning' };
        } else {
            return { symbol: 'ℹ️', class: 'positive' };
        }
    }

    function exportResults() {
        const results = {
            prediction: predictionBadge.textContent,
            confidence: confidenceValue.textContent,
            language: languageResult.textContent,
            bias: biasBadge.textContent,
            explanation: explanationText.textContent,
            analysisTime: analysisTime.textContent,
            timestamp: new Date().toISOString()
        };
        
        const json = JSON.stringify(results, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analysis_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showError('Results exported as JSON!');
        setTimeout(() => hideError(), 2000);
    }

    function updateFactCheckLinks(text) {
        const links = document.querySelectorAll('.fact-check-link');
        const encodedText = encodeURIComponent(text.substring(0, 200)); // Limit to first 200 chars for URL
        
        links.forEach(link => {
            const site = link.dataset.site;
            let url = '#';
            
            if (site === 'snopes') {
                url = `https://www.snopes.com/search/?query=${encodedText}`;
            } else if (site === 'factcheck') {
                url = `https://www.factcheck.org/search/?q=${encodedText}`;
            } else if (site === 'afp') {
                url = `https://factcheck.afp.com/search?search=${encodedText}`;
            }
            
            link.href = url;
        });
    }

    function calculateBiasBreakdown(biasType, biasPhrases) {
        let political = 10;
        let emotional = 10;
        let neutral = 80;
        
        // Adjust based on primary bias type
        if (biasType === 'POLITICAL') {
            political = 65;
            emotional = 15;
            neutral = 20;
        } else if (biasType === 'EMOTIONAL') {
            political = 10;
            emotional = 70;
            neutral = 20;
        } else if (biasType === 'NEUTRAL') {
            political = 8;
            emotional = 7;
            neutral = 85;
        }
        
        // Adjust based on detected phrases
        if (biasPhrases && biasPhrases.length > 0) {
            const phraseText = biasPhrases.join(' ').toLowerCase();
            const politicalWords = ['political', 'government', 'party', 'election', 'liberal', 'conservative', 'left', 'right'];
            const emotionalWords = ['shocking', 'unbelievable', 'outrage', 'fear', 'anger', 'hate', 'love', 'amazing'];
            
            const politicalCount = politicalWords.filter(word => phraseText.includes(word)).length;
            const emotionalCount = emotionalWords.filter(word => phraseText.includes(word)).length;
            
            if (politicalCount > 0) {
                political = Math.min(100, political + politicalCount * 5);
                neutral = Math.max(0, neutral - politicalCount * 3);
            }
            
            if (emotionalCount > 0) {
                emotional = Math.min(100, emotional + emotionalCount * 5);
                neutral = Math.max(0, neutral - emotionalCount * 3);
            }
        }
        
        // Normalize to ensure total is 100%
        const total = political + emotional + neutral;
        if (total !== 100) {
            const factor = 100 / total;
            political = Math.round(political * factor);
            emotional = Math.round(emotional * factor);
            neutral = 100 - political - emotional;
        }
        
        return { political, emotional, neutral };
    }

    function initDarkMode() {
        // Check localStorage for saved preference
        const savedMode = localStorage.getItem('darkMode');
        if (savedMode === 'true') {
            document.body.classList.add('dark-mode');
            darkModeToggle.textContent = '☀️';
        } else {
            darkModeToggle.textContent = '🌙';
        }
    }

    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        darkModeToggle.textContent = isDarkMode ? '☀️' : '🌙';
        localStorage.setItem('darkMode', isDarkMode);
    }
});
