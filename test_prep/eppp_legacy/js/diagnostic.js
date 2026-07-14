/* Diagnostic Exam Module — Enhanced
   Features: difficulty-stratified selection, EPPP-weighted domains,
   per-question review, subtopic analysis, progress comparison, quick actions */
const Diagnostic = {
    questions: [],
    answers: [],
    currentIdx: 0,
    showingResults: false,
    started: false,

    /* EPPP domain weights (approximate % of actual exam, summing to 100) */
    DOMAIN_WEIGHTS: {
        1: 12, // Biological Bases
        2: 13, // Cognitive-Affective
        3: 12, // Social & Multicultural
        4: 12, // Growth & Lifespan
        5: 14, // Assessment & Diagnosis
        6: 14, // Treatment
        7: 11, // Research & Statistics
        8: 12  // Ethics & Professional Issues
    },

    render(container) {
        const store = App.getStore();
        const hasPrevious = store.diagnosticHistory && store.diagnosticHistory.length > 0;

        if (this.started && !this.showingResults) {
            this.renderQuestion(container);
            return;
        }

        const totalQ = EPPPData.domains.reduce((s, d) => s + (d.questions?.length || 0), 0);

        container.innerHTML = `
        <div class="page-header">
            <h1>Diagnostic Exam</h1>
            <p>Take a comprehensive assessment to identify your strengths and weaknesses across all 8 EPPP domains</p>
        </div>

        <div class="grid-2 mb-15">
            <div class="card" style="cursor:pointer;text-align:center;padding:1.5rem;" id="diag-mode-standard">
                <div style="font-size:2rem;margin-bottom:0.5rem;">📊</div>
                <h3>Standard Diagnostic</h3>
                <p class="text-sm text-muted">40 questions · 5 per domain · ~30 min</p>
                <p class="text-sm text-muted" style="margin-top:0.5rem;">Equal representation across domains</p>
            </div>
            <div class="card" style="cursor:pointer;text-align:center;padding:1.5rem;" id="diag-mode-weighted">
                <div style="font-size:2rem;margin-bottom:0.5rem;">🎯</div>
                <h3>EPPP-Weighted Diagnostic</h3>
                <p class="text-sm text-muted">50 questions · Weighted by EPPP blueprint · ~40 min</p>
                <p class="text-sm text-muted" style="margin-top:0.5rem;">Assessment & Treatment get more questions</p>
            </div>
        </div>

        <div class="card mb-15" style="max-width:650px">
            <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;">
                <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,var(--accent-primary),var(--accent-secondary));display:flex;align-items:center;justify-content:center;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width:24px;height:24px;"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                </div>
                <div>
                    <h3 style="margin:0;">Personalized Assessment</h3>
                    <p class="text-muted text-sm" style="margin:0.25rem 0 0;">Drawing from ${totalQ} questions across 8 domains</p>
                </div>
            </div>
            <p style="line-height:1.7;margin-bottom:1rem;">Your diagnostic exam uses difficulty-stratified selection to ensure a balanced mix of easy, medium, and hard questions. After completing it, you'll receive:</p>
            <ul style="padding-left:1.25rem;margin-bottom:1.5rem;">
                <li class="text-sm" style="margin-bottom:0.5rem;">📊 <strong>Domain-by-domain proficiency scores</strong> with color-coded performance</li>
                <li class="text-sm" style="margin-bottom:0.5rem;">🎯 <strong>Personalized study recommendations</strong> ranked by priority</li>
                <li class="text-sm" style="margin-bottom:0.5rem;">📈 <strong>Progress comparison</strong> with previous diagnostics</li>
                <li class="text-sm" style="margin-bottom:0.5rem;">📝 <strong>Per-question review</strong> — review every question with rationale</li>
                <li class="text-sm" style="margin-bottom:0.5rem;">⏱️ <strong>Estimated study time</strong> recommendations per domain</li>
                <li class="text-sm">🔗 <strong>Quick actions</strong> — jump to quizzes, flashcards, or textbook for weak areas</li>
            </ul>
        </div>

        ${hasPrevious ? this.renderPreviousResults(store) : ''}

        <div class="card" style="margin-top:1.5rem;padding:1rem 1.25rem;background:var(--color-surface-2,var(--bg-card));">
            <h4 style="margin:0 0 0.5rem;">⌨️ Keyboard Shortcuts</h4>
            <div class="grid-2" style="gap:0.35rem 1rem;font-size:0.85rem;">
                <span><kbd>A</kbd> <kbd>B</kbd> <kbd>C</kbd> <kbd>D</kbd> — Select answer</span>
                <span><kbd>Enter</kbd> — Submit / Next</span>
                <span><kbd>←</kbd> / <kbd>→</kbd> — Previous / Next</span>
                <span><kbd>Esc</kbd> — Return to diagnostic home</span>
            </div>
        </div>`;

        document.getElementById('diag-mode-standard').addEventListener('click', () => this.startDiagnostic(container, 'standard'));
        document.getElementById('diag-mode-weighted').addEventListener('click', () => this.startDiagnostic(container, 'weighted'));
    },

    renderPreviousResults(store) {
        const latest = store.diagnosticHistory[store.diagnosticHistory.length - 1];
        const historyCount = store.diagnosticHistory.length;
        return `
        <h3 class="mt-2" style="margin-bottom:1rem;">Latest Diagnostic Results
            <span class="badge badge-neutral" style="margin-left:0.5rem;">${historyCount} attempt${historyCount > 1 ? 's' : ''}</span>
        </h3>
        <div class="card">
            <div class="flex justify-between items-center mb-1">
                <div>
                    <span class="font-heading" style="font-size:1.3rem;">${latest.overallPct}% Overall</span>
                    <span class="text-muted text-sm" style="margin-left:0.75rem;">${new Date(latest.date).toLocaleDateString()}</span>
                    ${latest.mode ? `<span class="badge badge-info" style="margin-left:0.5rem;">${latest.mode === 'weighted' ? 'EPPP-Weighted' : 'Standard'}</span>` : ''}
                </div>
                ${historyCount > 1 ? `<span class="text-sm" style="color:${this._getProgressDelta(store) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">${this._getProgressDelta(store) >= 0 ? '↑' : '↓'} ${Math.abs(this._getProgressDelta(store))}% from previous</span>` : ''}
            </div>
            <div class="domain-list">
                ${Object.entries(latest.domainScores).map(([did, data]) => {
                    const d = EPPPData.getDomain(parseInt(did));
                    const pct = Math.round((data.correct / data.total) * 100);
                    return `<div class="domain-item">
                        <div class="domain-number" style="background:${d?.color}22;color:${d?.color}">${did}</div>
                        <div class="domain-info">
                            <div class="domain-name"><span>${data.name}</span><span>${data.correct}/${data.total} (${pct}%)</span></div>
                            ${App.progressBar(pct)}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    },

    _getProgressDelta(store) {
        if (store.diagnosticHistory.length < 2) return 0;
        const curr = store.diagnosticHistory[store.diagnosticHistory.length - 1].overallPct;
        const prev = store.diagnosticHistory[store.diagnosticHistory.length - 2].overallPct;
        return curr - prev;
    },

    startDiagnostic(container, mode = 'standard') {
        this._mode = mode;
        this.questions = [];

        if (mode === 'weighted') {
            // EPPP-weighted: allocate questions proportional to exam blueprint
            const totalQuestions = 50;
            EPPPData.domains.forEach(d => {
                const weight = this.DOMAIN_WEIGHTS[d.id] || 12;
                const numQ = Math.max(3, Math.round((weight / 100) * totalQuestions));
                const selected = this._stratifiedSelect(d, numQ);
                this.questions.push(...selected);
            });
        } else {
            // Standard: 5 from each domain
            EPPPData.domains.forEach(d => {
                const selected = this._stratifiedSelect(d, 5);
                this.questions.push(...selected);
            });
        }

        // Shuffle all questions
        for (let i = this.questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.questions[i], this.questions[j]] = [this.questions[j], this.questions[i]];
        }

        this.answers = new Array(this.questions.length).fill(null);
        this.currentIdx = 0;
        this.started = true;
        this.showingResults = false;
        this._startTime = Date.now();
        this.renderQuestion(container);
    },

    /* Select questions with balanced difficulty when possible */
    _stratifiedSelect(domain, numQ) {
        const pool = domain.questions.map(q => ({...q, domainId: domain.id, domainName: domain.name}));
        const easy = pool.filter(q => q.difficulty === 'easy');
        const med  = pool.filter(q => q.difficulty === 'medium');
        const hard = pool.filter(q => q.difficulty === 'hard');
        const unknown = pool.filter(q => !q.difficulty || !['easy','medium','hard'].includes(q.difficulty));

        // Target ratio: ~30% easy, ~45% medium, ~25% hard
        let nEasy = Math.max(1, Math.round(numQ * 0.30));
        let nMed  = Math.max(1, Math.round(numQ * 0.45));
        let nHard = Math.max(1, numQ - nEasy - nMed);

        const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i+1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } };
        shuffle(easy); shuffle(med); shuffle(hard); shuffle(unknown);

        let selected = [];
        selected.push(...easy.slice(0, nEasy));
        selected.push(...med.slice(0, nMed));
        selected.push(...hard.slice(0, nHard));

        // Fill remaining from any pool if we didn't have enough of a difficulty
        if (selected.length < numQ) {
            const used = new Set(selected.map(q => q.q));
            const remaining = [...unknown, ...easy, ...med, ...hard].filter(q => !used.has(q.q));
            shuffle(remaining);
            selected.push(...remaining.slice(0, numQ - selected.length));
        }

        return selected.slice(0, numQ);
    },

    renderQuestion(container) {
        const q = this.questions[this.currentIdx];
        const answered = this.answers[this.currentIdx] !== null;
        const selected = this.answers[this.currentIdx];
        const domain = EPPPData.getDomain(q.domainId);
        const answeredCount = this.answers.filter(a => a !== null).length;
        const correctAnswer = q.answer ?? q.correct;
        const difficultyColor = q.difficulty === 'hard' ? 'var(--color-danger)' : q.difficulty === 'easy' ? 'var(--color-success)' : 'var(--color-warning)';

        container.innerHTML = `
        <div class="flex justify-between items-center mb-1">
            <div class="flex items-center gap-05">
                <span class="badge" style="background:${domain?.color}22;color:${domain?.color}">${q.domainName}</span>
                <span class="badge" style="background:${difficultyColor}22;color:${difficultyColor}">${q.difficulty || 'medium'}</span>
                <span class="badge badge-neutral">${this._mode === 'weighted' ? 'EPPP-Weighted' : 'Standard'}</span>
            </div>
            <span class="text-muted text-sm">Question ${this.currentIdx + 1} of ${this.questions.length} · ${answeredCount} answered</span>
        </div>
        <div class="card mb-15">
            <h3 style="font-size:1.05rem;line-height:1.6;margin-bottom:1.25rem;">${q.q}</h3>
            <div class="option-list">
                ${q.options.map((opt, i) => {
                    let cls = '';
                    if (answered) {
                        cls = 'disabled';
                        if (i === correctAnswer) cls += ' correct';
                        else if (i === selected && i !== correctAnswer) cls += ' incorrect';
                    } else if (i === selected) cls = 'selected';
                    return `<button class="option-btn ${cls}" data-idx="${i}">
                        <span class="option-letter">${'ABCD'[i]}</span>
                        <span>${opt}</span>
                    </button>`;
                }).join('')}
            </div>
            ${answered && q.rationale ? `<div class="rationale-box"><strong>Rationale:</strong> ${q.rationale}</div>` : ''}
            ${answered && typeof MemoryAids !== 'undefined' ? this._renderMemoryTip(q) : ''}
        </div>
        <div class="flex justify-between items-center">
            <button class="btn btn-secondary" id="diag-prev" ${this.currentIdx === 0 ? 'disabled' : ''}>← Previous</button>
            <div class="flex gap-05">
                ${!answered ? `<button class="btn btn-primary" id="diag-submit" disabled>Check Answer</button>` : ''}
                ${answered && this.currentIdx < this.questions.length - 1 ? `<button class="btn btn-primary" id="diag-next">Next →</button>` : ''}
                ${answered && this.currentIdx === this.questions.length - 1 ? `<button class="btn btn-primary" id="diag-finish">View Diagnostic Report</button>` : ''}
            </div>
        </div>
        <div class="progress-bar mt-15"><div class="progress-fill" style="width:${((this.currentIdx + 1) / this.questions.length) * 100}%"></div></div>`;

        if (!answered) {
            container.querySelectorAll('.option-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    const submitBtn = document.getElementById('diag-submit');
                    if (submitBtn) submitBtn.disabled = false;
                    this.answers[this.currentIdx] = parseInt(btn.dataset.idx);
                });
            });

            const submitBtn = document.getElementById('diag-submit');
            if (submitBtn) submitBtn.addEventListener('click', () => this.renderQuestion(container));
        }

        const prevBtn = document.getElementById('diag-prev');
        if (prevBtn) prevBtn.addEventListener('click', () => { this.currentIdx--; this.renderQuestion(container); });

        const nextBtn = document.getElementById('diag-next');
        if (nextBtn) nextBtn.addEventListener('click', () => { this.currentIdx++; this.renderQuestion(container); });

        const finishBtn = document.getElementById('diag-finish');
        if (finishBtn) finishBtn.addEventListener('click', () => this.showResults(container));

        this._setupKeyHandler(container);
    },

    _renderMemoryTip(q) {
        if (typeof MemoryAids === 'undefined') return '';
        const aid = MemoryAids.getForQuestion(q);
        if (!aid) return '';
        return `<div class="memory-tip-box" style="margin-top:1rem;padding:1rem;border-radius:var(--radius-sm);background:var(--color-info-dim);border-left:3px solid var(--color-info);">
            <div style="font-weight:600;color:var(--color-info);margin-bottom:0.5rem;">💡 Memory Aid: ${aid.title}</div>
            <div class="text-sm">${MemoryAids.formatContent ? MemoryAids.formatContent(aid.content) : aid.content}</div>
        </div>`;
    },

    showResults(container) {
        this.started = false;
        this.showingResults = true;
        this._removeKeyHandler();

        const elapsed = Date.now() - (this._startTime || Date.now());
        const minutes = Math.round(elapsed / 60000);

        let correct = 0;
        const domainScores = {};
        const difficultyScores = {easy: {c:0,t:0}, medium: {c:0,t:0}, hard: {c:0,t:0}};

        this.questions.forEach((q, i) => {
            const correctAnswer = q.answer ?? q.correct;
            const isCorrect = this.answers[i] === correctAnswer;
            if (isCorrect) correct++;

            if (!domainScores[q.domainId]) domainScores[q.domainId] = {name: q.domainName, correct: 0, total: 0, questions: []};
            domainScores[q.domainId].total++;
            if (isCorrect) domainScores[q.domainId].correct++;
            domainScores[q.domainId].questions.push({...q, userAnswer: this.answers[i], isCorrect, idx: i});

            const diff = q.difficulty || 'medium';
            if (difficultyScores[diff]) {
                difficultyScores[diff].t++;
                if (isCorrect) difficultyScores[diff].c++;
            }
        });

        const overallPct = Math.round((correct / this.questions.length) * 100);

        // Save to history
        const store = App.getStore();
        if (!store.diagnosticHistory) store.diagnosticHistory = [];
        store.diagnosticHistory.push({
            date: new Date().toISOString(), overallPct, domainScores, correct,
            total: this.questions.length, mode: this._mode, duration: minutes
        });

        Object.entries(domainScores).forEach(([did, data]) => {
            store.quizHistory.push({date: new Date().toISOString(), domainId: parseInt(did), score: data.correct, total: data.total});
        });
        App.saveStore(store);

        // Sort domains by performance
        const ranked = Object.entries(domainScores).map(([did, data]) => ({
            ...data, domainId: parseInt(did),
            pct: Math.round((data.correct / data.total) * 100),
            domain: EPPPData.getDomain(parseInt(did))
        })).sort((a, b) => a.pct - b.pct);

        const weakest = ranked.slice(0, 3);
        const strongest = ranked.slice(-2);

        const getStudyHours = (pct, weight) => {
            if (pct >= 80) return Math.round(weight * 1.5);
            if (pct >= 60) return Math.round(weight * 3);
            if (pct >= 40) return Math.round(weight * 4.5);
            return Math.round(weight * 6);
        };

        const readinessLabel = overallPct >= 80 ? '🟢 Strong' : overallPct >= 65 ? '🟡 Developing' : overallPct >= 50 ? '🟠 Building' : '🔴 Foundational';
        const prevDiag = store.diagnosticHistory.length > 1 ? store.diagnosticHistory[store.diagnosticHistory.length - 2] : null;
        const delta = prevDiag ? overallPct - prevDiag.overallPct : null;

        container.innerHTML = `
        <div class="page-header"><h1>Diagnostic Report</h1><p>Your personalized baseline assessment · ${this._mode === 'weighted' ? 'EPPP-Weighted' : 'Standard'} · ${minutes} minutes</p></div>

        <!-- Top Stats Row -->
        <div class="stats-grid mb-15">
            <div class="card stat-card text-center">
                ${App.createScoreRing(overallPct, 120, 8)}
                <div class="stat-label mt-05">Overall Score</div>
            </div>
            <div class="card stat-card text-center">
                <div class="stat-value" style="color:var(--accent-primary);">${correct}/${this.questions.length}</div>
                <div class="stat-label">Questions Correct</div>
            </div>
            <div class="card stat-card text-center">
                <div class="stat-value">${readinessLabel}</div>
                <div class="stat-label">Readiness Level</div>
            </div>
            <div class="card stat-card text-center">
                <div class="stat-value" ${delta !== null ? `style="color:${delta >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}"` : ''}>${delta !== null ? (delta >= 0 ? `↑${delta}%` : `↓${Math.abs(delta)}%`) : '—'}</div>
                <div class="stat-label">${delta !== null ? 'vs. Previous' : 'First Assessment'}</div>
            </div>
        </div>

        <!-- Difficulty Breakdown -->
        <div class="card mb-15">
            <h3 style="margin-bottom:1rem;">📊 Performance by Difficulty</h3>
            <div class="grid-3" style="gap:1rem;">
                ${['easy','medium','hard'].map(d => {
                    const ds = difficultyScores[d];
                    const dpct = ds.t > 0 ? Math.round((ds.c / ds.t) * 100) : 0;
                    const color = d === 'easy' ? 'var(--color-success)' : d === 'hard' ? 'var(--color-danger)' : 'var(--color-warning)';
                    return `<div style="text-align:center;">
                        <div style="font-size:1.5rem;font-weight:700;font-family:var(--font-heading);color:${color};">${dpct}%</div>
                        <div class="text-sm text-muted">${d.charAt(0).toUpperCase()+d.slice(1)} (${ds.c}/${ds.t})</div>
                        ${App.progressBar(dpct)}
                    </div>`;
                }).join('')}
            </div>
        </div>

        <!-- Domain Breakdown -->
        <div class="card mb-15">
            <h3 style="margin-bottom:1rem;">🏆 Domain Performance (Ranked)</h3>
            <div class="domain-list">
                ${ranked.slice().reverse().map(data => {
                    const statusIcon = data.pct >= 80 ? '🟢' : data.pct >= 60 ? '🟡' : data.pct >= 40 ? '🟠' : '🔴';
                    return `<div class="domain-item">
                        <div class="domain-number" style="background:${data.domain?.color}22;color:${data.domain?.color}">${data.domainId}</div>
                        <div class="domain-info" style="flex:1;">
                            <div class="domain-name"><span>${statusIcon} ${data.name}</span><span>${data.correct}/${data.total} (${data.pct}%)</span></div>
                            ${App.progressBar(data.pct)}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>

        <!-- Progress Comparison -->
        ${store.diagnosticHistory.length > 1 ? this._renderProgressComparison(store) : ''}

        <!-- Study Plan -->
        <h3 style="margin-bottom:1rem;">📋 Personalized Study Plan</h3>
        <div class="card mb-15">
            <div style="padding:0.75rem;border-radius:var(--radius-sm);background:var(--color-danger-dim);margin-bottom:1rem;">
                <div style="font-weight:600;color:var(--color-danger);margin-bottom:0.5rem;">🎯 Priority Focus Areas</div>
                ${weakest.map(w => `
                    <div style="padding:0.5rem 0;border-bottom:1px solid rgba(248,113,113,0.1);">
                        <div class="flex justify-between items-center">
                            <span class="text-sm"><strong>${w.domain?.name}</strong> — ${w.pct}% proficiency</span>
                            <span class="text-sm text-muted">~${getStudyHours(w.pct, w.domain?.weight || 10)} hrs</span>
                        </div>
                        <div class="flex gap-05" style="margin-top:0.5rem;">
                            <button class="btn btn-sm btn-primary" onclick="App.navigateTo('quiz',{domainId:${w.domainId}})">Quiz →</button>
                            <button class="btn btn-sm btn-secondary" onclick="App.navigateTo('flashcards',{domainId:${w.domainId}})">Flashcards</button>
                            <button class="btn btn-sm btn-secondary" onclick="App.navigateTo('study',{domainId:${w.domainId}})">Study</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div style="padding:0.75rem;border-radius:var(--radius-sm);background:var(--color-success-dim);">
                <div style="font-weight:600;color:var(--color-success);margin-bottom:0.5rem;">💪 Strongest Areas</div>
                ${strongest.map(s => `
                    <div class="flex justify-between items-center" style="padding:0.4rem 0;">
                        <span class="text-sm"><strong>${s.domain?.name}</strong> — ${s.pct}% proficiency</span>
                        <span class="text-sm text-muted">~${getStudyHours(s.pct, s.domain?.weight || 10)} hrs for review</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Timeline -->
        <h3 style="margin-bottom:1rem;">📅 Estimated Study Timeline</h3>
        <div class="card mb-15">
            <div class="flex justify-between items-center" style="padding:0.75rem 0;border-bottom:1px solid var(--border-color);">
                <span>Total estimated study hours</span>
                <span class="font-heading" style="font-size:1.3rem;">${ranked.reduce((sum, d) => sum + getStudyHours(d.pct, d.domain?.weight || 10), 0)} hours</span>
            </div>
            <div class="flex justify-between items-center" style="padding:0.75rem 0;border-bottom:1px solid var(--border-color);">
                <span>At 2 hrs/day</span>
                <span class="font-heading">${Math.ceil(ranked.reduce((sum, d) => sum + getStudyHours(d.pct, d.domain?.weight || 10), 0) / 14)} weeks</span>
            </div>
            <div class="flex justify-between items-center" style="padding:0.75rem 0;">
                <span>At 4 hrs/day</span>
                <span class="font-heading">${Math.ceil(ranked.reduce((sum, d) => sum + getStudyHours(d.pct, d.domain?.weight || 10), 0) / 28)} weeks</span>
            </div>
        </div>

        <!-- Per-Question Review -->
        <h3 style="margin-bottom:1rem;">📝 Question Review
            <button class="btn btn-sm btn-secondary" id="diag-toggle-review" style="margin-left:1rem;">Show All Questions</button>
        </h3>
        <div id="diag-question-review" style="display:none;">
            ${Object.entries(domainScores).map(([did, data]) => {
                const d = EPPPData.getDomain(parseInt(did));
                const dpct = Math.round((data.correct / data.total) * 100);
                return `<div class="card mb-1">
                    <h4 style="margin-bottom:0.75rem;">
                        <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:${d?.color}22;color:${d?.color};text-align:center;line-height:24px;font-size:0.7rem;margin-right:0.5rem;">${did}</span>
                        ${data.name} <span class="text-sm text-muted">(${data.correct}/${data.total} — ${dpct}%)</span>
                    </h4>
                    ${data.questions.map((q, qi) => {
                        const correctAnswer = q.answer ?? q.correct;
                        return `<div style="padding:0.75rem;margin-bottom:0.5rem;border-radius:var(--radius-sm);background:${q.isCorrect ? 'var(--color-success-dim)' : 'var(--color-danger-dim)'};">
                            <div class="text-sm" style="margin-bottom:0.5rem;">
                                <span style="font-weight:600;">${q.isCorrect ? '✅' : '❌'} Q${qi+1}:</span> ${q.q}
                            </div>
                            <div class="text-sm text-muted">
                                Your answer: <strong>${'ABCD'[q.userAnswer]}) ${q.options[q.userAnswer]}</strong>
                                ${!q.isCorrect ? ` · Correct: <strong style="color:var(--color-success);">${'ABCD'[correctAnswer]}) ${q.options[correctAnswer]}</strong>` : ''}
                            </div>
                            ${q.rationale ? `<div class="text-sm text-muted" style="margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid var(--border-color);">${q.rationale.substring(0, 200)}${q.rationale.length > 200 ? '...' : ''}</div>` : ''}
                        </div>`;
                    }).join('')}
                </div>`;
            }).join('')}
        </div>

        <div class="flex gap-1 mt-15" style="flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="App.navigateTo('study',{domainId:${weakest[0]?.domainId || 1}})">Study Weakest Domain</button>
            <button class="btn btn-secondary" onclick="App.navigateTo('quiz',{domainId:${weakest[0]?.domainId || 1}})">Quiz Weakest Domain</button>
            <button class="btn btn-secondary" onclick="App.navigateTo('flashcards',{domainId:${weakest[0]?.domainId || 1}})">Flashcards for Weakest</button>
            <button class="btn btn-secondary" onclick="App.navigateTo('dashboard')">Dashboard</button>
        </div>`;

        // Toggle review
        const toggleBtn = document.getElementById('diag-toggle-review');
        const reviewDiv = document.getElementById('diag-question-review');
        if (toggleBtn && reviewDiv) {
            toggleBtn.addEventListener('click', () => {
                const visible = reviewDiv.style.display !== 'none';
                reviewDiv.style.display = visible ? 'none' : 'block';
                toggleBtn.textContent = visible ? 'Show All Questions' : 'Hide Questions';
            });
        }
    },

    _renderProgressComparison(store) {
        const history = store.diagnosticHistory;
        if (history.length < 2) return '';

        // Show last 5 attempts
        const recent = history.slice(-5);
        return `
        <div class="card mb-15">
            <h3 style="margin-bottom:1rem;">📈 Progress Over Time</h3>
            <div style="display:flex;align-items:end;gap:0.75rem;height:140px;padding:0.5rem 0;">
                ${recent.map((h, i) => {
                    const barH = Math.max(8, (h.overallPct / 100) * 120);
                    const color = h.overallPct >= 70 ? 'var(--color-success)' : h.overallPct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';
                    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:0.25rem;">
                        <div class="text-sm" style="font-weight:600;">${h.overallPct}%</div>
                        <div style="width:100%;max-width:48px;height:${barH}px;background:${color};border-radius:var(--radius-sm) var(--radius-sm) 0 0;transition:height 0.6s ease;"></div>
                        <div class="text-sm text-muted" style="font-size:0.7rem;">${new Date(h.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                    </div>`;
                }).join('')}
            </div>
            ${recent.length >= 2 ? `<div class="text-sm text-muted text-center" style="margin-top:0.5rem;padding-top:0.75rem;border-top:1px solid var(--border-color);">
                ${recent[recent.length-1].overallPct >= recent[0].overallPct
                    ? `📈 You've improved ${recent[recent.length-1].overallPct - recent[0].overallPct}% since your first shown attempt. Keep going!`
                    : `Focus on your weak areas and retake when ready. Consistent study pays off!`}
            </div>` : ''}
        </div>`;
    },

    /* Keyboard navigation */
    _setupKeyHandler(container) {
        this._removeKeyHandler();
        this._keyHandler = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const answered = this.answers[this.currentIdx] !== null;

            switch (e.key) {
                case 'a': case 'A': if (!answered) this._selectOption(container, 0); break;
                case 'b': case 'B': if (!answered) this._selectOption(container, 1); break;
                case 'c': case 'C': if (!answered) this._selectOption(container, 2); break;
                case 'd': case 'D': if (!answered) this._selectOption(container, 3); break;
                case 'Enter':
                    e.preventDefault();
                    if (!answered && this.answers[this.currentIdx] !== null) {
                        this.renderQuestion(container);
                    } else if (answered && this.currentIdx < this.questions.length - 1) {
                        this.currentIdx++; this.renderQuestion(container);
                    } else if (answered && this.currentIdx === this.questions.length - 1) {
                        this.showResults(container);
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (this.currentIdx > 0) { this.currentIdx--; this.renderQuestion(container); }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (answered && this.currentIdx < this.questions.length - 1) { this.currentIdx++; this.renderQuestion(container); }
                    break;
                case 'Escape':
                    this.started = false;
                    this._removeKeyHandler();
                    App.navigateTo('diagnostic');
                    break;
            }
        };
        document.addEventListener('keydown', this._keyHandler);
    },

    _selectOption(container, idx) {
        const btns = container.querySelectorAll('.option-btn');
        if (idx >= btns.length) return;
        btns.forEach(b => b.classList.remove('selected'));
        btns[idx].classList.add('selected');
        this.answers[this.currentIdx] = idx;
        const submitBtn = document.getElementById('diag-submit');
        if (submitBtn) submitBtn.disabled = false;
    },

    _removeKeyHandler() {
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
    }
};
