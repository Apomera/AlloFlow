function _alloParsePreviewMarkdown(text) {
    if (!text) return '';
    const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const emphasis = value => value.replace(/\*\*(\S(?:.*?\S)?)\*\*/g, '<strong>$1</strong>').replace(/\*(\S(?:.*?\S)?)\*/g, '<em>$1</em>');
    const inline = value => {
        const tokens = [];
        const hold = html => '\u0000' + (tokens.push(html) - 1) + '\u0000';
        // Protect code, escaped punctuation, and link URLs from emphasis replacement.
        const content = escape(value.replace(/\u0000/g, ''))
            .replace(/\x60([^\x60]+)\x60/g, (_, code) => hold('<code>' + code + '</code>'))
            .replace(/\\([\\*_{}\[\]()#+.!-])/g, (_, literal) => hold(literal))
            .replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_, label, url) => {
                const safeUrl = /^(?:https?:|mailto:|tel:|resource:|#|\/|\.)/i.test(url) ? url : '#';
                return hold('<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer">' + emphasis(label) + '</a>');
            });
        let rendered = emphasis(content);
        for (let pass = 0; pass <= tokens.length && rendered.includes('\u0000'); pass++) {
            rendered = rendered.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)]);
        }
        return rendered;
    };
    const lines = String(text).replace(/\\n/g, '\n').replace(/\r\n?/g, '\n').split('\n');
    let html = '';
    const lists = [];
    const closeList = () => {
        const list = lists.pop();
        if (list) html += (list.itemOpen ? '</li>' : '') + '</' + list.kind + '>';
    };
    lines.forEach(line => {
        const content = line.trim();
        if (!content) return;
        const indented = line.replace(/\t/g, '    ');
        const match = indented.match(/^(\s*)(?:([-*•])|(\d+)[.)])\s+(.+)$/);
        if (match) {
            const indent = match[1].length;
            const kind = match[3] ? 'ol' : 'ul';
            while (lists.length && indent < lists[lists.length - 1].indent) closeList();
            if (lists.length && indent === lists[lists.length - 1].indent && kind !== lists[lists.length - 1].kind) closeList();
            let list = lists[lists.length - 1];
            if (!list || indent > list.indent) {
                html += '<' + kind + (match[3] ? ' start="' + Number(match[3]) + '"' : '') + ' style="margin: 5px 0; padding-left: 20px; list-style-type: ' + (match[3] ? 'decimal' : 'disc') + ';">';
                list = { kind, indent, itemOpen: false };
                lists.push(list);
            }
            if (list.itemOpen) html += '</li>';
            html += '<li' + (match[3] ? ' value="' + Number(match[3]) + '"' : '') + ' style="margin-bottom: 5px;">' + inline(match[4]);
            list.itemOpen = true;
            return;
        }
        const indent = indented.length - indented.trimStart().length;
        if (lists.length && indent > lists[lists.length - 1].indent) {
            html += '<p style="margin-bottom: 10px;">' + inline(content) + '</p>';
            return;
        }
        while (lists.length) closeList();
        const heading = content.match(/^(#{1,6})\s+(.+)$/);
        html += heading
            ? '<h' + heading[1].length + '>' + inline(heading[2]) + '</h' + heading[1].length + '>'
            : '<p style="margin-bottom: 10px;">' + inline(content) + '</p>';
    });
    while (lists.length) closeList();
    return html;
}
