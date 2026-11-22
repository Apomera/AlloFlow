(function () {
    'use strict';

    var ISSUE_URL = 'https://github.com/Apomera/AlloFlow/issues/new';
    var CONTACT_EMAIL = 'aaron.pomeranz@maine.edu';
    var MAX_TOOL_NAME_LENGTH = 120;

    function normalizedToolName(value) {
        return String(value || '')
            .replace(/[\u0000-\u001f\u007f]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, MAX_TOOL_NAME_LENGTH);
    }

    function issueUrl(title, body) {
        var url = new URL(ISSUE_URL);
        url.searchParams.set('title', title);
        url.searchParams.set('body', body);
        return url.toString();
    }

    function emailUrl(subject, body) {
        return 'mailto:' + CONTACT_EMAIL
            + '?subject=' + encodeURIComponent(subject)
            + '&body=' + encodeURIComponent(body);
    }

    function setLink(link, href, accessibleLabel) {
        if (!link) return;
        link.href = href;
        link.setAttribute('aria-label', accessibleLabel);
    }

    function applyFeedbackTool(rawTool) {
        var tool = normalizedToolName(rawTool);
        var subjectName = tool || 'AlloFlow tool or workflow';
        var toolLine = tool ? tool : '[Name the tool or workflow]';
        var context = document.getElementById('feedbackContext');
        var clearBtn = document.getElementById('feedbackToolClear');

        if (context) {
            if (tool) {
                context.textContent = 'You are sharing feedback about: ' + tool + '.';
                context.hidden = false;
            } else {
                context.textContent = '';
                context.hidden = true;
            }
        }
        if (clearBtn) clearBtn.hidden = !tool;

        var privacyReminder = [
            'Privacy reminder: Do not include student names or records, health or disability information,',
            'credentials or API keys, confidential information, or copyrighted source material.'
        ].join(' ');

        var ideaBody = [
            'Tool or workflow: ' + toolLine,
            '',
            'What were you trying to accomplish?',
            '',
            'What idea or improvement would help?',
            '',
            'Who might benefit?',
            '',
            'Optional de-identified context:',
            '',
            privacyReminder
        ].join('\n');

        var problemBody = [
            'Tool or workflow: ' + toolLine,
            '',
            'What were you trying to accomplish?',
            '',
            'Steps to reproduce the problem:',
            '1.',
            '2.',
            '3.',
            '',
            'Expected result:',
            '',
            'Observed result:',
            '',
            'Browser, device, file type, or assistive technology (if relevant):',
            '',
            privacyReminder,
            'For a security vulnerability, stop and use the private email route instead.'
        ].join('\n');

        var privateBody = [
            'Tool or workflow: ' + toolLine,
            '',
            'De-identified classroom or practitioner context:',
            '',
            'What worked, what did not, or what would help?',
            '',
            privacyReminder,
            'Please remove identifying details before sending.'
        ].join('\n');

        setLink(
            document.getElementById('ideaFeedback'),
            issueUrl('[Idea] ' + subjectName, ideaBody),
            'Start a public idea issue on GitHub about ' + subjectName + ' (opens in a new tab)'
        );
        setLink(
            document.getElementById('barrierFeedback'),
            issueUrl('[Bug or accessibility barrier] ' + subjectName, problemBody),
            'Start a public problem report on GitHub about ' + subjectName + ' (opens in a new tab)'
        );
        setLink(
            document.getElementById('privateFeedback'),
            emailUrl('Private AlloFlow feedback: ' + subjectName, privateBody),
            'Draft a private email about ' + subjectName
        );
    }

    function configureFeedbackLinks() {
        var params = new URLSearchParams(window.location.search);
        var initialTool = normalizedToolName(params.get('tool'));
        var input = document.getElementById('feedbackToolInput');
        var clearBtn = document.getElementById('feedbackToolClear');

        if (input && initialTool && !input.value) input.value = initialTool;
        applyFeedbackTool(input ? input.value : initialTool);

        if (input) {
            input.addEventListener('input', function () {
                applyFeedbackTool(input.value);
            });
            input.addEventListener('keydown', function (event) {
                if (event.isComposing || event.keyCode === 229) return;
                if (event.key === 'Escape' && input.value) {
                    event.preventDefault();
                    input.value = '';
                    applyFeedbackTool('');
                }
            });
        }
        if (clearBtn && input) {
            clearBtn.addEventListener('click', function () {
                input.value = '';
                applyFeedbackTool('');
                input.focus();
            });
        }
    }

    function configureBackToTop() {
        var backButton = document.querySelector('.back-to-top');
        if (!backButton) return;

        function updateVisibility() {
            backButton.classList.toggle('visible', window.scrollY > 500);
        }

        backButton.addEventListener('click', function () {
            var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        });
        window.addEventListener('scroll', updateVisibility, { passive: true });
        updateVisibility();
    }

    function initialize() {
        configureFeedbackLinks();
        configureBackToTop();
        if (window.lucide) window.lucide.createIcons();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
}());
