/* Analytics Module */
const Analytics = {
    render(container) {
        const store = App.getStore();
        const readiness = App.calculateReadiness();
        const predictedScaled = Math.round(200 + (readiness / 100) * 600);
        const hasData = readiness > 0;

        container.innerHTML = `
        <div class="page-header"><h1>Analytics</h1><p>Track your progress and identify areas for improvement</p></div>

        ${hasData ? `
        <div class="grid-3 mb-15">
            <div class="card text-center" style="padding:1.5rem;">
                ${App.createScoreRing(readiness, 120, 8)}
                <div class="text-sm text-muted mt-05">Readiness Score</div>
            </div>
            <div class="card text-center" style="padding:1.5rem;">
                <div class="font-heading" style="font-size:2.5rem;color:${predictedScaled >= 500 ? 'var(--color-success)' : 'var(--color-warning)'};">${predictedScaled}</div>
                <div class="text-sm text-muted">/800 Predicted Score</div>
                <div class="badge mt-05 ${predictedScaled >= 500 ? 'badge-success' : 'badge-warning'}">${predictedScaled >= 500 ? 'On Track to Pass' : 'More Study Needed'}</div>
            </div>
            <div class="card text-center" style="padding:1.5rem;">
                <div class="font-heading" style="font-size:2.5rem;color:var(--accent-primary);">${App.getCurrentStreak()}</div>
                <div class="text-sm text-muted">Day Streak 🔥</div>
                <div class="text-sm text-muted mt-05">${store.quizHistory.length + store.examHistory.length} total sessions</div>
            </div>
        </div>` : ''}

        <div class="grid-2 mb-15">
            <div class="card">
                <h3 style="margin-bottom:1rem;">Domain Performance</h3>
                <div class="chart-container"><canvas id="chart-domain"></canvas></div>
            </div>
            <div class="card">
                <h3 style="margin-bottom:1rem;">Score Trend</h3>
                <div class="chart-container"><canvas id="chart-trend"></canvas></div>
            </div>
        </div>
        <div class="grid-2 mb-15">
            <div class="card">
                <h3 style="margin-bottom:1rem;">Strongest & Weakest Domains</h3>
                <div id="strength-weakness"></div>
            </div>
            <div class="card">
                <h3 style="margin-bottom:1rem;">Study Statistics</h3>
                <div id="study-stats"></div>
            </div>
        </div>

        ${hasData ? `
        <h3 style="margin-bottom:1rem;">📋 Domain-Specific Recommendations</h3>
        <div class="card mb-15" id="domain-recs"></div>` : ''}`;

        this.drawDomainChart(store);
        this.drawTrendChart(store);
        this.renderStrengthWeakness(store);
        this.renderStudyStats(store);
        if (hasData) this.renderRecommendations(store);
    },

    drawDomainChart(store) {
        const canvas = document.getElementById('chart-domain');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.parentElement.clientWidth;
        const h = 300;
        canvas.width = w * dpr; canvas.height = h * dpr;
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        ctx.scale(dpr, dpr);

        const barW = (w - 80) / 8;
        const maxH = h - 60;

        ctx.fillStyle = '#64748B';
        ctx.font = '11px Inter';
        ctx.textAlign = 'center';

        EPPPData.domains.forEach((d, i) => {
            const score = App.getDomainScore(d.id);
            const pct = score !== null ? score : 0;
            const barHeight = (pct / 100) * maxH;
            const x = 40 + i * barW + barW * 0.15;
            const bw = barW * 0.7;

            // Bar
            const grad = ctx.createLinearGradient(0, h - 30 - barHeight, 0, h - 30);
            grad.addColorStop(0, d.color);
            grad.addColorStop(1, d.color + '44');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(x, h - 30 - barHeight, bw, barHeight, [4, 4, 0, 0]);
            ctx.fill();

            // Label
            ctx.fillStyle = '#94A3B8';
            ctx.fillText(`D${d.id}`, x + bw/2, h - 12);
            if (pct > 0) { ctx.fillStyle = '#F1F5F9'; ctx.fillText(`${pct}%`, x + bw/2, h - 35 - barHeight); }
        });
    },

    drawTrendChart(store) {
        const canvas = document.getElementById('chart-trend');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.parentElement.clientWidth;
        const h = 300;
        canvas.width = w * dpr; canvas.height = h * dpr;
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        ctx.scale(dpr, dpr);

        const quizzes = store.quizHistory.slice(-20);
        if (quizzes.length < 2) {
            ctx.fillStyle = '#64748B'; ctx.font = '14px Inter'; ctx.textAlign = 'center';
            ctx.fillText('Complete more quizzes to see trends', w/2, h/2);
            return;
        }

        const padding = 50;
        const plotW = w - padding * 2;
        const plotH = h - padding * 2;

        // Draw line
        ctx.strokeStyle = '#6EE7B7'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
        ctx.beginPath();
        quizzes.forEach((q, i) => {
            const x = padding + (i / (quizzes.length - 1)) * plotW;
            const y = padding + plotH - ((q.score / q.total) * plotH);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Fill under
        const lastX = padding + plotW;
        const lastY = padding + plotH - ((quizzes[quizzes.length-1].score / quizzes[quizzes.length-1].total) * plotH);
        ctx.lineTo(lastX, padding + plotH);
        ctx.lineTo(padding, padding + plotH);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, padding, 0, padding + plotH);
        grad.addColorStop(0, 'rgba(110, 231, 183, 0.25)');
        grad.addColorStop(1, 'rgba(110, 231, 183, 0.02)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Dots
        quizzes.forEach((q, i) => {
            const x = padding + (i / (quizzes.length - 1)) * plotW;
            const y = padding + plotH - ((q.score / q.total) * plotH);
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#6EE7B7';
            ctx.fill();
        });

        // Axes labels
        ctx.fillStyle = '#64748B'; ctx.font = '11px Inter'; ctx.textAlign = 'right';
        ctx.fillText('100%', padding - 8, padding + 4);
        ctx.fillText('50%', padding - 8, padding + plotH/2 + 4);
        ctx.fillText('0%', padding - 8, padding + plotH + 4);
    },

    renderStrengthWeakness(store) {
        const el = document.getElementById('strength-weakness');
        const scores = EPPPData.domains.map(d => ({...d, score: App.getDomainScore(d.id)})).filter(d => d.score !== null);
        if (scores.length === 0) { el.innerHTML = '<p class="text-muted text-sm">Complete quizzes to see your strongest and weakest domains.</p>'; return; }

        scores.sort((a, b) => b.score - a.score);
        const strongest = scores[0];
        const weakest = scores[scores.length - 1];

        el.innerHTML = `
        <div style="padding:0.75rem;border-radius:var(--radius-sm);background:var(--color-success-dim);margin-bottom:0.75rem;">
            <div class="flex items-center gap-05"><span style="color:var(--color-success);font-weight:600;">💪 Strongest</span></div>
            <div class="text-sm mt-05">${strongest.name} — ${strongest.score}%</div>
        </div>
        <div style="padding:0.75rem;border-radius:var(--radius-sm);background:var(--color-danger-dim);">
            <div class="flex items-center gap-05"><span style="color:var(--color-danger);font-weight:600;">📚 Needs Work</span></div>
            <div class="text-sm mt-05">${weakest.name} — ${weakest.score}%</div>
            <button class="btn btn-sm btn-secondary mt-05" onclick="App.navigateTo('study',{domainId:${weakest.id}})">Study Now →</button>
        </div>`;
    },

    renderStudyStats(store) {
        const el = document.getElementById('study-stats');
        const totalQ = store.quizHistory.reduce((s,q)=>s+q.total,0) + store.examHistory.reduce((s,e)=>s+e.total,0);
        const totalCorrect = store.quizHistory.reduce((s,q)=>s+q.score,0) + store.examHistory.reduce((s,e)=>s+e.score,0);
        const avgPct = totalQ > 0 ? Math.round((totalCorrect/totalQ)*100) : 0;

        el.innerHTML = `
        <div class="flex justify-between items-center" style="padding:0.5rem 0;border-bottom:1px solid var(--border-color);">
            <span class="text-muted text-sm">Total Questions Answered</span><span class="font-heading">${totalQ}</span>
        </div>
        <div class="flex justify-between items-center" style="padding:0.5rem 0;border-bottom:1px solid var(--border-color);">
            <span class="text-muted text-sm">Overall Accuracy</span><span class="font-heading">${avgPct}%</span>
        </div>
        <div class="flex justify-between items-center" style="padding:0.5rem 0;border-bottom:1px solid var(--border-color);">
            <span class="text-muted text-sm">Quizzes Completed</span><span class="font-heading">${store.quizHistory.length}</span>
        </div>
        <div class="flex justify-between items-center" style="padding:0.5rem 0;border-bottom:1px solid var(--border-color);">
            <span class="text-muted text-sm">Practice Exams Taken</span><span class="font-heading">${store.examHistory.length}</span>
        </div>
        <div class="flex justify-between items-center" style="padding:0.5rem 0;">
            <span class="text-muted text-sm">Current Streak</span><span class="font-heading">${App.getCurrentStreak()} days</span>
        </div>`;
    },

    renderRecommendations(store) {
        const el = document.getElementById('domain-recs');
        if (!el) return;

        const domainWeights = {1:10,2:13,3:11,4:12,5:16,6:15,7:7,8:16};
        const ranked = EPPPData.domains.map(d => {
            const score = App.getDomainScore(d.id);
            const weight = domainWeights[d.id];
            // Priority = (100 - score) * weight — higher = needs more work and is more impactful
            const priority = score !== null ? (100 - score) * weight : weight * 100;
            return { ...d, score: score !== null ? score : 0, hasData: score !== null, weight, priority };
        }).sort((a, b) => b.priority - a.priority);

        el.innerHTML = ranked.map(d => {
            let status, action;
            if (!d.hasData) { status = '⚪ Not started'; action = 'Start studying'; }
            else if (d.score < 50) { status = '🔴 Needs significant work'; action = 'Focus here first'; }
            else if (d.score < 70) { status = '🟡 Getting there'; action = 'Review & practice quizzes'; }
            else if (d.score < 85) { status = '🟢 Solid'; action = 'Periodic review'; }
            else { status = '⭐ Mastered'; action = 'Maintain with spaced review'; }

            return `<div class="flex justify-between items-center" style="padding:0.6rem 0;${d !== ranked[ranked.length-1]?'border-bottom:1px solid var(--border-color);':''}">
                <div class="flex items-center gap-05">
                    <span class="domain-number" style="background:${d.color}22;color:${d.color};width:28px;height:28px;font-size:0.75rem;">${d.id}</span>
                    <div>
                        <div class="text-sm" style="font-weight:500;">${d.name}</div>
                        <div class="text-sm text-muted">${status} · ${d.weight}% of exam</div>
                    </div>
                </div>
                <div class="flex items-center gap-05">
                    <span class="text-sm" style="font-weight:600;color:${d.score >= 70 ? 'var(--color-success)' : d.score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'};">${d.hasData ? d.score + '%' : '—'}</span>
                    <button class="btn btn-sm btn-secondary" onclick="App.navigateTo('quiz',{domainId:${d.id}})">${action} →</button>
                </div>
            </div>`;
        }).join('');
    }
};
