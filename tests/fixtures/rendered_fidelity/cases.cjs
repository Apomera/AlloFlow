'use strict';

// Synthetic, source-authored preservation obligations. These examples are not
// expert calibration or screen-reader acceptance evidence. A checkpoint lists
// only the properties that must survive that particular repair: for example, a
// valid table-header correction deliberately does not require an unchanged role.
// Every document is self-contained except the explicit unavailable-resource case.
const documentHtml = (body, { css = '', head = '', lang = 'en', dir = 'ltr' } = {}) =>
    `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><title>Synthetic rendered fidelity fixture</title><style>body { margin: 24px; font: 16px sans-serif; } table { border-collapse: collapse; } td, th { padding: 8px; border: 1px solid #666; } ${css}</style>${head}</head><body>${body}</body></html>`;

const cases = [
    {
        id: 'valid-table-header-correction',
        category: 'semantic-correction',
        sourceHtml: documentHtml('<table id="results"><caption>Trial results</caption><tbody><tr><td>Trial</td><td>Score</td></tr><tr><td>A</td><td>95</td></tr></tbody></table>'),
        candidateHtml: documentHtml('<table id="results"><caption>Trial results</caption><tbody><tr><th scope="col">Trial</th><th scope="col">Score</th></tr><tr><th scope="row">A</th><td>95</td></tr></tbody></table>'),
        checkpoints: [{ id: 'results-content', sourceSelector: '#results', properties: ['text', 'visible', 'exposed'] }],
        expectedStatus: 'passed',
    },
    {
        id: 'valid-equivalent-label-association',
        category: 'semantic-correction',
        sourceHtml: documentHtml('<label for="account">Account number</label><input id="account" value="0012">'),
        candidateHtml: documentHtml('<label>Account number<input id="account" value="0012"></label>'),
        checkpoints: [{ id: 'account-control', sourceSelector: '#account', properties: ['name', 'role', 'value', 'disabled', 'visible', 'exposed'] }],
        expectedStatus: 'passed',
    },
    {
        id: 'valid-fieldset-first-legend-exception',
        category: 'forms',
        sourceHtml: documentHtml('<fieldset><legend><label><input id="override" type="checkbox" checked>Enable alternate delivery</label></legend><p>Choose whether to use alternate delivery.</p></fieldset>'),
        candidateHtml: documentHtml('<fieldset disabled><legend><label><input id="override" type="checkbox" checked>Enable alternate delivery</label></legend><p>Choose whether to use alternate delivery.</p></fieldset>'),
        checkpoints: [{ id: 'first-legend-control', sourceSelector: '#override', properties: ['name', 'role', 'disabled', 'checked', 'visible', 'exposed'] }],
        expectedStatus: 'passed',
    },
    {
        id: 'valid-internal-target-consistent-rename',
        category: 'navigation',
        sourceHtml: documentHtml('<a id="jump" href="#fees">Read the fee schedule</a><h2 id="fees">Fee schedule</h2><p>Fees are listed by service.</p>'),
        candidateHtml: documentHtml('<a id="jump" href="#fee-schedule">Read the fee schedule</a><h2 id="fee-schedule">Fee schedule</h2><p>Fees are listed by service.</p>'),
        checkpoints: [{ id: 'same-target-content', sourceSelector: '#jump', properties: ['targetText'] }],
        expectedStatus: 'passed',
    },
    {
        id: 'valid-inherited-language-equivalence',
        category: 'multilingual',
        sourceHtml: documentHtml('<section lang="fr"><p id="instruction">Conservez ce document pour vos dossiers.</p></section>'),
        candidateHtml: documentHtml('<section><p id="instruction" lang="fr">Conservez ce document pour vos dossiers.</p></section>'),
        checkpoints: [{ id: 'french-instruction', sourceSelector: '#instruction', properties: ['text', 'language', 'direction', 'visible', 'exposed'] }],
        expectedStatus: 'passed',
    },
    {
        id: 'css-cascade-hides-instruction',
        category: 'rendered-visibility',
        sourceHtml: documentHtml('<p id="instruction" class="important">Submit the form before Friday.</p>', { css: '.important { display: block; }' }),
        candidateHtml: documentHtml('<p id="instruction" class="important">Submit the form before Friday.</p>', { css: '.important { display: block; } #instruction { display: none; }' }),
        checkpoints: [{ id: 'submission-instruction', sourceSelector: '#instruction', properties: ['text', 'visible', 'exposed'] }],
        expectedStatus: 'review-required',
    },
    {
        id: 'desktop-media-query-hides-instruction',
        category: 'rendered-visibility',
        sourceHtml: documentHtml('<p id="instruction">Bring a printed copy to your appointment.</p>'),
        candidateHtml: documentHtml('<p id="instruction">Bring a printed copy to your appointment.</p>', { css: '@media (min-width: 1000px) { #instruction { visibility: hidden; } }' }),
        checkpoints: [{ id: 'desktop-instruction', sourceSelector: '#instruction', properties: ['text', 'visible', 'exposed'] }],
        expectedStatus: 'review-required',
    },
    {
        id: 'duplicate-text-hidden-at-required-location',
        category: 'source-location',
        sourceHtml: documentHtml('<aside><p id="summary-copy">Save the confirmation number.</p></aside><section><h2>After submitting</h2><p id="required-copy">Save the confirmation number.</p></section>'),
        candidateHtml: documentHtml('<aside><p id="summary-copy">Save the confirmation number.</p></aside><section><h2>After submitting</h2><p id="required-copy">Save the confirmation number.</p></section>', { css: '#required-copy { display: none; }' }),
        checkpoints: [{ id: 'after-submitting-instruction', sourceSelector: '#required-copy', properties: ['text', 'visible', 'exposed'] }],
        expectedStatus: 'review-required',
    },
    {
        id: 'aria-label-overrides-visible-field-label',
        category: 'accessible-name',
        sourceHtml: documentHtml('<label for="account">Account number</label><input id="account" value="0012">'),
        candidateHtml: documentHtml('<label for="account">Account number</label><input id="account" value="0012" aria-label="Shipping address">'),
        checkpoints: [{ id: 'account-spoken-label', sourceSelector: '#account', properties: ['name', 'role', 'value'] }],
        expectedStatus: 'review-required',
    },
    {
        id: 'aria-labelledby-overrides-label-and-aria-label',
        category: 'accessible-name',
        sourceHtml: documentHtml('<p id="unrelated">Shipping address</p><label for="account">Account number</label><input id="account" aria-label="Account number" value="0012">'),
        candidateHtml: documentHtml('<p id="unrelated">Shipping address</p><label for="account">Account number</label><input id="account" aria-label="Account number" aria-labelledby="unrelated" value="0012">'),
        checkpoints: [{ id: 'account-label-precedence', sourceSelector: '#account', properties: ['name', 'role', 'value'] }],
        expectedStatus: 'review-required',
    },
    {
        id: 'fieldset-inherits-disabled-state',
        category: 'forms',
        sourceHtml: documentHtml('<fieldset><legend>Contact details</legend><label for="email">Email address</label><input id="email" type="email" value="reader@example.test"></fieldset>'),
        candidateHtml: documentHtml('<fieldset disabled><legend>Contact details</legend><label for="email">Email address</label><input id="email" type="email" value="reader@example.test"></fieldset>'),
        checkpoints: [{ id: 'contact-email', sourceSelector: '#email', properties: ['name', 'role', 'value', 'disabled'] }],
        expectedStatus: 'review-required',
    },
    {
        id: 'checkbox-selected-choice-changed',
        category: 'forms',
        sourceHtml: documentHtml('<label><input id="receipt" type="checkbox" checked>Email a receipt</label>'),
        candidateHtml: documentHtml('<label><input id="receipt" type="checkbox">Email a receipt</label>'),
        checkpoints: [{ id: 'receipt-choice', sourceSelector: '#receipt', properties: ['name', 'role', 'checked'] }],
        expectedStatus: 'review-required',
    },
    {
        id: 'select-default-choice-changed',
        category: 'forms',
        sourceHtml: documentHtml('<label for="delivery">Delivery method</label><select id="delivery"><option id="postal-option" value="postal" selected>Postal mail</option><option value="email">Email</option></select>'),
        candidateHtml: documentHtml('<label for="delivery">Delivery method</label><select id="delivery"><option id="postal-option" value="postal">Postal mail</option><option value="email" selected>Email</option></select>'),
        checkpoints: [
            { id: 'delivery-value', sourceSelector: '#delivery', properties: ['name', 'role', 'value'] },
            { id: 'postal-selection', sourceSelector: '#postal-option', properties: ['selected'] },
        ],
        expectedStatus: 'review-required',
    },
    {
        id: 'internal-target-id-reassigned',
        category: 'navigation',
        sourceHtml: documentHtml('<a id="jump" href="#fees">Read the fee schedule</a><h2 id="fees">Fee schedule</h2><p>Fees are listed by service.</p><h2 id="contact">Contact information</h2>'),
        candidateHtml: documentHtml('<a id="jump" href="#fees">Read the fee schedule</a><h2 id="contact">Fee schedule</h2><p>Fees are listed by service.</p><h2 id="fees">Contact information</h2>'),
        checkpoints: [{ id: 'fee-link-target', sourceSelector: '#jump', properties: ['href', 'targetText'] }],
        expectedStatus: 'review-required',
    },
    {
        id: 'math-spoken-description-changed',
        category: 'math',
        sourceHtml: documentHtml('<p>Balance: <span id="formula" role="math" aria-label="x minus two">x − 2</span></p>'),
        candidateHtml: documentHtml('<p>Balance: <span id="formula" role="math" aria-label="x plus two">x − 2</span></p>'),
        checkpoints: [{ id: 'formula-description', sourceSelector: '#formula', properties: ['text', 'name', 'role', 'visible', 'exposed'] }],
        expectedStatus: 'review-required',
    },
    {
        id: 'math-visible-operator-changed',
        category: 'math',
        sourceHtml: documentHtml('<p>Balance: <span id="formula" role="math" aria-label="x minus two">x − 2</span></p>'),
        candidateHtml: documentHtml('<p>Balance: <span id="formula" role="math" aria-label="x minus two">x + 2</span></p>'),
        checkpoints: [{ id: 'formula-operator', sourceSelector: '#formula', properties: ['text', 'name', 'role', 'visible', 'exposed'] }],
        expectedStatus: 'review-required',
    },
    {
        id: 'inherited-language-changed',
        category: 'multilingual',
        sourceHtml: documentHtml('<section lang="fr"><p id="instruction">Conservez ce document pour vos dossiers.</p></section>'),
        candidateHtml: documentHtml('<section lang="en"><p id="instruction">Conservez ce document pour vos dossiers.</p></section>'),
        checkpoints: [{ id: 'french-pronunciation', sourceSelector: '#instruction', properties: ['text', 'language'] }],
        expectedStatus: 'review-required',
    },
    {
        id: 'right-to-left-reading-direction-changed',
        category: 'multilingual',
        sourceHtml: documentHtml('<section lang="ar" dir="rtl"><p id="instruction">احتفظ بهذا المستند في سجلاتك.</p></section>'),
        candidateHtml: documentHtml('<section lang="ar" dir="ltr"><p id="instruction">احتفظ بهذا المستند في سجلاتك.</p></section>'),
        checkpoints: [{ id: 'arabic-reading-direction', sourceSelector: '#instruction', properties: ['text', 'language', 'direction'] }],
        expectedStatus: 'review-required',
    },
    {
        id: 'data-table-role-removed',
        category: 'semantic-regression',
        sourceHtml: documentHtml('<table id="results"><caption>Trial results</caption><thead><tr><th scope="col">Trial</th><th scope="col">Score</th></tr></thead><tbody><tr><th scope="row">A</th><td>95</td></tr></tbody></table>'),
        candidateHtml: documentHtml('<table id="results" role="presentation"><caption>Trial results</caption><thead><tr><th scope="col">Trial</th><th scope="col">Score</th></tr></thead><tbody><tr><th scope="row">A</th><td>95</td></tr></tbody></table>'),
        checkpoints: [{ id: 'results-table-semantics', sourceSelector: '#results', properties: ['text', 'role', 'visible', 'exposed'] }],
        expectedStatus: 'review-required',
    },
    {
        id: 'external-stylesheet-is-unavailable',
        category: 'unavailable-resource',
        sourceHtml: documentHtml('<p id="instruction">Bring a printed copy to your appointment.</p>', { head: '<link rel="stylesheet" href="https://rendered-fidelity.example.invalid/document.css">' }),
        candidateHtml: documentHtml('<p id="instruction">Bring a printed copy to your appointment.</p>', { head: '<link rel="stylesheet" href="https://rendered-fidelity.example.invalid/document.css">' }),
        checkpoints: [{ id: 'externally-styled-instruction', sourceSelector: '#instruction', properties: ['text', 'visible', 'exposed'] }],
        expectedStatus: 'unavailable',
    },
];

module.exports = cases;
