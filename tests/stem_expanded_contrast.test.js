import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const P = {
  slate:{50:'#f8fafc',100:'#f1f5f9',200:'#e2e8f0',300:'#cbd5e1',400:'#94a3b8',500:'#64748b',600:'#475569',700:'#334155',800:'#1e293b',900:'#0f172a',950:'#020617'}, gray:{50:'#f9fafb',100:'#f3f4f6',200:'#e5e7eb',300:'#d1d5db',400:'#9ca3af',500:'#6b7280',600:'#4b5563',700:'#374151',800:'#1f2937',900:'#111827',950:'#030712'}, zinc:{50:'#fafafa',100:'#f4f4f5',200:'#e4e4e7',300:'#d4d4d8',400:'#a1a1aa',500:'#71717a',600:'#52525b',700:'#3f3f46',800:'#27272a',900:'#18181b',950:'#09090b'}, neutral:{50:'#fafafa',100:'#f5f5f5',200:'#e5e5e5',300:'#d4d4d4',400:'#a3a3a3',500:'#737373',600:'#525252',700:'#404040',800:'#262626',900:'#171717',950:'#0a0a0a'}, stone:{50:'#fafaf9',100:'#f5f5f4',200:'#e7e5e4',300:'#d6d3d1',400:'#a8a29e',500:'#78716c',600:'#57534e',700:'#44403c',800:'#292524',900:'#1c1917',950:'#0c0a09'},
  red:{50:'#fef2f2',100:'#fee2e2',200:'#fecaca',300:'#fca5a5',400:'#f87171',500:'#ef4444',600:'#dc2626',700:'#b91c1c',800:'#991b1b',900:'#7f1d1d',950:'#450a0a'}, orange:{50:'#fff7ed',100:'#ffedd5',200:'#fed7aa',300:'#fdba74',400:'#fb923c',500:'#f97316',600:'#ea580c',700:'#c2410c',800:'#9a3412',900:'#7c2d12',950:'#431407'}, amber:{50:'#fffbeb',100:'#fef3c7',200:'#fde68a',300:'#fcd34d',400:'#fbbf24',500:'#f59e0b',600:'#d97706',700:'#b45309',800:'#92400e',900:'#78350f',950:'#451a03'}, yellow:{50:'#fefce8',100:'#fef9c3',200:'#fef08a',300:'#fde047',400:'#facc15',500:'#eab308',600:'#ca8a04',700:'#a16207',800:'#854d0e',900:'#713f12',950:'#422006'}, lime:{50:'#f7fee7',100:'#ecfccb',200:'#d9f99d',300:'#bef264',400:'#a3e635',500:'#84cc16',600:'#65a30d',700:'#4d7c0f',800:'#3f6212',900:'#365314',950:'#1a2e05'}, green:{50:'#f0fdf4',100:'#dcfce7',200:'#bbf7d0',300:'#86efac',400:'#4ade80',500:'#22c55e',600:'#16a34a',700:'#15803d',800:'#166534',900:'#14532d',950:'#052e16'}, emerald:{50:'#ecfdf5',100:'#d1fae5',200:'#a7f3d0',300:'#6ee7b7',400:'#34d399',500:'#10b981',600:'#059669',700:'#047857',800:'#065f46',900:'#064e3b',950:'#022c22'}, teal:{50:'#f0fdfa',100:'#ccfbf1',200:'#99f6e4',300:'#5eead4',400:'#2dd4bf',500:'#14b8a6',600:'#0d9488',700:'#0f766e',800:'#115e59',900:'#134e4a',950:'#042f2e'}, cyan:{50:'#ecfeff',100:'#cffafe',200:'#a5f3fc',300:'#67e8f9',400:'#22d3ee',500:'#06b6d4',600:'#0891b2',700:'#0e7490',800:'#155e75',900:'#164e63',950:'#083344'}, sky:{50:'#f0f9ff',100:'#e0f2fe',200:'#bae6fd',300:'#7dd3fc',400:'#38bdf8',500:'#0ea5e9',600:'#0284c7',700:'#0369a1',800:'#075985',900:'#0c4a6e',950:'#082f49'}, blue:{50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a',950:'#172554'}, indigo:{50:'#eef2ff',100:'#e0e7ff',200:'#c7d2fe',300:'#a5b4fc',400:'#818cf8',500:'#6366f1',600:'#4f46e5',700:'#4338ca',800:'#3730a3',900:'#312e81',950:'#1e1b4b'}, violet:{50:'#f5f3ff',100:'#ede9fe',200:'#ddd6fe',300:'#c4b5fd',400:'#a78bfa',500:'#8b5cf6',600:'#7c3aed',700:'#6d28d9',800:'#5b21b6',900:'#4c1d95',950:'#2e1065'}, purple:{50:'#faf5ff',100:'#f3e8ff',200:'#e9d5ff',300:'#d8b4fe',400:'#c084fc',500:'#a855f7',600:'#9333ea',700:'#7e22ce',800:'#6b21a8',900:'#581c87',950:'#3b0764'}, fuchsia:{50:'#fdf4ff',100:'#fae8ff',200:'#f5d0fe',300:'#f0abfc',400:'#e879f9',500:'#d946ef',600:'#c026d3',700:'#a21caf',800:'#86198f',900:'#701a75',950:'#4a044e'}, pink:{50:'#fdf2f8',100:'#fce7f3',200:'#fbcfe8',300:'#f9a8d4',400:'#f472b6',500:'#ec4899',600:'#db2777',700:'#be185d',800:'#9d174d',900:'#831843',950:'#500724'}, rose:{50:'#fff1f2',100:'#ffe4e6',200:'#fecdd3',300:'#fda4af',400:'#fb7185',500:'#f43f5e',600:'#e11d48',700:'#be123c',800:'#9f1239',900:'#881337',950:'#4c0519'}
};
const files = () => readdirSync(resolve(process.cwd(), 'stem_lab')).filter((name) => name.endsWith('.js') && name !== 'stem_tool_coasterlab.js');
const desktopExclusiveFiles = ['stem_tool_art.js', 'stem_tool_creative.js', 'stem_tool_watersafety.js'];
function color(token, kind) { const s=token.replace(/^(?:hover|active|focus|group-hover):/,''); if(s===kind+'-white')return '#ffffff'; if(s===kind+'-black')return '#000000'; const m=s.match(new RegExp('^'+kind+'-([a-z]+)-(\\d+)$')); return m ? P[m[1]]?.[m[2]] || null : null; }
function lum(h){const v=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4));return .2126*v[0]+.7152*v[1]+.0722*v[2];}
function ratio(a,b){a=lum(a);b=lum(b);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
function stateUtility(token, kind) {
  const segments = token.split(':');
  const utility = segments.pop();
  const fixed = utility.match(new RegExp('^' + kind + '-(white|black)(?:/(\\d+))?$'));
  if (fixed) return { token, prefixes: segments, hex: fixed[1] === 'white' ? '#ffffff' : '#000000', opacity: fixed[2] || null };
  const palette = utility.match(new RegExp('^' + kind + '-([a-z]+)-(\\d+)(?:/(\\d+))?$'));
  if (!palette || !P[palette[1]]?.[palette[2]]) return null;
  return { token, prefixes: segments, hex: P[palette[1]][palette[2]], opacity: palette[3] || null };
}
function samePrefixes(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}
function stateUtilityFor(utilities, dark, interaction) {
  const candidates = [];
  if (dark && interaction) candidates.push(['dark', interaction], [interaction, 'dark']);
  if (interaction) candidates.push([interaction]);
  if (dark) candidates.push(['dark']);
  candidates.push([]);
  for (const prefixes of candidates) {
    const utility = utilities.find((item) => samePrefixes(item.prefixes, prefixes));
    if (utility) return utility;
  }
  return null;
}
function hasStateOverride(utilities, dark, interaction) {
  if (!dark && !interaction) return true;
  const candidates = interaction
    ? (dark ? [['dark', interaction], [interaction, 'dark'], [interaction]] : [[interaction]])
    : [['dark']];
  return utilities.some((utility) => candidates.some((prefixes) => samePrefixes(utility.prefixes, prefixes)));
}
function literalSolidFailures(root, names) {
  const failures = [];
  const interactions = [null, 'hover', 'active', 'focus', 'group-hover'];
  for (const name of names) {
    const source = readFileSync(resolve(root, name), 'utf8');
    for (const match of source.matchAll(/(["'\x60])([^"'\x60\r\n]*?)\1/g)) {
      if (!match[2].includes('text-') || !match[2].includes('bg-')) continue;
      const words = match[2].trim().split(/\s+/);
      const textUtilities = [], backgroundUtilities = [];
      for (const word of words) {
        const text = stateUtility(word, 'text');
        if (text) textUtilities.push(text);
        const background = stateUtility(word, 'bg');
        if (background) backgroundUtilities.push(background);
      }
      if (!textUtilities.length || !backgroundUtilities.length) continue;
      const allUtilities = textUtilities.concat(backgroundUtilities);
      for (const dark of [false, true]) {
        for (const interaction of interactions) {
          if (!hasStateOverride(allUtilities, dark, interaction)) continue;
          const foreground = stateUtilityFor(textUtilities, dark, interaction);
          const background = stateUtilityFor(backgroundUtilities, dark, interaction);
          if (!foreground || !background || foreground.opacity || background.opacity) continue;
          const value = ratio(foreground.hex, background.hex);
          if (value < 4.5) {
            const state = (dark ? 'dark' : 'light') + (interaction ? '/' + interaction : '');
            failures.push(name + ': ' + foreground.token + ' on ' + background.token + ' (' + state + ', ' + value.toFixed(2) + ':1)');
          }
        }
      }
    }
  }
  return failures;
}
function literalFormBoundaryFailures(root, names) {
  const failures = [];
  const interactions = [null, 'hover', 'focus'];
  const elementPattern = /(?:React\.createElement|\bh)\(\s*(["'])(input|select|textarea)\1\s*,\s*\{(?:(?!(?:React\.createElement|\bh)\().){0,1800}?className\s*:\s*(["'])(.*?)\3/gs;
  for (const name of names) {
    const source = readFileSync(resolve(root, name), 'utf8');
    for (const match of source.matchAll(elementPattern)) {
      const words = match[4].trim().split(/\s+/);
      const borderUtilities = [], backgroundUtilities = [];
      for (const word of words) {
        const border = stateUtility(word, 'border');
        if (border) borderUtilities.push(border);
        const background = stateUtility(word, 'bg');
        if (background) backgroundUtilities.push(background);
      }
      if (!borderUtilities.length || !backgroundUtilities.length) continue;
      const allUtilities = borderUtilities.concat(backgroundUtilities);
      const hasDarkOverride = allUtilities.some((utility) => utility.prefixes.includes('dark'));
      for (const dark of [false, true]) {
        if (dark && !hasDarkOverride) continue;
        for (const interaction of interactions) {
          if (!hasStateOverride(allUtilities, dark, interaction)) continue;
          const border = stateUtilityFor(borderUtilities, dark, interaction);
          const background = stateUtilityFor(backgroundUtilities, dark, interaction);
          if (!border || !background || border.opacity || background.opacity) continue;
          const value = ratio(border.hex, background.hex);
          if (value < 3) {
            const state = (dark ? 'dark' : 'light') + (interaction ? '/' + interaction : '');
            failures.push(name + ': ' + border.token + ' on ' + background.token + ' (' + state + ', ' + value.toFixed(2) + ':1)');
          }
        }
      }
    }
  }
  return failures;
}
function placeholderUtility(token) {
  const segments = token.split(':');
  const utility = segments.pop();
  let textToken = null;
  const markerIndex = segments.lastIndexOf('placeholder');
  if (markerIndex >= 0 && /^text-(?:white|black|[a-z]+-\d+)(?:\/\d+)?$/.test(utility)) {
    const prefixes = segments.slice();
    prefixes.splice(markerIndex, 1);
    textToken = prefixes.concat(utility).join(':');
  } else {
    const legacy = utility.match(/^placeholder-(white|black|[a-z]+-\d+)(?:\/(\d+))?$/);
    if (legacy) textToken = segments.concat('text-' + legacy[1] + (legacy[2] ? '/' + legacy[2] : '')).join(':');
  }
  if (!textToken) return null;
  const parsed = stateUtility(textToken, 'text');
  return parsed ? { ...parsed, token } : null;
}
function literalPlaceholderFailures(root, names) {
  const failures = [];
  for (const name of names) {
    const source = readFileSync(resolve(root, name), 'utf8');
    for (const match of source.matchAll(/(["'\x60])([^"'\x60\r\n]*placeholder[^"'\x60\r\n]*)\1/g)) {
      if (!match[2].includes('bg-')) continue;
      const words = match[2].trim().split(/\s+/);
      const placeholders = [], backgrounds = [];
      for (const word of words) {
        const placeholder = placeholderUtility(word);
        if (placeholder) placeholders.push(placeholder);
        const background = stateUtility(word, 'bg');
        if (background) backgrounds.push(background);
      }
      if (!placeholders.length || !backgrounds.length) continue;
      const hasDarkOverride = placeholders.concat(backgrounds).some((utility) => utility.prefixes.includes('dark'));
      for (const dark of [false, true]) {
        if (dark && !hasDarkOverride) continue;
        const placeholder = stateUtilityFor(placeholders, dark, null);
        const background = stateUtilityFor(backgrounds, dark, null);
        if (!placeholder || !background || placeholder.opacity || background.opacity) continue;
        const value = ratio(placeholder.hex, background.hex);
        if (value < 4.5) failures.push(name + ': ' + placeholder.token + ' on ' + background.token + ' (' + (dark ? 'dark' : 'light') + ', ' + value.toFixed(2) + ':1)');
      }
    }
  }
  return failures;
}
function literalGradientFailures(root, names) {
  const failures = [];
  const interactions = [null, 'hover', 'active', 'focus', 'group-hover'];
  for (const name of names) {
    const source = readFileSync(resolve(root, name), 'utf8');
    for (const match of source.matchAll(/(["'\x60])([^"'\x60\r\n]*bg-gradient-to-[^"'\x60\r\n]*)\1/g)) {
      const words = match[2].trim().split(/\s+/);
      const textUtilities = [];
      const stops = { from: [], via: [], to: [] };
      for (const word of words) {
        const text = stateUtility(word, 'text');
        if (text) textUtilities.push(text);
        for (const kind of Object.keys(stops)) {
          const stop = stateUtility(word, kind);
          if (stop) stops[kind].push(stop);
        }
      }
      const stopUtilities = Object.values(stops).flat();
      if (!textUtilities.length || !stopUtilities.length) continue;
      const allUtilities = textUtilities.concat(stopUtilities);
      const hasDarkOverride = allUtilities.some((utility) => utility.prefixes.includes('dark'));
      for (const dark of [false, true]) {
        if (dark && !hasDarkOverride) continue;
        for (const interaction of interactions) {
          if (!hasStateOverride(allUtilities, dark, interaction)) continue;
          const foreground = stateUtilityFor(textUtilities, dark, interaction);
          if (!foreground || foreground.opacity) continue;
          for (const kind of Object.keys(stops)) {
            const background = stateUtilityFor(stops[kind], dark, interaction);
            if (!background || background.opacity) continue;
            const value = ratio(foreground.hex, background.hex);
            if (value < 4.5) {
              const state = (dark ? 'dark' : 'light') + (interaction ? '/' + interaction : '');
              failures.push(name + ': ' + foreground.token + ' on ' + background.token + ' (' + state + ', ' + value.toFixed(2) + ':1)');
            }
          }
        }
      }
    }
  }
  return failures;
}
describe('expanded STEM contrast coverage',()=>{
  it('keeps shared-source gradient endpoints AA across light, dark, and interaction states', () => {
    expect(literalGradientFailures(resolve(process.cwd(), 'stem_lab'), files())).toEqual([]);
  });
  it('keeps desktop-exclusive gradient endpoints AA across light, dark, and interaction states', () => {
    const root = resolve(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab');
    expect(literalGradientFailures(root, desktopExclusiveFiles)).toEqual([]);
  });
  it('keeps shared-source solid text and background pairs AA across light, dark, and interaction states', () => {
    expect(literalSolidFailures(resolve(process.cwd(), 'stem_lab'), files())).toEqual([]);
  });
  it('keeps desktop-exclusive solid text and background pairs AA across light, dark, and interaction states', () => {
    const root = resolve(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab');
    expect(literalSolidFailures(root, desktopExclusiveFiles)).toEqual([]);
  });
  it('keeps shared-source placeholders AA across light and dark fills', () => {
    expect(literalPlaceholderFailures(resolve(process.cwd(), 'stem_lab'), files())).toEqual([]);
  });
  it('keeps desktop-exclusive placeholders AA across light and dark fills', () => {
    const root = resolve(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab');
    expect(literalPlaceholderFailures(root, desktopExclusiveFiles)).toEqual([]);
  });
  it('keeps shared-source form boundaries at 3:1 across light, dark, and interaction states', () => {
    expect(literalFormBoundaryFailures(resolve(process.cwd(), 'stem_lab'), files())).toEqual([]);
  });
  it('keeps desktop-exclusive form boundaries at 3:1 across light, dark, and interaction states', () => {
    const root = resolve(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab');
    expect(literalFormBoundaryFailures(root, desktopExclusiveFiles)).toEqual([]);
  });
});


describe('STEM alpha text and progress contrast', () => {
  it('keeps shared catalog descriptions AA on their pastel cards', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_lab_module.js'), 'utf8');
    const failures = [];
    for (const line of source.split(/\r?\n/)) {
      const background = line.match(/\bbg:\s*['"](bg-[a-z]+-\d+)['"]/);
      const description = line.match(/\bdesc:\s*['"](text-[a-z]+-\d+)(?:\/(\d+))?['"]/);
      if (!background || !description) continue;
      const bg = color(background[1], 'bg');
      const fg = color(description[1], 'text');
      if (bg && fg && ratio(fg, bg) < 4.5) failures.push(description[1] + ' on ' + background[1]);
    }
    expect(failures).toEqual([]);
  });

  it('pins 3:1 progress fills and theme-aware fallback messages', () => {
    const indicatorPairs = [
      ['bg-orange-600', 'bg-orange-100'], ['bg-amber-700', 'bg-orange-100'],
      ['bg-emerald-600', 'bg-slate-100'], ['bg-orange-600', 'bg-slate-100'],
      ['bg-yellow-700', 'bg-white'], ['bg-rose-500', 'bg-white'],
      ['bg-emerald-700', 'bg-white'], ['bg-red-500', 'bg-white'],
      ['bg-green-700', 'bg-blue-100'], ['bg-blue-500', 'bg-blue-100'],
      ['bg-slate-400', 'bg-slate-700'], ['bg-rose-400', 'bg-slate-700'],
      ['bg-amber-500', 'bg-slate-700'], ['bg-emerald-500', 'bg-slate-700']
    ];
    for (const [fill, track] of indicatorPairs) {
      expect(ratio(color(fill, 'bg'), color(track, 'bg')), fill + ' on ' + track).toBeGreaterThanOrEqual(3);
    }
    const companion = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_companionplanting.js'), 'utf8');
    expect(companion).toContain('from-orange-600 to-amber-700 transition-all');
    expect(companion).toContain("voice.complete ? 'bg-emerald-600' : 'bg-orange-600'");
    expect(companion).toContain("plotReady ? 'bg-yellow-700' : plotNeedsCare ? 'bg-rose-500' : 'bg-emerald-700'");
    const dissection = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_dissection.js'), 'utf8');
    expect(dissection).toContain("progressPct >= 100 ? 'bg-green-700' : 'bg-blue-500'");
    const particle = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_particlelab3d.js'), 'utf8');
    expect(particle).toContain("tone: 'text-rose-800', fill: 'bg-rose-400'");
    const shell = readFileSync(resolve(process.cwd(), 'stem_lab/stem_lab_module.js'), 'utf8');
    expect(shell.match(/color: 'var\(--allo-stem-text-soft, #64748b\)'/g)).toHaveLength(2);
  });
});

describe('STEM dynamic active-state contrast', () => {
  it.each([
    ['emerald hover label', 'text-emerald-800', 'bg-emerald-200'],
    ['sky hover label', 'text-sky-800', 'bg-sky-200'],
    ['cyan action', 'text-white', 'bg-cyan-700'],
    ['emerald selected action', 'text-white', 'bg-emerald-700'],
    ['red hover label', 'text-red-800', 'bg-red-200'],
    ['amber grid label', 'text-amber-700', 'bg-amber-50'],
    ['amber highlighted grid label', 'text-amber-800', 'bg-orange-100'],
    ['sky selected action', 'text-white', 'bg-sky-700'],
    ['disabled thinking label', 'text-slate-300', 'bg-slate-800'],
    ['green revealed answer', 'text-white', 'bg-green-700'],
    ['amber selected action', 'text-white', 'bg-amber-700'],
    ['violet hover action', 'text-white', 'bg-violet-700'],
    ['pink hover label', 'text-pink-700', 'bg-pink-100'],
    ['amber hover action', 'text-white', 'bg-amber-800'],
    ['pink loading label', 'text-pink-800', 'bg-pink-200'],
    ['amber hover label', 'text-amber-800', 'bg-amber-200'],
    ['muted unavailable label', 'text-slate-600', 'bg-slate-100'],
    ['indigo hover action', 'text-white', 'bg-indigo-700'],
    ['slate quick-add hover', 'text-slate-300', 'bg-slate-700'],
    ['emerald hover action', 'text-white', 'bg-emerald-800'],
    ['indigo selected filter', 'text-white', 'bg-indigo-600'],
    ['red state label', 'text-red-700', 'bg-red-100'],
    ['emerald state label', 'text-emerald-700', 'bg-emerald-100'],
    ['blue hover label', 'text-blue-700', 'bg-blue-100'],
    ['red feedback label', 'text-red-700', 'bg-red-50'],
    ['lime action', 'text-white', 'bg-lime-700'],
    ['fuchsia hover label', 'text-fuchsia-700', 'bg-fuchsia-100'],
    ['inactive option on slate', 'text-slate-600', 'bg-slate-50'],
    ['answered option on white', 'text-slate-600', 'bg-white'],
    ['rose hover label', 'text-rose-800', 'bg-rose-200'],
    ['cyan dark hover action', 'text-white', 'bg-cyan-800'],
    ['indigo hover label', 'text-indigo-700', 'bg-indigo-200'],
    ['green difficulty badge', 'text-green-800', 'bg-green-200'],
    ['gray checklist badge', 'text-gray-700', 'bg-gray-200'],
    ['light-theme off state', 'text-slate-700', 'bg-slate-200'],
    ['purple hover label', 'text-purple-700', 'bg-purple-200'],
    ['purple selected action', 'text-white', 'bg-purple-600'],
    ['fuchsia hover action', 'text-white', 'bg-fuchsia-700'],
    ['orange dark badge', 'text-orange-100', 'bg-orange-700'],
    ['indigo dark hover label', 'text-indigo-300', 'bg-indigo-900'],
    ['yellow dark hover label', 'text-yellow-200', 'bg-yellow-900'],
    ['blue selected action', 'text-white', 'bg-blue-700'],
    ['orange label on bright badge', 'text-orange-950', 'bg-orange-400'],
    ['indigo pale label', 'text-indigo-50', 'bg-indigo-600'],
    ['rose pale label', 'text-rose-50', 'bg-rose-700'],
    ['violet pale label', 'text-violet-50', 'bg-violet-600'],
    ['blue pale label', 'text-blue-50', 'bg-blue-700'],
    ['orange pale label', 'text-orange-50', 'bg-orange-700'],
    ['slate light status', 'text-slate-700', 'bg-slate-100'],
    ['teal hover label', 'text-teal-800', 'bg-teal-200'],
    ['yellow status label', 'text-yellow-800', 'bg-yellow-100'],
    ['green status label', 'text-green-700', 'bg-green-100'],
    ['teal status label', 'text-teal-700', 'bg-teal-100'],
    ['violet hover label', 'text-violet-700', 'bg-violet-200'],
    ['yellow label on pale surface', 'text-yellow-800', 'bg-yellow-50'],
    ['rose status label', 'text-rose-700', 'bg-rose-100'],
    ['amber status label', 'text-amber-800', 'bg-amber-100'],
    ['slate label on dark hover', 'text-slate-200', 'bg-slate-700'],
    ['yellow selected action', 'text-white', 'bg-yellow-800'],
    ['pink selected action', 'text-white', 'bg-pink-700'],
    ['rose selected action', 'text-white', 'bg-rose-600'],
    ['lime label on pale surface', 'text-lime-800', 'bg-lime-50'],
    ['rose action label', 'text-rose-700', 'bg-rose-50'],
    ['blue hinted label', 'text-blue-700', 'bg-blue-50'],
    ['orange selected action', 'text-white', 'bg-orange-700'],
    ['sky label on pale surface', 'text-sky-700', 'bg-sky-50'],
    ['teal label on pale surface', 'text-teal-700', 'bg-teal-50'],
    ['green label on pale surface', 'text-green-700', 'bg-green-50'],
    ['cyan label on pale surface', 'text-cyan-700', 'bg-cyan-50'],
    ['orange label on pale surface', 'text-orange-700', 'bg-orange-50'],
    ['violet label on strong hover', 'text-violet-800', 'bg-violet-300'],
    ['slate action on white', 'text-slate-700', 'bg-white'],
    ['green label on soft surface', 'text-green-700', 'bg-green-50'],
    ['amber label on soft surface', 'text-amber-800', 'bg-amber-50'],
    ['violet selected action', 'text-white', 'bg-violet-600'],
    ['slate label on medium surface', 'text-slate-700', 'bg-slate-200'],
    ['sky label on hover surface', 'text-sky-800', 'bg-sky-200'],
    ['red label on strong hover', 'text-red-900', 'bg-red-300'],
    ['orange label on strong hover', 'text-orange-900', 'bg-orange-300'],
    ['pink label on strong hover', 'text-pink-900', 'bg-pink-300'],
    ['gray label on medium surface', 'text-gray-800', 'bg-gray-300'],
    ['orange label on dark hover', 'text-orange-200', 'bg-slate-600'],
    ['indigo label on white', 'text-indigo-700', 'bg-white'],
    ['yellow label on hover surface', 'text-yellow-800', 'bg-yellow-200'],
    ['zinc label on dark surface', 'text-zinc-300', 'bg-zinc-700'],
    ['zinc label on darkest surface', 'text-zinc-300', 'bg-zinc-900'],
    ['red label on zinc hover', 'text-red-300', 'bg-zinc-700'],
    ['orange label on soft hover', 'text-orange-800', 'bg-orange-100'],
    ['slate label on darkest surface', 'text-slate-300', 'bg-slate-900'],
    ['slate label on lightest surface', 'text-slate-600', 'bg-slate-50'],
    ['slate label on dark surface', 'text-slate-300', 'bg-slate-800'],
    ['strong slate label on lightest surface', 'text-slate-700', 'bg-slate-50'],
    ['purple loading label', 'text-purple-800', 'bg-purple-200'],
    ['Solar fuchsia action', 'text-white', 'bg-fuchsia-600'],
    ['Solar blue action', 'text-white', 'bg-blue-600'],
    ['Solar yellow action', 'text-white', 'bg-yellow-700'],
    ['World Builder hover label', 'text-violet-700', 'bg-slate-50']
  ])('%s remains at or above 4.5:1', (_label, foreground, background) => {
    expect(ratio(color(foreground, 'text'), color(background, 'bg'))).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['stem_tool_a11yauditor.js', 'bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold hover:bg-emerald-200'],
    ['stem_tool_numberline.js', 'bg-sky-100 text-sky-800 rounded-full hover:bg-sky-200'],
    ['stem_tool_spaceexplorer.js', 'bg-cyan-700 text-white hover:bg-cyan-800'],
    ['stem_tool_wave.js', 'bg-emerald-700 text-white'],
    ['stem_tool_worldbuilder.js', 'bg-red-100 text-red-800 hover:bg-red-200'],
    ['stem_tool_areamodel.js', 'text-[10px] text-amber-800 leading-none'],
    ['stem_tool_areamodel.js', 'bg-sky-100 text-sky-800 rounded-full hover:bg-sky-200'],
    ['stem_tool_brainatlas.js', 'border-emerald-700 bg-emerald-700 text-white'],
    ['stem_tool_circuit.js', 'bg-green-700 text-white border-green-800'],
    ['stem_tool_circuit.js', 'bg-slate-800 text-slate-300'],
    ['stem_tool_lumen.js', 'bg-violet-600 text-white hover:bg-violet-700'],
    ['stem_tool_artstudio.js', 'bg-pink-50 text-pink-700 border border-pink-700 hover:bg-pink-100'],
    ['stem_tool_dataplot.js', 'bg-pink-200 text-pink-800 cursor-wait'],
    ['stem_tool_angles.js', 'bg-pink-200 text-pink-800 cursor-wait'],
    ['stem_tool_angles.js', 'bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-800'],
    ['stem_tool_angles.js', 'hover:bg-red-100 hover:text-red-700 hover:border-red-700'],
    ['stem_tool_cell.js', 'bg-amber-100 text-amber-800 hover:bg-amber-200'],
    ['stem_tool_cell.js', 'bg-slate-100 text-slate-600 line-through'],
    ['stem_tool_cell.js', 'bg-green-700 text-white shadow-sm'],
    ['stem_tool_coding.js', 'bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700'],
    ['stem_tool_coding.js', 'bg-slate-600 text-slate-300 hover:bg-slate-700'],
    ['stem_tool_coding.js', 'bg-emerald-700 text-white hover:bg-emerald-800'],
    ['stem_tool_economicslab.js', 'bg-sky-700 text-white'],
    ['stem_tool_economicslab.js', 'bg-sky-100 text-sky-800 hover:bg-sky-200'],
    ['stem_tool_economicslab.js', 'bg-indigo-600 text-white'],
    ['stem_tool_epidemic.js', 'bg-red-100 text-red-700'],
    ['stem_tool_epidemic.js', 'bg-emerald-100 text-emerald-700'],
    ['stem_tool_epidemic.js', 'bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100'],
    ['stem_tool_galaxy.js', 'bg-indigo-600 hover:bg-indigo-700 text-white'],
    ['stem_tool_galaxy.js', 'bg-amber-700 text-white hover:bg-amber-800'],
    ['stem_tool_galaxy.js', 'bg-red-50 text-red-700 border border-red-200'],
    ['stem_tool_physics.js', 'bg-sky-700 text-white'],
    ['stem_tool_physics.js', 'bg-amber-700 text-white text-[11px] font-bold rounded-lg hover:bg-amber-800'],
    ['stem_tool_physics.js', 'bg-red-100 border-red-400 text-red-700'],
    ['stem_tool_birdlab.js', 'bg-emerald-700 text-white'],
    ['stem_tool_birdlab.js', 'bg-lime-700 text-white hover:bg-lime-800 active:scale-[0.97]'],
    ['stem_tool_punnett.js', 'text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-700 rounded-lg hover:bg-fuchsia-100'],
    ['stem_tool_punnett.js', 'text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-700 rounded-full hover:bg-fuchsia-100'],
    ['stem_tool_cell.js', 'bg-slate-50 border-slate-400 text-slate-600'],
    ['stem_tool_economicslab.js', 'border-slate-400 bg-white text-slate-600'],
    ['stem_tool_physics.js', 'bg-slate-100 text-slate-600 cursor-not-allowed'],
    ['stem_tool_artstudio.js', 'bg-rose-100 text-rose-800 hover:bg-rose-200'],
    ['stem_tool_lifeskills.js', 'bg-slate-100 text-slate-600 cursor-not-allowed'],
    ['stem_tool_lumen.js', 'border-slate-400 bg-slate-50 text-slate-600 cursor-not-allowed'],
    ['stem_tool_spaceexplorer.js', 'bg-slate-700 text-slate-300 cursor-not-allowed'],
    ['stem_tool_decomposer.js', 'bg-amber-700 text-white font-bold text-xs rounded-lg hover:bg-amber-800'],
    ['stem_tool_decomposer.js', 'bg-indigo-600 text-white'],
    ['stem_tool_decomposer.js', 'bg-red-50 text-red-700 border border-red-200'],
    ['stem_tool_geosandbox.js', 'bg-slate-700 text-slate-300 cursor-not-allowed'],
    ['stem_tool_nutritionlab.js', 'bg-amber-700 text-white border-amber-800 shadow'],
    ['stem_tool_nutritionlab.js', 'bg-emerald-700 text-white hover:bg-emerald-800'],
    ['stem_tool_coordgrid.js', 'bg-sky-100 text-sky-800 rounded-full hover:bg-sky-200'],
    ['stem_tool_coordgrid.js', 'bg-amber-100 text-amber-800 font-bold rounded-lg text-[11px] hover:bg-amber-200'],
    ['stem_tool_coordgrid.js', 'bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-800'],
    ['stem_tool_coordgrid.js', 'bg-cyan-700 text-white font-bold rounded-lg text-sm hover:bg-cyan-800'],
    ['stem_tool_coordgrid.js', 'bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200'],
    ['stem_tool_gamestudio.js', 'bg-green-200 text-green-800'],
    ['stem_tool_gamestudio.js', 'bg-amber-200 text-amber-800'],
    ['stem_tool_gamestudio.js', 'bg-red-200 text-red-800'],
    ['stem_tool_gamestudio.js', 'bg-gray-200 text-gray-700'],
    ['stem_tool_migration.js', 'bg-sky-700 hover:bg-sky-800 text-white'],
    ['stem_tool_migration.js', 'bg-green-700 text-white'],
    ['stem_tool_migration.js', 'bg-slate-200 text-slate-700'],
    ['stem_tool_migration.js', 'bg-sky-700 text-white ring-2 ring-sky-300'],
    ['stem_tool_migration.js', 'bg-sky-700 text-white'],
    ['stem_tool_companionplanting.js', 'border border-slate-500 bg-white p-2 text-[10px]']
  ])('%s pins its accessible dynamic state', (fileName, treatment) => {
    expect(readFileSync(resolve(process.cwd(), 'stem_lab', fileName), 'utf8')).toContain(treatment);
  });

  it('pins the nine-tool conditional-state batch', () => {
    const treatments = [
      ['stem_tool_molecule.js', 'hover:bg-emerald-800'],
      ['stem_tool_molecule.js', 'bg-red-100 text-red-800 text-sm font-bold hover:bg-red-200'],
      ['stem_tool_molecule.js', 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'],
      ['stem_tool_molecule.js', 'bg-green-700 text-white border-green-800'],
      ['stem_tool_multtable.js', 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-700'],
      ['stem_tool_multtable.js', 'bg-purple-600 text-white shadow-sm'],
      ['stem_tool_multtable.js', 'hover:bg-emerald-800'],
      ['stem_tool_multtable.js', 'bg-pink-100 text-pink-800 hover:bg-pink-200 border border-pink-700'],
      ['stem_tool_particlelab3d.js', 'bg-fuchsia-600 px-2 py-1 text-[10px] font-black text-white hover:bg-fuchsia-700'],
      ['stem_tool_particlelab3d.js', 'bg-cyan-700 px-2 py-1 text-[10px] font-black text-white hover:bg-cyan-800'],
      ['stem_tool_particlelab3d.js', 'bg-slate-100 text-slate-600'],
      ['stem_tool_probability.js', 'bg-amber-100 text-amber-800 rounded-lg text-xs font-bold hover:bg-amber-200'],
      ['stem_tool_probability.js', 'bg-red-100 text-red-800 font-bold text-sm hover:bg-red-200'],
      ['stem_tool_probability.js', 'bg-emerald-100 text-emerald-800 font-bold text-sm hover:bg-emerald-200'],
      ['stem_tool_singing.js', 'bg-red-100 hover:bg-red-200 text-red-800'],
      ['stem_tool_singing.js', 'bg-red-50 text-red-700'],
      ['stem_tool_singing.js', 'bg-blue-700 text-white'],
      ['stem_tool_spacecolony.js', 'bg-orange-700 text-orange-100'],
      ['stem_tool_spacecolony.js', 'bg-indigo-800 text-indigo-300 text-[11px] hover:bg-indigo-900'],
      ['stem_tool_spacecolony.js', 'bg-yellow-800 text-yellow-200 text-[11px] font-bold hover:bg-yellow-900'],
      ['stem_tool_spacecolony.js', 'bg-slate-800 text-slate-300'],
      ['stem_tool_allobotsage.js', 'border-slate-400 bg-slate-50 text-slate-600'],
      ['stem_tool_allobotsage.js', 'bg-emerald-700 text-white'],
      ['stem_tool_allobotsage.js', 'bg-red-600 text-white'],
      ['stem_tool_allobotsage.js', 'bg-amber-700 hover:bg-amber-800 text-white'],
      ['stem_tool_allobotsage.js', 'bg-slate-100 text-slate-600 cursor-not-allowed'],
      ['stem_tool_behaviorlab.js', 'bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700'],
      ['stem_tool_behaviorlab.js', 'bg-red-600 border-red-500 text-white scale-110'],
      ['stem_tool_behaviorlab.js', 'bg-emerald-700 border-emerald-600 text-white'],
      ['stem_tool_behaviorlab.js', 'bg-red-600 text-white hover:bg-red-700'],
      ['stem_tool_unitconvert.js', 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-700'],
      ['stem_tool_unitconvert.js', 'bg-cyan-700 text-white text-xs font-black hover:bg-cyan-800'],
      ['stem_tool_unitconvert.js', 'bg-purple-100 text-purple-700 font-bold rounded-lg hover:bg-purple-200'],
      ['stem_tool_unitconvert.js', 'bg-purple-100 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-200'],
      ['stem_tool_unitconvert.js', 'bg-cyan-700 text-white hover:bg-cyan-800'],
      ['stem_tool_unitconvert.js', 'bg-cyan-700 px-4 py-2 text-xs font-black text-white hover:bg-cyan-800']
    ];
    const sources = new Map();
    for (const [fileName, treatment] of treatments) {
      if (!sources.has(fileName)) sources.set(fileName, readFileSync(resolve(process.cwd(), 'stem_lab', fileName), 'utf8'));
      expect(sources.get(fileName), fileName + ': ' + treatment).toContain(treatment);
    }
  });

  it('pins the eight-tool conditional-state batch', () => {
    const treatments = [
      ['stem_tool_ecosystem.js', 'hover:bg-emerald-800'],
      ['stem_tool_ecosystem.js', 'hover:bg-slate-200 dark:hover:bg-slate-700'],
      ['stem_tool_ecosystem.js', 'hover:bg-teal-800'],
      ['stem_tool_ecosystem.js', 'bg-orange-100 hover:bg-orange-200 text-orange-800'],
      ['stem_tool_geologyexplorer.js', 'bg-indigo-600 border-indigo-700 text-indigo-50'],
      ['stem_tool_geologyexplorer.js', 'bg-rose-700 border-rose-800 text-rose-50'],
      ['stem_tool_geologyexplorer.js', 'bg-slate-50 border-slate-400 text-slate-600'],
      ['stem_tool_geologyexplorer.js', 'bg-violet-600 border-violet-700 text-violet-50'],
      ['stem_tool_geologyexplorer.js', 'bg-blue-700 border-blue-800 text-blue-50'],
      ['stem_tool_geologyexplorer.js', 'bg-orange-700 border-orange-800 text-orange-50'],
      ['stem_tool_inequality.js', 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-700'],
      ['stem_tool_inequality.js', 'bg-fuchsia-50 text-fuchsia-700 rounded border border-fuchsia-700 hover:bg-fuchsia-100'],
      ['stem_tool_inequality.js', 'bg-fuchsia-50 text-fuchsia-700 rounded hover:bg-fuchsia-100'],
      ['stem_tool_inequality.js', 'bg-teal-100 text-teal-800 rounded hover:bg-teal-200'],
      ['stem_tool_geo.js', 'bg-red-600 text-white'],
      ['stem_tool_geo.js', 'bg-orange-400 text-orange-950'],
      ['stem_tool_geo.js', 'hover:bg-teal-800'],
      ['stem_tool_geo.js', 'bg-slate-50 border-slate-400 text-slate-600'],
      ['stem_tool_geo.js', 'bg-teal-700 text-white shadow'],
      ['stem_tool_geo.js', 'bg-slate-50 border-slate-400 text-slate-700'],
      ['stem_tool_geo.js', 'hover:bg-emerald-800'],
      ['stem_tool_oratory.js', 'bg-violet-600 hover:bg-violet-700 text-white'],
      ['stem_tool_oratory.js', 'bg-red-100 hover:bg-red-200 text-red-800'],
      ['stem_tool_oratory.js', 'bg-red-600 hover:bg-red-700 text-white'],
      ['stem_tool_oratory.js', 'bg-red-50 text-red-700'],
      ['stem_tool_platetectonics.js', 'bg-orange-700 text-white'],
      ['stem_tool_platetectonics.js', 'bg-emerald-700 text-white'],
      ['stem_tool_platetectonics.js', 'bg-white text-red-700 border border-red-200 hover:bg-red-50'],
      ['stem_tool_platetectonics.js', 'border-red-400 bg-red-50 text-red-700'],
      ['stem_tool_platetectonics.js', 'bg-orange-100 hover:bg-orange-200 text-orange-800'],
      ['stem_tool_volume.js', 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-700'],
      ['stem_tool_volume.js', 'hover:bg-amber-800'],
      ['stem_tool_volume.js', 'bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200'],
      ['stem_tool_volume.js', 'border-indigo-700 bg-indigo-600 text-white'],
      ['stem_tool_volume.js', 'border-sky-800 bg-sky-700 text-white'],
      ['stem_tool_volume.js', 'border-cyan-800 bg-cyan-700 text-white'],
      ['stem_tool_universe.js', 'bg-emerald-100 text-emerald-700'],
      ['stem_tool_universe.js', 'bg-violet-100 text-violet-700 hover:bg-violet-200'],
      ['stem_tool_universe.js', 'bg-slate-100 border-slate-400 text-slate-700'],
      ['stem_tool_universe.js', 'bg-green-100 text-green-700'],
      ['stem_tool_universe.js', 'bg-yellow-100 text-yellow-800'],
      ['stem_tool_universe.js', 'bg-red-100 text-red-700'],
      ['stem_tool_universe.js', 'bg-sky-100 text-sky-700'],
      ['stem_tool_universe.js', 'bg-teal-100 text-teal-700']
    ];
    const sources = new Map();
    for (const [fileName, treatment] of treatments) {
      if (!sources.has(fileName)) sources.set(fileName, readFileSync(resolve(process.cwd(), 'stem_lab', fileName), 'utf8'));
      expect(sources.get(fileName), fileName + ': ' + treatment).toContain(treatment);
    }
  });

  it('pins the five-tool status and loading-state batch', () => {
    const treatments = [
      ['stem_tool_dissection.js', 'bg-red-50 text-red-700'],
      ['stem_tool_dissection.js', 'bg-yellow-50 text-yellow-800'],
      ['stem_tool_dissection.js', 'bg-red-100 text-red-700'],
      ['stem_tool_dissection.js', 'bg-emerald-100 text-emerald-700'],
      ['stem_tool_dissection.js', 'bg-rose-100 text-rose-700'],
      ['stem_tool_dissection.js', 'bg-amber-100 text-amber-800'],
      ['stem_tool_dissection.js', 'bg-blue-100 text-blue-700'],
      ['stem_tool_dissection.js', 'bg-teal-100 text-teal-700'],
      ['stem_tool_semiconductor.js', 'bg-slate-600 text-slate-200 hover:bg-slate-700'],
      ['stem_tool_semiconductor.js', 'bg-cyan-700 text-white hover:bg-cyan-800'],
      ['stem_tool_semiconductor.js', 'bg-amber-700 text-white hover:bg-amber-800'],
      ['stem_tool_watercycle.js', 'bg-sky-100 text-sky-800 hover:bg-sky-200'],
      ['stem_tool_watercycle.js', 'bg-sky-700 text-white'],
      ['stem_tool_watercycle.js', 'bg-purple-700 text-white cursor-wait'],
      ['stem_tool_watercycle.js', 'bg-red-50 text-red-700 border border-red-200'],
      ['stem_tool_weathersystems.js', 'hover:bg-indigo-700'],
      ['stem_tool_weathersystems.js', 'border-cyan-800 bg-cyan-700 text-white'],
      ['stem_tool_weathersystems.js', 'bg-slate-800 text-slate-300'],
      ['stem_tool_weathersystems.js', 'bg-slate-100 text-slate-600'],
      ['stem_tool_weathersystems.js', 'hover:bg-emerald-800'],
      ['stem_tool_weathersystems.js', 'hover:bg-sky-800'],
      ['stem_tool_weathersystems.js', 'hover:bg-cyan-800'],
      ['stem_tool_weathersystems.js', 'hover:bg-teal-800'],
      ['stem_tool_dna.js', 'hover:bg-amber-800'],
      ['stem_tool_dna.js', 'hover:bg-emerald-800'],
      ['stem_tool_dna.js', 'bg-purple-700 text-white cursor-wait'],
      ['stem_tool_dna.js', 'hover:bg-violet-700'],
      ['stem_tool_dna.js', 'bg-cyan-700 text-white cursor-wait'],
      ['stem_tool_dna.js', 'bg-purple-200 text-purple-800 cursor-wait'],
      ['stem_tool_dna.js', 'bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100'],
      ['stem_tool_dna.js', 'bg-green-700 text-white border-green-800']
    ];
    const sources = new Map();
    for (const [fileName, treatment] of treatments) {
      if (!sources.has(fileName)) sources.set(fileName, readFileSync(resolve(process.cwd(), 'stem_lab', fileName), 'utf8'));
      expect(sources.get(fileName), fileName + ': ' + treatment).toContain(treatment);
    }
  });

  it('pins the five-tool calculus, baking, echo, and chemistry batch', () => {
    const treatments = [
      ['stem_tool_calculus.js', 'bg-red-100 text-red-800 hover:bg-red-200'],
      ['stem_tool_calculus.js', 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'],
      ['stem_tool_calculus.js', 'hover:bg-emerald-800'],
      ['stem_tool_calculus.js', 'hover:bg-amber-800'],
      ['stem_tool_calculus.js', 'bg-cyan-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-cyan-800'],
      ['stem_tool_calculus.js', 'bg-red-600 border-red-700 text-white shadow-md'],
      ['stem_tool_calculus.js', 'bg-indigo-600 border-indigo-700 text-white'],
      ['stem_tool_bakingscience.js', 'bg-amber-700 text-white border-amber-800 shadow'],
      ['stem_tool_bakingscience.js', 'bg-orange-700 text-white border-orange-800 shadow'],
      ['stem_tool_bakingscience.js', 'bg-yellow-800 text-white shadow'],
      ['stem_tool_bakingscience.js', 'bg-emerald-700 border-emerald-800 text-white'],
      ['stem_tool_bakingscience.js', 'bg-red-600 border-red-700 text-white'],
      ['stem_tool_bakingscience.js', 'bg-pink-700 border-pink-800 text-white'],
      ['stem_tool_bakingscience.js', 'bg-rose-600 text-white'],
      ['stem_tool_bakingscience.js', 'bg-teal-700 text-white'],
      ['stem_tool_bakingscience.js', 'bg-sky-700 text-white'],
      ['stem_tool_echolocation.js', 'hover:bg-emerald-800'],
      ['stem_tool_echolocation.js', 'hover:bg-indigo-700'],
      ['stem_tool_echolocation.js', 'bg-slate-200 text-slate-700'],
      ['stem_tool_echolocation.js', 'bg-slate-700 text-slate-200 cursor-wait'],
      ['stem_tool_chembalance.js', 'bg-lime-700 text-white'],
      ['stem_tool_chembalance.js', 'bg-lime-700 rounded-lg hover:bg-lime-800'],
      ['stem_tool_chembalance.js', 'text-white bg-lime-700 rounded-lg hover:bg-lime-800'],
      ['stem_tool_chembalance.js', 'text-lime-800 bg-lime-50 border border-lime-800'],
      ['stem_tool_chembalance.js', 'bg-emerald-700 text-white'],
      ['stem_tool_chembalance.js', 'bg-orange-700 text-white']
    ];
    const sources = new Map();
    for (const [fileName, treatment] of treatments) {
      if (!sources.has(fileName)) sources.set(fileName, readFileSync(resolve(process.cwd(), 'stem_lab', fileName), 'utf8'));
      expect(sources.get(fileName), fileName + ': ' + treatment).toContain(treatment);
    }
  });

  it('pins the ten-tool small-state contrast batch', () => {
    const treatments = [
      ['stem_tool_a11yauditor.js', 'hover:bg-teal-100 text-teal-700 transition-colors'],
      ['stem_tool_geosandbox.js', 'text-slate-300 hover:bg-slate-700'],
      ['stem_tool_cell.js', 'bg-amber-700 text-white border-amber-800'],
      ['stem_tool_cell.js', 'border border-amber-800 bg-amber-700 text-white'],
      ['stem_tool_coding.js', 'hover:bg-emerald-800'],
      ['stem_tool_coding.js', 'hover:bg-amber-800'],
      ['stem_tool_coordgrid.js', 'bg-red-50 text-red-700'],
      ['stem_tool_coordgrid.js', 'bg-blue-50 text-blue-700'],
      ['stem_tool_dataplot.js', 'bg-red-100 text-red-700'],
      ['stem_tool_dataplot.js', 'bg-emerald-100 text-emerald-700'],
      ['stem_tool_geo.js', 'bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-800'],
      ['stem_tool_gamestudio.js', 'text-rose-700 hover:bg-rose-50'],
      ['stem_tool_gamestudio.js', 'text-rose-700 border border-rose-600 rounded-lg hover:bg-rose-50'],
      ['stem_tool_spacecolony.js', 'bg-cyan-700 text-white hover:bg-cyan-800'],
      ['stem_tool_spacecolony.js', 'bg-emerald-700 text-white hover:bg-emerald-800'],
      ['stem_lab_module.js', 'hover:bg-amber-200 transition-colors text-amber-800'],
      ['stem_lab_module.js', 'bg-emerald-100 text-emerald-700'],
      ['stem_lab_module.js', 'bg-green-100 text-green-700'],
      ['stem_lab_module.js', 'bg-amber-100 text-amber-800'],
      ['stem_lab_module.js', 'bg-red-100 text-red-700'],
      ['stem_lab_module.js', 'bg-slate-200 text-slate-700 cursor-not-allowed'],
      ['stem_lab_module.js', 'bg-emerald-200 text-emerald-800']
    ];
    const sources = new Map();
    for (const [fileName, treatment] of treatments) {
      if (!sources.has(fileName)) sources.set(fileName, readFileSync(resolve(process.cwd(), 'stem_lab', fileName), 'utf8'));
      expect(sources.get(fileName), fileName + ': ' + treatment).toContain(treatment);
    }
  });

  it('pins the weld, graph, logic, and anatomy contrast batch', () => {
    const treatments = [
      ['stem_tool_weldlab.js', 'bg-orange-700 text-white border-orange-800'],
      ['stem_tool_weldlab.js', 'hover:bg-orange-800'],
      ['stem_tool_weldlab.js', 'bg-emerald-700 text-white border-emerald-800'],
      ['stem_tool_funcgrapher.js', 'text-rose-700 bg-rose-50'],
      ['stem_tool_funcgrapher.js', 'text-sky-700 bg-sky-50'],
      ['stem_tool_funcgrapher.js', 'text-teal-700 bg-teal-50'],
      ['stem_tool_funcgrapher.js', 'text-green-700 bg-green-50'],
      ['stem_tool_funcgrapher.js', 'text-amber-800 bg-amber-50'],
      ['stem_tool_funcgrapher.js', 'bg-indigo-600 text-white'],
      ['stem_tool_funcgrapher.js', 'bg-cyan-50 text-cyan-700'],
      ['stem_tool_funcgrapher.js', 'bg-emerald-50 text-emerald-700'],
      ['stem_tool_funcgrapher.js', 'bg-orange-50 text-orange-700'],
      ['stem_tool_funcgrapher.js', 'bg-purple-700 text-white cursor-wait'],
      ['stem_tool_funcgrapher.js', 'bg-slate-100 text-slate-600 hover:bg-indigo-50'],
      ['stem_tool_logiclab.js', 'hover:bg-red-200 text-red-800'],
      ['stem_tool_logiclab.js', 'hover:bg-emerald-200 text-emerald-800'],
      ['stem_tool_logiclab.js', 'bg-red-50 text-red-700 group-hover:bg-red-100'],
      ['stem_tool_logiclab.js', 'bg-violet-100 text-violet-700 hover:bg-violet-200'],
      ['stem_tool_logiclab.js', 'hover:bg-violet-300 text-violet-800'],
      ['stem_tool_anatomy.js', 'text-amber-800 hover:bg-amber-200'],
      ['stem_tool_anatomy.js', 'bg-pink-50 text-pink-700'],
      ['stem_tool_anatomy.js', 'hover:bg-violet-50 text-violet-700'],
      ['stem_tool_anatomy.js', 'bg-slate-100 text-slate-600'],
      ['stem_tool_anatomy.js', 'hover:bg-amber-800'],
      ['stem_tool_anatomy.js', 'hover:bg-orange-200 text-orange-800'],
      ['stem_tool_anatomy.js', 'text-slate-600 hover:bg-slate-100'],
      ['stem_tool_anatomy.js', 'bg-rose-100 text-rose-800 hover:bg-rose-200'],
      ['stem_tool_anatomy.js', 'hover:bg-emerald-800'],
      ['stem_tool_anatomy.js', 'text-teal-800 hover:bg-teal-200']
    ];
    const sources = new Map();
    for (const [fileName, treatment] of treatments) {
      if (!sources.has(fileName)) sources.set(fileName, readFileSync(resolve(process.cwd(), 'stem_lab', fileName), 'utf8'));
      expect(sources.get(fileName), fileName + ': ' + treatment).toContain(treatment);
    }
  });

  it('pins the aquarium, bike, evolution, and bird contrast batch', () => {
    const treatments = [
      ['stem_tool_aquarium.js', 'text-slate-600 hover:bg-slate-100'],
      ['stem_tool_aquarium.js', 'bg-white text-slate-700 border-slate-500 hover:bg-slate-100'],
      ['stem_tool_aquarium.js', 'bg-slate-100 text-slate-600'],
      ['stem_tool_aquarium.js', 'border-emerald-800 bg-emerald-700 text-white hover:bg-emerald-800'],
      ['stem_tool_aquarium.js', 'bg-green-100 text-green-700'],
      ['stem_tool_aquarium.js', 'bg-red-100 text-red-700'],
      ['stem_tool_aquarium.js', 'bg-green-50 text-green-700'],
      ['stem_tool_aquarium.js', 'bg-amber-50 text-amber-800'],
      ['stem_tool_aquarium.js', 'text-red-700 bg-red-50'],
      ['stem_tool_aquarium.js', 'bg-emerald-700 text-white border-emerald-800'],
      ['stem_tool_aquarium.js', 'bg-amber-700 text-white border-amber-800'],
      ['stem_tool_aquarium.js', 'bg-orange-700 text-white border-orange-800'],
      ['stem_tool_bikelab.js', 'bg-rose-600 hover:bg-rose-700 text-white'],
      ['stem_tool_bikelab.js', 'bg-emerald-700 hover:bg-emerald-800 text-white'],
      ['stem_tool_bikelab.js', 'border-indigo-700 bg-indigo-600 text-white'],
      ['stem_tool_bikelab.js', 'bg-pink-700 text-white'],
      ['stem_tool_bikelab.js', 'bg-amber-700 text-white'],
      ['stem_tool_bikelab.js', 'border-violet-700 bg-violet-600 text-white'],
      ['stem_tool_bikelab.js', 'border-fuchsia-800 bg-fuchsia-700 text-white'],
      ['stem_tool_bikelab.js', 'bg-slate-100 text-slate-600 cursor-not-allowed'],
      ['stem_tool_bikelab.js', 'border-rose-700 bg-rose-600 text-white'],
      ['stem_tool_evolab.js', 'bg-rose-600 hover:bg-rose-700 text-white'],
      ['stem_tool_evolab.js', 'bg-cyan-700 hover:bg-cyan-800 text-white'],
      ['stem_tool_evolab.js', 'bg-violet-600 text-white'],
      ['stem_tool_evolab.js', 'bg-fuchsia-700 hover:bg-fuchsia-800 disabled:bg-fuchsia-800 text-white'],
      ['stem_tool_evolab.js', 'bg-emerald-700 hover:bg-emerald-800 text-white'],
      ['stem_tool_evolab.js', 'bg-lime-700 hover:bg-lime-800 text-white'],
      ['stem_tool_evolab.js', 'bg-emerald-700 hover:bg-emerald-800 text-white shadow'],
      ['stem_tool_birdlab.js', 'cursor-not-allowed border-slate-400 bg-slate-100 text-slate-600']
    ];
    const sources = new Map();
    for (const [fileName, treatment] of treatments) {
      if (!sources.has(fileName)) sources.set(fileName, readFileSync(resolve(process.cwd(), 'stem_lab', fileName), 'utf8'));
      expect(sources.get(fileName), fileName + ': ' + treatment).toContain(treatment);
    }
  });

  it('pins the fractions, music, and raptor contrast batch', () => {
    const treatments = [
      ['stem_tool_fractions.js', 'bg-slate-200 text-slate-700'],
      ['stem_tool_fractions.js', 'text-sky-800 rounded-full hover:bg-sky-200'],
      ['stem_tool_fractions.js', 'bg-slate-100 text-slate-600'],
      ['stem_tool_fractions.js', 'text-amber-800 hover:bg-amber-200'],
      ['stem_tool_fractions.js', 'bg-red-200 text-red-900 hover:bg-red-300'],
      ['stem_tool_fractions.js', 'bg-yellow-800 text-white border-yellow-900'],
      ['stem_tool_fractions.js', 'bg-orange-200 text-orange-900 hover:bg-orange-300'],
      ['stem_tool_fractions.js', 'bg-orange-100 text-orange-900 hover:bg-orange-300'],
      ['stem_tool_fractions.js', 'bg-pink-200 text-pink-900 hover:bg-pink-300'],
      ['stem_tool_fractions.js', 'bg-green-700 text-white ring-2 ring-green-800'],
      ['stem_tool_fractions.js', 'bg-rose-600 text-white'],
      ['stem_tool_fractions.js', 'text-rose-800 hover:bg-rose-200'],
      ['stem_tool_fractions.js', 'text-rose-700 hover:bg-rose-100'],
      ['stem_tool_music.js', 'bg-violet-100 text-violet-700 hover:bg-violet-200'],
      ['stem_tool_music.js', 'text-amber-800 hover:bg-amber-200'],
      ['stem_tool_music.js', 'text-red-800 border border-red-600 hover:bg-red-200'],
      ['stem_tool_music.js', 'bg-red-50 text-red-700 hover:bg-red-100'],
      ['stem_tool_music.js', 'hover:bg-red-50 hover:text-red-700'],
      ['stem_tool_music.js', 'bg-orange-50 text-orange-700'],
      ['stem_tool_music.js', 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'],
      ['stem_tool_music.js', 'bg-purple-100 text-purple-700 hover:bg-purple-200'],
      ['stem_tool_music.js', 'bg-gray-300 text-gray-800'],
      ['stem_tool_music.js', 'hover:bg-orange-800'],
      ['stem_tool_music.js', 'text-emerald-800 hover:bg-emerald-200'],
      ['stem_tool_music.js', 'bg-amber-700 text-white'],
      ['stem_tool_music.js', 'hover:bg-amber-800'],
      ['stem_tool_music.js', 'bg-slate-50 text-slate-700'],
      ['stem_tool_raptorhunt.js', 'text-orange-200 hover:bg-slate-600'],
      ['stem_tool_raptorhunt.js', 'bg-slate-700 text-slate-200 cursor-not-allowed'],
      ['stem_tool_raptorhunt.js', 'bg-cyan-700 text-white'],
      ['stem_tool_raptorhunt.js', 'bg-emerald-700 text-white'],
      ['stem_tool_raptorhunt.js', 'bg-amber-700 text-white'],
      ['stem_tool_raptorhunt.js', 'bg-orange-700 text-white'],
      ['stem_tool_raptorhunt.js', 'bg-green-700 text-white'],
      ['stem_tool_raptorhunt.js', 'bg-yellow-800 text-white'],
      ['stem_tool_raptorhunt.js', 'bg-teal-700 text-white'],
      ['stem_tool_raptorhunt.js', 'bg-lime-700 text-white'],
      ['stem_tool_raptorhunt.js', 'bg-sky-700 text-white']
    ];
    const sources = new Map();
    for (const [fileName, treatment] of treatments) {
      if (!sources.has(fileName)) sources.set(fileName, readFileSync(resolve(process.cwd(), 'stem_lab', fileName), 'utf8'));
      expect(sources.get(fileName), fileName + ': ' + treatment).toContain(treatment);
    }
  });

  it('pins the manipulatives, companion, and money contrast batch', () => {
    const treatments = [
      ['stem_tool_manipulatives.js', 'bg-pink-100 border-pink-700 text-pink-700'],
      ['stem_tool_manipulatives.js', 'bg-pink-50 border-pink-700 text-pink-700 hover:bg-pink-100'],
      ['stem_tool_manipulatives.js', 'hover:bg-orange-800'],
      ['stem_tool_manipulatives.js', 'hover:bg-emerald-800'],
      ['stem_tool_manipulatives.js', 'hover:bg-amber-800'],
      ['stem_tool_manipulatives.js', 'text-rose-800 hover:bg-rose-200'],
      ['stem_tool_manipulatives.js', 'bg-orange-200 text-orange-900 hover:bg-orange-300'],
      ['stem_tool_manipulatives.js', 'bg-green-700 text-white border-green-800'],
      ['stem_tool_manipulatives.js', 'text-sky-800 hover:bg-sky-200'],
      ['stem_tool_manipulatives.js', 'bg-teal-700 text-white hover:bg-teal-800'],
      ['stem_tool_manipulatives.js', 'bg-slate-100 text-slate-600'],
      ['stem_tool_manipulatives.js', 'text-emerald-800 hover:bg-emerald-200'],
      ['stem_tool_companionplanting.js', 'border-amber-800 bg-amber-700 text-white'],
      ['stem_tool_companionplanting.js', 'bg-emerald-50 text-xl text-emerald-700'],
      ['stem_tool_companionplanting.js', 'border-cyan-800 bg-cyan-700 text-white'],
      ['stem_tool_companionplanting.js', 'bg-sky-700 text-white hover:bg-sky-800'],
      ['stem_tool_companionplanting.js', 'bg-emerald-700 text-white'],
      ['stem_tool_companionplanting.js', 'bg-slate-100 text-slate-600'],
      ['stem_tool_companionplanting.js', 'bg-white px-1 text-indigo-700'],
      ['stem_tool_companionplanting.js', 'hover:bg-emerald-800'],
      ['stem_tool_companionplanting.js', 'border-dashed border-slate-400 bg-slate-50 text-slate-600'],
      ['stem_tool_companionplanting.js', 'rounded-lg bg-rose-600 px-2.5 py-1.5 text-[10px] font-black text-white'],
      ['stem_tool_companionplanting.js', 'cursor-not-allowed border-slate-400 bg-slate-100 text-slate-600'],
      ['stem_tool_companionplanting.js', 'text-red-800 transition-colors hover:bg-red-200'],
      ['stem_tool_companionplanting.js', 'text-orange-800 transition-colors hover:bg-orange-200'],
      ['stem_tool_companionplanting.js', 'text-yellow-800 transition-colors hover:bg-yellow-200'],
      ['stem_tool_companionplanting.js', 'cursor-not-allowed bg-slate-200 text-slate-700'],
      ['stem_tool_companionplanting.js', 'bg-slate-100 text-slate-700'],
      ['stem_tool_companionplanting.js', 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'],
      ['stem_tool_companionplanting.js', 'bg-white text-green-700 border border-green-400'],
      ['stem_tool_companionplanting.js', 'border-white bg-emerald-700 text-[8px] font-black text-white'],
      ['stem_tool_money.js', 'hover:bg-amber-800'],
      ['stem_tool_money.js', 'text-red-300 border border-red-900'],
      ['stem_tool_money.js', 'bg-emerald-700 text-white border-emerald-800'],
      ['stem_tool_money.js', 'bg-zinc-900 border-zinc-600 text-zinc-300'],
      ['stem_tool_money.js', 'bg-zinc-700 text-zinc-300'],
      ['stem_tool_money.js', 'bg-indigo-600 text-white'],
      ['stem_tool_money.js', 'text-zinc-300 hover:bg-zinc-700'],
      ['stem_tool_money.js', 'hover:bg-emerald-800'],
      ['stem_tool_money.js', 'text-orange-800 hover:bg-orange-100'],
      ['stem_tool_money.js', 'hover:bg-orange-800'],
      ['stem_tool_money.js', 'bg-teal-700 text-white'],
      ['stem_tool_money.js', 'bg-white text-pink-700 border border-pink-700 hover:bg-pink-50'],
      ['stem_tool_money.js', 'hover:text-red-800'],
      ['stem_tool_money.js', 'hover:bg-teal-800'],
      ['stem_tool_money.js', 'bg-white border border-green-700 text-green-700 hover:bg-green-50'],
      ['stem_tool_money.js', 'bg-white border border-red-700 text-red-700 hover:bg-red-50'],
      ['stem_tool_money.js', 'hover:bg-cyan-800'],
      ['stem_tool_money.js', 'bg-white text-rose-700 border border-rose-700 hover:bg-rose-50'],
      ['stem_tool_money.js', 'bg-white text-emerald-700 border border-emerald-700 hover:bg-emerald-50'],
      ['stem_tool_money.js', 'bg-red-50 text-red-700'],
      ['stem_tool_money.js', 'bg-slate-100 text-slate-600 cursor-not-allowed']
    ];
    const sources = new Map();
    for (const [fileName, treatment] of treatments) {
      if (!sources.has(fileName)) sources.set(fileName, readFileSync(resolve(process.cwd(), 'stem_lab', fileName), 'utf8'));
      expect(sources.get(fileName), fileName + ': ' + treatment).toContain(treatment);
    }
  });

  it('pins the beehive, assessment, space, and bird contrast batch', () => {
    const treatments = [
      ['stem_tool_beehive.js', 'text-slate-300 hover:bg-slate-700'],
      ['stem_tool_beehive.js', 'text-slate-600 hover:bg-slate-100'],
      ['stem_tool_beehive.js', 'bg-amber-700 text-white'],
      ['stem_tool_beehive.js', 'bg-slate-900 text-slate-300'],
      ['stem_tool_beehive.js', 'bg-slate-100 text-slate-600'],
      ['stem_tool_beehive.js', 'bg-slate-50 text-slate-600'],
      ['stem_tool_beehive.js', 'hover:bg-purple-700'],
      ['stem_tool_beehive.js', 'hover:bg-indigo-700'],
      ['stem_tool_beehive.js', 'bg-amber-700 hover:bg-amber-800 text-white'],
      ['stem_tool_beehive.js', 'border-emerald-800 bg-emerald-700 text-white'],
      ['stem_tool_beehive.js', 'bg-emerald-700 text-white'],
      ['stem_tool_beehive.js', 'hover:bg-sky-800'],
      ['stem_tool_beehive.js', 'hover:bg-emerald-800'],
      ['stem_tool_beehive.js', 'bg-sky-700 text-white'],
      ['stem_tool_beehive.js', 'bg-slate-50 border-slate-400 text-slate-600 cursor-not-allowed'],
      ['stem_tool_beehive.js', 'bg-slate-800 text-slate-300'],
      ['stem_tool_beehive.js', 'border-slate-500 text-slate-700 bg-white'],
      ['stem_tool_beehive.js', 'bg-green-700 text-white'],
      ['stem_tool_beehive.js', 'bg-amber-100 text-amber-800 hover:bg-amber-200'],
      ['stem_tool_beehive.js', 'bg-amber-50 text-amber-800 hover:bg-amber-100'],
      ['stem_tool_beehive.js', 'bg-slate-50 text-slate-700 border border-slate-400'],
      ['stem_tool_beehive.js', 'rounded-lg bg-emerald-700 px-3 py-2 text-[10px] font-black text-white'],
      ['stem_tool_assessmentliteracy.js', 'bg-cyan-700 text-white hover:bg-cyan-800'],
      ['stem_tool_assessmentliteracy.js', 'bg-purple-700 text-white'],
      ['stem_tool_assessmentliteracy.js', 'hover:bg-purple-700'],
      ['stem_tool_assessmentliteracy.js', 'bg-emerald-700 text-white'],
      ['stem_tool_assessmentliteracy.js', 'bg-emerald-700 text-white hover:bg-emerald-800'],
      ['stem_tool_assessmentliteracy.js', 'bg-cyan-700 text-white border-2 border-cyan-800'],
      ['stem_tool_assessmentliteracy.js', 'bg-amber-700 text-white'],
      ['stem_tool_assessmentliteracy.js', 'hover:bg-emerald-800'],
      ['stem_tool_assessmentliteracy.js', 'bg-amber-700 text-white hover:bg-amber-800'],
      ['stem_tool_assessmentliteracy.js', 'bg-emerald-700 border-emerald-800 text-white'],
      ['stem_tool_assessmentliteracy.js', 'bg-sky-700 text-white hover:bg-sky-800'],
      ['stem_tool_assessmentliteracy.js', 'bg-fuchsia-700 text-white'],
      ['stem_tool_assessmentliteracy.js', 'hover:bg-fuchsia-800'],
      ['stem_tool_spaceexplorer.js', 'bg-fuchsia-600 hover:bg-fuchsia-700'],
      ['stem_tool_birdlab.js', 'border-amber-800 bg-amber-700 text-white hover:bg-amber-800']
    ];
    const sources = new Map();
    for (const [fileName, treatment] of treatments) {
      if (!sources.has(fileName)) sources.set(fileName, readFileSync(resolve(process.cwd(), 'stem_lab', fileName), 'utf8'));
      expect(sources.get(fileName), fileName + ': ' + treatment).toContain(treatment);
    }
  });
});
