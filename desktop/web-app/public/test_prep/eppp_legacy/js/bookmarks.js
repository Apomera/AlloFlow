/* Bookmarks Module */
const Bookmarks = {
    render(container) {
        const store = App.getStore();
        const bookmarks = store.bookmarks || [];

        container.innerHTML = `
        <div class="page-header"><h1>Bookmarks & Notes</h1><p>Review your saved items and study notes</p></div>
        <div class="tabs mb-15">
            <button class="tab-btn active" data-tab="bookmarks">Bookmarks (${bookmarks.length})</button>
            <button class="tab-btn" data-tab="notes">Notes</button>
        </div>
        <div id="tab-content"></div>`;

        let currentTab = 'bookmarks';
        const renderTab = () => {
            const el = document.getElementById('tab-content');
            if (currentTab === 'bookmarks') {
                if (bookmarks.length === 0) {
                    el.innerHTML = `<div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                        <h3>No bookmarks yet</h3><p>Bookmark study topics and quiz questions while studying to review them here.</p>
                    </div>`;
                } else {
                    el.innerHTML = bookmarks.map((b, i) => `
                        <div class="card mb-1 flex justify-between items-center">
                            <div>
                                <div class="flex items-center gap-05 mb-05">
                                    <span class="badge badge-info">${b.type}</span>
                                    <span class="badge badge-neutral">${b.domainName || 'Domain ' + b.domainId}</span>
                                </div>
                                <div style="font-weight:500;">${b.title || 'Item ' + b.itemId}</div>
                                <div class="text-sm text-muted">${new Date(b.date).toLocaleDateString()}</div>
                            </div>
                            <div class="flex gap-05">
                                <button class="btn btn-secondary btn-sm" data-goto="${i}">Go to →</button>
                                <button class="btn btn-danger btn-sm" data-remove="${i}">Remove</button>
                            </div>
                        </div>`).join('');

                    el.querySelectorAll('[data-goto]').forEach(btn => {
                        const b = bookmarks[parseInt(btn.dataset.goto)];
                        btn.addEventListener('click', () => {
                            if (b.type === 'study') App.navigateTo('study', {domainId: b.domainId, topicIdx: b.itemId});
                            else App.navigateTo('quiz', {domainId: b.domainId});
                        });
                    });

                    el.querySelectorAll('[data-remove]').forEach(btn => {
                        btn.addEventListener('click', () => {
                            store.bookmarks.splice(parseInt(btn.dataset.remove), 1);
                            App.saveStore(store);
                            App.toast('Bookmark removed', 'info');
                            this.render(container);
                        });
                    });
                }
            } else {
                const noteEntries = Object.entries(store.notes || {}).filter(([,v]) => v.trim());
                if (noteEntries.length === 0) {
                    el.innerHTML = `<div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        <h3>No notes yet</h3><p>Add notes while studying topics to review them here.</p>
                    </div>`;
                } else {
                    el.innerHTML = noteEntries.map(([key, text]) => {
                        const parts = key.split('_');
                        const did = parseInt(parts[1]);
                        const tid = parseInt(parts[2]);
                        const domain = EPPPData.getDomain(did);
                        const topic = domain?.topics[tid];
                        return `<div class="card mb-1">
                            <div class="flex items-center gap-05 mb-05">
                                <span class="badge" style="background:${domain?.color}22;color:${domain?.color}">${domain?.name || 'Domain '+did}</span>
                                <span class="text-sm text-muted">${topic?.title || ''}</span>
                            </div>
                            <p class="text-sm" style="white-space:pre-wrap;line-height:1.7;">${text}</p>
                        </div>`;
                    }).join('');
                }
            }
        };

        renderTab();
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTab = btn.dataset.tab;
                renderTab();
            });
        });
    }
};
