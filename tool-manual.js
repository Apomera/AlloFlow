(function () {
    'use strict';

    var d = document;
    var root = d.documentElement;
    var LS = 'allo-reader-prefs';

    function fallbackCopy(text) {
        var area = d.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        area.style.top = '0';
        d.body.appendChild(area);
        area.select();
        var copied = false;
        try {
            copied = Boolean(d.execCommand && d.execCommand('copy'));
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

    function el(tag, attrs, kids) {
        var node = d.createElement(tag);
        Object.keys(attrs || {}).forEach(function (k) {
            if (k === 'text') node.textContent = attrs[k];
            else node.setAttribute(k, attrs[k]);
        });
        (kids || []).forEach(function (child) { node.appendChild(child); });
        return node;
    }

    function initReadingTools() {
        if (d.getElementById('rtools')) return;
        var prefs = {};
        try {
            var parsed = JSON.parse(localStorage.getItem(LS) || '{}', function (k, v) {
                return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
            });
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) prefs = parsed;
        } catch (_err) {
            prefs = {};
        }
        function save() {
            try { localStorage.setItem(LS, JSON.stringify(prefs)); } catch (_err) {}
        }

        var FONTS = [
            ['', 'Original'],
            ['Inter, ui-sans-serif, system-ui, sans-serif', 'Sans-serif'],
            ["Georgia, 'Times New Roman', serif", 'Serif'],
            ["'OpenDyslexic','Comic Sans MS','Trebuchet MS',sans-serif", 'Dyslexia-friendly'],
            ['ui-monospace, Menlo, Consolas, monospace', 'Monospace']
        ];
        var THEMES = [
            ['default', 'Default'], ['warm', 'Warm'], ['sepia', 'Sepia'], ['dark', 'Dark'],
            ['highContrast', 'High contrast'], ['blue', 'Blue'], ['green', 'Green'],
            ['rose', 'Rose'], ['easyread', 'Easy read']
        ];

        function $(id) { return d.getElementById(id); }
        function selectField(id, label, pairs) {
            var s = el('select', { id: id, 'aria-label': label });
            pairs.forEach(function (p) { s.appendChild(el('option', { value: p[0], text: p[1] })); });
            return el('label', {}, [d.createTextNode(label + ' '), s]);
        }
        function rangeField(id, label, min, max, step) {
            var r = el('input', { type: 'range', id: id, min: min, max: max, step: step, 'aria-label': label });
            return el('label', {}, [d.createTextNode(label + ' '), r]);
        }

        var status = el('span', { id: 'rt-status', class: 'rtools-status', role: 'status', 'aria-live': 'polite' });
        var panel = el('div', { class: 'rtools-panel', id: 'rtools-panel', hidden: '' }, [
            selectField('rt-font', 'Font', FONTS),
            rangeField('rt-size', 'Size', '0.85', '1.6', '0.05'),
            rangeField('rt-line', 'Line', '1.2', '2.4', '0.1'),
            rangeField('rt-letter', 'Letter', '0', '0.14', '0.01'),
            selectField('rt-theme', 'Theme', THEMES),
            el('button', { type: 'button', id: 'rt-ruler', 'aria-pressed': 'false', 'aria-keyshortcuts': 'ArrowUp ArrowDown', text: 'Reading ruler' }),
            el('button', { type: 'button', id: 'rt-reset', text: 'Reset' }),
            status
        ]);
        var toggle = el('button', {
            type: 'button', id: 'rt-toggle', class: 'rtools-toggle',
            'aria-expanded': 'false', 'aria-controls': 'rtools-panel', text: 'Reading tools'
        });
        var bar = el('div', { class: 'rtools no-print', id: 'rtools', lang: 'en', role: 'region', 'aria-label': 'Reading tools' }, [
            el('div', { class: 'rtools-in' }, [toggle, panel])
        ]);

        var main = d.getElementById('manual-main');
        if (main && main.parentNode) {
            main.parentNode.insertBefore(bar, main);
        } else {
            d.body.insertBefore(bar, d.body.firstChild);
        }
        d.body.appendChild(el('div', { id: 'rtools-ruler', 'aria-hidden': 'true' }));

        function announce(msg) {
            if (status) status.textContent = msg;
        }

        function apply() {
            var sizeNum = Number(prefs.size);
            var validSize = Number.isFinite(sizeNum) && sizeNum >= 0.5 && sizeNum <= 3;
            var lineNum = Number(prefs.line);
            var validLine = Number.isFinite(lineNum) && lineNum >= 1 && lineNum <= 4;
            var letterNum = Number(prefs.letter);
            var validLetter = Number.isFinite(letterNum) && letterNum >= 0 && letterNum <= 0.5;

            var sizeVal = validSize ? sizeNum : 1;
            var lineVal = validLine ? lineNum : 1.75;
            var letterVal = validLetter ? letterNum : 0;

            d.body.style.fontFamily = typeof prefs.font === 'string' ? prefs.font : '';
            d.body.style.lineHeight = validLine ? String(lineNum) : '';
            d.body.style.letterSpacing = validLetter && letterNum > 0 ? letterNum + 'em' : '';
            root.style.setProperty('--mn-fs', String(sizeVal));

            if (typeof prefs.theme === 'string' && prefs.theme && prefs.theme !== 'default') {
                root.setAttribute('data-allo-theme', prefs.theme);
            } else {
                root.removeAttribute('data-allo-theme');
            }
            if (prefs.ruler) root.setAttribute('data-allo-ruler', '1');
            else root.removeAttribute('data-allo-ruler');

            $('rt-font').value = typeof prefs.font === 'string' ? prefs.font : '';
            $('rt-size').value = sizeVal;
            $('rt-size').setAttribute('aria-valuetext', Math.round(sizeVal * 100) + '% text size');
            $('rt-line').value = lineVal;
            $('rt-line').setAttribute('aria-valuetext', Number(lineVal).toFixed(2).replace(/\.?0+$/, '') + ' line spacing');
            $('rt-letter').value = letterVal;
            $('rt-letter').setAttribute('aria-valuetext', letterVal > 0 ? '+' + Number(letterVal).toFixed(2) + ' em letter spacing' : 'Default letter spacing');
            $('rt-theme').value = typeof prefs.theme === 'string' && prefs.theme ? prefs.theme : 'default';
            $('rt-ruler').setAttribute('aria-pressed', prefs.ruler ? 'true' : 'false');
        }

        function on(id, ev, fn) { var n = $(id); if (n) n.addEventListener(ev, fn); }
        on('rt-font', 'change', function (e) { prefs.font = e.target.value; save(); apply(); });
        on('rt-size', 'input', function (e) { prefs.size = parseFloat(e.target.value); save(); apply(); });
        on('rt-line', 'input', function (e) { prefs.line = parseFloat(e.target.value); save(); apply(); });
        on('rt-letter', 'input', function (e) { prefs.letter = parseFloat(e.target.value); save(); apply(); });
        on('rt-theme', 'change', function (e) { prefs.theme = e.target.value; save(); apply(); });
        on('rt-ruler', 'click', function () {
            prefs.ruler = !prefs.ruler;
            save();
            apply();
            if (prefs.ruler) moveRuler(rulerTop);
            announce(prefs.ruler ? 'Reading ruler on. Use Up and Down arrows to move.' : 'Reading ruler off.');
        });
        on('rt-reset', 'click', function () {
            prefs = {};
            save();
            apply();
            announce('Reading tools reset to defaults.');
        });
        on('rt-toggle', 'click', function () {
            var opening = panel.hasAttribute('hidden');
            if (opening) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', '');
            toggle.setAttribute('aria-expanded', opening ? 'true' : 'false');
        });
        panel.addEventListener('keydown', function (e) {
            if (e.isComposing || e.keyCode === 229) return;
            if (e.key === 'Escape' && !panel.hasAttribute('hidden')) {
                e.preventDefault();
                panel.setAttribute('hidden', '');
                toggle.setAttribute('aria-expanded', 'false');
                toggle.focus();
            }
        });

        var ruler = $('rtools-ruler');
        var rulerTop = Math.max(0, Math.round(window.innerHeight / 2));
        function moveRuler(top) {
            if (!ruler) return;
            rulerTop = Math.max(0, Math.min(window.innerHeight - ruler.offsetHeight, top));
            ruler.style.top = rulerTop + 'px';
        }
        d.addEventListener('mousemove', function (e) {
            if (ruler && root.getAttribute('data-allo-ruler') === '1') {
                moveRuler(e.clientY - ruler.offsetHeight / 2);
            }
        });
        d.addEventListener('focusin', function (e) {
            if (!ruler || root.getAttribute('data-allo-ruler') !== '1' || !e.target || !e.target.getBoundingClientRect) return;
            var rect = e.target.getBoundingClientRect();
            moveRuler(rect.top + rect.height / 2 - ruler.offsetHeight / 2);
        });
        on('rt-ruler', 'keydown', function (e) {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
            e.preventDefault();
            if (!prefs.ruler) { prefs.ruler = true; save(); apply(); }
            moveRuler(rulerTop + (e.key === 'ArrowDown' ? 20 : -20));
        });

        apply();
    }

    function initManualActions() {
        var actions = d.querySelector('.manual-actions');
        if (!actions || actions.querySelector('.manual-copy-btn')) return;
        var openLink = actions.querySelector('a.manual-open');
        var url = openLink ? String(openLink.getAttribute('href') || '').trim() : '';
        var heading = d.querySelector('.manual-hero h1');
        var toolName = heading ? String(heading.textContent || '').replace(/:\s*Teacher Manual$/i, '').trim() : 'this tool';

        if (url) {
            var copyBtn = el('button', {
                type: 'button',
                class: 'manual-copy-btn no-print',
                'aria-label': 'Copy Cloudflare direct link for ' + toolName,
                text: 'Copy Cloudflare link'
            });
            var status = el('span', {
                class: 'manual-copy-status no-print',
                role: 'status',
                'aria-live': 'polite'
            });
            copyBtn.addEventListener('click', function () {
                if (copyBtn.getAttribute('aria-disabled') === 'true') return;
                copyBtn.setAttribute('aria-disabled', 'true');
                status.textContent = '';
                copyText(url).then(function (ok) {
                    status.textContent = ok
                        ? 'Copied Cloudflare link: ' + url
                        : 'Copy unavailable. Copy this link manually: ' + url;
                }).finally(function () {
                    copyBtn.removeAttribute('aria-disabled');
                });
            });
            actions.appendChild(copyBtn);
            actions.appendChild(status);
        }

        var printBtn = el('button', {
            type: 'button',
            class: 'manual-print-btn no-print',
            text: 'Print manual'
        });
        printBtn.addEventListener('click', function () {
            if (typeof window.print === 'function') window.print();
        });
        actions.appendChild(printBtn);
    }

    function initTocTracking() {
        var tocLinks = Array.prototype.slice.call(d.querySelectorAll('.manual-toc a[href^="#"]'));
        if (!tocLinks.length) return;
        var pairs = tocLinks.map(function (link) {
            var id = String(link.getAttribute('href') || '').slice(1);
            return { link: link, target: id ? d.getElementById(id) : null };
        }).filter(function (pair) { return Boolean(pair.target); });
        if (!pairs.length) return;

        function setCurrent(activeLink) {
            pairs.forEach(function (pair) {
                if (pair.link === activeLink) pair.link.setAttribute('aria-current', 'location');
                else pair.link.removeAttribute('aria-current');
            });
        }

        function sync() {
            var current = pairs[0].link;
            for (var i = 0; i < pairs.length; i++) {
                var rect = pairs[i].target.getBoundingClientRect();
                if (rect.top <= 140) current = pairs[i].link;
            }
            setCurrent(current);
        }

        window.addEventListener('scroll', sync, { passive: true });
        window.addEventListener('hashchange', sync);
        sync();
    }

    function start() {
        initReadingTools();
        initManualActions();
        initTocTracking();
    }

    if (d.readyState === 'loading') {
        d.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
