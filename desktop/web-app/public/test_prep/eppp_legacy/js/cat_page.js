/* ============================================================
   PasstheEPPP — CAT (Adaptive Assessment) Page
   ============================================================ */

const CATPage = {
    session: null,
    container: null,

    render(container) {
        this.container = container;
        this.session = null;

        const prev = CATEngine.getPreviousResults();
        const abilities = CATEngine.getSavedAbilities();
        const hasHistory = prev.length > 0;

        container.innerHTML = `
        <div class="page-header">
            <h1>🧠 Adaptive Assessment (CAT)</h1>
            <p>Computer Adaptive Testing adjusts to your ability level in real-time, finding your strengths and weaknesses faster than fixed quizzes</p>
        </div>

        <div class="grid-2 mb-15">
            <div class="card" style="border:1px solid var(--accent-primary);border-top:3px solid var(--accent-primary);">
                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
                    <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--accent-primary),#8B5CF6);display:flex;align-items:center;justify-content:center;">
                        <span style="font-size:1.3rem;">🎯</span>
                    </div>
                    <div>
                        <h3 style="margin:0;">Start Adaptive Assessment</h3>
                        <span class="badge" style="background:var(--accent-primary-dim);color:var(--accent-primary);">~40 questions · 15-20 min</span>
                    </div>
                </div>
                <ul style="padding-left:1.25rem;margin-bottom:1.5rem;">
                    <li class="text-muted text-sm" style="margin-bottom:0.4rem;">Questions adapt to your ability — harder when you're right, easier when you're wrong</li>
                    <li class="text-muted text-sm" style="margin-bottom:0.4rem;">5 questions per domain across all 8 EPPP domains</li>
                    <li class="text-muted text-sm" style="margin-bottom:0.4rem;">Detailed ability profile with study recommendations</li>
                    <li class="text-muted text-sm">Gets smarter each time — remembers your level between sessions</li>
                </ul>
                <button class="btn btn-primary btn-lg w-full" id="cat-start" style="background:linear-gradient(135deg,var(--accent-primary),#8B5CF6);">
                    ${hasHistory ? '🔄 Retake Adaptive Assessment' : '🚀 Begin Assessment'}
                </button>
                <button class="btn btn-lg w-full" id="cat-endless" style="margin-top:0.5rem;background:linear-gradient(135deg,#10B981,#059669);color:#fff;border:none;">
                    ♾️ Endless Practice Mode
                </button>
                <p class="text-muted text-sm" style="margin-top:0.5rem;text-align:center;">Endless mode goes through all ${EPPPData.domains.reduce((s,d)=>s+d.questions.length,0).toLocaleString()}+ questions adaptively — stop whenever you want</p>
            </div>

            <div class="card">
                <h3 style="margin-bottom:0.75rem;">How CAT Works</h3>
                <div style="display:flex;flex-direction:column;gap:0.75rem;">
                    ${[
                        { icon: '📊', title: 'Starts at medium', desc: 'Your first question is at an average difficulty level' },
                        { icon: '⬆️', title: 'Adapts upward', desc: 'Correct answers move you to harder questions' },
                        { icon: '⬇️', title: 'Adjusts downward', desc: 'Incorrect answers recalibrate to easier questions' },
                        { icon: '🎯', title: 'Finds your level', desc: 'Converges on your true ability per domain in ~5 questions' }
                    ].map(s => `
                        <div style="display:flex;align-items:flex-start;gap:0.6rem;">
                            <span style="font-size:1rem;flex-shrink:0;">${s.icon}</span>
                            <div>
                                <div class="text-sm" style="font-weight:600;">${s.title}</div>
                                <div class="text-sm text-muted">${s.desc}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        ${hasHistory ? this.renderPreviousResults(prev, abilities) : ''}`;

        document.getElementById('cat-start').addEventListener('click', () => this.startAssessment());
        document.getElementById('cat-endless').addEventListener('click', () => this.startEndlessAssessment());
    },

    renderPreviousResults(history, abilities) {
        const latest = history[history.length - 1];
        const domainNames = {};
        EPPPData.domains.forEach(d => { domainNames[d.id] = d.name; });

        // Trend data
        let trendHtml = '';
        if (history.length > 1) {
            const prev = history[history.length - 2];
            const diff = latest.readiness - prev.readiness;
            const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
            const color = diff > 0 ? 'var(--color-success)' : diff < 0 ? 'var(--color-danger)' : 'var(--text-muted)';
            trendHtml = `<span style="color:${color};font-weight:600;"> ${arrow} ${Math.abs(diff)} pts from last</span>`;
        }

        return `
        <h3 style="margin-bottom:1rem;">Your Ability Profile</h3>
        <div class="grid-2 mb-15">
            <div class="card text-center" style="padding:2rem;">
                ${App.createScoreRing(latest.readiness, 140, 8)}
                <h3 class="mt-1">Readiness: ${latest.readiness}%</h3>
                <p class="text-muted text-sm">${new Date(latest.date).toLocaleDateString()} · ${latest.totalCorrect}/${latest.totalQuestions} correct${trendHtml}</p>
            </div>
            <div class="card">
                <h3 style="margin-bottom:1rem;">Domain Abilities</h3>
                <div class="domain-list">
                    ${(latest.domains || []).sort((a, b) => a.theta - b.theta).map(d => {
                        const level = CATEngine.getAbilityLevel(d.theta);
                        const pct = Math.round(((d.theta - 0.5) / 3.0) * 100);
                        return `<div class="domain-item">
                            <div class="domain-number" style="background:${level.color}22;color:${level.color}">${d.id}</div>
                            <div class="domain-info">
                                <div class="domain-name"><span>${d.name}</span><span style="color:${level.color};font-weight:600;">${level.icon} ${level.label}</span></div>
                                ${App.progressBar(Math.min(100, pct))}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>

        ${history.length > 1 ? `
        <h3 style="margin-bottom:1rem;">Assessment History</h3>
        <div class="card mb-15">
            ${history.slice(-5).reverse().map((h, i) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;${i > 0 ? 'border-top:1px solid var(--border-color);' : ''}">
                    <div>
                        <span class="text-sm">${new Date(h.date).toLocaleDateString()}</span>
                        <span class="text-sm text-muted"> · ${h.totalCorrect}/${h.totalQuestions}</span>
                    </div>
                    <div class="flex items-center gap-05">
                        <span class="badge" style="background:${h.readiness >= 70 ? 'var(--color-success-dim)' : h.readiness >= 40 ? 'var(--color-warning-dim)' : 'var(--color-danger-dim)'};color:${h.readiness >= 70 ? 'var(--color-success)' : h.readiness >= 40 ? 'var(--color-warning)' : 'var(--color-danger)'};">${h.readiness}% ready</span>
                    </div>
                </div>
            `).join('')}
        </div>
        ` : ''}`;
    },

    startAssessment() {
        this.session = CATEngine.createSession(5);
        const q = CATEngine.selectNextQuestion(this.session);
        if (!q) {
            App.toast('No questions available for CAT', 'error');
            return;
        }
        this.renderQuestion();
    },

    startEndlessAssessment() {
        this.session = CATEngine.createEndlessSession();
        const q = CATEngine.selectNextQuestion(this.session);
        if (!q) {
            App.toast('No questions available', 'error');
            return;
        }
        this.renderQuestion();
    },

    renderQuestion() {
        if (this.session.finished) {
            this.renderResults();
            return;
        }

        const q = this.session.currentQuestion;
        const domainId = this.session.currentDomainId;
        const domain = EPPPData.getDomain(domainId);
        const domainSt = this.session.domainState[domainId];
        const qDiff = q.difficulty;
        const diffColor = qDiff === 'hard' ? 'var(--color-danger)' : qDiff === 'medium' ? 'var(--color-warning)' : 'var(--color-success)';

        // Progress info
        const totalAnswered = this.session.totalAnswered;
        const totalTarget = this.session.totalTarget;
        const progressPct = Math.round((totalAnswered / totalTarget) * 100);

        this.container.innerHTML = `
        <div class="flex justify-between items-center mb-15" style="flex-wrap:wrap;gap:0.5rem;">
            <div class="flex items-center gap-05" style="flex-wrap:wrap;">
                <span class="badge" style="background:${domain?.color}22;color:${domain?.color}">${domain?.name || 'Domain '+domainId}</span>
                <span class="badge" style="background:${diffColor}18;color:${diffColor};border:1px solid ${diffColor}40;">
                    ${qDiff === 'hard' ? '🔥' : qDiff === 'medium' ? '📊' : '🌱'} ${CATEngine.DIFFICULTY_LABELS[qDiff]}
                </span>
                <span class="badge" style="background:rgba(139,92,246,0.12);color:#8B5CF6;">
                    θ ${domainSt.theta.toFixed(1)}
                </span>
                ${this.session.endless ? '<span class="badge" style="background:rgba(16,185,129,0.12);color:#10B981;">♾️ Endless</span>' : ''}
            </div>
            <div class="flex items-center gap-05">
                <span class="text-muted text-sm">Q${totalAnswered + 1}${this.session.endless ? '' : ' of ~' + totalTarget}</span>
            </div>
        </div>

        <div class="card mb-15">
            <h3 style="font-size:1.05rem;line-height:1.6;margin-bottom:1.25rem;">${q.q}</h3>
            <div class="option-list" id="cat-options">
                ${q.options.map((opt, i) => `
                    <button class="option-btn" data-idx="${i}">
                        <span class="option-letter">${'ABCD'[i]}</span>
                        <span>${opt}</span>
                    </button>
                `).join('')}
            </div>
            <div id="cat-feedback" style="display:none;"></div>
        </div>

        <div class="flex justify-between items-center">
            <div class="text-sm text-muted">
                ${Object.entries(this.session.domainState).filter(([,s]) => s.answered > 0).map(([id, s]) => {
                    const d = EPPPData.getDomain(parseInt(id));
                    return `<span style="display:inline-block;margin-right:0.5rem;">${d?.name?.split(' ')[0] || id}: ${s.answered}/${s.target}</span>`;
                }).join('')}
            </div>
            <button class="btn btn-primary" id="cat-next" style="display:none;">Next Question →</button>
            ${this.session.endless ? '<button class="btn btn-secondary" id="cat-finish-now" style="margin-left:0.5rem;">🏁 Finish & View Results</button>' : ''}
        </div>

        <div class="progress-bar mt-1"><div class="progress-fill" style="width:${this.session.endless ? Math.min(100, Math.round((totalAnswered / totalTarget)*100)) : progressPct}%;background:linear-gradient(90deg,${this.session.endless ? '#10B981,#059669' : 'var(--accent-primary),#8B5CF6'});"></div></div>

        <div style="margin-top:0.75rem;display:flex;gap:4px;flex-wrap:wrap;overflow:hidden;max-width:100%;" id="cat-domain-dots">
            ${this.session.endless ?
                EPPPData.domains.map(d => {
                    const st = this.session.domainState[d.id];
                    return `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:10px;background:${d.id === domainId ? d.color+'22' : 'var(--surface-secondary)'};font-size:0.7rem;color:${d.id === domainId ? d.color : 'var(--text-muted)'};" title="${d.name}: ${st.answered} answered">
                        <span style="font-weight:600;">${d.id}</span><span>${st.answered}</span>
                    </span>`;
                }).join('') :
                EPPPData.domains.map(d => {
                    const st = this.session.domainState[d.id];
                    const filled = st.answered;
                    const total = st.target;
                    let dots = '';
                    for (let i = 0; i < total; i++) {
                        const done = i < filled;
                        const current = d.id === domainId && i === filled;
                        dots += `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:1px;background:${current ? '#8B5CF6' : done ? d.color : 'var(--border-color)'};${current ? 'box-shadow:0 0 4px #8B5CF6;' : ''}"></span>`;
                    }
                    return `<div style="display:flex;align-items:center;gap:2px;margin-right:0.5rem;" title="${d.name}">
                        <span class="text-sm" style="font-size:0.65rem;color:${d.color};min-width:14px;">${d.id}</span>${dots}
                    </div>`;
                }).join('')
            }
        </div>`;

        // Option click handlers
        let answered = false;
        this.container.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (answered) return;
                answered = true;
                const selected = parseInt(btn.dataset.idx);

                // Process through CAT engine
                const result = CATEngine.processAnswer(this.session, selected);

                // Show feedback
                this.container.querySelectorAll('.option-btn').forEach(b => {
                    b.classList.add('disabled');
                    const idx = parseInt(b.dataset.idx);
                    if (idx === q.answer) b.classList.add('correct');
                    else if (idx === selected && idx !== q.answer) b.classList.add('incorrect');
                });

                // Show rationale + adaptive feedback
                const feedback = document.getElementById('cat-feedback');
                const thetaChange = result.newTheta - result.oldTheta;
                const arrow = thetaChange > 0 ? '↑' : thetaChange < 0 ? '↓' : '→';
                const arrowColor = thetaChange > 0 ? 'var(--color-success)' : thetaChange < 0 ? 'var(--color-danger)' : 'var(--text-muted)';

                feedback.style.display = 'block';
                feedback.innerHTML = `
                    <div style="margin-top:1rem;padding:0.75rem;border-radius:var(--radius-sm);background:${result.correct ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'};border-left:3px solid ${result.correct ? 'var(--color-success)' : 'var(--color-danger)'};">
                        <div class="flex justify-between items-center" style="margin-bottom:0.5rem;">
                            <strong style="color:${result.correct ? 'var(--color-success)' : 'var(--color-danger)'};">${result.correct ? '✓ Correct!' : '✗ Incorrect'}</strong>
                            <span class="badge" style="background:${arrowColor}18;color:${arrowColor};">Ability ${arrow} ${Math.abs(thetaChange).toFixed(2)}</span>
                        </div>
                        <div class="text-sm" style="line-height:1.6;">${q.rationale || ''}</div>
                    </div>
                `;

                // Show next button
                const nextBtn = document.getElementById('cat-next');
                nextBtn.style.display = 'inline-flex';
                nextBtn.textContent = this.session.finished ? 'View Results →' : 'Next Question →';

                // Update streak
                App.updateStreak();
            });
        });

        // Next button
        document.getElementById('cat-next').addEventListener('click', () => {
            if (this.session.finished) {
                this.renderResults();
            } else {
                CATEngine.selectNextQuestion(this.session);
                this.renderQuestion();
            }
        });

        // Endless mode: Finish Now button
        const finishBtn = document.getElementById('cat-finish-now');
        if (finishBtn) {
            finishBtn.addEventListener('click', () => {
                this.session.finished = true;
                this.renderResults();
            });
        }
    },

    renderResults() {
        const results = CATEngine.generateResults(this.session);
        CATEngine.saveResults(results);

        const timeStr = `${Math.floor(results.timeSpent / 60)}m ${results.timeSpent % 60}s`;
        const overallPct = Math.round((results.totalCorrect / results.totalQuestions) * 100);

        this.container.innerHTML = `
        <div class="page-header">
            <h1>🎯 Adaptive Assessment Results</h1>
            <p>Your personalized ability profile across all EPPP domains</p>
        </div>

        <div class="grid-2 mb-15">
            <div class="card text-center" style="padding:2rem;">
                ${App.createScoreRing(results.readiness, 160, 10)}
                <h2 style="margin-top:1rem;margin-bottom:0.25rem;">Readiness: ${results.readiness}%</h2>
                <p class="text-muted">${results.totalCorrect}/${results.totalQuestions} correct (${overallPct}%) · ${timeStr}</p>
                <div class="flex justify-center gap-05 mt-1" style="flex-wrap:wrap;">
                    <span class="badge" style="background:${results.overallLevel.color}22;color:${results.overallLevel.color};font-size:0.85rem;padding:0.35rem 0.75rem;">
                        ${results.overallLevel.icon} Overall: ${results.overallLevel.label}
                    </span>
                    <span class="badge badge-neutral" style="font-size:0.85rem;padding:0.35rem 0.75rem;">
                        θ = ${results.overallTheta}
                    </span>
                </div>
            </div>

            <div class="card">
                <h3 style="margin-bottom:1rem;">📌 Top Study Priorities</h3>
                ${results.weakest.map((d, i) => `
                    <div style="padding:0.75rem;border-radius:var(--radius-sm);background:${i === 0 ? 'rgba(239,68,68,0.06)' : 'var(--surface-secondary)'};margin-bottom:0.5rem;${i === 0 ? 'border-left:3px solid var(--color-danger);' : ''}">
                        <div class="flex justify-between items-center" style="margin-bottom:0.4rem;">
                            <div class="flex items-center gap-05">
                                <span style="color:${d.level.color};font-weight:600;">${d.level.icon}</span>
                                <strong class="text-sm">${d.domainName}</strong>
                            </div>
                            <span class="badge" style="background:${d.level.color}22;color:${d.level.color}">${d.level.label}</span>
                        </div>
                        <div class="text-sm text-muted">θ ${d.theta} · ${d.correct}/${d.total} correct · ~${d.recommendedHours}h recommended study</div>
                        <button class="btn btn-sm btn-secondary mt-05" onclick="App.navigateTo('study',{domainId:${d.domainId}})">Study This Domain →</button>
                    </div>
                `).join('')}
            </div>
        </div>

        <h3 style="margin-bottom:1rem;">Domain Ability Breakdown</h3>
        <div class="card mb-15">
            <div class="domain-list">
                ${results.domainResults.sort((a,b) => a.domainId - b.domainId).map(d => {
                    const barPct = Math.round(((d.theta - 0.5) / 3.0) * 100);
                    return `
                    <div class="domain-item">
                        <div class="domain-number" style="background:${d.color}22;color:${d.color}">${d.domainId}</div>
                        <div class="domain-info">
                            <div class="domain-name">
                                <span>${d.domainName}</span>
                                <span style="color:${d.level.color};font-weight:600;">${d.level.icon} ${d.level.label} (θ ${d.theta})</span>
                            </div>
                            <div class="progress-bar" style="height:8px;"><div class="progress-fill" style="width:${Math.min(100, barPct)}%;background:${d.level.color};"></div></div>
                            <div class="text-sm text-muted">${d.correct}/${d.total} correct · ${d.pct}% · ~${d.recommendedHours}h study recommended</div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>

        <h3 style="margin-bottom:1rem;">Adaptive Difficulty Trace</h3>
        <div class="card mb-15" style="overflow-x:auto;">
            <div class="text-sm text-muted" style="margin-bottom:0.75rem;">Watch how the algorithm adapted to your ability level in each domain:</div>
            ${results.domainResults.filter(d => d.history.length > 0).map(d => {
                const tracePoints = d.history.map((h, i) => {
                    const color = h.correct ? 'var(--color-success)' : 'var(--color-danger)';
                    return `<span style="display:inline-flex;align-items:center;gap:2px;" title="Q${i+1}: ${h.difficulty} (${h.correct ? 'correct' : 'wrong'}) → θ ${h.thetaAfter.toFixed(2)}">
                        <span style="color:${color};font-weight:bold;">${h.correct ? '✓' : '✗'}</span>
                        <span class="text-sm" style="color:var(--text-muted);">${h.thetaAfter.toFixed(1)}</span>
                        ${i < d.history.length - 1 ? '<span style="color:var(--border-color);margin:0 2px;">→</span>' : ''}
                    </span>`;
                }).join('');
                return `<div style="margin-bottom:0.75rem;">
                    <div class="text-sm" style="font-weight:600;color:${d.color};margin-bottom:0.3rem;">${d.domainName}</div>
                    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px;">${tracePoints}</div>
                </div>`;
            }).join('')}
        </div>

        <div class="flex gap-1 mt-15" style="flex-wrap:wrap;">
            <button class="btn btn-primary" id="cat-retake" style="background:linear-gradient(135deg,var(--accent-primary),#8B5CF6);">🔄 Retake Assessment</button>
            <button class="btn btn-secondary" id="cat-weak-exam">📝 Practice Weak Areas</button>
            <button class="btn btn-secondary" onclick="App.navigateTo('dashboard')">Dashboard</button>
        </div>`;

        document.getElementById('cat-retake').addEventListener('click', () => this.startAssessment());
        document.getElementById('cat-weak-exam').addEventListener('click', () => {
            App.navigateTo('exam', { type: 'weak-areas' });
        });
    }
};
