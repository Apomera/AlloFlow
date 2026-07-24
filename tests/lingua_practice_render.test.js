import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, Lingua, BookReader, root, host;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('lingua_practice_module.js');
  loadAlloModule('reading_library_module.js');
  Lingua = window.AlloModules.LinguaPractice;
  BookReader = window.AlloModules.ReadingLibrary.BookReader;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
});

function button(text) {
  return Array.from(host.querySelectorAll('button')).find((node) => node.textContent.includes(text));
}

async function mount(component) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => { root.render(component); });
}

describe('Lingua Practice render flow', () => {
  it('moves from setup into vocabulary and speaking practice', async () => {
    const lesson = {
      title: 'At school',
      goal: 'Ask for help in context.',
      scenario: 'You need a pencil during class.',
      vocabulary: [
        { term: 'lápiz', meaning: 'pencil', pronunciation: 'LAH-pees', example: 'Necesito un lápiz.', examplePronunciation: 'neh-seh-SEE-toh oon LAH-pees', translation: 'I need a pencil.' },
        { term: 'ayuda', meaning: 'help', example: 'Necesito ayuda.', translation: 'I need help.' },
      ],
      phrases: [{ target: 'Necesito un lápiz.', pronunciation: 'neh-seh-SEE-toh oon LAH-pees', translation: 'I need a pencil.' }],
      conversation: [{ coach: '¿Qué necesitas?', coachPronunciation: 'keh neh-seh-SEE-tahs', translation: 'What do you need?', sample: 'Necesito un lápiz.', samplePronunciation: 'neh-seh-SEE-toh oon LAH-pees' }],
    };
    const callGemini = async () => JSON.stringify(lesson);
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini }));

    expect(host.textContent).toContain('Practice language from what you are learning');
    await act(async () => {
      button('Build practice set').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(host.textContent).toContain('At school');
    expect(JSON.parse(localStorage.getItem('allo_lingua_recent_v1')).Spanish.title).toBe('At school');
    expect(host.textContent).toContain('lápiz');
    expect(host.textContent).toContain('LAH-pees');
    expect(button('Practice speaking')).toBeTruthy();

    await act(async () => {
      button('Practice speaking').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(host.textContent).toContain('Make the phrase your own');
    expect(host.textContent).toContain('Necesito un lápiz.');
    expect(host.textContent).toContain('not your accent');
    expect(host.textContent).toContain('neh-seh-SEE-toh oon LAH-pees');
  });

  it('continues the most recent practice set for the selected language', async () => {
    localStorage.setItem('allo_lingua_recent_v1', JSON.stringify({
      Spanish: {
        title: 'Travel basics',
        topic: 'At the station',
        level: 'Developing',
        createdAt: Date.now(),
        lesson: {
          title: 'Travel basics',
          goal: 'Ask where the train leaves.',
          scenario: 'At a train station.',
          vocabulary: [{ term: 'andén', meaning: 'platform', pronunciation: 'ahn-DEN', example: '¿Dónde está el andén?', examplePronunciation: 'DON-deh es-TAH el ahn-DEN', translation: 'Where is the platform?' }],
          phrases: [{ target: '¿Dónde está el andén?', pronunciation: 'DON-deh es-TAH el ahn-DEN', translation: 'Where is the platform?' }],
          conversation: [{ coach: '¿Adónde va?', translation: 'Where are you going?', sample: 'Voy a Madrid.' }],
        },
      },
    }));

    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));

    expect(host.textContent).toContain('Recent Spanish practice');
    expect(host.textContent).toContain('Travel basics');
    expect(button('Continue recent practice')).toBeTruthy();
    expect(host.querySelector('#lingua-source').value).toBe('');

    await act(async () => {
      button('Continue recent practice').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(host.textContent).toContain('Ask where the train leaves.');
    expect(host.textContent).toContain('andén');
    expect(host.textContent).toContain('ahn-DEN');
  });
  it('preloads a Reading Library selection and detects its target language', async () => {
    let consumed = 0;
    await mount(React.createElement(Lingua, {
      isOpen: true,
      onClose: () => {},
      initialSource: {
        text: 'El agua cambia de estado cuando la temperatura cambia.',
        title: 'El ciclo del agua',
        selectionLabel: 'Pages 2-3',
        language: 'Spanish',
      },
      onInitialSourceConsumed: () => { consumed += 1; },
    }));

    expect(host.textContent).toContain('Imported from Reading Library');
    expect(host.textContent).toContain('El ciclo del agua · Pages 2-3');
    expect(host.querySelector('#lingua-source').value).toContain('El agua cambia');
    expect(host.querySelector('select[aria-label="I am learning"]').value).toBe('Spanish');
    expect(host.querySelector('input').value).toBe('Discussing El ciclo del agua');
    expect(consumed).toBe(1);
  });
  it('renders an honest per-language progress summary', async () => {
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({
      sessions: 2,
      spokenAttempts: 3,
      languageStats: {
        Spanish: {
          practiceSets: 2,
          spokenAttempts: 3,
          reviews: 4,
          lastPracticedAt: Date.now(),
        },
      },
      saved: [
        { id: 'Spanish::hola', language: 'Spanish', term: 'hola', meaning: 'hello', reviewStage: 0, nextReviewAt: 0 },
        { id: 'Spanish::gracias', language: 'Spanish', term: 'gracias', meaning: 'thank you', reviewStage: 3, nextReviewAt: Date.now() + 86400000 },
      ],
    }));

    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));
    await act(async () => {
      button('Progress').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(host.textContent).toContain('Spanish progress');
    expect(host.textContent).toContain('not a grade or proficiency score');
    expect(host.textContent).toContain('Practiced today');
    expect(host.textContent).toContain('1 learning');
    expect(host.textContent).toContain('1 well-practiced');
    expect(button('Review 1 due')).toBeTruthy();

    const labels = Array.from(host.querySelectorAll('p'));
    const practiceSets = labels.find((node) => node.textContent === 'Practice sets');
    const reviews = labels.find((node) => node.textContent === 'Reviews completed');
    expect(practiceSets.previousSibling.textContent).toBe('2');
    expect(reviews.previousSibling.textContent).toBe('4');
  });
  it('reviews a due saved word and persists its next interval', async () => {
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({
      sessions: 0,
      spokenAttempts: 0,
      saved: [{
        id: 'Spanish::hola',
        language: 'Spanish',
        term: 'hola',
        meaning: 'hello',
        example: 'Hola, me llamo Ana.',
        translation: 'Hello, my name is Ana.',
        pronunciation: 'OH-lah',
        examplePronunciation: 'OH-lah, meh YAH-moh AH-nah',
        reviewStage: 0,
        nextReviewAt: 0,
        reviews: 0,
      }],
    }));

    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));

    expect(button('Review (1)')).toBeTruthy();
    await act(async () => {
      button('Review (1)').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(host.textContent).toContain('Recall the Spanish word');
    expect(host.textContent).toContain('hello');

    await act(async () => {
      button('Reveal answer').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(host.textContent).toContain('Hola, me llamo Ana.');
    expect(host.textContent).toContain('OH-lah, meh YAH-moh AH-nah');
    expect(button('Know')).toBeTruthy();

    await act(async () => {
      button('Know').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(host.textContent).toContain('You are caught up for now');

    const saved = JSON.parse(localStorage.getItem('allo_lingua_progress_v1')).saved[0];
    expect(saved.reviewStage).toBe(2);
    expect(saved.reviews).toBe(1);
    expect(saved.nextReviewAt).toBeGreaterThan(Date.now());
    const stored = JSON.parse(localStorage.getItem('allo_lingua_progress_v1'));
    expect(stored.languageStats.Spanish.reviews).toBe(1);
  });
});

describe('Reading Library handoff', () => {
  it('emits the displayed text and language through the Lingua command', async () => {
    let selection = null;
    const book = {
      title: 'Hola, escuela',
      language: 'Spanish',
      isRtl: false,
      level: 2,
      authors: ['Test Author'],
      illustrators: [],
      pages: [{ n: 1, text: 'Hola clase. Necesito un lápiz.' }],
      source: { name: 'Test collection', url: 'https://example.test/book' },
    };

    await mount(React.createElement(BookReader, {
      book,
      onExit: () => {},
      addToast: () => {},
      onPracticeLanguage: (value) => { selection = value; },
    }));

    expect(button('Lingua Practice')).toBeTruthy();
    await act(async () => {
      button('Lingua Practice').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(selection).toMatchObject({
      title: 'Hola, escuela',
      language: 'Spanish',
      selectionLabel: 'Whole text',
    });
    expect(selection.text).toContain('Hola clase. Necesito un lápiz.');
  });
});

describe('Lingua Practice custom language', () => {
  it('accepts a free-typed target language and uses it when building a set', async () => {
    let prompt = '';
    const callGemini = async (p) => {
      prompt = p;
      return JSON.stringify({
        title: 't', goal: 'g', scenario: 's',
        vocabulary: [{ term: 'a', meaning: 'b' }],
        phrases: [{ target: 'a', translation: 'b' }],
        conversation: [{ coach: 'a', translation: 'b', sample: 'c' }],
      });
    };
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini }));

    const targetSelect = host.querySelector('select[aria-label="I am learning"]');
    await act(async () => { targetSelect.value = '__other__'; targetSelect.dispatchEvent(new Event('change', { bubbles: true })); });
    const input = host.querySelector('input[aria-label="I am learning: type a language"]');
    expect(input).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(async () => { setter.call(input, 'Chuukese'); input.dispatchEvent(new Event('input', { bubbles: true })); });

    await act(async () => {
      button('Build practice set').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve(); await Promise.resolve();
    });
    expect(prompt).toContain('Target language: Chuukese');
    expect(JSON.parse(localStorage.getItem('allo_lingua_profile_v1')).target).toBe('Chuukese');
  });
});

describe('Lingua Practice UI localization', () => {
  it("renders its own chrome in the learner's known language", async () => {
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini: async () => '{}' }));
    // default chrome is English
    expect(button('Setup')).toBeTruthy();
    const known = host.querySelector('select[aria-label="I know"]');
    await act(async () => { known.value = 'Spanish'; known.dispatchEvent(new Event('change', { bubbles: true })); });
    const navText = Array.from(host.querySelectorAll('nav button')).map((n) => n.textContent).join('|');
    expect(navText).toContain('Configuración');
    expect(navText).toContain('Vocabulario');
    expect(navText).toContain('Palabras guardadas');
    // known-language select's own label is now localized too
    expect(host.querySelector('select[aria-label="Yo sé"]')).toBeTruthy();
  });
});

describe('Lingua Practice runtime auto-localization', () => {
  it('auto-translates the UI for an unbundled known language via the AI and caches it', async () => {
    let uiCalls = 0;
    const callGemini = async (prompt) => {
      if (typeof prompt === 'string' && prompt.includes('Localize the user-interface labels')) {
        uiCalls += 1;
        const en = JSON.parse(prompt.slice(prompt.indexOf('{"'))); // English map starts at {" (not the {token} braces)
        const out = {};
        Object.keys(en).forEach((k) => { out[k] = 'VI·' + en[k]; }); // keep {tokens}, mark distinctly
        return JSON.stringify(out);
      }
      return '{}';
    };
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini }));

    const known = host.querySelector('select[aria-label="I know"]');
    await act(async () => { known.value = 'Vietnamese'; known.dispatchEvent(new Event('change', { bubbles: true })); });
    // 700ms debounce + async translate
    await act(async () => { await new Promise((r) => setTimeout(r, 900)); });

    expect(uiCalls).toBe(1);
    const navText = Array.from(host.querySelectorAll('nav button')).map((n) => n.textContent).join('|');
    expect(navText).toContain('VI·Setup'); // nav_setup value auto-translated
    const cached = JSON.parse(localStorage.getItem('allo_lingua_ui_i18n_v1'));
    expect(cached.Vietnamese.nav_vocabulary).toBe('VI·Vocabulary');

    // token preservation survived the round-trip
    expect(cached.Vietnamese.due_saved).toContain('{due}');
    expect(cached.Vietnamese.due_saved).toContain('{saved}');
  });
});

describe('Lingua Practice localized chrome details', () => {
  it('shows level labels in the known language while storing canonical values', async () => {
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini: async () => '{}' }));
    const known = host.querySelector('select[aria-label="I know"]');
    await act(async () => { known.value = 'Spanish'; known.dispatchEvent(new Event('change', { bubbles: true })); });

    const level = host.querySelector('select[aria-label="Mi nivel"]');
    expect(level).toBeTruthy();
    expect(level.value).toBe('Beginner'); // stored value stays canonical
    const labels = Array.from(level.options).map((o) => o.textContent);
    expect(labels).toContain('Principiante');
    expect(labels).toContain('Intermedio');
    // Wave-2 strings: long setup paragraph and topic chips are localized too.
    expect(host.textContent).toContain('Elige tus idiomas y un tema.');
    expect(button('Presentaciones')).toBeTruthy();
  });

  it('flips the dialog to RTL once translated chrome exists for an RTL known language', async () => {
    const callGemini = async (prompt) => {
      if (typeof prompt === 'string' && prompt.includes('Localize the user-interface labels')) {
        const en = JSON.parse(prompt.slice(prompt.indexOf('{"')));
        const out = {};
        Object.keys(en).forEach((k) => { out[k] = 'AR·' + en[k]; });
        return JSON.stringify(out);
      }
      return '{}';
    };
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini }));

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog.getAttribute('dir')).toBe(null); // English chrome stays LTR

    const known = host.querySelector('select[aria-label="I know"]');
    await act(async () => { known.value = 'Arabic'; known.dispatchEvent(new Event('change', { bubbles: true })); });
    // Still LTR while the auto-translation is pending (English labels).
    expect(dialog.getAttribute('dir')).toBe(null);

    await act(async () => { await new Promise((r) => setTimeout(r, 900)); });
    expect(dialog.getAttribute('dir')).toBe('rtl');
    expect(dialog.getAttribute('lang')).toBe('ar-SA');
  });
});

describe('Lingua Practice progress quick-switch', () => {
  it('lists other practiced languages and switches the target from the Progress tab', async () => {
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({
      sessions: 2,
      spokenAttempts: 0,
      languageStats: {
        Spanish: { practiceSets: 2, lastPracticedAt: Date.now() },
        French: { practiceSets: 1, lastPracticedAt: Date.now() },
      },
      saved: [{ id: 'French::bonjour', language: 'French', term: 'bonjour', meaning: 'hello', reviewStage: 0, nextReviewAt: 0 }],
    }));
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));
    await act(async () => { button('Progress').dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    expect(host.textContent).toContain('Other languages you have practiced');
    const chip = host.querySelector('button[aria-label="Practice French"]');
    expect(chip.textContent).toBe('French · 1');
    await act(async () => { chip.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    // Still on Progress, now for French; French no longer offered as "other".
    expect(host.textContent).toContain('French progress');
    expect(host.querySelector('button[aria-label="Practice French"]')).toBe(null);
    expect(host.querySelector('button[aria-label="Practice Spanish"]')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('allo_lingua_profile_v1')).target).toBe('French');
  });
});

describe('Lingua Practice word-bank download', () => {
  it('downloads the saved words as a local CSV file', async () => {
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({
      sessions: 0,
      spokenAttempts: 0,
      saved: [{ id: 'Spanish::hola', language: 'Spanish', term: 'hola', meaning: 'hello', reviewStage: 0, nextReviewAt: 0 }],
    }));
    const toasts = [];
    const clicks = [];
    const originalClick = window.HTMLAnchorElement.prototype.click;
    const originalCreate = window.URL.createObjectURL;
    const originalRevoke = window.URL.revokeObjectURL;
    window.HTMLAnchorElement.prototype.click = function () { clicks.push(this.getAttribute('download')); };
    window.URL.createObjectURL = () => 'blob:lingua-test';
    window.URL.revokeObjectURL = () => {};
    try {
      await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, addToast: (m, t) => toasts.push({ m, t }) }));
      await act(async () => { button('Saved words').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      const download = button('Download CSV');
      expect(download).toBeTruthy();
      await act(async () => { download.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(clicks).toEqual(['lingua-word-bank.csv']);
      expect(toasts.some((x) => x.t === 'success')).toBe(true);
    } finally {
      window.HTMLAnchorElement.prototype.click = originalClick;
      window.URL.createObjectURL = originalCreate;
      window.URL.revokeObjectURL = originalRevoke;
    }
  });
});

describe('Lingua Practice AI illustrations', () => {
  const lesson = {
    title: 'At school', goal: 'Ask for help.', scenario: 'You need a pencil during class.',
    vocabulary: [
      { term: 'lápiz', meaning: 'pencil', example: 'Necesito un lápiz.', translation: 'I need a pencil.' },
      { term: 'ayuda', meaning: 'help', example: 'Necesito ayuda.', translation: 'I need help.' },
    ],
    phrases: [{ target: 'Necesito un lápiz.', translation: 'I need a pencil.' }],
    conversation: [{ coach: '¿Qué necesitas?', translation: 'What do you need?', sample: 'Necesito un lápiz.' }],
  };

  afterEach(() => { delete window.callGeminiImageEdit; delete window.callGeminiVision; });

  it('illustrates the vocabulary set on demand with text-free icon prompts', async () => {
    const imageCalls = [];
    window.callGeminiImageEdit = async (prompt, base64, w, q, ref) => {
      imageCalls.push({ prompt, base64, ref });
      return 'data:image/png;base64,IMG' + imageCalls.length;
    };
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, addToast: () => {}, callGemini: async () => JSON.stringify(lesson) }));
    await act(async () => { button('Build practice set').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });

    await act(async () => {
      button('Add pictures').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(imageCalls).toHaveLength(2);
    expect(imageCalls[0].base64).toBe(null); // text-to-image mode
    expect(imageCalls[0].prompt).toContain('lápiz');
    expect(imageCalls[0].prompt).toContain('pencil');
    expect(imageCalls[0].prompt).toContain('NO TEXT');
    // Style consistency: the first image has no reference; every later call
    // attaches the first image's base64 and asks to match its style.
    expect(imageCalls[0].ref).toBe(null);
    expect(imageCalls[0].prompt).not.toContain('reference image');
    expect(imageCalls[1].ref).toBe('IMG1');
    expect(imageCalls[1].prompt).toContain('Match the art style');
    expect(host.querySelector('img[alt="Illustration of lápiz"]')).toBeTruthy();
    expect(host.querySelector('img[alt="Illustration of ayuda"]')).toBeTruthy();
    expect(host.textContent).toContain('AI-generated illustrations');
    // Per-card regenerate appears once a card has an image, and regenerating
    // one card keeps it in the family of ANOTHER card's image.
    const regen = host.querySelector('button[aria-label="New illustration of ayuda"]');
    expect(regen).toBeTruthy();
    await act(async () => {
      regen.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(imageCalls).toHaveLength(3);
    expect(imageCalls[2].ref).toBe('IMG1'); // lápiz's image, not ayuda's own
    expect(imageCalls[2].prompt).toContain('Match the art style');
  });

  it('hides picture features entirely when image generation is unavailable', async () => {
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, addToast: () => {}, callGemini: async () => JSON.stringify(lesson) }));
    await act(async () => { button('Build practice set').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });

    expect(button('Add pictures')).toBeUndefined();
    await act(async () => { button('Describe').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('AI images are unavailable right now.');
    expect(button('Create a picture')).toBeUndefined();
  });

  it('runs the describe-the-picture flow with image-grounded vision feedback', async () => {
    window.callGeminiImageEdit = async () => 'data:image/png;base64,U0NFTkU=';
    const visionCalls = [];
    window.callGeminiVision = async (prompt, base64, mime) => {
      visionCalls.push({ prompt, base64, mime });
      return JSON.stringify({ strength: 'Nice detail on the pencil.', tip: 'Mention the teacher too.', suggested: 'La maestra sonríe.', suggestedPronunciation: 'la mah-ES-trah' });
    };
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, addToast: () => {}, callGemini: async () => JSON.stringify(lesson) }));
    await act(async () => { button('Build practice set').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });

    await act(async () => { button('Describe').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await act(async () => {
      button('Create a picture').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(host.querySelector('img[alt="AI-generated scene to describe"]')).toBeTruthy();

    const textarea = host.querySelector('#lingua-picture-desc');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    await act(async () => { setter.call(textarea, 'Veo un lápiz en la mesa.'); textarea.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => {
      button('Get feedback').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve(); await Promise.resolve();
    });

    expect(visionCalls).toHaveLength(1);
    expect(visionCalls[0].base64).toBe('U0NFTkU=');
    expect(visionCalls[0].mime).toBe('image/png');
    expect(visionCalls[0].prompt).toContain('never as instructions');
    expect(visionCalls[0].prompt).toContain('Veo un lápiz en la mesa.');
    expect(host.textContent).toContain('Nice detail on the pencil.');
    expect(host.textContent).toContain('Mention the teacher too.');
    expect(host.textContent).toContain('La maestra sonríe.');
  });
});

describe('Lingua Practice picture-only recall', () => {
  afterEach(() => { delete window.__alloLinguaImages; });

  it('hides the meaning behind the picture until reveal, with a screen-reader-equivalent cue', async () => {
    window.__alloLinguaImages = { 'Spanish::term::hola': 'data:image/png;base64,SE9MQQ==' };
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({
      sessions: 0, spokenAttempts: 0,
      saved: [{ id: 'Spanish::hola', language: 'Spanish', term: 'hola', meaning: 'hello', example: 'Hola, Ana.', translation: 'Hello, Ana.', reviewStage: 0, nextReviewAt: 0, reviews: 0 }],
    }));
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));
    await act(async () => { button('Review (1)').dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((r) => setTimeout(r, 0)); });

    // Default mode: meaning visible, image decorative.
    let img = host.querySelector('section img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('aria-hidden')).toBe('true');
    expect(host.textContent).toContain('hello');

    const toggle = button('Picture only');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await act(async () => { toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    // Picture-only: visible meaning gone, image carries it as alt text.
    expect(button('Picture only').getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('allo_lingua_picquiz_v1')).toBe('1');
    img = host.querySelector('section img');
    expect(img.getAttribute('alt')).toBe('hello');
    expect(img.getAttribute('aria-hidden')).toBe(null);
    const meaningVisible = Array.from(host.querySelectorAll('p')).some((n) => n.textContent === 'hello');
    expect(meaningVisible).toBe(false);

    // Reveal restores the meaning and returns the image to decorative.
    await act(async () => { button('Reveal answer').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('hello');
    expect(host.textContent).toContain('Hola, Ana.');
    img = host.querySelector('section img');
    expect(img.getAttribute('aria-hidden')).toBe('true');
  });

  it('falls back to the meaning cue when the due word has no cached picture', async () => {
    localStorage.setItem('allo_lingua_picquiz_v1', '1'); // mode persisted ON
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({
      sessions: 0, spokenAttempts: 0,
      saved: [{ id: 'Spanish::adiós', language: 'Spanish', term: 'adiós', meaning: 'goodbye', reviewStage: 0, nextReviewAt: 0, reviews: 0 }],
    }));
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {} }));
    await act(async () => { button('Review (1)').dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise((r) => setTimeout(r, 0)); });

    expect(host.querySelector('section img')).toBe(null);
    expect(button('Picture only')).toBeUndefined(); // toggle only offered with a picture
    expect(host.textContent).toContain('goodbye'); // meaning cue still shown
  });
});

describe('Lingua Practice slow audio', () => {
  it('toggles slow playback, persists it, and passes a slower rate to the player', async () => {
    const spoken = [];
    window.AlloSpeechPlayer = { speak: (text, opts) => { spoken.push({ text, opts }); }, stop: () => {} };
    try {
      const lesson = {
        title: 'At school', goal: 'g', scenario: 's',
        vocabulary: [{ term: 'lápiz', meaning: 'pencil', example: 'Necesito un lápiz.', translation: 'I need a pencil.' }],
        phrases: [{ target: 'Necesito un lápiz.', translation: 'x' }],
        conversation: [{ coach: '¿Qué?', translation: 'What?', sample: 'x' }],
      };
      await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini: async () => JSON.stringify(lesson) }));

      const slow = button('Slow');
      expect(slow.getAttribute('aria-pressed')).toBe('false');
      await act(async () => { slow.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(button('Slow').getAttribute('aria-pressed')).toBe('true');
      expect(localStorage.getItem('allo_lingua_slow_v1')).toBe('1');

      await act(async () => { button('Build practice set').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });
      const listen = host.querySelector('button[title="Listen to lápiz"]');
      await act(async () => { listen.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(spoken.length).toBe(1);
      expect(spoken[0].opts.rate).toBeGreaterThan(0);
      expect(spoken[0].opts.rate).toBeLessThan(1);
    } finally {
      delete window.AlloSpeechPlayer;
    }
  });
});

describe('Lingua Practice chat persistence and save-from-chat', () => {
  it('persists a conversation, saves a phrase, and restores it after remount', async () => {
    const callGemini = async () => JSON.stringify({
      reply: 'Hola, ¿qué tal?', translation: 'Hi, how are you?', pronunciation: 'OH-lah keh tahl', tip: 'good',
    });
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini, addToast: () => {} }));

    await act(async () => { button('Live chat').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await act(async () => {
      button('Start the chat').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    });
    expect(host.textContent).toContain('Hola, ¿qué tal?');
    const stored = JSON.parse(localStorage.getItem('allo_lingua_chat_v1'));
    expect(stored.Spanish.messages.some((m) => m.target === 'Hola, ¿qué tal?')).toBe(true);

    await act(async () => { button('Save phrase').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const saved = JSON.parse(localStorage.getItem('allo_lingua_progress_v1')).saved;
    expect(saved.some((s) => s.term === 'Hola, ¿qué tal?' && s.language === 'Spanish')).toBe(true);

    act(() => root.unmount());
    await mount(React.createElement(Lingua, { isOpen: true, onClose: () => {}, callGemini, addToast: () => {} }));
    await act(async () => { button('Live chat').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(host.textContent).toContain('Hola, ¿qué tal?');
  });
});
