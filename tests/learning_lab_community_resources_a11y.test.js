import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Community Resources accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalResources(props) {');
  const end = source.indexOf('  function PersonalSundayPlan(props) {', start);
  const resources = source.slice(start, end);

  it('uses a named form with native submit behavior', () => {
    expect(resources).toContain("hh('form', { onSubmit: function(event) { event.preventDefault(); addResource(); }");
    expect(resources).toContain("'aria-labelledby': 'learning-lab-resource-form-heading'");
    expect(resources).toContain("type: 'submit'");
  });

  it('provides visible labels for every field', () => {
    expect(resources).toContain("htmlFor: 'learning-lab-resource-name'");
    expect(resources).toContain("htmlFor: 'learning-lab-resource-category'");
    expect(resources).toContain("htmlFor: 'learning-lab-resource-contact'");
    expect(resources).toContain("htmlFor: 'learning-lab-resource-notes'");
  });

  it('uses a named native category select with a safe default', () => {
    expect(resources).toContain("emptyForm = { name: '', cat: 'community', contact: '', notes: '' }");
    expect(resources).toContain("hh('select', { id: 'learning-lab-resource-category'");
    expect(resources).toContain("hh('option', { key: category.id, value: category.id }, category.label)");
  });

  it('requires and bounds the resource name', () => {
    expect(resources).toContain("'Resource name (required)'");
    expect(resources).toContain('required: true, maxLength: 1000');
    expect(resources).toContain('maxLength: 2000');
    expect(resources).toContain('maxLength: 4000');
  });

  it('reports and focuses an empty name inline without a blocking alert', () => {
    expect(resources).toContain("setNameError('Enter a resource name.')");
    expect(resources).toContain("id: 'learning-lab-resource-name-error', role: 'alert'");
    expect(resources).toContain("'aria-invalid': nameError ? 'true' : undefined");
    expect(resources).toContain("focusById('learning-lab-resource-name')");
    expect(resources).not.toContain("alert('Need a name.')");
  });

  it('trims fields and preserves unrelated saved data', () => {
    expect(resources).toContain("name: name, cat: categoryFor(form.cat).id, contact: form.contact.trim(), notes: form.notes.trim()");
    expect(resources).toContain("setData(Object.assign({}, data, { resources: [resource].concat(data.resources || []) }))");
  });

  it('announces saving and returns focus to the form', () => {
    expect(resources).toContain("llAnnounce('Community resource saved: ' + name)");
    expect(resources).toContain("setForm(emptyForm); setNameError('');");
    expect(resources).toContain("focusById('learning-lab-resource-name')");
  });

  it('does not imply real-time verification, eligibility, or endorsement', () => {
    expect(resources).toContain('does not contact providers, verify availability in real time, guarantee eligibility, or endorse a service');
    expect(resources).toContain('Phone numbers, hours, coverage, cost, and privacy practices can change');
    expect(resources).toContain('open the official provider site before relying on a listing');
    expect(resources).not.toContain('universal crisis lines');
    expect(resources).not.toContain('Your safety net');
  });

  it('states emergency and geographic boundaries without claiming universal coverage', () => {
    expect(resources).toContain('For immediate or life-threatening danger, contact the emergency service for your location.');
    expect(resources).toContain('Built-in references are primarily for the United States, and some are Maine-specific.');
  });

  it('records a verification date and official URL for every built-in listing', () => {
    expect(resources.match(/verifiedOn: '2026-07-18'/g)).toHaveLength(8);
    expect(resources.match(/url: 'https:\/\//g)).toHaveLength(8);
  });

  it('accurately identifies 988 contact channels', () => {
    expect(resources).toContain("contact: 'Call or text 988; chat at 988lifeline.org'");
    expect(resources).toContain("url: 'https://988lifeline.org/get-help/'");
  });

  it('accurately identifies the US Crisis Text Line channel', () => {
    expect(resources).toContain("contact: 'In the US, text HOME to 741741'");
    expect(resources).toContain('carrier, shortcode, privacy, and safety limitations may apply');
  });

  it('accurately identifies the Maine Crisis Line', () => {
    expect(resources).toContain("contact: 'Call 1-888-568-1112'");
    expect(resources).toContain("url: 'https://www.maine.gov/dvem/'");
  });

  it('accurately identifies The Trevor Project channels and scope', () => {
    expect(resources).toContain("contact: 'Call 1-866-488-7386; text START to 678678; or use online chat'");
    expect(resources).toContain('US crisis support for LGBTQ+ young people');
  });

  it('accurately identifies the SAMHSA National Helpline', () => {
    expect(resources).toContain("contact: 'Call 1-800-662-HELP (4357)'");
    expect(resources).toContain('US treatment referral and information for mental health and substance use');
  });

  it('identifies NAMI Maine as a weekday non-crisis resource', () => {
    expect(resources).toContain("contact: 'Call 1-800-464-5767 and press 1'");
    expect(resources).toContain('Non-crisis Maine information and resource support, Monday through Friday, 8 a.m. to 4 p.m. Eastern.');
  });

  it('accurately identifies RAINN channels and privacy boundaries', () => {
    expect(resources).toContain("contact: 'Call 1-800-656-HOPE (4673) or use hotline.rainn.org'");
    expect(resources).toContain('Review official safety and confidentiality information before using online services.');
  });

  it('accurately identifies 211 Maine phone, text, and web channels', () => {
    expect(resources).toContain("contact: 'Dial 211; text your ZIP code to 898-211; or visit 211maine.org'");
    expect(resources).toContain("url: 'https://211maine.org/contact/'");
  });

  it('provides dated official links with explicit new-window behavior', () => {
    expect(resources).toContain("hh('time', { dateTime: resource.verifiedOn }, resource.verifiedOn)");
    expect(resources).toContain("href: resource.url, target: '_blank', rel: 'noopener noreferrer'");
    expect(resources).toContain("'Open official provider site (new tab)'");
  });

  it('uses semantic grouped lists and labeled resource articles', () => {
    expect(resources).toContain("hh('section', { 'aria-labelledby': 'learning-lab-resource-list-heading'");
    expect(resources).toContain("hh('h3', { id: headingId");
    expect(resources).toContain("hh('ul', { 'aria-label': category.label + ' resources'");
    expect(resources).toContain("hh('article', { 'aria-labelledby': resourceHeadingId");
    expect(resources).toContain("hh('h4', { id: resourceHeadingId");
  });

  it('distinguishes built-in references from personal resources in text', () => {
    expect(resources).toContain("resource.builtin ? 'Built-in reference' : 'Personal resource'");
  });

  it('keeps records with unknown legacy categories available', () => {
    expect(resources).toContain('return CATEGORIES.filter(function(category) { return category.id === id; })[0] || CATEGORIES[6]');
  });

  it('confirms removal while preserving unrelated data', () => {
    expect(resources).toContain("title: 'Remove this resource?', confirmText: 'Remove resource'");
    expect(resources).toContain('This cannot be undone.');
    expect(resources).toContain("setData(Object.assign({}, data, { resources: (data.resources || []).filter");
  });

  it('names personal removal controls, announces removal, and restores focus', () => {
    expect(resources).toContain("'aria-label': 'Remove personal resource: '");
    expect(resources).toContain("llAnnounce('Personal community resource removed.')");
    expect(resources).toContain("focusById('learning-lab-resource-list-heading')");
    expect(resources).toContain('resource.builtin ? null');
  });

  it('uses time semantics for personal resource dates', () => {
    expect(resources).toContain("hh('time', { dateTime: resource.createdAt || undefined }, relDate(resource.createdAt))");
  });

  it('discloses local storage privacy for personal listings', () => {
    expect(resources).toContain('Personal listings save in this browser.');
    expect(resources).toContain('Avoid names or private details if other people use this device.');
    expect(resources).toContain("'aria-describedby': 'learning-lab-resource-privacy-note'");
  });

  it('wraps long user content and uses responsive fields and 44-pixel targets', () => {
    expect(resources).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
    expect(resources).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))'");
    expect(resources).toContain('minWidth: 44, minHeight: 44');
    expect(resources).toContain("width: '100%', minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
