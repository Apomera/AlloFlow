/* Practice Exam Module */
const Exam = {
    questions: [],
    answers: [],
    flagged: new Set(),
    currentIdx: 0,
    timerInterval: null,
    timeRemaining: 0,
    started: false,
    finished: false,

    render(container, params = {}) {
        this.finished = false;
        this.started = false;
        clearInterval(this.timerInterval);

        // If launched with weak-areas param, start immediately
        if (params.type === 'weak-areas' && typeof CATEngine !== 'undefined') {
            const questions = CATEngine.generateWeakAreasExam(50);
            if (questions.length > 0) {
                this.questions = questions;
                this.answers = new Array(questions.length).fill(null);
                this.flagged = new Set();
                this.currentIdx = 0;
                this.timeRemaining = 3600;
                this.started = true;
                this.finished = false;
                this.timerInterval = setInterval(() => { this.timeRemaining--; this.updateTimer(); if (this.timeRemaining <= 0) this.finishExam(container); }, 1000);
                this.renderExamQuestion(container);
                return;
            }
        }

        const hasCATData = typeof CATEngine !== 'undefined' && Object.keys(CATEngine.getSavedAbilities()).length > 0;

        container.innerHTML = `
        <div class="page-header"><h1>Practice Exam</h1><p>Simulate the real EPPP experience with timed practice exams</p></div>
        <div class="grid-2 mb-15">
            <div class="card">
                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
                    <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,var(--accent-primary),var(--accent-secondary));display:flex;align-items:center;justify-content:center;">
                        <span style="font-size:1.2rem;">📋</span>
                    </div>
                    <div>
                        <h3 style="margin:0;">Full-Length Exam</h3>
                        <span class="badge badge-neutral">225 questions · 4h 15m</span>
                    </div>
                </div>
                <ul style="padding-left:1.25rem;margin-bottom:1.5rem;">
                    <li class="text-muted text-sm" style="margin-bottom:0.4rem;">Proportional to actual EPPP domain weights</li>
                    <li class="text-muted text-sm" style="margin-bottom:0.4rem;">Scored on a 200–800 scale (passing: 500)</li>
                    <li class="text-muted text-sm">Free navigation & question flagging</li>
                </ul>
                <button class="btn btn-primary btn-lg w-full" id="exam-start-full">Start Full Exam</button>
            </div>
            <div class="card">
                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
                    <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#FBBF24,#FB923C);display:flex;align-items:center;justify-content:center;">
                        <span style="font-size:1.2rem;">⚡</span>
                    </div>
                    <div>
                        <h3 style="margin:0;">Mini Exam</h3>
                        <span class="badge badge-neutral">50 questions · 1 hour</span>
                    </div>
                </div>
                <ul style="padding-left:1.25rem;margin-bottom:1.5rem;">
                    <li class="text-muted text-sm" style="margin-bottom:0.4rem;">Quick practice session with all domains</li>
                    <li class="text-muted text-sm" style="margin-bottom:0.4rem;">Same scoring and features as full exam</li>
                    <li class="text-muted text-sm">Great for daily practice sessions</li>
                </ul>
                <button class="btn btn-primary btn-lg w-full" style="background:linear-gradient(135deg,#FBBF24,#FB923C);" id="exam-start-mini">Start Mini Exam</button>
            </div>
        </div>

        <div class="grid-2 mb-15">
            <div class="card">
                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
                    <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#8B5CF6,#6366F1);display:flex;align-items:center;justify-content:center;">
                        <span style="font-size:1.2rem;">🎯</span>
                    </div>
                    <div>
                        <h3 style="margin:0;">Domain-Specific Exam</h3>
                        <span class="badge badge-neutral">50 questions · 1 hour</span>
                    </div>
                </div>
                <ul style="padding-left:1.25rem;margin-bottom:1rem;">
                    <li class="text-muted text-sm" style="margin-bottom:0.4rem;">Deep dive into a single EPPP domain</li>
                    <li class="text-muted text-sm" style="margin-bottom:0.4rem;">Perfect for targeted domain mastery</li>
                    <li class="text-muted text-sm">Same scoring as full exam</li>
                </ul>
                <select id="exam-domain-select" style="width:100%;margin-bottom:0.75rem;">
                    ${EPPPData.domains.map(d => `<option value="${d.id}">${d.id}. ${d.name} (${d.questions.length} questions)</option>`).join('')}
                </select>
                <button class="btn btn-primary btn-lg w-full" style="background:linear-gradient(135deg,#8B5CF6,#6366F1);" id="exam-start-domain">Start Domain Exam</button>
            </div>
            <div class="card" style="${hasCATData ? '' : 'opacity:0.6;'}">
                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
                    <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#EF4444,#F97316);display:flex;align-items:center;justify-content:center;">
                        <span style="font-size:1.2rem;">🔥</span>
                    </div>
                    <div>
                        <h3 style="margin:0;">Weak-Areas Exam</h3>
                        <span class="badge badge-neutral">50 questions · 1 hour</span>
                    </div>
                </div>
                <ul style="padding-left:1.25rem;margin-bottom:1.5rem;">
                    <li class="text-muted text-sm" style="margin-bottom:0.4rem;">2× more questions from your weakest 3 domains</li>
                    <li class="text-muted text-sm" style="margin-bottom:0.4rem;">Uses your CAT results to target weak spots</li>
                    <li class="text-muted text-sm">${hasCATData ? 'Personalized based on your ability profile' : 'Take a CAT assessment first to unlock'}</li>
                </ul>
                <button class="btn btn-primary btn-lg w-full" style="background:linear-gradient(135deg,#EF4444,#F97316);" id="exam-start-weak" ${hasCATData ? '' : 'disabled'}>
                    ${hasCATData ? 'Start Weak-Areas Exam' : '🔒 Take CAT First'}
                </button>
            </div>
        </div>

        ${this.renderHistory()}`;

        document.getElementById('exam-start-full').addEventListener('click', () => this.startExam(container, 225, 4 * 3600 + 15 * 60));
        document.getElementById('exam-start-mini').addEventListener('click', () => this.startExam(container, 50, 3600));
        document.getElementById('exam-start-domain').addEventListener('click', () => {
            const domainId = parseInt(document.getElementById('exam-domain-select').value);
            const questions = typeof CATEngine !== 'undefined' ? CATEngine.generateDomainExam(domainId, 50) : [];
            if (questions.length > 0) {
                this.questions = questions;
                this.answers = new Array(questions.length).fill(null);
                this.flagged = new Set();
                this.currentIdx = 0;
                this.timeRemaining = 3600;
                this.started = true;
                this.finished = false;
                this.timerInterval = setInterval(() => { this.timeRemaining--; this.updateTimer(); if (this.timeRemaining <= 0) this.finishExam(container); }, 1000);
                this.renderExamQuestion(container);
            }
        });
        if (hasCATData) {
            document.getElementById('exam-start-weak').addEventListener('click', () => {
                const questions = CATEngine.generateWeakAreasExam(50);
                if (questions.length > 0) {
                    this.questions = questions;
                    this.answers = new Array(questions.length).fill(null);
                    this.flagged = new Set();
                    this.currentIdx = 0;
                    this.timeRemaining = 3600;
                    this.started = true;
                    this.finished = false;
                    this.timerInterval = setInterval(() => { this.timeRemaining--; this.updateTimer(); if (this.timeRemaining <= 0) this.finishExam(container); }, 1000);
                    this.renderExamQuestion(container);
                }
            });
        }
    },

    renderHistory() {
        const store = App.getStore();
        if (store.examHistory.length === 0) return '';
        return `<h3 class="mt-2" style="margin-bottom:1rem;">Past Exams</h3>
        ${store.examHistory.slice(-5).reverse().map(e => `
            <div class="card mb-1 flex justify-between items-center">
                <div>
                    <div class="font-heading" style="font-size:1.1rem;">${e.scaled}/800 ${e.passed ? '<span class="badge badge-success">PASS</span>' : '<span class="badge badge-danger">FAIL</span>'}</div>
                    <div class="text-sm text-muted">${new Date(e.date).toLocaleDateString()} · ${e.score}/${e.total} correct (${Math.round(e.score/e.total*100)}%)</div>
                </div>
            </div>`).join('')}`;
    },

    startExam(container, questionCount = 225, timeLimit = 15300) {
        // Build exam proportional to domain weights
        this.questions = [];
        EPPPData.domains.forEach(d => {
            const count = Math.round(questionCount * (d.weight / 100));
            const pool = d.questions.map(q => EPPPData._normalize(q, d.id, d.name));
            // Shuffle pool first for variety
            for (let k = pool.length - 1; k > 0; k--) {
                const j = Math.floor(Math.random() * (k + 1));
                [pool[k], pool[j]] = [pool[j], pool[k]];
            }
            for (let i = 0; i < count; i++) {
                this.questions.push({...pool[i % pool.length]});
            }
        });
        // Shuffle all questions
        for (let i = this.questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.questions[i], this.questions[j]] = [this.questions[j], this.questions[i]];
        }
        this.questions = this.questions.slice(0, questionCount);
        this.answers = new Array(this.questions.length).fill(null);
        this.flagged = new Set();
        this.currentIdx = 0;
        this.timeRemaining = timeLimit;
        this.started = true;
        this.finished = false;

        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimer();
            if (this.timeRemaining <= 0) this.finishExam(container);
        }, 1000);

        this.renderExamQuestion(container);
    },

    updateTimer() {
        const el = document.getElementById('exam-timer');
        if (!el) return;
        const h = Math.floor(this.timeRemaining / 3600);
        const m = Math.floor((this.timeRemaining % 3600) / 60);
        const s = this.timeRemaining % 60;
        el.textContent = `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        el.className = 'exam-timer' + (this.timeRemaining < 600 ? ' danger' : this.timeRemaining < 1800 ? ' warning' : '');
    },

    renderExamQuestion(container) {
        const q = this.questions[this.currentIdx];
        const answered = this.answers.filter(a => a !== null).length;
        const domain = EPPPData.getDomain(q.domainId);

        container.innerHTML = `
        <div class="flex justify-between items-center mb-1">
            <div class="flex items-center gap-1">
                <span class="badge" style="background:${domain?.color}22;color:${domain?.color}">${q.domainName}</span>
                <span class="text-muted text-sm">Q${this.currentIdx+1}/${this.questions.length}</span>
            </div>
            <div class="flex items-center gap-1">
                <div id="exam-timer" class="exam-timer"></div>
                <button class="btn btn-danger btn-sm" id="exam-end">End Exam</button>
            </div>
        </div>
        <div class="grid-2" style="grid-template-columns:1fr 300px;align-items:flex-start;">
            <div>
                <div class="card mb-1">
                    <h3 style="font-size:1rem;line-height:1.6;margin-bottom:1.25rem;">${q.q}</h3>
                    <div class="option-list">
                        ${q.options.map((opt, i) => `
                            <button class="option-btn ${this.answers[this.currentIdx]===i?'selected':''}" data-idx="${i}">
                                <span class="option-letter">${'ABCD'[i]}</span><span>${opt}</span>
                            </button>`).join('')}
                    </div>
                </div>
                <div class="flex justify-between">
                    <button class="btn btn-secondary" id="exam-prev" ${this.currentIdx===0?'disabled':''}>← Prev</button>
                    <button class="btn btn-sm ${this.flagged.has(this.currentIdx)?'btn-danger':'btn-secondary'}" id="exam-flag">
                        ${this.flagged.has(this.currentIdx)?'🚩 Flagged':'Flag for Review'}
                    </button>
                    <button class="btn btn-primary" id="exam-next">${this.currentIdx===this.questions.length-1?'Review':'Next →'}</button>
                </div>
            </div>
            <div class="card" style="max-height:400px;overflow-y:auto;">
                <div class="text-sm text-muted mb-05">${answered}/${this.questions.length} answered · ${this.flagged.size} flagged</div>
                <div class="q-navigator">
                    ${this.questions.map((_, i) => `<button class="q-nav-btn ${this.answers[i]!==null?'answered':''} ${this.flagged.has(i)?'flagged':''} ${i===this.currentIdx?'current':''}" data-qi="${i}">${i+1}</button>`).join('')}
                </div>
            </div>
        </div>`;

        this.updateTimer();

        container.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.answers[this.currentIdx] = parseInt(btn.dataset.idx);
                this.renderExamQuestion(container);
            });
        });

        container.querySelectorAll('.q-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentIdx = parseInt(btn.dataset.qi);
                this.renderExamQuestion(container);
            });
        });

        document.getElementById('exam-prev').addEventListener('click', () => { this.currentIdx--; this.renderExamQuestion(container); });
        document.getElementById('exam-next').addEventListener('click', () => { if (this.currentIdx < this.questions.length - 1) { this.currentIdx++; this.renderExamQuestion(container); } });
        document.getElementById('exam-flag').addEventListener('click', () => {
            if (this.flagged.has(this.currentIdx)) this.flagged.delete(this.currentIdx);
            else this.flagged.add(this.currentIdx);
            this.renderExamQuestion(container);
        });
        document.getElementById('exam-end').addEventListener('click', () => {
            if (confirm('End the exam and score your results?')) this.finishExam(container);
        });
    },

    finishExam(container) {
        clearInterval(this.timerInterval);
        this.finished = true;

        let correct = 0;
        const domainScores = {};
        this.questions.forEach((q, i) => {
            const ans = q.answer !== undefined ? q.answer : q.correct;
            if (this.answers[i] === ans) correct++;
            if (!domainScores[q.domainId]) domainScores[q.domainId] = {correct:0, total:0, name: q.domainName};
            domainScores[q.domainId].total++;
            if (this.answers[i] === ans) domainScores[q.domainId].correct++;
        });

        const pct = correct / this.questions.length;
        const scaled = Math.round(200 + pct * 600);
        const passed = scaled >= 500;

        // Save
        const store = App.getStore();
        store.examHistory.push({date: new Date().toISOString(), score: correct, total: this.questions.length, scaled, passed, domainScores});
        App.saveStore(store);

        container.innerHTML = `
        <div class="page-header"><h1>Exam Results</h1></div>
        <div class="card text-center mb-15" style="padding:2.5rem;">
            <div class="font-heading" style="font-size:3rem;font-weight:800;color:${passed?'var(--color-success)':'var(--color-danger)'};">${scaled}</div>
            <div class="text-sm text-muted mb-1">out of 800</div>
            <span class="badge ${passed?'badge-success':'badge-danger'}" style="font-size:1rem;padding:0.4rem 1rem;">${passed?'PASS ✓':'BELOW PASSING'}</span>
            <p class="text-muted mt-1">${correct} of ${this.questions.length} correct (${Math.round(pct*100)}%) · Passing score: 500</p>
        </div>
        <h3 style="margin-bottom:1rem;">Performance by Domain</h3>
        <div class="card mb-15">
            <div class="domain-list">
                ${Object.entries(domainScores).map(([did, data]) => {
                    const dpct = Math.round((data.correct/data.total)*100);
                    const d = EPPPData.getDomain(parseInt(did));
                    return `<div class="domain-item">
                        <div class="domain-number" style="background:${d?.color}22;color:${d?.color}">${did}</div>
                        <div class="domain-info">
                            <div class="domain-name"><span>${data.name}</span><span>${data.correct}/${data.total} (${dpct}%)</span></div>
                            ${App.progressBar(dpct)}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>
        <div class="flex gap-1">
            <button class="btn btn-primary" onclick="App.navigateTo('exam')">New Exam</button>
            <button class="btn btn-secondary" onclick="App.navigateTo('analytics')">View Analytics</button>
            <button class="btn btn-secondary" onclick="App.navigateTo('dashboard')">Dashboard</button>
        </div>`;
    }
};
