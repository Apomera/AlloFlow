'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const checkerPath = path.resolve(__dirname, '../../dev-tools/rendered_document_fidelity.cjs');
const { compareFiles } = require(checkerPath);
const documentHtml = body => '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Review probe</title></head><body>' + body + '</body></html>';
const cases = [
  { id: 'hidden-negation-in-checkpoint', source: '<p id="p">Do <span>not</span> open the container.</p>', candidate: '<p id="p">Do <span style="display:none">not</span> open the container.</p>', properties: ['text', 'visible', 'exposed'] },
  { id: 'display-contents-opacity', source: '<div><p id="p" style="display:contents">Keep the required instruction.</p></div>', candidate: '<div style="opacity:0"><p id="p" style="display:contents">Keep the required instruction.</p></div>', properties: ['text', 'visible', 'exposed'] },
  { id: 'duplicate-option-values', source: '<label for="p">Direction</label><select id="p"><option value="direction" selected>North</option><option value="direction">South</option></select>', candidate: '<label for="p">Direction</label><select id="p"><option value="direction">North</option><option value="direction" selected>South</option></select>', properties: ['selected', 'value', 'text', 'name', 'role', 'disabled'] },
  { id: 'relative-link-root-collapse', source: '<a id="p" href="./chapter.pdf">Read the chapter</a>', candidate: '<a id="p" href="../chapter.pdf">Read the chapter</a>', properties: ['href', 'text', 'name', 'role'] },
  { id: 'unrequested-large-text', source: '<main id="p"><p>' + 'Original reading. '.repeat(600) + '</p></main>', candidate: '<main id="p"><p>' + 'Original reading. '.repeat(600) + '</p></main>', properties: ['role', 'exposed'] },
];
async function inspect(browser, html) {
  const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
  try {
    await context.route('**/*', route => route.abort());
    const page = await context.newPage(); await page.setContent(html);
    const facts = await page.locator('#p').evaluate(el => ({
      textContent: el.textContent.slice(0, 180), innerText: el.innerText.slice(0, 180),
      ownVisible: el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }),
      parentOpacity: getComputedStyle(el.parentElement).opacity,
      selectedOptions: el.tagName === 'SELECT' ? Array.from(el.selectedOptions).map(option => ({ label: option.label, value: option.value, index: option.index })) : null,
      literalHref: el.getAttribute('href'),
    }));
    facts.aria = (await page.locator('#p').ariaSnapshot()).slice(0, 1000);
    return facts;
  } finally { await context.close(); }
}
(async () => {
  const beforeHash = crypto.createHash('sha256').update(fs.readFileSync(checkerPath)).digest('hex');
  const browser = await require('playwright').chromium.launch({ headless: true });
  const results = [];
  try {
    for (const fixture of cases) {
      const directory = path.join(__dirname, fixture.id); fs.mkdirSync(directory, { recursive: true });
      const sourcePath = path.join(directory, 'source.html'), candidatePath = path.join(directory, 'candidate.html');
      const source = documentHtml(fixture.source), candidate = documentHtml(fixture.candidate);
      fs.writeFileSync(sourcePath, source); fs.writeFileSync(candidatePath, candidate);
      const report = await compareFiles(browser, sourcePath, candidatePath, { checkpoints: [{ id: 'p', sourceSelector: '#p', properties: fixture.properties }] });
      const observations = { source: await inspect(browser, source), candidate: await inspect(browser, candidate) };
      if (fixture.id === 'relative-link-root-collapse') {
        observations.source.actualFileDestination = new URL(observations.source.literalHref, pathToFileURL(sourcePath)).href;
        observations.candidate.actualFileDestination = new URL(observations.candidate.literalHref, pathToFileURL(candidatePath)).href;
      }
      results.push({ id: fixture.id, report, observations });
      console.log(JSON.stringify({ id: fixture.id, status: report.status, coverage: report.coverage, observations }));
    }
  } finally { await browser.close(); }
  const afterHash = crypto.createHash('sha256').update(fs.readFileSync(checkerPath)).digest('hex');
  fs.writeFileSync(path.join(__dirname, 'rendered-probe-results.json'), JSON.stringify({ checkerSha256: beforeHash, sourceChanged: beforeHash !== afterHash, browserVersion: browser.version(), results }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
