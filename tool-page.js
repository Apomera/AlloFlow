(function () {
    'use strict';

    function fallbackCopy(text) {
        var area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        area.style.top = '0';
        document.body.appendChild(area);
        area.select();
        var copied = false;
        try {
            copied = Boolean(document.execCommand && document.execCommand('copy'));
        } catch (_err) {
            copied = false;
        }
        area.remove();
        return copied;
    }

    function copyText(text) {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            return navigator.clipboard.writeText(text).then(function () {
                return true;
            }, function () {
                return fallbackCopy(text);
            });
        }
        return Promise.resolve(fallbackCopy(text));
    }

    function enhanceShareLink() {
        var urlBox = document.querySelector('.tool-page-url');
        if (!urlBox || urlBox.querySelector('.tool-page-copy-btn')) return;
        var code = urlBox.querySelector('code');
        var url = code ? String(code.textContent || '').trim() : '';
        if (!url) return;

        var heading = document.querySelector('.tool-page-hero h1');
        var toolName = heading ? String(heading.textContent || '').trim() : 'this tool';

        var actions = document.createElement('span');
        actions.className = 'tool-page-url-actions';

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-page-copy-btn';
        btn.textContent = 'Copy Cloudflare link';
        btn.setAttribute('aria-label', 'Copy Cloudflare direct link for ' + toolName);

        var status = document.createElement('span');
        status.className = 'tool-page-copy-status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');

        btn.addEventListener('click', function () {
            if (btn.getAttribute('aria-disabled') === 'true') return;
            btn.setAttribute('aria-disabled', 'true');
            status.textContent = '';
            copyText(url).then(function (ok) {
                status.textContent = ok
                    ? 'Copied Cloudflare link for ' + toolName + '.'
                    : 'Copy unavailable. Select and copy the link above.';
            }).finally(function () {
                btn.removeAttribute('aria-disabled');
            });
        });

        actions.appendChild(btn);
        actions.appendChild(status);
        urlBox.appendChild(actions);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enhanceShareLink);
    } else {
        enhanceShareLink();
    }
})();
