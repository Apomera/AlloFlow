// Student delivery restores pictures by KEY NAME after the session sanitizer
// nulls every data: string. A field missing from that list reaches students
// blank with no warning (anchor-chart iconUrl, 2026-10-29). These tests drive
// the shipped modules, so a new image field must be added to the pack list
// before any resource that uses it can reach a student.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const PNG = 'data:image/png;base64,' + 'iVBORw0KGgo' + 'A'.repeat(600);
const PNG2 = 'data:image/png;base64,' + 'iVBORw0KGgo' + 'B'.repeat(600);
const store = new Map();
let L;

beforeAll(() => {
  window.React = Object.assign(window.React || {}, {
    Component: window.React?.Component || class {},
    createElement: window.React?.createElement || (() => null),
    useState: window.React?.useState || (() => [null, () => {}]),
    useEffect: window.React?.useEffect || (() => {}),
    useRef: window.React?.useRef || (() => ({ current: null })),
    useMemo: window.React?.useMemo || ((fn) => fn()),
  });
  window.AlloLanguageContext = window.AlloLanguageContext || {};
  window.doc = (_db, ...parts) => parts.join('/');
  window.db = {};
  window.setDoc = async (ref, data) => { store.set(ref, structuredClone(data)); };
  window.getDoc = async (ref) => ({ exists: () => store.has(ref), data: () => structuredClone(store.get(ref)) });
  window.warnLog = () => {};
  window.__alloFirebase = { auth: { currentUser: { uid: 'test-teacher' } } };
  loadAlloModule('firestore_sync_module.js');
  loadAlloModule('live_aac_module.js');
  loadAlloModule('module_scope_extras_module.js');
  L = window.AlloModules.LiveAac;
});

beforeEach(() => store.clear());

const deps = () => ({ sanitizeHistoryForCloud: window.sanitizeHistoryForCloud, stripUndefined: (v) => JSON.parse(JSON.stringify(v)) });
const packFields = () => {
  const src = readFileSync(resolve(process.cwd(), 'live_aac_source.jsx'), 'utf8');
  const match = src.match(/const ALLO_PACK_IMAGE_FIELDS = (\[[^\]]*\]);/);
  expect(match, 'ALLO_PACK_IMAGE_FIELDS should be declared').toBeTruthy();
  return JSON.parse(match[1].replace(/'/g, '"'));
};

describe('student pack image fields', () => {
  it('covers every field the image authoring controls can write', () => {
    const controls = readFileSync(resolve(process.cwd(), 'resource_image_controls_source.jsx'), 'utf8');
    const declared = controls.match(/const RESOURCE_IMAGE_FIELDS = new Set\((\[[^\]]*\])\)/);
    expect(declared, 'RESOURCE_IMAGE_FIELDS should be declared').toBeTruthy();
    const authorable = JSON.parse(declared[1].replace(/'/g, '"'));
    const missing = authorable.filter((field) => !packFields().includes(field));
    expect(missing, 'authorable image fields the student pack would blank').toEqual([]);
  });

  it('the sanitizer really does blank these fields, so the restore is load-bearing', () => {
    const blanked = window.sanitizeSessionValue({ iconUrl: PNG, coverImage: PNG }, 'resource');
    expect(blanked.iconUrl).toBeNull();
    expect(blanked.coverImage).toBeNull();
  });

  it('restores every listed field, nested inside a resource', () => {
    const fields = packFields();
    const item = { id: 'r1', type: 'outline', title: 'T', data: { rows: fields.map((field) => ({ label: field, [field]: PNG })) } };
    const packed = L.serializeResourceForStudentPack(item, deps());
    const lost = fields.filter((field, index) => packed.data.rows[index][field] !== PNG);
    expect(lost, 'image fields that reached the student blank').toEqual([]);
  });

  it('restores per-choice picture lists and id-keyed image maps', () => {
    const item = { id: 'q1', type: 'quiz', title: 'Q', data: { questions: [{ question: 'Pick', answerImageUrls: [PNG, null], evidenceImageUrls: [PNG2] }], gallery: { images: { a: PNG, b: PNG2 } } } };
    const packed = L.serializeResourceForStudentPack(item, deps());
    expect(packed.data.questions[0].answerImageUrls).toEqual([PNG, null]);
    expect(packed.data.questions[0].evidenceImageUrls).toEqual([PNG2]);
    expect(packed.data.gallery.images).toEqual({ a: PNG, b: PNG2 });
  });

  it('delivers anchor chart icons and counts them for delivery receipts', async () => {
    const chart = { id: 'ac1', type: 'anchor-chart', title: 'Chart', data: { title: 'Chart', sections: [
      { id: 's1', label: 'A', bullets: ['x'], iconPrompt: 'p', iconUrl: PNG, iconAlt: 'A sun' },
      { id: 's2', label: 'B', bullets: ['y'], iconPrompt: 'p', iconUrl: '' },
    ] } };
    const { resource, report } = await L.prepareMailboxResource(chart, { ...deps(), resizeImage: async () => null });
    expect(resource.data.sections[0].iconUrl).toBe(PNG);
    expect(resource.data.sections[0].iconAlt).toBe('A sun');
    expect(report.total).toBe(1);
    expect(L.mailboxResourceImages(resource).sources).toEqual([PNG]);
    expect(chart.data.sections[0].iconUrl, 'the teacher original is untouched').toBe(PNG);
  });

  it('an icon over the pack budget is reported and its description dropped', async () => {
    const huge = 'data:image/png;base64,' + 'A'.repeat(5 * 1024 * 1024 + 10);
    const chart = { id: 'ac2', type: 'anchor-chart', title: 'Chart', data: { sections: [{ id: 's1', label: 'A', iconUrl: huge, iconAlt: 'A sun', iconAltSource: 'ai' }] } };
    const { resource, report } = await L.prepareMailboxResource(chart, { ...deps(), resizeImage: async () => null });
    const section = resource.data.sections[0];
    expect(section.iconUrl).toBeNull();
    expect(section.iconAlt).toBeUndefined();
    expect(section.iconAltSource).toBeUndefined();
    expect(report.omitted).toBe(1);
    expect(L.mailboxResourceImages(resource).omitted).toBe(1);
  });

  it('top-level Memory Aid visuals still spend the budget once', async () => {
    const aid = { id: 'm1', type: 'memory-aid', title: 'M', data: { cards: [{ id: 'c1', visualImage: PNG, visualAlt: 'A cat' }] } };
    const { resource, report } = await L.prepareMailboxResource(aid, { ...deps(), resizeImage: async () => null });
    expect(resource.data.cards[0].visualImage).toBe(PNG);
    expect(resource.data.cards[0].visualAlt).toBe('A cat');
    expect(report.total).toBe(1);
  });
});

describe('Firebase live session image assets', () => {
  it('every image the uploader externalizes is hydrated back', async () => {
    window.AlloModules.WordSoundsReadiness = window.AlloModules.WordSoundsReadiness || { portable: (item) => item };
    const resources = [
      { id: 'i', type: 'image', data: { imageUrl: PNG } },
      { id: 'g', type: 'glossary', data: [{ term: 'sun', image: PNG }] },
      { id: 'm', type: 'memory-aid', data: { cards: [{ id: 'c', visualImage: PNG }] } },
      { id: 'a', type: 'adventure', data: { sceneImage: PNG, inventory: [{ name: 'key', image: PNG }], snapshot: { sceneImage: PNG2, inventory: [{ name: 'map', image: PNG2 }] } } },
      { id: 'p', type: 'persona', data: [{ name: 'Ada', avatarUrl: PNG }] },
      { id: 'ac', type: 'anchor-chart', data: { sections: [{ id: 's', iconUrl: PNG }] } },
    ];
    const manifest = await window.uploadSessionAssets('app-test', resources, 'IMGS');
    expect([...store.values()].some((entry) => entry.kind === 'sessionImage' || entry.kind === 'sessionImageChunks'), 'images were externalized').toBe(true);
    const hydrated = await window.hydrateSessionAssets('app-test', manifest);
    const json = JSON.stringify(hydrated);
    expect(json.includes('ref::img_'), 'an externalized picture came back as its ref:: placeholder').toBe(false);
    expect(hydrated[2].data.cards[0].visualImage).toBe(PNG);
    expect(hydrated[5].data.sections[0].iconUrl).toBe(PNG);
  });
});
