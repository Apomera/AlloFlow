/* Quiz Module — Enhanced with timer, flagging, and recommendations */
const Quiz = {
    questions: [],
    currentIdx: 0,
    answers: [],
    flagged: [],
    showingResults: false,
    selectedDomain: null,
    timerEnabled: false,
    timerSeconds: 0,
    timerInterval: null,

    render(container, params = {}) {
        this.selectedDomain = params.domainId || null;
        this.questions = [];
        this.currentIdx = 0;
        this.answers = [];
        this.flagged = [];
        this.showingResults = false;
        this.timerEnabled = false;
        this.timerSeconds = 0;
        this.stopTimer();

        if (this.selectedDomain && !params.showSetup) {
            this.startQuiz(container);
            return;
        }

        const store = App.getStore();
        container.innerHTML = `
        <div class="page-header">
            <h1>Quiz Mode</h1>
            <p>Test your knowledge with domain-specific questions and detailed rationales</p>
        </div>
        <div class="card" style="max-width:600px;">
            <h3 style="margin-bottom:1rem;">Configure Quiz</h3>
            <label class="text-sm text-muted" style="display:block;margin-bottom:0.4rem;">Select Domain</label>
            <select id="quiz-domain" style="width:100%;margin-bottom:1rem;">
                <option value="all">All Domains (Mixed)</option>
                ${EPPPData.domains.map(d => `<option value="${d.id}" ${this.selectedDomain===d.id?'selected':''}>${d.id}. ${d.name} (${d.questions.length} questions)</option>`).join('')}
            </select>
            <label class="text-sm text-muted" style="display:block;margin-bottom:0.4rem;">Number of Questions</label>
            <select id="quiz-count" style="width:100%;margin-bottom:1rem;">
                ${[5,10,15,20,25,30,'all'].map(n => `<option value="${n}" ${n===store.settings.questionCount?'selected':''}>${n === 'all' ? 'All Available' : n}</option>`).join('')}
            </select>
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem;padding:0.75rem;border-radius:var(--radius-sm);background:var(--surface-secondary);">
                <label class="toggle" style="flex-shrink:0;">
                    <input type="checkbox" id="quiz-timer-toggle">
                    <span class="toggle-slider"></span>
                </label>
                <div>
                    <div class="text-sm" style="font-weight:500;">Enable Timer</div>
                    <div class="text-sm text-muted">Simulate exam pressure with a timed quiz</div>
                </div>
            </div>
            <button class="btn btn-primary btn-lg w-full" id="quiz-start">Start Quiz</button>
        </div>

        ${this.renderHistory(store)}`;

        document.getElementById('quiz-start').addEventListener('click', () => {
            this.selectedDomain = document.getElementById('quiz-domain').value;
            this.timerEnabled = document.getElementById('quiz-timer-toggle').checked;
            this.startQuiz(container);
        });
    },

    renderHistory(store) {
        if (!store.quizHistory || store.quizHistory.length === 0) return '';
        // Group by date
        const recent = store.quizHistory.slice(-10).reverse();
        return `
        <h3 style="margin:1.5rem 0 1rem;">Recent Quiz History</h3>
        <div class="card">
            <div style="display:flex;flex-direction:column;gap:0.5rem;">
                ${recent.map(h => {
                    const d = EPPPData.getDomain(h.domainId);
                    const pct = Math.round((h.score/h.total)*100);
                    return `<div class="flex justify-between items-center" style="padding:0.5rem 0;border-bottom:1px solid var(--border-color);">
                        <div class="flex items-center gap-05">
                            <span class="badge" style="background:${d?.color}22;color:${d?.color}">${d?.name || 'Mixed'}</span>
                            <span class="text-sm text-muted">${new Date(h.date).toLocaleDateString()}</span>
                        </div>
                        <span class="text-sm" style="font-weight:600;color:${pct >= 70 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'};">${h.score}/${h.total} (${pct}%)</span>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    },

    startQuiz(container) {
        let poolRaw;
        if (this.selectedDomain === 'all' || !this.selectedDomain) {
            poolRaw = EPPPData.getAllQuestions();
            this.selectedDomain = 'all';
        } else {
            const did = parseInt(this.selectedDomain);
            poolRaw = EPPPData.getQuestionsByDomain(did);
            this.selectedDomain = did;
        }

        const masteredSet = App.getMasteredQuestionsSet();
        const unmastered = poolRaw.filter(q => !masteredSet.has(App.getQuestionId(q)));
        const mastered = poolRaw.filter(q => masteredSet.has(App.getQuestionId(q)));

        const shuffle = (arr) => {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        };

        shuffle(unmastered);
        shuffle(mastered);

        let pool = [...unmastered, ...mastered];

        const countEl = document.getElementById('quiz-count');
        let count = countEl ? countEl.value : App.getStore().settings.questionCount;
        if (count === 'all') count = pool.length;
        else count = Math.min(parseInt(count), pool.length);

        this.questions = pool.slice(0, count);
        this.answers = new Array(this.questions.length).fill(null);
        this.flagged = new Array(this.questions.length).fill(false);
        this.currentIdx = 0;
        this.showingResults = false;
        this.timerSeconds = 0;

        if (this.timerEnabled) this.startTimer();

        this.renderQuestion(container);
    },

    startTimer() {
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            this.timerSeconds++;
            const el = document.getElementById('quiz-timer-display');
            if (el) el.textContent = this.formatTime(this.timerSeconds);
        }, 1000);
    },

    stopTimer() {
        if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
    },

    formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    },

    renderQuestion(container) {
        if (this.showingResults) { this.renderResults(container); return; }
        const q = this.questions[this.currentIdx];
        const answered = this.answers[this.currentIdx] !== null;
        const selected = this.answers[this.currentIdx];
        const domain = EPPPData.getDomain(q.domainId);
        const isFlagged = this.flagged[this.currentIdx];

        container.innerHTML = `
        <div class="flex justify-between items-center mb-15">
            <div class="flex items-center gap-1">
                <span class="badge" style="background:${domain?.color}22;color:${domain?.color}">${q.domainName}</span>
                <span class="badge badge-neutral">${q.difficulty}</span>
                ${this.timerEnabled ? `<span class="badge" style="background:var(--accent-primary-dim);color:var(--accent-primary);">⏱ <span id="quiz-timer-display">${this.formatTime(this.timerSeconds)}</span></span>` : ''}
            </div>
            <div class="flex items-center gap-05">
                <button class="btn btn-sm ${isFlagged ? 'btn-warning' : 'btn-secondary'}" id="quiz-flag" title="Flag for review" style="font-size:0.8rem;">
                    ${isFlagged ? '🚩 Flagged' : '🏳️ Flag'}
                </button>
                <span class="text-muted text-sm">Question ${this.currentIdx+1} of ${this.questions.length}</span>
            </div>
        </div>
        <div class="card mb-15">
            <h3 style="font-size:1.05rem;line-height:1.6;margin-bottom:1.25rem;">${q.q}</h3>
            <div class="option-list">
                ${q.options.map((opt, i) => {
                    let cls = '';
                    if (answered) {
                        cls = 'disabled';
                        if (i === q.answer) cls += ' correct';
                        else if (i === selected && i !== q.answer) cls += ' incorrect';
                    } else if (i === selected) cls = 'selected';
                    return `<button class="option-btn ${cls}" data-idx="${i}">
                        <span class="option-letter">${'ABCD'[i]}</span>
                        <span>${opt}</span>
                    </button>`;
                }).join('')}
            </div>
            ${answered ? (() => {
                // Format enhanced rationales with "Why others are wrong" section
                let rationaleHtml = q.rationale;
                if (rationaleHtml.includes('Why others are wrong:')) {
                    const parts = rationaleHtml.split(/\n\nWhy others are wrong:\n/);
                    const correctPart = parts[0].replace(/^Correct:\s*\([A-D]\)\s*/, '');
                    const wrongParts = parts[1] || '';
                    const wrongLines = wrongParts.split('\n').filter(l => l.trim()).map(line => {
                        return line.replace(/^\(([A-D])\)/, '<strong style="color:var(--color-danger);">($1)</strong>');
                    }).join('<br>');
                    rationaleHtml = `<div style="margin-bottom:0.75rem;">${correctPart}</div>
                        <div style="padding:0.75rem;border-radius:var(--radius-sm);background:rgba(239,68,68,0.06);border-left:3px solid var(--color-danger);">
                            <div style="font-size:0.8rem;font-weight:600;color:var(--color-danger);margin-bottom:0.4rem;text-transform:uppercase;letter-spacing:0.5px;">Why Other Answers Are Wrong</div>
                            <div style="font-size:0.85rem;line-height:1.7;">${wrongLines}</div>
                        </div>`;
                }
                let html = `<div class="rationale-box"><strong>Rationale:</strong> ${rationaleHtml}</div>`;
                // Check for matching memory aid
                if (typeof MemoryAids !== 'undefined') {
                    const aid = MemoryAids.getForQuestion(q);
                    if (aid) {
                        html += `<div class="memory-tip-box" style="margin-top:0.75rem;padding:1rem;border-radius:var(--radius-sm);background:linear-gradient(135deg,rgba(251,191,36,0.08),rgba(251,146,60,0.08));border:1px solid rgba(251,191,36,0.3);">
                            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
                                <span style="font-size:1.1rem;">💡</span>
                                <strong style="color:var(--color-warning);">Memory Tip: ${aid.title}</strong>
                                <span class="badge" style="font-size:0.65rem;background:rgba(251,191,36,0.15);color:var(--color-warning);">${aid.type}</span>
                            </div>
                            <div style="font-size:0.88rem;line-height:1.6;white-space:pre-line;">${MemoryAids.formatContent(aid.content)}</div>
                        </div>`;
                    }
                }
                // Display reference if available
                if (q.reference) {
                    // Auto-linkify URLs in the reference
                    const refHtml = q.reference.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--accent-primary);word-break:break-all;">$1</a>');
                    html += `<div style="margin-top:0.75rem;padding:0.75rem;border-radius:var(--radius-sm);background:rgba(99,102,241,0.06);border-left:3px solid var(--accent-primary);">
                        <div style="font-size:0.75rem;font-weight:600;color:var(--accent-primary);margin-bottom:0.3rem;text-transform:uppercase;letter-spacing:0.5px;">📖 Reference</div>
                        <div style="font-size:0.82rem;line-height:1.6;font-style:italic;color:var(--text-secondary);">${refHtml}</div>
                    </div>`;
                }
                // Community voting UI
                if (typeof CommunityFeedback !== 'undefined') {
                    html += CommunityFeedback.renderVotingUI(q);
                }
                return html;
            })() : ''}
        </div>
        <div class="flex justify-between items-center">
            <button class="btn btn-secondary" id="quiz-prev" ${this.currentIdx===0?'disabled':''}>← Previous</button>
            <div class="flex gap-05">
                ${!answered ? `<button class="btn btn-primary" id="quiz-submit" disabled>Check Answer</button>` : ''}
                ${answered && this.currentIdx < this.questions.length - 1 ? `<button class="btn btn-primary" id="quiz-next">Next →</button>` : ''}
                ${answered && this.currentIdx === this.questions.length - 1 ? `<button class="btn btn-primary" id="quiz-finish">View Results</button>` : ''}
            </div>
        </div>
        <div class="progress-bar mt-15"><div class="progress-fill" style="width:${((this.currentIdx+1)/this.questions.length)*100}%"></div></div>

        ${this.questions.length > 10 ? `
        <div style="margin-top:1rem;">
            <div class="text-sm text-muted" style="margin-bottom:0.5rem;">Question Navigator</div>
            <div class="question-nav-grid" style="display:flex;flex-wrap:wrap;gap:4px;">
                ${this.questions.map((_, i) => {
                    let navCls = 'nav-btn';
                    if (i === this.currentIdx) navCls += ' current';
                    if (this.answers[i] !== null) navCls += ' answered';
                    if (this.flagged[i]) navCls += ' flagged';
                    return `<button class="${navCls}" data-nav="${i}" style="width:28px;height:28px;border-radius:4px;border:1px solid var(--border-color);background:${i===this.currentIdx?'var(--accent-primary)':this.answers[i]!==null?'var(--surface-secondary)':'transparent'};color:${i===this.currentIdx?'white':'var(--text-secondary)'};font-size:0.7rem;cursor:pointer;position:relative;">
                        ${i+1}
                        ${this.flagged[i] ? '<span style="position:absolute;top:-3px;right:-3px;font-size:0.5rem;">🚩</span>' : ''}
                    </button>`;
                }).join('')}
            </div>
        </div>
        ` : ''}`;

        // Flag button
        document.getElementById('quiz-flag')?.addEventListener('click', () => {
            this.flagged[this.currentIdx] = !this.flagged[this.currentIdx];
            this.renderQuestion(container);
        });

        // Question navigator
        container.querySelectorAll('[data-nav]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentIdx = parseInt(btn.dataset.nav);
                this.renderQuestion(container);
            });
        });

        // Option click
        if (!answered) {
            container.querySelectorAll('.option-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    const submitBtn = document.getElementById('quiz-submit');
                    if (submitBtn) submitBtn.disabled = false;
                    this.answers[this.currentIdx] = parseInt(btn.dataset.idx);
                });
            });

            const submitBtn = document.getElementById('quiz-submit');
            if (submitBtn) {
                submitBtn.addEventListener('click', () => {
                    App.updateStreak();
                    this.renderQuestion(container);
                    // Attach community feedback listeners after re-render
                    if (typeof CommunityFeedback !== 'undefined') {
                        CommunityFeedback.attachVotingListeners(container, this.questions[this.currentIdx]);
                    }
                });
            }
        }

        // Attach community feedback listeners for already-answered questions
        if (answered && typeof CommunityFeedback !== 'undefined') {
            CommunityFeedback.attachVotingListeners(container, q);
        }

        const prevBtn = document.getElementById('quiz-prev');
        if (prevBtn) prevBtn.addEventListener('click', () => { this.currentIdx--; this.renderQuestion(container); });

        const nextBtn = document.getElementById('quiz-next');
        if (nextBtn) nextBtn.addEventListener('click', () => { this.currentIdx++; this.renderQuestion(container); });

        const finishBtn = document.getElementById('quiz-finish');
        if (finishBtn) finishBtn.addEventListener('click', () => { this.showingResults = true; this.renderQuestion(container); });
    },

    renderResults(container) {
        this.stopTimer();
        let correct = 0;
        const domainBreakdown = {};
        this.questions.forEach((q, i) => {
            if (this.answers[i] === q.answer) {
                correct++;
                App.markQuestionMastered(q);
            }
            if (!domainBreakdown[q.domainId]) domainBreakdown[q.domainId] = {name: q.domainName, correct:0, total:0, color: EPPPData.getDomain(q.domainId)?.color};
            domainBreakdown[q.domainId].total++;
            if (this.answers[i] === q.answer) domainBreakdown[q.domainId].correct++;
        });
        const pct = Math.round((correct / this.questions.length) * 100);
        const flaggedCount = this.flagged.filter(Boolean).length;

        // Save to history
        const store = App.getStore();
        if (this.selectedDomain !== 'all') {
            store.quizHistory.push({date: new Date().toISOString(), domainId: this.selectedDomain, score: correct, total: this.questions.length, timeSpent: this.timerSeconds});
        } else {
            Object.entries(domainBreakdown).forEach(([did, data]) => {
                store.quizHistory.push({date: new Date().toISOString(), domainId: parseInt(did), score: data.correct, total: data.total, timeSpent: Math.round(this.timerSeconds / Object.keys(domainBreakdown).length)});
            });
        }
        App.saveStore(store);

        // Find weakest domain for recommendation
        const weakest = Object.entries(domainBreakdown).sort((a,b) => (a[1].correct/a[1].total) - (b[1].correct/b[1].total))[0];

        container.innerHTML = `
        <div class="page-header"><h1>Quiz Results</h1></div>
        <div class="grid-2 mb-15">
            <div class="card text-center" style="padding:2rem;">
                ${App.createScoreRing(pct, 140, 8)}
                <h3 class="mt-1">${correct} / ${this.questions.length} Correct</h3>
                <p class="text-muted text-sm">${pct >= 70 ? 'Great job! 🎉' : pct >= 50 ? 'Keep studying! 📚' : 'Review this material 💪'}</p>
                ${this.timerEnabled ? `<p class="text-muted text-sm mt-05">⏱ Time: ${this.formatTime(this.timerSeconds)} (${Math.round(this.timerSeconds/this.questions.length)}s/question)</p>` : ''}
            </div>
            <div class="card">
                <h3 style="margin-bottom:1rem;">Domain Breakdown</h3>
                <div class="domain-list">
                    ${Object.entries(domainBreakdown).map(([did, data]) => {
                        const dpct = Math.round((data.correct/data.total)*100);
                        return `<div class="domain-item">
                            <div class="domain-number" style="background:${data.color}22;color:${data.color}">${did}</div>
                            <div class="domain-info">
                                <div class="domain-name"><span>${data.name}</span><span>${data.correct}/${data.total} (${dpct}%)</span></div>
                                ${App.progressBar(dpct)}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
                ${weakest ? `
                <div style="margin-top:1rem;padding:0.75rem;border-radius:var(--radius-sm);background:var(--color-warning-dim);">
                    <div class="text-sm"><strong>📌 Recommendation:</strong> Focus on <strong>${weakest[1].name}</strong> — your weakest area in this quiz.</div>
                    <button class="btn btn-sm btn-primary mt-05" onclick="App.navigateTo('study',{domainId:${weakest[0]}})">Study ${weakest[1].name} →</button>
                </div>` : ''}
            </div>
        </div>

        ${flaggedCount > 0 ? `
        <h3 style="margin-bottom:1rem;">🚩 Flagged Questions (${flaggedCount})</h3>
        ${this.questions.map((q, i) => {
            if (!this.flagged[i]) return '';
            const isCorrect = this.answers[i] === q.answer;
            return `<div class="card mb-1">
                <div class="flex items-center gap-05 mb-05">
                    <span class="badge ${isCorrect ? 'badge-success' : 'badge-danger'}">${isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>
                    <span class="badge badge-warning">🚩 Flagged</span>
                    <span class="text-muted text-sm">Q${i+1}</span>
                </div>
                <p style="font-weight:500;margin-bottom:0.5rem;">${q.q}</p>
                ${!isCorrect ? `<p class="text-sm" style="color:var(--color-danger);">Your answer: ${q.options[this.answers[i]]}</p>` : ''}
                <p class="text-sm" style="color:var(--color-success);">Correct: ${q.options[q.answer]}</p>
                <div class="rationale-box" style="margin-top:0.5rem;font-size:0.85rem;">${q.rationale}</div>
            </div>`;
        }).join('')}
        ` : ''}

        <h3 style="margin-bottom:1rem;">Review All Questions</h3>
        ${this.questions.map((q, i) => {
            const isCorrect = this.answers[i] === q.answer;
            return `<div class="card mb-1">
                <div class="flex items-center gap-05 mb-05">
                    <span class="badge ${isCorrect ? 'badge-success' : 'badge-danger'}">${isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>
                    <span class="text-muted text-sm">Q${i+1}</span>
                </div>
                <p style="font-weight:500;margin-bottom:0.5rem;">${q.q}</p>
                ${!isCorrect ? `<p class="text-sm" style="color:var(--color-danger);">Your answer: ${q.options[this.answers[i]]}</p>` : ''}
                <p class="text-sm" style="color:var(--color-success);">Correct: ${q.options[q.answer]}</p>
                <div class="rationale-box" style="margin-top:0.5rem;font-size:0.85rem;">${q.rationale}</div>
            </div>`;
        }).join('')}
        <div class="flex gap-1 mt-15">
            <button class="btn btn-primary" onclick="App.navigateTo('quiz')">New Quiz</button>
            <button class="btn btn-secondary" onclick="App.navigateTo('dashboard')">Dashboard</button>
        </div>`;
    }
};
