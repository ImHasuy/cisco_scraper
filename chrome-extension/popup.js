class CiscoQuestionsSearch {
    constructor() {
        this.questions = [];
        this.filteredQuestions = [];
        this.searchInput = document.getElementById('searchInput');
        this.searchButton = document.getElementById('searchButton');
        this.clearButton = document.getElementById('clearButton');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.resultsCount = document.getElementById('resultsCount');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.noResults = document.getElementById('noResults');
        this.errorMessage = document.getElementById('errorMessage');

        this.init();
    }

    init() {
        this.loadQuestions();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.searchInput.addEventListener('input', (e) => {
            this.performSearch(e.target.value);
        });

        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch(e.target.value);
            }
        });

        this.searchButton.addEventListener('click', () => {
            this.performSearch(this.searchInput.value);
        });

        this.clearButton.addEventListener('click', () => {
            this.clearSearch();
        });
    }

    async loadQuestions() {
        this.showLoading();

        try {
            // Try to load from extension resources first
            const response = await fetch(chrome.runtime.getURL('extractedCCNA3_questions.json'));
            if (!response.ok) {
                throw new Error('Failed to load questions from extension');
            }

            const data = await response.json();
            this.questions = Array.isArray(data) ? data : [];
            this.filteredQuestions = [...this.questions];

            this.hideLoading();
            this.updateResultsCount();
            this.displayQuestions(this.filteredQuestions.slice(0, 1)); // Show first initially

        } catch (error) {
            console.error('Error loading questions:', error);
            this.hideLoading();
            this.showError();
        }
    }

    performSearch(query) {
        const trimmedQuery = query.trim().toLowerCase();

        if (!trimmedQuery) {
            this.filteredQuestions = [...this.questions];
        } else {
            this.filteredQuestions = this.questions.filter(question => {
                const questionText = question.question_text.toLowerCase();
                const questionNumber = question.question_number.toString();
                const optionsText = question.options ? question.options.join(' ').toLowerCase() : '';
                const correctAnswersText = question.correct_answers ? question.correct_answers.join(' ').toLowerCase() : '';
                const explanationText = question.explanation ? question.explanation.toLowerCase() : '';

                return questionText.includes(trimmedQuery) ||
                       questionNumber.includes(trimmedQuery) ||
                       optionsText.includes(trimmedQuery) ||
                       correctAnswersText.includes(trimmedQuery) ||
                       explanationText.includes(trimmedQuery);
            });
        }

        this.updateResultsCount();
        this.displayQuestions(this.filteredQuestions.slice(0, 20)); // Show up to 20 results
    }

    clearSearch() {
        this.searchInput.value = '';
        this.filteredQuestions = [...this.questions];
        this.updateResultsCount();
        this.displayQuestions(this.filteredQuestions.slice(0, 10));
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
            if (!term || !text) return text;
            const regex = new RegExp(`(${this.escapeRegExp(term)})`, 'gi');
            return text.replace(regex, '<span class="highlight">$1</span>');
        };

        const questionNumber = question.question_number || 'N/A';
        const questionText = highlightText(question.question_text || '', searchTerm);
        const questionType = question.type || 'unknown';

        let optionsHTML = '';
        if (question.options && question.options.length > 0) {
            optionsHTML = `
                <div class="options-section">
                    <div class="options-title">Options:</div>
                    ${question.options.map(option =>
                        `<div class="option-item">${highlightText(option, searchTerm)}</div>`
                    ).join('')}
                </div>
            `;
        }

        let correctAnswersHTML = '';
        if (question.correct_answers && question.correct_answers.length > 0) {
            correctAnswersHTML = `
                <div class="correct-answers-section">
                    <div class="options-title">Correct Answer(s):</div>
                    ${question.correct_answers.map(answer =>
                        `<div class="correct-answer">${highlightText(answer, searchTerm)}</div>`
                    ).join('')}
                </div>
            `;
        }

        let explanationHTML = '';
        if (question.explanation && question.explanation !== 'N/A') {
            explanationHTML = `
                <div class="explanation-section">
                    <div class="explanation-title">Explanation:</div>
                    <div class="explanation-text">${highlightText(question.explanation, searchTerm)}</div>
                </div>
            `;
        }

        return `
            <div class="question-item">
                <div class="question-number">Question ${questionNumber}</div>
                <div class="question-type">${questionType}</div>
                <div class="question-text">${questionText}</div>
                ${correctAnswersHTML}
            </div>
        `;
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    updateResultsCount() {
        const total = this.questions.length;
        const filtered = this.filteredQuestions.length;

        if (this.searchInput.value.trim()) {
            this.resultsCount.textContent = `${filtered} of ${total} questions found`;
        } else {
            this.resultsCount.textContent = `${total} questions loaded`;
        }
    }

    showLoading() {
        this.loadingIndicator.classList.remove('hidden');
        this.hideError();
        this.hideNoResults();
    }

    hideLoading() {
        this.loadingIndicator.classList.add('hidden');
    }

    showError() {
        this.errorMessage.classList.remove('hidden');
        this.hideNoResults();
    }

    hideError() {
        this.errorMessage.classList.add('hidden');
    }

    showNoResults() {
        this.noResults.classList.remove('hidden');
    }

    hideNoResults() {
        this.noResults.classList.add('hidden');
    }
}

// Initialize the extension when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CiscoQuestionsSearch();
});
