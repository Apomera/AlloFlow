import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

const html = fs.readFileSync('text_inquiry/text_inquiry.html', 'utf8');
const compromise = fs.readFileSync('vendor/compromise/compromise.js', 'utf8');
const sdk = fs.readFileSync('tool_integration_sdk.js', 'utf8');
const annotationBridge = fs.readFileSync('annotation_inquiry_bridge.js', 'utf8');
const core = fs.readFileSync('text_inquiry/text_inquiry_core.js', 'utf8');

describe('Text Inquiry Studio browser runtime', () => {
  it('runs the pinned NLP enhancement and captures only bounded derived evidence', () => {
    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://alloflow.test/text_inquiry/text_inquiry.html' });
    const { window } = dom;
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    const captureArtifact = vi.fn(() => ({ ok: true, queued: true }));
    window.ResearchHub = { captureArtifact };
    window.eval(compromise);
    window.eval(annotationBridge);
    window.eval(sdk);
    window.eval(core);
    const inline = Array.from(window.document.querySelectorAll('script')).at(-1).textContent;
    window.eval(inline);

    expect(typeof window.nlp).toBe('function');
    expect(window.document.getElementById('nlpBadge').textContent).toContain('compromise 14.15.1');
    window.document.getElementById('sampleBtn').click();
    window.document.getElementById('analyzeBtn').click();
    expect(window.document.getElementById('resultsCard').hidden).toBe(false);
    expect(window.document.getElementById('metrics').textContent).toContain('Words');

    window.document.getElementById('queryTerm').value = 'John';
    window.document.getElementById('concordanceBtn').click();
    expect(window.document.querySelectorAll('#concordanceList li').length).toBeGreaterThan(0);
    window.document.getElementById('patternClaim').value = 'The repeated name may concentrate authority in one relationship.';
    window.document.getElementById('counterReading').value = 'One occurrence is ordinary reference rather than symbolic emphasis.';
    window.document.getElementById('limitation').value = 'Frequency alone cannot establish narration, historical context, or meaning.';
    window.document.getElementById('approvalCheck').checked = true;
    window.document.getElementById('queryTerm').value = 'marriage';
    window.document.getElementById('queryTerm').dispatchEvent(new window.Event('input', { bubbles: true }));
    window.document.getElementById('captureBtn').click();
    expect(captureArtifact).not.toHaveBeenCalled();
    expect(window.document.getElementById('captureStatus').textContent).toContain('current concordance');
    window.document.getElementById('concordanceBtn').click();
    window.document.getElementById('openAnnotationBtn').click();
    expect(window.document.getElementById('annotationCard').hidden).toBe(false);
    window.document.getElementById('annotationStance').value = 'complicates';
    window.document.getElementById('annotationNote').value = 'The casual phrase qualifies how authority is represented in this sentence.';
    window.document.getElementById('addAnnotationBtn').click();
    expect(window.document.querySelectorAll('#annotationList li')).toHaveLength(1);
    window.document.getElementById('captureBtn').click();

    expect(captureArtifact).toHaveBeenCalledOnce();
    const artifact = captureArtifact.mock.calls[0][0];
    expect(artifact.integrationContract.id).toBe('text_inquiry_studio');
    expect(artifact.data.analysis.concordance.length).toBeGreaterThan(0);
    expect(artifact.data.annotations.annotations).toHaveLength(1);
    expect(artifact.data.annotations.annotations[0].stance).toBe('complicates');
    expect(JSON.stringify(artifact)).not.toContain('A colonial mansion, a hereditary estate');
    expect(artifact.reproducibilityReceipt.transformations).toContain('full source text omitted from capture');
    expect(window.document.getElementById('captureStatus').textContent).toContain('queued in the Research Hub');
    dom.window.close();
  });
});
