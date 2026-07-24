/* Flashcards Page Module — Spaced Repetition Study */
const Flashcards = {
    currentDomain: null,
    currentIdx: 0,
    isFlipped: false,
    cards: [],
    mode: 'browse', // 'browse' or 'review'
    sessionStats: { reviewed: 0, correct: 0, streak: 0, maxStreak: 0 },
    _keyHandler: null,

    render(container, params = {}) {
        if (params.domainId) this.currentDomain = params.domainId;
        this.currentIdx = 0;
        this.isFlipped = false;
        this.cards = [];
        this.mode = 'browse';
        this.sessionStats = { reviewed: 0, correct: 0, streak: 0, maxStreak: 0 };
        this._removeKeyHandler();

        // Domain selection view
        container.innerHTML = `
        <div class="page-header">
            <h1>Flashcards</h1>
            <p>Study with spaced repetition — cards you find difficult appear more often</p>
        </div>
        <div class="grid-2 mb-15">
            <div class="card" style="cursor:pointer;text-align:center;padding:1.5rem;" id="fc-mode-browse">
                <div style="font-size:2rem;margin-bottom:0.5rem;">📚</div>
                <h3>Browse by Domain</h3>
                <p class="text-sm text-muted">Study all cards in a specific domain</p>
            </div>
            <div class="card" style="cursor:pointer;text-align:center;padding:1.5rem;" id="fc-mode-review">
                <div style="font-size:2rem;margin-bottom:0.5rem;">🔄</div>
                <h3>Spaced Review</h3>
                <p class="text-sm text-muted">Review cards due for repetition (${this.getDueCount()} due)</p>
            </div>
        </div>
        <div class="flex justify-between items-center" style="margin-bottom:1rem;">
            <h3 style="margin:0;">Select Domain</h3>
            <span class="text-sm text-muted">Total: ${EPPPData.domains.reduce((s,d)=>s+(d.flashcards?.length||0),0)} flashcards</span>
        </div>
        <div class="domain-list">
            ${EPPPData.domains.map(d => {
                const cardCount = d.flashcards?.length || 0;
                const mastered = this.getMasteredCount(d.id);
                const pct = cardCount > 0 ? Math.round((mastered / cardCount) * 100) : 0;
                return `<div class="card domain-item" style="cursor:pointer;" data-domain="${d.id}">
                    <div class="domain-number" style="background:${d.color}22;color:${d.color}">${d.id}</div>
                    <div class="domain-info" style="flex:1;">
                        <div class="domain-name"><span>${d.name}</span><span class="text-sm text-muted">${cardCount} cards</span></div>
                        ${App.progressBar(pct)}
                        <div class="text-sm text-muted" style="margin-top:0.25rem;">${mastered}/${cardCount} mastered</div>
                    </div>
                </div>`;
            }).join('')}
        </div>
        <div class="card" style="margin-top:1.5rem;padding:1rem 1.25rem;background:var(--color-surface-2);">
            <h4 style="margin:0 0 0.5rem;">⌨️ Keyboard Shortcuts</h4>
            <div class="grid-2" style="gap:0.35rem 1rem;font-size:0.85rem;">
                <span><kbd>Space</kbd> — Flip card</span>
                <span><kbd>←</kbd> / <kbd>→</kbd> — Previous / Next</span>
                <span><kbd>1</kbd> Didn't know &nbsp; <kbd>2</kbd> Hard</span>
                <span><kbd>3</kbd> Good &nbsp; <kbd>4</kbd> Easy</span>
                <span><kbd>S</kbd> — Shuffle deck</span>
                <span><kbd>B</kbd> — Bookmark card</span>
            </div>
        </div>`;

        // Event listeners
        document.getElementById('fc-mode-review').addEventListener('click', () => {
            this.mode = 'review';
            this.startReview(container);
        });

        document.getElementById('fc-mode-browse').addEventListener('click', () => {
            document.querySelector('.domain-list').scrollIntoView({behavior: 'smooth'});
        });

        container.querySelectorAll('[data-domain]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentDomain = parseInt(btn.dataset.domain);
                this.mode = 'browse';
                this.startDomain(container);
            });
        });
    },

    startDomain(container) {
        const domain = EPPPData.getDomain(this.currentDomain);
        if (!domain || !domain.flashcards || domain.flashcards.length === 0) {
            container.innerHTML = `<div class="card text-center"><h3>No flashcards available for this domain yet.</h3>
                <button class="btn btn-secondary mt-1" onclick="App.navigateTo('flashcards')">← Back</button></div>`;
            return;
        }
        this.cards = [...domain.flashcards];
        this.currentIdx = 0;
        this.isFlipped = false;
        this.sessionStats = { reviewed: 0, correct: 0, streak: 0, maxStreak: 0 };
        this.renderCard(container);
    },

    startReview(container) {
        const store = App.getStore();
        const now = Date.now();
        const dueCards = [];

        EPPPData.domains.forEach(domain => {
            if (!domain.flashcards) return;
            domain.flashcards.forEach((card, idx) => {
                const key = `${domain.id}_${idx}`;
                const sr = store.spacedRepetition[key];
                if (!sr || new Date(sr.nextReview).getTime() <= now) {
                    dueCards.push({...card, domainId: domain.id, cardIdx: idx, domainName: domain.name, color: domain.color});
                }
            });
        });

        if (dueCards.length === 0) {
            container.innerHTML = `<div class="page-header"><h1>Flashcards</h1></div>
                <div class="card text-center" style="padding:3rem;">
                    <div style="font-size:3rem;margin-bottom:1rem;">🎉</div>
                    <h3>All caught up!</h3>
                    <p class="text-muted">No cards are due for review right now. Great work!</p>
                    <button class="btn btn-primary mt-1" onclick="App.navigateTo('flashcards')">← Back to Flashcards</button>
                </div>`;
            return;
        }

        // Shuffle due cards
        this._shuffle(dueCards);

        this.cards = dueCards;
        this.currentIdx = 0;
        this.isFlipped = false;
        this.sessionStats = { reviewed: 0, correct: 0, streak: 0, maxStreak: 0 };
        this.renderCard(container);
    },

    renderCard(container) {
        if (this.currentIdx >= this.cards.length) {
            this.renderComplete(container);
            return;
        }

        const card = this.cards[this.currentIdx];
        const domain = this.mode === 'review' ? card : EPPPData.getDomain(this.currentDomain);
        const domainName = this.mode === 'review' ? card.domainName : domain.name;
        const domainColor = this.mode === 'review' ? card.color : domain.color;
        const isBookmarked = this._isBookmarked(card);

        container.innerHTML = `
        <div class="flex justify-between items-center mb-15">
            <div class="flex items-center gap-05">
                <button class="btn btn-secondary btn-sm" id="fc-back">← Back</button>
                <span class="badge" style="background:${domainColor}22;color:${domainColor}">${domainName}</span>
                <span class="badge badge-neutral">${this.mode === 'review' ? 'Spaced Review' : 'Browse'}</span>
            </div>
            <div class="flex items-center gap-05">
                <button class="btn btn-sm ${isBookmarked ? 'btn-primary' : 'btn-secondary'}" id="fc-bookmark" title="Bookmark this card" style="font-size:1.1rem;padding:0.25rem 0.5rem;">
                    ${isBookmarked ? '⭐' : '☆'}
                </button>
                <button class="btn btn-secondary btn-sm" id="fc-shuffle" title="Shuffle cards">🔀</button>
                <span class="text-muted text-sm">Card ${this.currentIdx + 1} of ${this.cards.length}</span>
            </div>
        </div>

        <div class="fc-scene" style="perspective:1000px;min-height:260px;cursor:pointer;margin-bottom:1rem;" id="fc-flip-trigger">
            <div class="fc-card-3d" id="fc-card-inner" style="
                position:relative;width:100%;min-height:260px;
                transform-style:preserve-3d;
                transition:transform 0.5s cubic-bezier(0.4,0,0.2,1);
                ${this.isFlipped ? 'transform:rotateY(180deg);' : ''}
            ">
                <div class="card fc-face fc-front" style="
                    position:absolute;top:0;left:0;right:0;
                    backface-visibility:hidden;
                    display:flex;flex-direction:column;align-items:center;justify-content:center;
                    padding:2rem;text-align:center;min-height:260px;
                ">
                    <div class="text-sm text-muted" style="margin-bottom:1rem;text-transform:uppercase;letter-spacing:1px;">❓ Question</div>
                    <div style="font-size:1.1rem;line-height:1.8;max-width:600px;">${card.front}</div>
                    <div class="text-sm text-muted" style="margin-top:1.5rem;">Click or press Space to flip</div>
                </div>
                <div class="card fc-face fc-back" style="
                    position:absolute;top:0;left:0;right:0;
                    backface-visibility:hidden;
                    transform:rotateY(180deg);
                    display:flex;flex-direction:column;align-items:center;justify-content:center;
                    padding:2rem;text-align:center;min-height:260px;
                    background:var(--color-surface-2);
                ">
                    <div class="text-sm text-muted" style="margin-bottom:1rem;text-transform:uppercase;letter-spacing:1px;">📖 Answer</div>
                    <div style="font-size:1.05rem;line-height:1.8;max-width:600px;">${card.back}</div>
                </div>
            </div>
        </div>

        ${this.isFlipped ? `
        <div class="card mt-1" style="text-align:center;padding:1.25rem;">
            <p class="text-sm text-muted" style="margin-bottom:0.75rem;">How well did you know this? <span class="text-sm" style="opacity:0.6;">(keys 1-4)</span></p>
            <div class="flex gap-05 justify-center" style="flex-wrap:wrap;">
                <button class="btn btn-sm fc-rate" data-rating="0" style="background:var(--color-danger);color:white;">❌ Didn't know (1)</button>
                <button class="btn btn-sm fc-rate" data-rating="3" style="background:var(--color-warning);color:white;">🤔 Hard (2)</button>
                <button class="btn btn-sm fc-rate" data-rating="4" style="background:var(--color-success);color:white;">👍 Good (3)</button>
                <button class="btn btn-sm fc-rate" data-rating="5" style="background:#22c55e;color:white;">⭐ Easy (4)</button>
            </div>
        </div>` : ''}

        <div class="flex justify-between items-center mt-1">
            <button class="btn btn-secondary" id="fc-prev" ${this.currentIdx === 0 ? 'disabled' : ''}>← Previous</button>
            <button class="btn btn-primary" id="fc-next" ${this.currentIdx >= this.cards.length - 1 ? 'disabled' : ''}>Next →</button>
        </div>
        <div class="progress-bar mt-1"><div class="progress-fill" style="width:${((this.currentIdx + 1) / this.cards.length) * 100}%"></div></div>`;

        // Event listeners
        document.getElementById('fc-flip-trigger').addEventListener('click', () => {
            this.isFlipped = !this.isFlipped;
            this.renderCard(container);
        });

        document.getElementById('fc-back').addEventListener('click', () => {
            this._removeKeyHandler();
            App.navigateTo('flashcards');
        });

        document.getElementById('fc-prev')?.addEventListener('click', () => {
            if (this.currentIdx > 0) { this.currentIdx--; this.isFlipped = false; this.renderCard(container); }
        });

        document.getElementById('fc-next')?.addEventListener('click', () => {
            if (this.currentIdx < this.cards.length - 1) { this.currentIdx++; this.isFlipped = false; this.renderCard(container); }
        });

        document.getElementById('fc-shuffle')?.addEventListener('click', () => {
            this._shuffle(this.cards);
            this.currentIdx = 0;
            this.isFlipped = false;
            this.renderCard(container);
        });

        document.getElementById('fc-bookmark')?.addEventListener('click', () => {
            this._toggleBookmark(card);
            this.renderCard(container);
        });

        // Rating buttons (SM-2)
        container.querySelectorAll('.fc-rate').forEach(btn => {
            btn.addEventListener('click', () => {
                const rating = parseInt(btn.dataset.rating);
                this.rateCard(rating);
                this.sessionStats.reviewed++;
                if (rating >= 3) {
                    this.sessionStats.correct++;
                    this.sessionStats.streak++;
                    this.sessionStats.maxStreak = Math.max(this.sessionStats.maxStreak, this.sessionStats.streak);
                } else {
                    this.sessionStats.streak = 0;
                }
                App.updateStreak();
                this.currentIdx++;
                this.isFlipped = false;
                this.renderCard(container);
            });
        });

        // Keyboard handler
        this._setupKeyHandler(container);
    },

    renderComplete(container) {
        this._removeKeyHandler();
        const { reviewed, correct, maxStreak } = this.sessionStats;
        const accuracy = reviewed > 0 ? Math.round((correct / reviewed) * 100) : 0;

        container.innerHTML = `
        <div class="page-header"><h1>Session Complete!</h1></div>
        <div class="card text-center" style="padding:3rem;">
            <div style="font-size:3rem;margin-bottom:1rem;">🎉</div>
            <h3>You reviewed ${this.cards.length} card${this.cards.length === 1 ? '' : 's'}!</h3>

            <div class="grid-2" style="max-width:400px;margin:1.5rem auto;gap:1rem;">
                <div class="card" style="padding:1rem;text-align:center;background:var(--color-surface-2);">
                    <div style="font-size:2rem;font-weight:700;color:var(--color-primary);">${reviewed}</div>
                    <div class="text-sm text-muted">Cards Rated</div>
                </div>
                <div class="card" style="padding:1rem;text-align:center;background:var(--color-surface-2);">
                    <div style="font-size:2rem;font-weight:700;color:${accuracy >= 70 ? 'var(--color-success)' : 'var(--color-warning)'};">${accuracy}%</div>
                    <div class="text-sm text-muted">Accuracy</div>
                </div>
                <div class="card" style="padding:1rem;text-align:center;background:var(--color-surface-2);">
                    <div style="font-size:2rem;font-weight:700;color:var(--color-primary);">${correct}</div>
                    <div class="text-sm text-muted">Knew It</div>
                </div>
                <div class="card" style="padding:1rem;text-align:center;background:var(--color-surface-2);">
                    <div style="font-size:2rem;font-weight:700;color:#f59e0b;">🔥 ${maxStreak}</div>
                    <div class="text-sm text-muted">Best Streak</div>
                </div>
            </div>

            <p class="text-muted">Keep up the great work. Consistent review is the key to retention.</p>
            <div class="flex gap-1 justify-center mt-15">
                <button class="btn btn-primary" onclick="App.navigateTo('flashcards')">Back to Flashcards</button>
                <button class="btn btn-secondary" onclick="App.navigateTo('quiz')">Take a Quiz</button>
            </div>
        </div>`;
    },

    // SM-2 Algorithm
    rateCard(quality) {
        const card = this.cards[this.currentIdx];
        const domainId = this.mode === 'review' ? card.domainId : this.currentDomain;
        const cardIdx = this.mode === 'review' ? card.cardIdx : this.currentIdx;
        const key = `${domainId}_${cardIdx}`;

        const store = App.getStore();
        if (!store.spacedRepetition) store.spacedRepetition = {};

        let sr = store.spacedRepetition[key] || { ef: 2.5, interval: 1, repetitions: 0 };

        if (quality >= 3) {
            // Correct response
            if (sr.repetitions === 0) sr.interval = 1;
            else if (sr.repetitions === 1) sr.interval = 6;
            else sr.interval = Math.round(sr.interval * sr.ef);
            sr.repetitions++;
        } else {
            // Incorrect — reset
            sr.repetitions = 0;
            sr.interval = 1;
        }

        // Update easiness factor
        sr.ef = Math.max(1.3, sr.ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
        sr.lastReview = new Date().toISOString();
        sr.nextReview = new Date(Date.now() + sr.interval * 24 * 60 * 60 * 1000).toISOString();

        store.spacedRepetition[key] = sr;

        // Also update simple progress tracking
        if (!store.flashcardProgress) store.flashcardProgress = {};
        if (!store.flashcardProgress[domainId]) store.flashcardProgress[domainId] = {};
        store.flashcardProgress[domainId][cardIdx] = quality >= 4 ? 'easy' : quality >= 3 ? 'medium' : 'hard';

        App.saveStore(store);
    },

    getDueCount() {
        const store = App.getStore();
        const now = Date.now();
        let count = 0;
        EPPPData.domains.forEach(domain => {
            if (!domain.flashcards) return;
            domain.flashcards.forEach((_, idx) => {
                const key = `${domain.id}_${idx}`;
                const sr = store.spacedRepetition[key];
                if (!sr || new Date(sr.nextReview).getTime() <= now) count++;
            });
        });
        return count;
    },

    getMasteredCount(domainId) {
        const store = App.getStore();
        const progress = store.flashcardProgress?.[domainId] || {};
        return Object.values(progress).filter(v => v === 'easy').length;
    },

    // --- Utility helpers ---

    _shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    },

    _isBookmarked(card) {
        const store = App.getStore();
        return (store.flashcardBookmarks || []).some(b => b.front === card.front);
    },

    _toggleBookmark(card) {
        const store = App.getStore();
        if (!store.flashcardBookmarks) store.flashcardBookmarks = [];
        const idx = store.flashcardBookmarks.findIndex(b => b.front === card.front);
        if (idx >= 0) {
            store.flashcardBookmarks.splice(idx, 1);
        } else {
            store.flashcardBookmarks.push({ front: card.front, back: card.back });
        }
        App.saveStore(store);
    },

    _setupKeyHandler(container) {
        this._removeKeyHandler();
        this._keyHandler = (e) => {
            // Don't capture if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key) {
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    this.isFlipped = !this.isFlipped;
                    this.renderCard(container);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (this.currentIdx > 0) { this.currentIdx--; this.isFlipped = false; this.renderCard(container); }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (this.currentIdx < this.cards.length - 1) { this.currentIdx++; this.isFlipped = false; this.renderCard(container); }
                    break;
                case '1':
                    if (this.isFlipped) { this._rateViaKey(0, container); }
                    break;
                case '2':
                    if (this.isFlipped) { this._rateViaKey(3, container); }
                    break;
                case '3':
                    if (this.isFlipped) { this._rateViaKey(4, container); }
                    break;
                case '4':
                    if (this.isFlipped) { this._rateViaKey(5, container); }
                    break;
                case 's':
                case 'S':
                    this._shuffle(this.cards);
                    this.currentIdx = 0;
                    this.isFlipped = false;
                    this.renderCard(container);
                    break;
                case 'b':
                case 'B':
                    this._toggleBookmark(this.cards[this.currentIdx]);
                    this.renderCard(container);
                    break;
            }
        };
        document.addEventListener('keydown', this._keyHandler);
    },

    _removeKeyHandler() {
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
    },

    _rateViaKey(quality, container) {
        this.rateCard(quality);
        this.sessionStats.reviewed++;
        if (quality >= 3) {
            this.sessionStats.correct++;
            this.sessionStats.streak++;
            this.sessionStats.maxStreak = Math.max(this.sessionStats.maxStreak, this.sessionStats.streak);
        } else {
            this.sessionStats.streak = 0;
        }
        App.updateStreak();
        this.currentIdx++;
        this.isFlipped = false;
        this.renderCard(container);
    }
};
