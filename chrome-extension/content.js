// Cisco Questions Search Overlay Content Script
class CiscoQuestionsOverlay {
    constructor() {
        this.questions = [];
        this.filteredQuestions = [];
        this.isVisible = false;
        this.overlay = null;
        this.searchInput = null;
        this.resultsContainer = null;
        this.resultsCount = null;
        this.loadingIndicator = null;
        this.noResults = null;
        this.errorMessage = null;

        this.init();
    }

    init() {
        this.createOverlay();
        this.setupEventListeners();
        this.loadQuestions();
    }

    createOverlay() {
        // Create overlay container
        this.overlay = document.createElement('div');
        this.overlay.id = 'cisco-questions-overlay';

        this.overlay.innerHTML = `
            <div class="cisco-overlay-container">
                <div class="cisco-overlay-header">
                    <button class="cisco-overlay-close" id="cisco-close-btn">×</button>
                </div>

                <div class="cisco-search-section">
                    <input type="text" id="cisco-search-input" class="cisco-search-input"
                           placeholder="Search questions, answers, or explanations..." autocomplete="off">
                    <button id="cisco-search-btn" class="cisco-btn">Search</button>
                    <button id="cisco-clear-btn" class="cisco-btn cisco-btn-clear">Clear</button>
                </div>

                <div class="cisco-stats">
                    <span id="cisco-results-count">Loading questions...</span>
                </div>

                <div id="cisco-loading" class="cisco-loading cisco-hidden">Searching...</div>

                <div id="cisco-results-container" class="cisco-results-container">
                    <!-- Search results will be displayed here -->
                </div>

                <div id="cisco-no-results" class="cisco-no-results cisco-hidden">
                    <p>No questions found matching your search.</p>
                </div>

                <div id="cisco-error-message" class="cisco-error cisco-hidden">
                    <p>Error loading questions. Please refresh the page and try again.</p>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Get references to elements
        this.searchInput = document.getElementById('cisco-search-input');
        this.resultsContainer = document.getElementById('cisco-results-container');
        this.resultsCount = document.getElementById('cisco-results-count');
        this.loadingIndicator = document.getElementById('cisco-loading');
        this.noResults = document.getElementById('cisco-no-results');
        this.errorMessage = document.getElementById('cisco-error-message');
    }

    setupEventListeners() {
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'toggle-overlay') {
                this.toggleOverlay();
            }
        });

        // Close button
        document.getElementById('cisco-close-btn').addEventListener('click', () => {
            this.hideOverlay();
        });

        // Close on overlay background click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hideOverlay();
            }
        });

        // Search functionality
        this.searchInput.addEventListener('input', (e) => {
            this.performSearch(e.target.value);
        });

        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch(e.target.value);
            }
            if (e.key === 'Escape') {
                this.hideOverlay();
            }
        });

        document.getElementById('cisco-search-btn').addEventListener('click', () => {
            this.performSearch(this.searchInput.value);
        });

        document.getElementById('cisco-clear-btn').addEventListener('click', () => {
            this.clearSearch();
        });

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // ESC to close overlay
            if (e.key === 'Escape' && this.isVisible) {
                this.hideOverlay();
            }

            // Ctrl+Shift+Q or Cmd+Shift+Q to toggle
            if (e.key === 'Q' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.toggleOverlay();
            }
        });
    }

    async loadQuestions() {
        try {
            // Request questions from background script
            chrome.runtime.sendMessage(
                { action: 'get-questions' },
                (response) => {
                    if (response.error) {
                        throw new Error(response.error);
                    }

                    this.questions = Array.isArray(response.questions) ? response.questions : [];
                    this.filteredQuestions = [...this.questions];
                    this.updateResultsCount();
                    this.displayQuestions(this.filteredQuestions.slice(0, 10));
                }
            );
        } catch (error) {
            console.error('Error loading questions:', error);
            this.showError();
        }
    }

    toggleOverlay() {
        if (this.isVisible) {
            this.hideOverlay();
        } else {
            this.showOverlay();
        }
    }

showOverlay() {
        // 1. Megnézzük, van-e kijelölve szöveg az oldalon
        const selectedText = window.getSelection().toString().trim();

        this.isVisible = true;
        this.overlay.classList.add('show');
        document.body.classList.add('cisco-overlay-active');

        // 2. Ha van kijelölés, beírjuk a keresőbe és keresünk
        if (selectedText) {
            this.searchInput.value = selectedText;
            this.performSearch(selectedText); // Azonnal elindítja a keresést
        }

        // 3. Fókuszálás az input mezőre
        setTimeout(() => {
            this.searchInput.focus();

            // Extra kényelem: Ha volt szöveg, jelöljük ki a mezőben is.
            // Így ha mégsem arra akartál keresni, egy gombnyomással felülírhatod.
            if (selectedText) {
                this.searchInput.select();
            }
        }, 100); // 200ms helyett 100ms általában elég és gyorsabbnak érződik
    }

    hideOverlay() {
        this.isVisible = false;
        this.overlay.classList.remove('show');
        document.body.classList.remove('cisco-overlay-active');
        
        if (this.searchInput) {
            this.searchInput.value = '';
        }
    }

    performSearch(query) {
        const trimmedQuery = query.trim().toLowerCase();

        if (!trimmedQuery) {
            this.filteredQuestions = [...this.questions];
        } else {
            this.filteredQuestions = this.questions.filter(question => {
                const questionText = (question.question_text || '').toLowerCase();
                const questionNumber = (question.question_number || '').toString();
                const optionsText = question.options ? question.options.join(' ').toLowerCase() : '';
                const correctAnswersText = question.correct_answers ? question.correct_answers.join(' ').toLowerCase() : '';
                const explanationText = (question.explanation || '').toLowerCase();

                return questionText.includes(trimmedQuery) ||
                       questionNumber.includes(trimmedQuery) ||
                       optionsText.includes(trimmedQuery) ||
                       correctAnswersText.includes(trimmedQuery) ||
                       explanationText.includes(trimmedQuery);
            });
        }

        this.updateResultsCount();
        this.displayQuestions(this.filteredQuestions.slice(0, 20));
    }

    clearSearch() {
        this.searchInput.value = '';
        this.filteredQuestions = [...this.questions];
        this.updateResultsCount();
        this.displayQuestions(this.filteredQuestions.slice(0, 10));
        this.searchInput.focus();
    }

    displayQuestions(questions) {
        this.hideError();
        this.hideNoResults();

        if (questions.length === 0) {
            this.showNoResults();
            this.resultsContainer.innerHTML = '';
            return;
        }

        const searchTerm = this.searchInput.value.trim().toLowerCase();

        this.resultsContainer.innerHTML = questions.map(question => {
            return this.createQuestionHTML(question, searchTerm);
        }).join('');
    }

    createQuestionHTML(question, searchTerm) {
        const highlightText = (text, term) => {
            if (!term || !text) return this.escapeHtml(text || '');
            const escapedText = this.escapeHtml(text);
            const regex = new RegExp(`(${this.escapeRegExp(term)})`, 'gi');
            return escapedText.replace(regex, '<span class="cisco-highlight">$1</span>');
        };

        const questionNumber = question.question_number || 'N/A';
        const questionText = highlightText(question.question_text || '', searchTerm);
        const questionType = question.type || 'unknown';

        let optionsHTML = '';
        if (question.options && question.options.length > 0) {
            optionsHTML = `
                <div class="cisco-options-section">
                    <div class="cisco-section-title">Options</div>
                    ${question.options.map(option =>
                        `<div class="cisco-option-item">${highlightText(option, searchTerm)}</div>`
                    ).join('')}
                </div>
            `;
        }

        let correctAnswersHTML = '';
        if (question.correct_answers && question.correct_answers.length > 0) {
            correctAnswersHTML = `
                <div class="cisco-correct-answers-section">
                    <div class="cisco-section-title">Correct Answer(s)</div>
                    ${question.correct_answers.map(answer =>
                        `<div class="cisco-correct-answer">${highlightText(answer, searchTerm)}</div>`
                    ).join('')}
                </div>
            `;
        }

        let explanationHTML = '';
        if (question.explanation && question.explanation !== 'N/A' && question.explanation.trim()) {
            explanationHTML = `
                <div class="cisco-explanation-section">
                    <div class="cisco-section-title">Explanation</div>
                    <div class="cisco-explanation-text">${highlightText(question.explanation, searchTerm)}</div>
                </div>
            `;
        }

        return `
            <div class="cisco-question-item">
                <div class="cisco-question-number">Question ${questionNumber}</div>
                <div class="cisco-question-type">${questionType}</div>
                <div class="cisco-question-text">${questionText}</div>
                ${correctAnswersHTML}
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    updateResultsCount() {
        const total = this.questions.length;
        const filtered = this.filteredQuestions.length;

        if (this.searchInput && this.searchInput.value.trim()) {
            this.resultsCount.textContent = `${filtered} of ${total} questions found`;
        } else {
            this.resultsCount.textContent = `${total} questions loaded`;
        }
    }

    showError() {
        this.errorMessage.classList.remove('cisco-hidden');
        this.hideNoResults();
    }

    hideError() {
        this.errorMessage.classList.add('cisco-hidden');
    }

    showNoResults() {
        this.noResults.classList.remove('cisco-hidden');
    }

    hideNoResults() {
        this.noResults.classList.add('cisco-hidden');
    }
}

// Initialize the overlay when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new CiscoQuestionsOverlay();
    });
} else {
    new CiscoQuestionsOverlay();
}