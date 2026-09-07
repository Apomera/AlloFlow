import { readFileSync } from 'node:fs';
export const coreSource = readFileSync('word_sounds_core.js', 'utf8');
export const core = new Function(coreSource + '\nreturn createWordSoundsCore();')();
export function compileWords(words, profile = {}, language = 'en', preparedActivities = null) {
  const source = readFileSync('word_sounds_setup_source.jsx', 'utf8');
  const between = (a,b) => {const start=source.indexOf(a),end=source.indexOf(b,start+a.length);if(start<0||end<0)throw Error(a);return source.slice(start,end);};
  const compiler = new Function('instructionalProfile','wordSoundsLanguage', `
    ${coreSource}
    const WS_CORE=createWordSoundsCore();
    const window={AlloModules:{AlloData:{}}};
    const Math=Object.create(globalThis.Math); Math.random=()=>0.5;
    ${between('const PACK_COMMON_WORDS =', '// ── eSpeak G2P')}
    ${between('const normalizePackKey =', 'const handleStart =')}
    return compileActivityItems;
  `)(profile,language);
  const processed=compiler(structuredClone(words));
  if(preparedActivities)new Function('processed','preparedActivities','instructionalProfile',coreSource+'\nconst WS_CORE=createWordSoundsCore();\n'+between('if (preparedActivities) processed.forEach', '// Build every picture required'))(processed,preparedActivities,profile);
  return processed;
}
