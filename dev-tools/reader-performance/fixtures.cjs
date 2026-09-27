'use strict';

const marker = '--- ENGLISH TRANSLATION ---';
// Requested sentences exclude headings; the runtime reports its actual canonical
// sentence count separately so this generator never substitutes for the splitter.
function makeFixture(options = {}) {
  const spec = { sentences: 30, supports: 0, headings: false, bilingual: false, ...options };
  if (!Number.isInteger(spec.sentences) || spec.sentences < 1 || spec.sentences > 3000) throw new Error('sentences must be 1..3000');
  if (!Number.isInteger(spec.supports) || spec.supports < 0 || spec.supports > spec.sentences) throw new Error('supports must be 0..sentences');
  function passage(spanish) {
    const paragraphs = [];
    for (let p = 0; p < spec.sentences; p += 3) {
      if (spec.headings && p % 30 === 0) paragraphs.push('## ' + (spanish ? 'Observaciones ' : 'Observations ') + (p / 30 + 1));
      const sentences = [];
      for (let i = p; i < Math.min(p + 3, spec.sentences); i++) {
        const term = 'term' + String(i + 1).padStart(5, '0');
        sentences.push(spanish
          ? 'Los estudiantes estudian ' + term + ' y registran los cambios del agua.'
          : 'The students study ' + term + ' and record changes in the water.');
      }
      paragraphs.push(sentences.join(' '));
    }
    return paragraphs.join('\n\n');
  }
  const originalText = passage(false);
  const supportText = passage(spec.bilingual);
  const data = spec.bilingual ? supportText + '\n\n' + marker + '\n\n' + originalText : supportText;
  const annotations = Array.from({ length: spec.supports }, (_, i) => {
    const quote = 'term' + String(i + 1).padStart(5, '0'), start = supportText.indexOf(quote);
    return { id: 'support-' + i, start, end: start + quote.length, quote,
      text: 'A prepared explanation for ' + quote + '.', kind: 'definition',
      origin: 'educator', priority: i % 5 === 0 ? 'essential' : 'helpful', language: spec.bilingual ? 'Spanish' : 'English' };
  });
  return { spec, data, originalText, supportText, annotations,
    language: spec.bilingual ? 'Spanish' : 'English',
    inventory: { requestedSentences: spec.sentences, supports: annotations.length,
      utf16Chars: data.length, words: data.split(/\s+/).length, paragraphs: data.split(/\n{2,}/).length } };
}

const cases = [
  { name: 'short-read', sentences: 30 },
  { name: 'long-immersive', sentences: 300, immersive: true },
  { name: 'stress-immersive', sentences: 3000, immersive: true },
  { name: 'outline-closed', sentences: 300, headings: true, teacher: true },
  { name: 'supports-30', sentences: 300, supports: 30, immersive: true },
  { name: 'supports-200', sentences: 300, supports: 200, immersive: true },
  { name: 'supports-1000', sentences: 3000, supports: 1000, immersive: true },
  { name: 'bilingual-panes', sentences: 300, supports: 200, bilingual: true, compare: true },
  { name: 'large-text-phone', sentences: 300, supports: 30, width: 320, fontSize: 24 },
  { name: 'preview-cycles', sentences: 300, supports: 30, teacher: true, lifecycle: 'preview' },
  { name: 'navigation-cycles', sentences: 300, supports: 30, lifecycle: 'navigation' },
  { name: 'unique-navigation', sentences: 300, supports: 30, teacher: true, immersive: true, lifecycle: 'navigation', cycles: 200, unique: true },
  { name: 'overlay-cycles', sentences: 300, immersive: true, lifecycle: 'overlay' },
  { name: 'live-audio', sentences: 30, immersive: true, audio: true },
  { name: 'reading-place-scroll', sentences: 300, headings: true, learner: 'fixture-learner', storage: true }
];

module.exports = { makeFixture, cases, marker };
