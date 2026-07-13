/* Study Mode Module */
const Study = {
    currentDomain: 1,
    currentTopic: 0,

    render(container, params = {}) {
        if (params.domainId) this.currentDomain = params.domainId;
        if (params.topicIdx !== undefined) this.currentTopic = params.topicIdx;

        const domain = EPPPData.getDomain(this.currentDomain);
        if (!domain) return;
        const topic = domain.topics[this.currentTopic] || domain.topics[0];

        container.innerHTML = `
        <div class="page-header">
            <h1>Study Content</h1>
            <p>Review key concepts and theories across all EPPP domains</p>
        </div>
        <div class="flex gap-2" style="align-items:flex-start;">
            <div class="study-sidebar">
                ${EPPPData.domains.map(d => `
                    <div class="study-domain-header">${d.id}. ${d.name}</div>
                    ${d.topics.map((t, ti) => `
                        <button class="study-topic-btn ${d.id===this.currentDomain && ti===this.currentTopic ? 'active' : ''}"
                            data-domain="${d.id}" data-topic="${ti}">${t.title}</button>
                    `).join('')}
                `).join('')}
            </div>
            <div class="study-content">
                <div class="flex items-center gap-1 mb-1">
                    <span class="badge" style="background:${domain.color}22;color:${domain.color}">${domain.name}</span>
                    <span class="badge badge-neutral">${domain.weight}% of exam</span>
                </div>
                <h2>${topic.title}</h2>
                <div class="card mt-1" id="study-body" style="line-height:1.9;">
                    ${this.formatContent(topic.summary)}
                </div>
                <div class="flex gap-1 mt-15">
                    <button class="btn btn-secondary btn-sm" id="study-bookmark-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                        Bookmark
                    </button>
                    <button class="btn btn-primary btn-sm" id="study-quiz-btn">
                        Quiz This Domain →
                    </button>
                </div>
                <div class="card mt-15" id="study-notes-section">
                    <h3 style="font-size:0.95rem;margin-bottom:0.75rem;color:var(--text-secondary);">Your Notes</h3>
                    <textarea id="study-notes" placeholder="Type your notes here... They auto-save." rows="4" style="width:100%;resize:vertical;">${this.getNote()}</textarea>
                </div>
            </div>
        </div>
        `;

        container.querySelectorAll('.study-topic-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentDomain = parseInt(btn.dataset.domain);
                this.currentTopic = parseInt(btn.dataset.topic);
                this.render(container);
                App.updateStreak();
            });
        });

        const notesEl = document.getElementById('study-notes');
        let saveTimer;
        notesEl.addEventListener('input', () => {
            clearTimeout(saveTimer);
            saveTimer = setTimeout(() => {
                const store = App.getStore();
                store.notes[`study_${this.currentDomain}_${this.currentTopic}`] = notesEl.value;
                App.saveStore(store);
                App.toast('Notes saved', 'success');
            }, 1000);
        });

        document.getElementById('study-bookmark-btn').addEventListener('click', () => {
            const store = App.getStore();
            store.bookmarks.push({type:'study', domainId: this.currentDomain, itemId: this.currentTopic, date: new Date().toISOString(), title: topic.title, domainName: domain.name});
            App.saveStore(store);
            App.toast('Bookmarked!', 'success');
        });

        document.getElementById('study-quiz-btn').addEventListener('click', () => {
            App.navigateTo('quiz', {domainId: this.currentDomain});
        });
    },

    formatContent(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/→/g, '→')
            .replace(/\. /g, '.</p><p>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>');
    },

    getNote() {
        const store = App.getStore();
        return store.notes[`study_${this.currentDomain}_${this.currentTopic}`] || '';
    }
};
