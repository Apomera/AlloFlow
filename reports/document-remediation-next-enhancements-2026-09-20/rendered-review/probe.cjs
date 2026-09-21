'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { compareRenderedHtml } = require('../../../dev-tools/rendered_document_fidelity.cjs');
const file = path.resolve('dev-tools/rendered_document_fidelity.cjs');
const digest = () => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const wrap = html => '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Bounded native probe</title></head><body>' + html + '</body></html>';
const form = (name, value = 'original') => wrap('<form id="checkpoint"><input name="' + name + '" value="' + value + '"></form>');
const link = (svg, target = 'Required explanation', extra = '') => wrap((svg ? '<svg><a id="checkpoint" href="#destination"' + extra + '><text x="0" y="20">Read</text></a></svg>' : '<a id="checkpoint" href="#destination"' + extra + '>Read</a>') + '<p id="destination">' + target + '</p>');
const cases = [
 { id: 'form-clobbered-tag-name-same-payload', source: form('tagName'), candidate: form('tagName').replace('<form ', '<form class="repair" '), property: 'formData' },
 { id: 'form-clobbered-tag-name-changed-payload', source: form('tagName'), candidate: form('tagName','changed'), property: 'formData' },
 { id: 'form-normal-name-same-payload', source: form('answer'), candidate: form('answer').replace('<form ', '<form class="repair" '), property: 'formData' },
 { id: 'form-normal-name-changed-payload', source: form('answer'), candidate: form('answer','changed'), property: 'formData' },
 { id: 'svg-same-target', source: link(true), candidate: link(true, 'Required explanation', ' class="repair"'), property: 'targetText' },
 { id: 'svg-changed-target-text', source: link(true), candidate: link(true, 'Changed explanation'), property: 'targetText' },
 { id: 'html-same-target', source: link(false), candidate: link(false, 'Required explanation', ' class="repair"'), property: 'targetText' },
 { id: 'html-changed-target-text', source: link(false), candidate: link(false, 'Changed explanation'), property: 'targetText' }
];
(async () => {
 const startHash = digest();
 const browser = await chromium.launch({headless:true});
 const observations = [];
 try {
 for (const item of cases) {
 const native = {};
 for (const side of ['source','candidate']) {
 const context = await browser.newContext({javaScriptEnabled:false, serviceWorkers:'block'});
 await context.route('**/*', route => route.abort());
 const page = await context.newPage(); await page.setContent(item[side]);
 native[side] = await page.evaluate(property => {
 const node = document.querySelector('#checkpoint');
 if (property === 'formData') return {isForm: node instanceof HTMLFormElement, tagNameValueType: typeof node.tagName, entries:Array.from(new FormData(node))};
 const href = node instanceof SVGAElement ? node.href.baseVal : node.getAttribute('href');
 const target = document.getElementById(href.slice(1));
 return {isSvg: node instanceof SVGAElement, href, targetText: target?.textContent, htmlOnlyHashProperty:node.hash ?? null};
 }, item.property);
 if (item.property === 'targetText') {
 await page.locator('#checkpoint').click({force:true});
 native[side].browserNavigatedHash = await page.evaluate(() => location.hash);
 }
 await context.close();
 }
 const report = await compareRenderedHtml(browser,item.source,item.candidate,{checkpoints:[{id:item.id, sourceSelector:'#checkpoint',properties:[item.property]}]});
 observations.push({id:item.id, property:item.property, native, report});
 }
 const result = {browserVersion:browser.version(), sourceHash:startHash, sourceUnchanged:startHash===digest(), cases:observations};
 fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({browserVersion:result.browserVersion,sourceUnchanged:result.sourceUnchanged,cases:observations.map(x =>({id:x.id,native:x.native,status:x.report.status,checks:x.report.checks}))},null,2));
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});

