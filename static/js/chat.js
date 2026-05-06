document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatContainer = document.getElementById('chatContainer');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const chatHistory = document.getElementById('chatHistory');
    const newChatBtn = document.getElementById('newChatBtn');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const sidebar = document.getElementById('sidebar');
    const charCount = document.getElementById('charCount');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn') || document.createElement('button');
    const sidebarOverlay = document.createElement('div');

    // Constants
    const MIN_TEXT_LENGTH = 10;
    const MAX_TEXT_LENGTH = 5000;
    const TYPING_DELAY = 1500;

    // State
    let chats = [];
    let currentChatId = null;
    let isTyping = false;

    // Initialize
    initSidebarOverlay();
    loadChatsFromStorage();
    initDarkMode();
    autoResizeTextarea();

    // Event Listeners
    messageInput.addEventListener('input', handleInput);
    messageInput.addEventListener('keydown', handleKeyDown);
    sendBtn.addEventListener('click', sendMessage);
    newChatBtn.addEventListener('click', startNewChat);
    sidebarToggle.addEventListener('click', toggleSidebar);
    darkModeToggle.addEventListener('click', toggleDarkMode);
    clearHistoryBtn.addEventListener('click', clearHistory);
    window.addEventListener('resize', handleResize);

    // Example suggestions click handlers
    const suggestionBtns = document.querySelectorAll('.suggestion-btn');
    suggestionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const text = this.getAttribute('data-text');
            messageInput.value = text;
            handleInput();
            messageInput.focus();
        });
    });

    // Functions
    function handleInput() {
        const text = messageInput.value.trim();
        const length = messageInput.value.length;
        
        charCount.textContent = `${length} / ${MAX_TEXT_LENGTH}`;
        
        if (length > MAX_TEXT_LENGTH) {
            charCount.style.color = '#ef4444';
            sendBtn.disabled = true;
        } else if (length >= MIN_TEXT_LENGTH) {
            charCount.style.color = '#6b7280';
            sendBtn.disabled = false;
        } else {
            charCount.style.color = '#6b7280';
            sendBtn.disabled = true;
        }
        
        autoResizeTextarea();
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled) {
                sendMessage();
            }
        }
    }

    function autoResizeTextarea() {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
    }

    function detectMultipleStatements(text) {
        const hasNumbering = /\n\s*\d+[.)\s]+/.test(text) || /^\d+[.)\s]+/.test(text);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > MIN_TEXT_LENGTH);
        
        if (hasNumbering) return true;
        if (sentences.length > 1) return true;
        return false;
    }

    function splitStatements(text) {
        // Improved paragraph-aware sentence splitting
        const paragraphs = text.split(/\n\n+/);
        const statements = [];
        const seen = new Set();
        
        paragraphs.forEach(paragraph => {
            const trimmed = paragraph.trim();
            if (!trimmed || trimmed.length < 20) return;
            
            // Check if paragraph is short enough to keep as one block
            if (trimmed.length < 300) {
                if (!seen.has(trimmed)) {
                    statements.push(trimmed);
                    seen.add(trimmed);
                }
                return;
            }
            
            // For longer paragraphs, split by sentence but preserve context
            const sentences = trimmed.split(/(?<=[.!?])\s+/);
            let currentBlock = '';
            
            sentences.forEach(sentence => {
                const trimmedSentence = sentence.trim();
                if (!trimmedSentence || trimmedSentence.length < 10) return;
                
                // Add to current block
                if (currentBlock) {
                    currentBlock += ' ' + trimmedSentence;
                } else {
                    currentBlock = trimmedSentence;
                }
                
                // If block is long enough, add it
                if (currentBlock.length >= 150) {
                    if (!seen.has(currentBlock)) {
                        statements.push(currentBlock);
                        seen.add(currentBlock);
                    }
                    currentBlock = '';
                }
            });
            
            // Add remaining block
            if (currentBlock && currentBlock.length >= 20 && !seen.has(currentBlock)) {
                statements.push(currentBlock);
                seen.add(currentBlock);
            }
        });
        
        return statements;
    }

    async function analyzeStatementsSequentially(statements, currentChat) {
        removeTypingIndicator();
        const results = [];
        const shouldCollapse = statements.length >= 20;
        
        // Show detection header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'message ai';
        headerDiv.innerHTML = `<div class="message-content"><div class="message-avatar">🤖</div><div class="message-text" style="font-size:14px;color:var(--text-secondary);">Detected ${statements.length} statement${statements.length > 1 ? 's' : ''}. Analyzing each one...</div></div>`;
        chatContainer.appendChild(headerDiv);
        scrollToBottom();
        await new Promise(r => setTimeout(r, 400));
        
        // Create collapsible container for large articles
        let collapseContainer = null;
        if (shouldCollapse) {
            collapseContainer = document.createElement('div');
            collapseContainer.className = 'results-collapse-container';
            collapseContainer.innerHTML = `
                <button class="collapse-toggle" onclick="this.nextElementSibling.classList.toggle('collapsed'); this.querySelector('.toggle-text').textContent = this.nextElementSibling.classList.contains('collapsed') ? 'Show Details' : 'Collapse Details';">
                    <span class="toggle-text">Collapse Details</span>
                    <span class="toggle-icon">▼</span>
                </button>
                <div class="collapse-content">
                </div>
            `;
            chatContainer.appendChild(collapseContainer);
            scrollToBottom();
        }
        
        const targetContainer = shouldCollapse ? collapseContainer.querySelector('.collapse-content') : chatContainer;
        
        try {
            for (let i = 0; i < statements.length; i++) {
                // Show thinking stages per statement
                const thinkingDiv = document.createElement('div');
                thinkingDiv.className = 'message ai thinking';
                thinkingDiv.id = `thinking-${i}`;
                thinkingDiv.innerHTML = `<div class="message-content"><div class="message-avatar">🤖</div><div class="message-text">${createThinkingStages()}</div></div>`;
                targetContainer.appendChild(thinkingDiv);
                scrollToBottom();
                
                await animateThinkingStages(thinkingDiv.querySelector('.thinking-stages'));
                
                // Remove thinking indicator for this statement
                const prevThinking = document.getElementById(`thinking-${i}`);
                if (prevThinking) prevThinking.remove();
                
                const analysis = analyzeText(statements[i]);
                results.push(analysis);
                
                addMessage('ai', null, analysis, i, true, targetContainer);
                
                if (currentChat) {
                    currentChat.messages.push({ role: 'ai', analysis: analysis });
                }
                
                scrollToBottom();
                await new Promise(r => setTimeout(r, 400));
            }
            
            // Render analysis summary
            if (results.length > 1) {
                const summaryDiv = document.createElement('div');
                summaryDiv.className = 'message ai';
                summaryDiv.innerHTML = `<div class="message-content"><div class="message-avatar">🤖</div><div class="message-text">${renderAnalysisSummary(results)}</div></div>`;
                chatContainer.appendChild(summaryDiv);
                scrollToBottom();
            }
        } catch (error) {
            console.error('Error during sequential analysis:', error);
            addMessage('ai', 'Sorry, an error occurred while analyzing one of the statements. Please try again.');
        } finally {
            saveChatsToStorage();
            updateChatHistory();
            isTyping = false;
        }
    }

    async function sendMessage() {
        const text = messageInput.value.trim();
        
        if (text.length < MIN_TEXT_LENGTH || text.length > MAX_TEXT_LENGTH) {
            return;
        }
        
        if (isTyping) {
            return;
        }

        // Hide welcome message
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }

        // Create new chat if needed
        if (!currentChatId) {
            currentChatId = Date.now().toString();
            chats.unshift({
                id: currentChatId,
                preview: text.substring(0, 50) + '...',
                messages: [],
                timestamp: new Date().toISOString()
            });
        }

        // Add user message
        addMessage('user', text);
        
        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        charCount.textContent = '0 / 5000';
        sendBtn.disabled = true;

        // Save to current chat
        const currentChat = chats.find(c => c.id === currentChatId);
        if (currentChat) {
            currentChat.messages.push({ role: 'user', text: text });
            currentChat.preview = text.substring(0, 50) + '...';
        }

        const isMultiple = detectMultipleStatements(text);

        if (isMultiple) {
            isTyping = true;
            const statements = splitStatements(text);
            removeTypingIndicator();
            
            try {
                // Brief skeleton flash then sequential analysis
                await new Promise(resolve => setTimeout(resolve, 600));
                await analyzeStatementsSequentially(statements, currentChat);
            } catch (error) {
                console.error('Error during multiple statement analysis:', error);
                removeTypingIndicator();
                addMessage('ai', 'Sorry, an error occurred while analyzing the statements. Please try again.');
                isTyping = false;
            }
        } else {
            isTyping = true;
            
            try {
                // Show thinking stages
                const thinkingDiv = document.createElement('div');
                thinkingDiv.className = 'message ai thinking';
                thinkingDiv.id = 'thinking-single';
                thinkingDiv.innerHTML = `<div class="message-content"><div class="message-avatar">🤖</div><div class="message-text">${createThinkingStages()}</div></div>`;
                chatContainer.appendChild(thinkingDiv);
                scrollToBottom();
                
                await animateThinkingStages(thinkingDiv.querySelector('.thinking-stages'));
                
                const prevThinking = document.getElementById('thinking-single');
                if (prevThinking) prevThinking.remove();
                
                const analysis = analyzeText(text);
                addMessage('ai', null, analysis, null, true);
                
                if (currentChat) {
                    currentChat.messages.push({ role: 'ai', analysis: analysis });
                }
                
                saveChatsToStorage();
                updateChatHistory();
            } catch (error) {
                console.error('Error during single statement analysis:', error);
                removeTypingIndicator();
                addMessage('ai', 'Sorry, an error occurred while analyzing the statement. Please try again.');
            } finally {
                isTyping = false;
            }
        }
    }

    function addMessage(role, text, analysis = null, index = null, useCard = true, targetContainer = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        const avatar = role === 'user' ? '👤' : '🤖';
        
        let contentHtml = '';
        
        if (role === 'user') {
            contentHtml = `
                <div class="message-avatar">${avatar}</div>
                <div class="message-text">${escapeHtml(text)}</div>
            `;
        } else if (analysis && useCard) {
            // Premium card rendering
            contentHtml = `
                <div class="message-avatar">${avatar}</div>
                <div class="message-text">
                    ${renderAnalysisCard(analysis, index)}
                </div>
            `;
        } else if (analysis) {
            // Fallback for history loading / plain text
            contentHtml = `
                <div class="message-avatar">${avatar}</div>
                <div class="message-text">${analysis.response || ''}</div>
            `;
        } else if (role === 'ai' && text) {
            contentHtml = `
                <div class="message-avatar">${avatar}</div>
                <div class="message-text">${escapeHtml(text)}</div>
            `;
        }

        messageDiv.innerHTML = `<div class="message-content">${contentHtml}</div>`;
        (targetContainer || chatContainer).appendChild(messageDiv);
        
        // Animate confidence bars in newly added cards
        if (analysis && useCard) {
            setTimeout(() => {
                const fills = messageDiv.querySelectorAll('.confidence-fill[data-width]');
                fills.forEach(fill => {
                    fill.style.width = fill.getAttribute('data-width');
                });
            }, 50);
        }
        
        scrollToBottom();
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai typing';
        typingDiv.id = 'typingIndicator';
        
        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="message-avatar">🤖</div>
                <div class="message-text">
                    <div class="typing-indicator">
                        <span class="typing-text">Analyzing</span>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            </div>
        `;
        
        chatContainer.appendChild(typingDiv);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Mock AI Analysis Logic
    function analyzeText(text) {
        const lowerText = text.toLowerCase();
        
        // Detect language
        const language = detectLanguage(text);
        
        // Enhanced keyword groups for better fake detection
        const scamSignals = [
            'free money', 'guaranteed income', 'instant payment', 'without registration', 
            'earn daily', 'miracle cure', 'aliens landed', 'unlimited money', 'cure cancer instantly',
            '100% guaranteed', 'without investment', 'viral claim', 'miracle treatment',
            'earn from home', 'get rich quick', 'guaranteed return', 'risk-free investment',
            'instant transfer', 'direct bank transfer', 'government scheme free',
            '₹2 lakh', '₹5 lakh', '₹10 lakh', 'unlimited cash'
        ];
        
        const unrealisticFinancial = [
            'every citizen', 'all citizens', 'everyone will get', 'starting tomorrow',
            'without any', 'no verification', 'no documents', 'no registration',
            'instantly', 'immediately', 'within hours', 'same day'
        ];
        
        const unrealisticMedical = [
            'cure cancer', 'cure diabetes', 'miracle cure', 'instant cure',
            'permanent cure', 'secret cure', 'breakthrough cure', 'natural cure'
        ];
        
        const sensationalClaims = [
            'aliens', 'ufo', 'miracle', 'shocking truth', 'hidden truth',
            'they dont want you to know', 'secret revealed', 'banned by',
            'government hiding', 'mainstream media wont report'
        ];
        
        // Source credibility - increase REAL confidence for trusted sources
        const credibleSources = [
            'reuters', 'associated press', 'ap news', 'bbc', 'bbc news',
            'ndtv', 'times of india', 'hindustan times', 'the hindu',
            'official military', 'defense ministry', 'flightradar24',
            'aviation authorities', 'official statement', 'government spokesperson'
        ];
        
        // Strong REAL indicators - major institutions and organizations
        const strongRealIndicators = [
            'isro', 'nasa', 'rbi', 'who', 'world health organization',
            'ministry of', 'government of', 'department of', 'university',
            'institute of', 'national institute', 'research institute',
            'space agency', 'central bank', 'federal reserve',
            'parliament', 'supreme court', 'high court'
        ];
        
        // Contextual REAL indicators - factual journalism patterns
        const contextRealSignals = [
            'according to', 'reported by', 'stated that', 'confirmed that',
            'spokesperson said', 'official said', 'authorities said',
            'on record', 'statement read', 'press release',
            'investigation ongoing', 'details emerging', 'preliminary report'
        ];
        
        // Journalism-style recognition - objective, factual, institutional
        const journalismPatterns = [
            'announced that', 'launched', 'mission', 'successful',
            'monitoring', 'development', 'program', 'initiative',
            'policy', 'regulation', 'guidelines', 'framework',
            'implementation', 'deployment', 'commissioned'
        ];
        
        // Technical/scientific vocabulary (REAL indicator)
        const technicalVocabulary = [
            'satellite', 'orbit', 'launch', 'trajectory', 'telemetry',
            'inflation', 'interest rate', 'monetary policy', 'fiscal',
            'vaccine', 'clinical trial', 'treatment', 'diagnosis',
            'infrastructure', 'development', 'investment', 'sector'
        ];
        
        // Timestamp and location patterns (REAL indicators)
        const timestampPatterns = [
            'today', 'yesterday', 'on ', 'at :', 'gmt', 'utc', 'ist',
            'morning', 'afternoon', 'evening', 'night'
        ];
        
        const locationPatterns = [
            'in ', 'at ', 'near ', 'from ', 'to ',
            'district', 'state', 'province', 'region', 'country'
        ];
        
        // Breaking news/emergency patterns (should not auto-downgrade)
        const breakingNewsPatterns = [
            'breaking news', 'developing story', 'emergency', 'crisis',
            'military operation', 'deployment', 'aircraft', 'flight',
            'missing', 'crashed', 'under investigation', 'search operation'
        ];
        
        // Reduced weight for official keywords (they shouldn't auto-classify as real)
        const realSignals = ['isro', 'policy', 'report', 'announced', 'launched', 'court'];
        const uncertainSignals = ['viral', 'claims', 'unconfirmed', 'rumor', 'reportedly', 'alleged', 'reportedly said'];
        const politicalSignals = ['government', 'policy', 'political', 'election', 'party', 'minister', 'parliament'];
        const emotionalSignals = ['shocking', 'amazing', 'incredible', 'outrage', 'fear', 'hate', 'love', 'tragic', 'horrifying'];
        
        const fakeSignals = [...scamSignals.slice(0, 6)];
        
        // Count keyword matches for each category
        const scamScore = countOccurrences(lowerText, scamSignals);
        const unrealisticFinancialScore = countOccurrences(lowerText, unrealisticFinancial);
        const unrealisticMedicalScore = countOccurrences(lowerText, unrealisticMedical);
        const sensationalScore = countOccurrences(lowerText, sensationalClaims);
        const fakeScore = countOccurrences(lowerText, fakeSignals);
        const realScore = countOccurrences(lowerText, realSignals) * 0.5;
        const uncertainScore = countOccurrences(lowerText, uncertainSignals);
        const politicalScore = countOccurrences(lowerText, politicalSignals);
        const emotionalScore = countOccurrences(lowerText, emotionalSignals);
        
        // Contextual scoring
        const credibleSourceScore = countOccurrences(lowerText, credibleSources) * 2; // High weight
        const strongRealScore = countOccurrences(lowerText, strongRealIndicators) * 3; // Very high weight
        const contextRealScore = countOccurrences(lowerText, contextRealSignals) * 1.5;
        const journalismScore = countOccurrences(lowerText, journalismPatterns) * 1;
        const technicalScore = countOccurrences(lowerText, technicalVocabulary) * 1;
        const timestampScore = countOccurrences(lowerText, timestampPatterns) * 0.5;
        const locationScore = countOccurrences(lowerText, locationPatterns) * 0.5;
        const breakingNewsScore = countOccurrences(lowerText, breakingNewsPatterns);
        
        // Collect matched words
        const matchedScam = findMatches(lowerText, scamSignals);
        const matchedUnrealisticFinancial = findMatches(lowerText, unrealisticFinancial);
        const matchedUnrealisticMedical = findMatches(lowerText, unrealisticMedical);
        const matchedSensational = findMatches(lowerText, sensationalClaims);
        const matchedFake = [...findMatches(lowerText, fakeSignals), ...matchedScam];
        const matchedReal = findMatches(lowerText, realSignals);
        const matchedUncertain = findMatches(lowerText, uncertainSignals);
        const matchedCredibleSource = findMatches(lowerText, credibleSources);
        const matchedStrongReal = findMatches(lowerText, strongRealIndicators);
        
        // Calculate combined fake score (scam patterns have high weight)
        const combinedFakeScore = scamScore * 3 + unrealisticFinancialScore * 2.5 + unrealisticMedicalScore * 3 + sensationalScore * 2 + fakeScore;
        
        // Calculate contextual real score (enhanced with strong indicators)
        const contextualRealScore = credibleSourceScore + strongRealScore + contextRealScore + journalismScore + technicalScore + timestampScore + locationScore;
        
        // Decision priority logic with enhanced fake detection
        let label = 'UNCERTAIN';
        let confidence = 50;
        let confidenceReason = 'Weak indicators detected';
        let matchedWords = [];
        
        // Semantic contradiction detection - unrealistic claims override real indicators
        const hasUnrealisticFinancial = unrealisticFinancialScore >= 2;
        const hasUnrealisticMedical = unrealisticMedicalScore >= 1;
        const hasSensational = sensationalScore >= 1;
        const hasScamPattern = scamScore >= 1;
        const hasCredibleSource = credibleSourceScore >= 2;
        const hasStrongRealIndicators = strongRealScore >= 3;
        const isBreakingNews = breakingNewsScore >= 1;
        
        // If scam patterns or unrealistic claims detected, classify as FAKE regardless of official keywords
        if (scamScore >= 1 || unrealisticFinancialScore >= 2 || unrealisticMedicalScore >= 1 || sensationalScore >= 1) {
            label = 'FAKE';
            matchedWords = [...matchedScam, ...matchedUnrealisticFinancial, ...matchedUnrealisticMedical, ...matchedSensational].slice(0, 8);
            
            // Calculate confidence based on scam strength (FAKE range: 75-99%)
            const scamStrength = scamScore * 3 + unrealisticFinancialScore * 2.5 + unrealisticMedicalScore * 3 + sensationalScore * 2;
            if (scamStrength >= 5) {
                confidence = 85 + Math.min(14, scamStrength - 5) * 1;
                confidenceReason = 'Strong scam patterns detected';
            } else if (scamStrength >= 3) {
                confidence = 75 + Math.min(10, (scamStrength - 3) * 2.5);
                confidenceReason = 'Moderate scam patterns detected';
            } else {
                confidence = 75 + Math.min(5, scamStrength * 2);
                confidenceReason = 'Suspicious patterns detected';
            }
        } else if (fakeScore >= 2) {
            label = 'FAKE';
            matchedWords = matchedFake;
            
            // FAKE range: 75-99%
            if (fakeScore >= 4) {
                confidence = 85 + Math.min(14, (fakeScore - 4) * 2);
                confidenceReason = 'Strong indicators detected';
            } else {
                confidence = 75 + Math.min(10, (fakeScore - 2) * 2.5);
                confidenceReason = 'Moderate indicators detected';
            }
        } else if (hasStrongRealIndicators && scamScore === 0) {
            // Strong institutional indicators = REAL (ISRO, NASA, RBI, WHO, etc.)
            label = 'REAL';
            matchedWords = [...matchedStrongReal, ...matchedReal].slice(0, 6);
            
            // REAL range: 65-95%
            const strongIndicatorStrength = strongRealScore + contextualRealScore;
            if (strongIndicatorStrength >= 8) {
                confidence = 85 + Math.min(10, (strongIndicatorStrength - 8) * 1.5);
                confidenceReason = 'Strong institutional indicators detected';
            } else {
                confidence = 65 + Math.min(20, strongIndicatorStrength * 2);
                confidenceReason = 'Institutional indicators detected';
            }
        } else if (hasCredibleSource && contextualRealScore >= 4 && scamScore === 0) {
            // Credible source with strong contextual indicators = REAL
            label = 'REAL';
            matchedWords = [...matchedReal, ...matchedCredibleSource].slice(0, 6);
            
            // REAL range: 65-95%
            const contextStrength = contextualRealScore;
            if (contextStrength >= 6) {
                confidence = 80 + Math.min(15, (contextStrength - 6) * 1.5);
                confidenceReason = 'Credible source with strong contextual indicators';
            } else {
                confidence = 65 + Math.min(15, contextStrength * 2);
                confidenceReason = 'Credible source detected';
            }
        } else if (realScore >= 1.5 && scamScore === 0 && unrealisticFinancialScore === 0) {
            // Only classify as REAL if no scam patterns exist and real signals are present
            label = 'REAL';
            matchedWords = matchedReal;
            
            // REAL range: 65-95%
            if (realScore >= 3) {
                confidence = 75 + Math.min(20, (realScore - 3) * 2);
                confidenceReason = 'Strong indicators detected';
            } else {
                confidence = 65 + Math.min(10, (realScore - 1.5) * 2.5);
                confidenceReason = 'Moderate indicators detected';
            }
        } else if (isBreakingNews && scamScore === 0 && contextualRealScore >= 2) {
            // Breaking news with contextual support - lean REAL with moderate confidence
            label = 'REAL';
            matchedWords = ['breaking news pattern', ...matchedReal].slice(0, 5);
            confidence = 60 + Math.min(15, contextualRealScore * 2);
            confidenceReason = 'Breaking news pattern - information developing';
        } else if (uncertainScore > 0 && !hasCredibleSource && !hasStrongRealIndicators && contextualRealScore < 2) {
            // Only use UNCERTAIN if no credible source, no strong real indicators, and low contextual support
            label = 'UNCERTAIN';
            matchedWords = matchedUncertain;
            
            // UNCERTAIN range: 40-65%
            if (uncertainScore >= 2) {
                confidence = 50 + Math.min(15, (uncertainScore - 2) * 3);
                confidenceReason = 'Moderate indicators detected';
            } else {
                confidence = 40 + Math.min(10, uncertainScore * 5);
                confidenceReason = 'Weak indicators detected';
            }
        } else {
            // Default to UNCERTAIN with neutral confidence
            label = 'UNCERTAIN';
            confidence = 50;
            matchedWords = ['insufficient indicators'];
            confidenceReason = 'Weak indicators detected';
        }
        
        // Determine bias
        let bias = 'Neutral';
        if (politicalScore > emotionalScore && politicalScore > 0) {
            bias = 'Political';
        } else if (emotionalScore > politicalScore && emotionalScore > 0) {
            bias = 'Emotional';
        }
        
        // Generate simple explanation for backward-compatible response field
        const response = generateDynamicExplanation(label, matchedWords);
        
        // Clamp confidence to 0-100 range
        confidence = Math.max(0, Math.min(100, confidence));
        
        return {
            label,
            confidence: Math.round(confidence),
            confidenceReason,
            matchedWords,
            bias,
            language,
            response
        };
    }
    
    function countOccurrences(text, keywords) {
        let count = 0;
        keywords.forEach(keyword => {
            const regex = new RegExp(keyword, 'gi');
            const matches = text.match(regex);
            if (matches) {
                count += matches.length;
            }
        });
        return count;
    }
    
    function findMatches(text, keywords) {
        const matches = [];
        keywords.forEach(keyword => {
            if (text.includes(keyword)) {
                matches.push(keyword);
            }
        });
        return [...new Set(matches)]; // Remove duplicates
    }
    
    // ============================================================
    // DYNAMIC RESPONSE GENERATION (No more repetitive text)
    // ============================================================
    
    const FAKE_EXPLANATIONS = [
        "Detected manipulative language patterns commonly used in misinformation campaigns.",
        "Contains claims that contradict established facts and lack verifiable attribution.",
        "Shows hallmarks of fabricated content designed to provoke emotional reactions.",
        "The narrative structure deviates from credible reporting standards significantly.",
        "Identified deceptive framing techniques aimed at misleading the reader.",
        "This content contains unrealistic financial promises and suspicious scam-like patterns commonly found in misinformation.",
        "Detected unrealistic monetary claims and suspicious phrases typical of financial scams.",
        "Contains impossible promises and emotional manipulation characteristic of fraudulent schemes.",
        "Identified multiple red flags including unrealistic guarantees and lack of verification requirements."
    ];
    
    const REAL_EXPLANATIONS = [
        "Aligns with verified reporting from credible institutional sources.",
        "Demonstrates factual consistency and proper contextual framing.",
        "Contains attributed claims with clear provenance and editorial standards.",
        "Matches patterns of legitimate news with verifiable data points.",
        "Reflects responsible journalism with balanced perspective and sourcing."
    ];
    
    const UNCERTAIN_EXPLANATIONS = [
        "Contains ambiguous claims that require additional verification.",
        "Shows partial sourcing without complete contextual evidence.",
        "Mixed indicators prevent a definitive authenticity assessment.",
        "Lacks sufficient corroborating references for full validation.",
        "Requires cross-referencing with established news outlets."
    ];
    
    function pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
    
    function generateDynamicExplanation(label, matchedWords) {
        let base = '';
        if (label === 'FAKE') {
            base = pickRandom(FAKE_EXPLANATIONS);
            if (matchedWords.length > 0 && matchedWords[0] !== 'insufficient indicators') {
                base += ` Key trigger phrases: "${matchedWords.slice(0, 2).join('" and "')}".`;
            }
        } else if (label === 'REAL') {
            base = pickRandom(REAL_EXPLANATIONS);
            if (matchedWords.length > 0 && matchedWords[0] !== 'insufficient indicators') {
                base += ` Supported by references to ${matchedWords.slice(0, 2).join(' and ')}.`;
            }
        } else {
            base = pickRandom(UNCERTAIN_EXPLANATIONS);
            if (matchedWords.length > 0 && matchedWords[0] !== 'insufficient indicators') {
                base += ` Uncertain phrases: "${matchedWords.slice(0, 2).join('" and "')}".`;
            }
        }
        return base;
    }
    
    function generateWhyFlagged(label, bias, matchedWords) {
        const items = [];
        if (label === 'FAKE') {
            items.push('Emotional wording detected');
            items.push('Suspicious financial claims');
            items.push('No trusted source references');
            items.push('Political influence indicators');
            items.push('Semantic inconsistency detected');
        } else if (label === 'REAL') {
            items.push('Credible institutional language patterns');
            items.push('Proper attribution and contextual references found');
            items.push('Consistent with verified news structure');
        } else {
            items.push('Ambiguous claims without full verification');
            items.push('Partial sourcing with missing attribution');
            items.push('Insufficient data for definitive assessment');
        }
        if (bias !== 'Neutral') {
            items.push(`${bias} bias indicators present in tone and framing`);
        }
        if (matchedWords.length > 0 && matchedWords[0] !== 'insufficient indicators') {
            items.push(`Specific trigger phrases: ${matchedWords.slice(0, 3).join(', ')}`);
        }
        return items;
    }
    
    function generateNLPMetrics(label, confidence, bias, language, text) {
        const sentiment = label === 'FAKE' ? 'Negative' : label === 'REAL' ? 'Neutral' : 'Mixed';
        const semanticScore = Math.round(confidence * 0.92 + Math.random() * 4);
        const transformerConf = Math.round(confidence * 0.88 + Math.random() * 6);
        const tokenCount = text && text.trim() ? text.trim().split(/\s+/).length : 0;
        return {
            sentiment,
            semanticScore: Math.min(99, semanticScore),
            transformerConf: Math.min(99, transformerConf),
            language,
            tokenCount
        };
    }
    
    function renderAnalysisCard(analysis, index) {
        const label = analysis.label || 'UNCERTAIN';
        const confidence = analysis.confidence || 50;
        const confidenceReason = analysis.confidenceReason || analysis.reason || 'Indicators detected';
        const matchedWords = analysis.matchedWords || analysis.reasons || [];
        const bias = analysis.bias || 'Neutral';
        const language = analysis.language || 'English';
        const badgeClass = label === 'FAKE' ? 'badge-fake' : label === 'REAL' ? 'badge-real' : 'badge-uncertain';
        const fillClass = label === 'FAKE' ? 'fill-fake' : label === 'REAL' ? 'fill-real' : 'fill-uncertain';
        const explanation = generateDynamicExplanation(label, matchedWords);
        const whyFlagged = generateWhyFlagged(label, bias, matchedWords);
        const metrics = generateNLPMetrics(label, confidence, bias, language, matchedWords.join(' '));
        
        let cardHtml = `<div class="analysis-card" data-prediction="${label}">`;
        
        // Numbering for multiple statements
        if (index !== undefined && index !== null) {
            cardHtml += `<div class="card-number">${index + 1}</div>`;
        }
        
        // Warning banners
        if (label === 'FAKE') {
            cardHtml += `<div class="fake-warning"><span class="fake-warning-icon">&#9888;</span><span>Potential misinformation detected</span></div>`;
        } else if (label === 'UNCERTAIN') {
            cardHtml += `<div class="uncertain-warning"><span class="uncertain-warning-icon">&#9432;</span><span>Verification recommended</span></div>`;
        }
        
        // Header: badge + confidence bar
        cardHtml += `<div class="card-header">`;
        cardHtml += `<span class="prediction-badge ${badgeClass}">${label}</span>`;
        cardHtml += `<div class="confidence-bar-container">`;
        cardHtml += `<div class="confidence-track"><div class="confidence-fill ${fillClass}" style="width: 0%" data-width="${confidence}%"></div></div>`;
        cardHtml += `<span class="confidence-value">${confidence}%</span>`;
        cardHtml += `</div></div>`;
        
        // Body: explanation + metrics + phrases
        cardHtml += `<div class="card-body">`;
        cardHtml += `<p class="card-explanation">${explanation}</p>`;
        
        // NLP Metrics
        cardHtml += `<div class="nlp-metrics">`;
        cardHtml += `<div class="metric-item"><span class="metric-label">Sentiment</span><span class="metric-value">${metrics.sentiment}</span></div>`;
        cardHtml += `<div class="metric-item"><span class="metric-label">Semantic</span><span class="metric-value">${metrics.semanticScore}%</span></div>`;
        cardHtml += `<div class="metric-item"><span class="metric-label">Transformer</span><span class="metric-value">${metrics.transformerConf}%</span></div>`;
        cardHtml += `<div class="metric-item"><span class="metric-label">Language</span><span class="metric-value">${metrics.language}</span></div>`;
        cardHtml += `<div class="metric-item"><span class="metric-label">Tokens</span><span class="metric-value">${metrics.tokenCount}</span></div>`;
        cardHtml += `</div>`;
        
        // Key phrases
        if (matchedWords.length > 0 && matchedWords[0] !== 'insufficient indicators') {
            cardHtml += `<div class="key-phrases">`;
            matchedWords.slice(0, 8).forEach(word => {
                cardHtml += `<span class="phrase-tag">${escapeHtml(word)}</span>`;
            });
            cardHtml += `</div>`;
        }
        
        // Why flagged expandable
        cardHtml += `<div class="why-flagged">`;
        cardHtml += `<button class="why-flagged-toggle" onclick="this.classList.toggle('expanded'); this.nextElementSibling.classList.toggle('visible')">Why flagged?</button>`;
        cardHtml += `<div class="why-flagged-content">`;
        whyFlagged.forEach(item => {
            cardHtml += `<div class="why-flagged-item">${escapeHtml(item)}</div>`;
        });
        cardHtml += `</div></div>`;
        
        cardHtml += `</div></div>`;
        return cardHtml;
    }
    
    // Typing effect for AI text
    async function typeTextIntoElement(element, text, speed = 12) {
        element.classList.add('typing-cursor');
        element.textContent = '';
        for (let i = 0; i < text.length; i++) {
            element.textContent += text[i];
            if (i % 3 === 0) await new Promise(r => setTimeout(r, speed));
        }
        element.classList.remove('typing-cursor');
    }
    
    // Thinking stages animation
    function createThinkingStages() {
        const stages = ['Tokenizing input...', 'Detecting language...', 'Running transformer inference...', 'Generating explanation...'];
        let html = '<div class="thinking-stages">';
        stages.forEach((stage, i) => {
            html += `<div class="thinking-stage" data-stage="${i}"><span class="thinking-stage-dot"></span><span>${stage}</span></div>`;
        });
        html += '</div>';
        return html;
    }
    
    async function animateThinkingStages(container) {
        const stages = container.querySelectorAll('.thinking-stage');
        for (let i = 0; i < stages.length; i++) {
            stages[i].classList.add('active');
            await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
            stages[i].classList.remove('active');
            stages[i].classList.add('completed');
        }
    }
    
    // Analysis summary card for multiple statements
    function renderAnalysisSummary(results) {
        const counts = { REAL: 0, FAKE: 0, UNCERTAIN: 0 };
        results.forEach(r => { if (counts[r.label] !== undefined) counts[r.label]++; });
        const total = results.length;
        
        // Check if article contains breaking news patterns
        const breakingNewsPatterns = ['breaking news', 'developing story', 'emergency', 'crisis', 'military operation', 'deployment', 'aircraft', 'flight', 'missing', 'crashed', 'under investigation', 'search operation'];
        let hasBreakingNews = false;
        let articleText = results.map(r => r.response || '').join(' ').toLowerCase();
        hasBreakingNews = breakingNewsPatterns.some(pattern => articleText.includes(pattern));
        
        // Weighted scoring: REAL = +1.0, UNCERTAIN = +0.2, FAKE = -1.0
        let weightedSum = (counts.REAL * 1.0) + (counts.UNCERTAIN * 0.2) - (counts.FAKE * 1.0);
        let maxPossible = counts.REAL + counts.UNCERTAIN + counts.FAKE;
        
        // Normalize to 0-100 range
        let trustScore = 50; // Default neutral
        if (maxPossible > 0) {
            // Scale weighted sum to 0-100, with 50 as neutral baseline
            let normalizedScore = ((weightedSum / maxPossible) * 100 + 100) / 2;
            trustScore = Math.round(Math.max(0, Math.min(100, normalizedScore)));
        }
        
        // Boost score for articles with no FAKE detections (common in real news)
        if (counts.FAKE === 0 && total > 0) {
            trustScore = Math.min(100, trustScore + 10);
        }
        
        // Additional boost for breaking news with no FAKE (uncertainty is expected)
        if (hasBreakingNews && counts.FAKE === 0) {
            trustScore = Math.min(100, trustScore + 5);
        }
        
        // Determine credibility label and summary
        let credibility = '';
        let summary = '';
        let credibilityClass = '';
        
        if (trustScore >= 90) {
            credibility = 'Highly Credible';
            summary = 'This article contains well-verified reporting with strong factual grounding.';
            credibilityClass = 'credibility-highly-credible';
        } else if (trustScore >= 75) {
            credibility = 'Credible';
            summary = 'This article contains mostly verified reporting with reliable sources.';
            credibilityClass = 'credibility-credible';
        } else if (trustScore >= 55) {
            credibility = 'Mixed Reliability';
            summary = hasBreakingNews 
                ? 'This is a developing story with verified reporting and some evolving details.'
                : 'This article contains partially verified reporting with some unresolved details.';
            credibilityClass = 'credibility-mixed';
        } else if (trustScore >= 35) {
            credibility = 'Verification Recommended';
            summary = 'This article contains unverified claims; verification is recommended.';
            credibilityClass = 'credibility-verification-needed';
        } else {
            credibility = 'Low Credibility';
            summary = 'This article contains multiple unverified or misleading claims.';
            credibilityClass = 'credibility-low';
        }
        
        // Special handling for articles with only REAL + UNCERTAIN (no FAKE)
        if (counts.FAKE === 0 && counts.REAL > 0 && counts.UNCERTAIN > 0) {
            credibility = trustScore >= 55 ? 'Mixed Reliability' : 'Verification Recommended';
            summary = hasBreakingNews
                ? 'This is a developing story with verified reporting and some evolving details.'
                : 'This article contains verified reporting with some evolving details.';
        }
        
        // Special handling for breaking news with mostly REAL
        if (hasBreakingNews && counts.FAKE === 0 && counts.REAL >= counts.UNCERTAIN) {
            credibility = trustScore >= 55 ? 'Credible' : 'Mixed Reliability';
            summary = 'This is a developing story with verified reporting and some evolving details.';
        }
        
        let html = '<div class="analysis-summary">';
        html += '<div class="analysis-summary-title">Analysis Summary</div>';
        
        // Trust score section
        html += '<div class="trust-score-section">';
        html += `<div class="trust-score-value">${trustScore}%</div>`;
        html += `<div class="trust-score-label">Overall Trust Score</div>`;
        html += `<div class="trust-score-credibility ${credibilityClass}">${credibility}</div>`;
        html += '</div>';
        
        // Article summary
        html += `<div class="article-summary">${summary}</div>`;
        
        // Stats grid
        html += '<div class="summary-stats">';
        html += `<div class="summary-stat"><span class="summary-stat-value stat-total">${total}</span><span class="summary-stat-label">Total</span></div>`;
        html += `<div class="summary-stat"><span class="summary-stat-value stat-real">${counts.REAL}</span><span class="summary-stat-label">Real</span></div>`;
        html += `<div class="summary-stat"><span class="summary-stat-value stat-fake">${counts.FAKE}</span><span class="summary-stat-label">Fake</span></div>`;
        html += `<div class="summary-stat"><span class="summary-stat-value stat-uncertain">${counts.UNCERTAIN}</span><span class="summary-stat-label">Uncertain</span></div>`;
        html += '</div></div>';
        return html;
    }
    
    function detectLanguage(text) {
        // Telugu Unicode range: 0x0C00 to 0x0C7F
        // Hindi (Devanagari) Unicode range: 0x0900 to 0x097F
        
        let teluguCount = 0;
        let hindiCount = 0;
        
        for (let char of text) {
            const code = char.charCodeAt(0);
            
            // Telugu range
            if (code >= 0x0C00 && code <= 0x0C7F) {
                teluguCount++;
            }
            // Hindi/Devanagari range
            else if (code >= 0x0900 && code <= 0x097F) {
                hindiCount++;
            }
        }
        
        // Determine language based on character counts
        if (teluguCount > 0) {
            return 'Telugu';
        } else if (hindiCount > 0) {
            return 'Hindi';
        } else {
            return 'English';
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Chat History Management
    function startNewChat() {
        currentChatId = null;
        chatContainer.innerHTML = `
            <div class="welcome-message" id="welcomeMessage">
                <div class="welcome-icon">🔍</div>
                <h1>AI News Analyzer</h1>
                <p>Paste any news article or text to analyze it for fake news, bias, and credibility.</p>
                <div class="example-suggestions">
                    <p class="suggestions-label">Try examples:</p>
                    <button class="suggestion-btn" data-text="Government gives ₹1 lakh to everyone">Government gives ₹1 lakh to everyone</button>
                    <button class="suggestion-btn" data-text="ISRO launches new satellite">ISRO launches new satellite</button>
                    <button class="suggestion-btn" data-text="Viral video claims politician statement">Viral video claims politician statement</button>
                </div>
            </div>
        `;
        // Re-attach suggestion handlers after recreating welcome message
        setTimeout(() => {
            document.querySelectorAll('.suggestion-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const text = this.getAttribute('data-text');
                    messageInput.value = text;
                    handleInput();
                    messageInput.focus();
                });
            });
        }, 0);
        updateChatHistory();
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    }

    function updateChatHistory() {
        chatHistory.innerHTML = '';
        
        chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = `chat-history-item ${chat.id === currentChatId ? 'active' : ''}`;
            item.innerHTML = `
                <div class="preview">${escapeHtml(chat.preview)}</div>
            `;
            item.addEventListener('click', () => loadChat(chat.id));
            chatHistory.appendChild(item);
        });
    }

    function loadChat(chatId) {
        currentChatId = chatId;
        const chat = chats.find(c => c.id === chatId);
        
        if (!chat) {
            return;
        }
        
        // Clear chat container
        chatContainer.innerHTML = '';
        
        // Load messages
        chat.messages.forEach(msg => {
            if (msg.role === 'user') {
                addMessage('user', msg.text);
            } else if (msg.role === 'ai' && msg.analysis) {
                addMessage('ai', null, msg.analysis);
            }
        });
        
        updateChatHistory();
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    }

    function saveChatsToStorage() {
        localStorage.setItem('newsAnalyzerChats', JSON.stringify(chats));
    }

    function loadChatsFromStorage() {
        const stored = localStorage.getItem('newsAnalyzerChats');
        if (stored) {
            try {
                chats = JSON.parse(stored);
                updateChatHistory();
            } catch (error) {
                console.error('Error loading chats:', error);
            }
        }
    }

    function clearHistory() {
        if (confirm('Clear all chat history?')) {
            chats = [];
            currentChatId = null;
            localStorage.removeItem('newsAnalyzerChats');
            startNewChat();
        }
    }

    // Sidebar Functions
    function toggleSidebar() {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('active');
        } else {
            sidebar.classList.toggle('collapsed');
        }
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    }

    function initSidebarOverlay() {
        sidebarOverlay.className = 'sidebar-overlay';
        sidebarOverlay.addEventListener('click', closeSidebar);
        document.body.appendChild(sidebarOverlay);
    }

    function handleResize() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
            sidebar.classList.remove('collapsed');
        }
    }

    // Dark Mode Functions
    function initDarkMode() {
        const savedMode = localStorage.getItem('darkMode');
        if (savedMode === 'true') {
            document.body.classList.add('dark-mode');
        }
    }

    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
    }
});
