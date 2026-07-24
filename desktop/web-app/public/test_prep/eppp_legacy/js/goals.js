/* Study Goals Module — Daily targets, weekly plans, and progress tracking */
const StudyGoals = {
    render(container) {
        const store = App.getStore();
        if (!store.studyGoals) {
            store.studyGoals = { dailyTarget: 30, weeklyTarget: 5, examDate: '', customGoals: [], dailyLog: [] };
            App.saveStore(store);
        }
        const goals = store.studyGoals;
        const today = new Date().toISOString().split('T')[0];
        const todayLog = goals.dailyLog.find(l => l.date === today) || { date: today, questionsAnswered: 0, minutesStudied: 0, flashcardsReviewed: 0 };

        // Calculate today's stats from store
        const todayQuizzes = store.quizHistory.filter(q => q.date.startsWith(today));
        const todayQuestions = todayQuizzes.reduce((s, q) => s + q.total, 0);
        const todayMinutes = Math.floor((store.totalTimeStudied || 0) / 60); // total all-time for now
        const todaySessionMinutes = this.getTodayMinutes(store);

        // Weekly stats
        const weekStart = this.getWeekStart();
        const daysStudied = this.getWeekDaysStudied(store, weekStart);
        const weeklyProgress = Math.min(100, Math.round((daysStudied / Math.max(1, goals.weeklyTarget)) * 100));

        // Daily progress
        const dailyQuestionTarget = goals.dailyTarget;
        const dailyProgress = Math.min(100, Math.round((todayQuestions / Math.max(1, dailyQuestionTarget)) * 100));

        // Days until exam
        const examDateStr = goals.examDate;
        let daysUntilExam = null;
        if (examDateStr) {
            const diff = new Date(examDateStr) - new Date();
            daysUntilExam = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        }

        container.innerHTML = `
        <div class="page-header">
            <h1>Study Goals</h1>
            <p>Set targets, track daily progress, and stay on schedule</p>
        </div>

        ${daysUntilExam !== null ? `
        <div class="card mb-15" style="background:linear-gradient(135deg,rgba(110,231,183,0.1),rgba(59,130,246,0.1));border:1px solid var(--accent-primary);">
            <div class="flex justify-between items-center">
                <div>
                    <h3 style="margin:0;">📅 Exam Countdown</h3>
                    <p class="text-sm text-muted mt-025">${new Date(examDateStr).toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p>
                </div>
                <div class="text-center">
                    <div class="font-heading" style="font-size:2.5rem;color:${daysUntilExam <= 30 ? 'var(--color-danger)' : daysUntilExam <= 90 ? 'var(--color-warning)' : 'var(--accent-primary)'};">${daysUntilExam}</div>
                    <div class="text-sm text-muted">days remaining</div>
                </div>
            </div>
        </div>` : ''}

        <div class="grid-2 mb-15">
            <div class="card">
                <h3 style="margin-bottom:1rem;">📊 Today's Progress</h3>
                <div style="display:flex;align-items:center;gap:1.5rem;margin-bottom:1.5rem;">
                    ${App.createScoreRing(dailyProgress, 100, 6)}
                    <div>
                        <div class="font-heading" style="font-size:1.5rem;">${todayQuestions} / ${dailyQuestionTarget}</div>
                        <div class="text-sm text-muted">questions answered today</div>
                        <div class="text-sm text-muted mt-025">~${todaySessionMinutes} min studied today</div>
                    </div>
                </div>
                <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                    <button class="btn btn-primary btn-sm" onclick="App.navigateTo('quiz')">📝 Take Quiz</button>
                    <button class="btn btn-sm" style="background:var(--accent-primary-dim);color:var(--accent-primary);" onclick="App.navigateTo('flashcards')">🧠 Flashcards</button>
                    <button class="btn btn-secondary btn-sm" onclick="App.navigateTo('study')">📖 Study</button>
                </div>
            </div>
            <div class="card">
                <h3 style="margin-bottom:1rem;">📅 This Week</h3>
                <div style="display:flex;align-items:center;gap:1.5rem;margin-bottom:1rem;">
                    ${App.createScoreRing(weeklyProgress, 100, 6)}
                    <div>
                        <div class="font-heading" style="font-size:1.5rem;">${daysStudied} / ${goals.weeklyTarget}</div>
                        <div class="text-sm text-muted">days studied this week</div>
                    </div>
                </div>
                <div class="flex gap-05" style="justify-content:space-between;">
                    ${this.renderWeekDots(store, weekStart)}
                </div>
            </div>
        </div>

        <div class="grid-2 mb-15">
            <div class="card">
                <h3 style="margin-bottom:1rem;">⚙️ Goal Settings</h3>
                <label class="text-sm text-muted" style="display:block;margin-bottom:0.3rem;">Daily question target</label>
                <select id="goals-daily" style="width:100%;margin-bottom:1rem;">
                    ${[10,15,20,25,30,40,50,75,100].map(n => `<option value="${n}" ${goals.dailyTarget===n?'selected':''}>${n} questions/day</option>`).join('')}
                </select>
                <label class="text-sm text-muted" style="display:block;margin-bottom:0.3rem;">Weekly study days target</label>
                <select id="goals-weekly" style="width:100%;margin-bottom:1rem;">
                    ${[3,4,5,6,7].map(n => `<option value="${n}" ${goals.weeklyTarget===n?'selected':''}>${n} days/week</option>`).join('')}
                </select>
                <label class="text-sm text-muted" style="display:block;margin-bottom:0.3rem;">Exam date (optional)</label>
                <input type="date" id="goals-exam-date" value="${goals.examDate}" style="width:100%;margin-bottom:1rem;">
                <button class="btn btn-primary w-full" id="goals-save">Save Settings</button>
            </div>
            <div class="card">
                <h3 style="margin-bottom:1rem;">🎯 Domain Focus Plan</h3>
                <div id="domain-focus-plan"></div>
            </div>
        </div>

        ${this.renderStudyCalendar(store)}`;

        document.getElementById('goals-save').addEventListener('click', () => {
            const store2 = App.getStore();
            if (!store2.studyGoals) store2.studyGoals = {};
            store2.studyGoals.dailyTarget = parseInt(document.getElementById('goals-daily').value);
            store2.studyGoals.weeklyTarget = parseInt(document.getElementById('goals-weekly').value);
            store2.studyGoals.examDate = document.getElementById('goals-exam-date').value;
            App.saveStore(store2);
            App.toast('Goals saved!');
            this.render(container);
        });

        this.renderDomainFocusPlan(store);
    },

    getTodayMinutes(store) {
        const today = new Date().toISOString().split('T')[0];
        const sessions = (store.studyTimeSessions || []).filter(s => s.date.startsWith(today));
        const secs = sessions.reduce((sum, s) => sum + s.duration, 0);
        return Math.round(secs / 60);
    },

    getWeekStart() {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff)).toISOString().split('T')[0];
    },

    getWeekDaysStudied(store, weekStart) {
        const ws = new Date(weekStart);
        const activeDays = new Set();

        // Count unique days with quiz activity this week
        store.quizHistory.forEach(q => {
            const d = q.date.split('T')[0];
            if (new Date(d) >= ws) activeDays.add(d);
        });
        store.examHistory.forEach(e => {
            const d = e.date.split('T')[0];
            if (new Date(d) >= ws) activeDays.add(d);
        });
        // Also count streak days
        (store.streakDays || []).forEach(d => {
            if (new Date(d) >= ws) activeDays.add(d);
        });

        return activeDays.size;
    },

    renderWeekDots(store, weekStart) {
        const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
        const ws = new Date(weekStart);
        const activeDays = new Set();
        store.quizHistory.forEach(q => { const d = q.date.split('T')[0]; activeDays.add(d); });
        store.examHistory.forEach(e => { const d = e.date.split('T')[0]; activeDays.add(d); });
        (store.streakDays || []).forEach(d => activeDays.add(d));

        return days.map((label, i) => {
            const date = new Date(ws);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const isActive = activeDays.has(dateStr);
            const isPast = date < new Date() && !isToday;

            return `<div style="text-align:center;">
                <div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;
                    background:${isActive ? 'var(--accent-primary)' : isPast ? 'var(--color-danger-dim)' : 'var(--bg-input)'};
                    color:${isActive ? 'var(--text-inverse)' : isPast ? 'var(--color-danger)' : 'var(--text-muted)'};
                    border:${isToday ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)'};
                    font-size:0.7rem;font-weight:600;">
                    ${isActive ? '✓' : isPast ? '✗' : '·'}
                </div>
                <div class="text-sm text-muted" style="font-size:0.65rem;margin-top:0.2rem;">${label}</div>
            </div>`;
        }).join('');
    },

    renderDomainFocusPlan(store) {
        const el = document.getElementById('domain-focus-plan');
        if (!el) return;

        const domainWeights = {1:10,2:13,3:11,4:12,5:16,6:15,7:7,8:16};
        const ranked = EPPPData.domains.map(d => {
            const score = App.getDomainScore(d.id);
            const weight = domainWeights[d.id];
            const priority = score !== null ? (100 - score) * weight : weight * 50;
            return { ...d, score: score !== null ? score : null, weight, priority };
        }).sort((a, b) => b.priority - a.priority);

        // Show top 3 priority domains
        const top3 = ranked.slice(0, 3);

        el.innerHTML = `
        <p class="text-sm text-muted mb-1">Focus on these domains for maximum impact:</p>
        ${top3.map((d, i) => `
            <div style="padding:0.6rem;border-radius:var(--radius-sm);background:${i === 0 ? 'var(--color-danger-dim)' : i === 1 ? 'var(--color-warning-dim)' : 'var(--accent-primary-dim)'};margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center;">
                <div class="flex items-center gap-05">
                    <span style="font-weight:700;font-size:0.85rem;color:${i === 0 ? 'var(--color-danger)' : i === 1 ? 'var(--color-warning)' : 'var(--accent-primary)'};">#${i+1}</span>
                    <span class="text-sm" style="font-weight:500;">${d.name}</span>
                </div>
                <div class="flex items-center gap-05">
                    <span class="text-sm text-muted">${d.score !== null ? d.score + '%' : 'New'} · ${d.weight}%</span>
                    <button class="btn btn-sm btn-secondary" onclick="App.navigateTo('quiz',{domainId:${d.id}})">Study →</button>
                </div>
            </div>
        `).join('')}
        <p class="text-sm text-muted mt-1">Ranked by: (gap from mastery) × (exam weight)</p>`;
    },

    renderStudyCalendar(store) {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Collect all active dates
        const activeDates = new Set();
        store.quizHistory.forEach(q => activeDates.add(q.date.split('T')[0]));
        store.examHistory.forEach(e => activeDates.add(e.date.split('T')[0]));
        (store.streakDays || []).forEach(d => activeDates.add(d));

        const cells = [];
        // Empty cells for start of month
        const startOffset = firstDay === 0 ? 6 : firstDay - 1;
        for (let i = 0; i < startOffset; i++) cells.push('<div></div>');

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const isActive = activeDates.has(dateStr);
            const isToday = d === today.getDate();
            cells.push(`<div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;
                font-size:0.75rem;font-weight:${isToday ? '700' : '400'};
                background:${isActive ? 'var(--accent-primary)' : 'transparent'};
                color:${isActive ? 'var(--text-inverse)' : isToday ? 'var(--accent-primary)' : 'var(--text-muted)'};
                border:${isToday ? '2px solid var(--accent-primary)' : 'none'};">${d}</div>`);
        }

        return `
        <h3 style="margin-bottom:1rem;">📆 Study Calendar — ${monthName}</h3>
        <div class="card">
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center;">
                ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => `<div class="text-sm text-muted" style="font-size:0.7rem;font-weight:600;padding:4px;">${d}</div>`).join('')}
                ${cells.join('')}
            </div>
            <div class="flex justify-between items-center mt-1" style="padding-top:0.75rem;border-top:1px solid var(--border-color);">
                <div class="flex items-center gap-05">
                    <div style="width:12px;height:12px;border-radius:50%;background:var(--accent-primary);"></div>
                    <span class="text-sm text-muted">Study day</span>
                </div>
                <span class="text-sm text-muted">${activeDates.size} total study days this month</span>
            </div>
        </div>`;
    }
};
