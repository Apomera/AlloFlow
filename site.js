(function () {
    'use strict';
    function initMobileNavigation() {
        var menu = document.getElementById('mobileNav');
        var openButton = document.querySelector('.mobile-menu-btn');
        if (!menu || !openButton) return;
        var closeButton = menu.querySelector('.close-btn');
        var lastFocused = null;
        function items() { return Array.prototype.slice.call(menu.querySelectorAll('a[href], button:not([disabled])')); }
        function setPageInert(inert) {
            document.querySelectorAll('body > *:not(#mobileNav)').forEach(function (element) {
                if (element.tagName === 'SCRIPT') return;
                if (inert) { element.setAttribute('inert', ''); element.setAttribute('data-site-inert', ''); }
                else if (element.hasAttribute('data-site-inert')) { element.removeAttribute('inert'); element.removeAttribute('data-site-inert'); }
            });
        }
        function openMenu() {
            lastFocused = document.activeElement;
            menu.hidden = false;
            menu.classList.add('open');
            menu.setAttribute('aria-hidden', 'false');
            openButton.setAttribute('aria-expanded', 'true');
            document.body.classList.add('site-menu-open');
            setPageInert(true);
            (closeButton || items()[0] || menu).focus();
        }
        function closeMenu(restoreFocus) {
            menu.classList.remove('open');
            menu.hidden = true;
            menu.setAttribute('aria-hidden', 'true');
            openButton.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('site-menu-open');
            setPageInert(false);
            if (restoreFocus !== false && lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
        }
        openButton.addEventListener('click', openMenu);
        if (closeButton) closeButton.addEventListener('click', function () { closeMenu(true); });
        menu.querySelectorAll('a[href]').forEach(function (link) { link.addEventListener('click', function () { closeMenu(false); }); });
        menu.addEventListener('click', function (event) { if (event.target === menu) closeMenu(true); });
        menu.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); return; }
            if (event.key !== 'Tab') return;
            var focusables = items();
            if (!focusables.length) return;
            var first = focusables[0];
            var last = focusables[focusables.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        });
        closeMenu(false);
    }
    function hardenExternalLinks() {
        document.querySelectorAll('a[target="_blank"]').forEach(function (link) {
            var values = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
            values.add('noopener'); values.add('noreferrer');
            link.setAttribute('rel', Array.from(values).join(' '));
        });
    }
    function trackStickyCallToAction() {
        var sticky = document.getElementById('stickyCta');
        if (!sticky || typeof MutationObserver === 'undefined') return;
        var sync = function () { document.body.classList.toggle('has-sticky-cta', sticky.classList.contains('visible')); };
        new MutationObserver(sync).observe(sticky, { attributes: true, attributeFilter: ['class'] });
        sync();
    }
    document.addEventListener('DOMContentLoaded', function () { initMobileNavigation(); hardenExternalLinks(); trackStickyCallToAction(); });
})();
