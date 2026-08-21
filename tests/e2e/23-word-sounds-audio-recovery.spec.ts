import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const wordSoundsStrings = JSON.parse(readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8')).word_sounds;

test('Word Sounds recovers from a browser playback block without restarting the activity', async ({ page }) => {
  await page.setContent('<!doctype html><html><body><div id="root"></div></body></html>');
  await page.addScriptTag({ path: resolve(modulesDir, 'react/umd/react.development.js') });
  await page.addScriptTag({ path: resolve(modulesDir, 'react-dom/umd/react-dom.development.js') });

  await page.evaluate((localizedWordSoundsStrings) => {
    const noop = () => {};
    const iconNames = ['AlertCircle', 'AlertTriangle', 'BarChart2', 'BarChart3', 'Calculator', 'Chart', 'Check', 'ChevronDown', 'ChevronLeft', 'ChevronRight', 'ClipboardList', 'Cloud', 'Download', 'Ear', 'Edit2', 'Globe', 'Maximize2', 'Mic', 'MicOff', 'Minimize', 'Music', 'Play', 'PlayCircle', 'Printer', 'RefreshCw', 'Settings', 'ShieldCheck', 'Star', 'Trash2', 'Trophy', 'Upload', 'Users', 'Volume2', 'Wifi', 'X', 'Zap'];
    for (const name of iconNames) {
      (window as any)[name] = () => (window as any).React.createElement('span', { 'data-icon': name });
    }
    Object.assign(window as any, {
      LETTER_NAME_AUDIO: {}, ORF_PRACTICE_PASSAGES: [], PHONEME_GUIDE: {}, PRACTICE_PROBE_BANKS: {},
      SafetyContentChecker: { check: () => ({ safe: true }), isSafe: () => true, scan: () => ({ safe: true }) },
      db: {}, appId: 'browser-test', collection: () => ({}), onSnapshot: () => noop,
      saveInterventionLog: noop, deleteInterventionLog: noop, _CACHE_WORD_AUDIO_BANK: {},
      calculateRunningRecordMetrics: () => ({}), callGeminiImageEdit: async () => null,
      getBenchmarkComparison: () => null, normalizePhoneme: (value: unknown) => value,
      safeGetItem: () => null, safeSetItem: noop, renderVoiceInputOverlay: () => null,
      alloBotRef: { current: null }, cancelled: false, currentStreak: 0,
      fluencyBenchmarkGrade: null, fluencyBenchmarkSeason: null, mathFluencyHistory: [],
      phonemeData: {}, rtiGoals: [], rtiDecisionRuleMethod: '', rtiDecisionRuleThreshold: 0,
      setRtiGoals: noop, setRtiDecisionRuleMethod: noop, setRtiDecisionRuleThreshold: noop,
      setShowClassAnalytics: noop, studentNickname: '', warnLog: noop, debugLog: noop,
      __wordSoundsPlaybackAllowed: false,
      __wordSoundsStrings: localizedWordSoundsStrings,
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'canPlayType', { configurable: true, value: () => 'probably' });
    Object.defineProperty(HTMLMediaElement.prototype, 'load', {
      configurable: true,
      value: function load() {
        if (this.getAttribute('src') || (this as HTMLMediaElement).src) {
          setTimeout(() => this.dispatchEvent(new Event('loadedmetadata')), 0);
        }
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: function play() {
        if (!(window as any).__wordSoundsPlaybackAllowed) {
          return Promise.reject(new DOMException('User gesture required', 'NotAllowedError'));
        }
        setTimeout(() => this.dispatchEvent(new Event('ended')), 0);
        return Promise.resolve();
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: noop });
  }, wordSoundsStrings);

  await page.addScriptTag({ path: resolve(process.cwd(), 'word_sounds_module.js') });
  await page.evaluate(() => {
    const React = (window as any).React;
    const WordSoundsModal = (window as any).AlloModules.WordSoundsModal;
    const noop = () => {};
    const audio = { mime: 'audio/wav', base64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=' };
    const pack = {
      id: 1, term: 'cat', word: 'cat', targetWord: 'cat', displayWord: 'cat',
      phonemes: ['k', 'a', 't'], phonemeCount: 3, graphemes: ['c', 'a', 't'],
      ttsReady: true, _studentPackVersion: 2, _ttsRequiredKeys: ['cat'], _ttsAssets: { cat: audio },
      activityItems: { counting: { options: [1, 2, 3, 4], answer: 3 } },
    };
    (window as any).__wordSoundsStatuses = [];
    function Host() {
      const [activity, setActivity] = React.useState('counting');
      const [word, setWord] = React.useState(null);
      const [phonemes, setPhonemes] = React.useState(null);
      const [feedback, setFeedback] = React.useState(null);
      const [score, setScore] = React.useState({ correct: 0, total: 0, streak: 0 });
      const [words, setWords] = React.useState([pack]);
      return React.createElement(WordSoundsModal, {
        glossaryTerms: [], onClose: noop, wordSoundsActivity: activity, setWordSoundsActivity: setActivity,
        wordSoundsScore: score, setWordSoundsScore: setScore, currentWordSoundsWord: word,
        setCurrentWordSoundsWord: setWord, wordSoundsPhonemes: phonemes, setWordSoundsPhonemes: setPhonemes,
        wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback, wordSoundsHistory: [], setWordSoundsHistory: noop,
        wordSoundsLanguage: 'en', setWordSoundsLanguage: noop, wordSoundsFamilies: [], setWordSoundsFamilies: noop,
        wordSoundsAudioLibrary: {}, setWordSoundsAudioLibrary: noop, wordSoundsDifficulty: 'auto', setWordSoundsDifficulty: noop,
        wordSoundsAccuracyHistory: [], setWordSoundsAccuracyHistory: noop, wordSoundsScoreHistory: [],
        wordSoundsTtsSpeed: 1, setWordSoundsTtsSpeed: noop, wordSoundsSessionGoal: 10, setWordSoundsSessionGoal: noop,
        wordSoundsSessionProgress: 0, setWordSoundsSessionProgress: noop, wordSoundsBadges: [], setWordSoundsBadges: noop,
        wordSoundsLevel: 1, setWordSoundsLevel: noop, phonemeMastery: {}, setPhonemeMastery: noop,
        wordSoundsDailyProgress: {}, setWordSoundsDailyProgress: noop, wordSoundsConfusionPatterns: {}, setWordSoundsConfusionPatterns: noop,
        wsPreloadedWords: words, setWsPreloadedWords: setWords, initialShowReviewPanel: false, initialActivitySequence: [],
        allowRuntimeAi: false, callGemini: noop, callTTS: noop, callImagen: noop, selectedVoice: null,
        fetchTTSBytes: noop, onScoreUpdate: noop, speakWord: noop, playSound: noop, addToast: noop,
        t: (key: string, fallback?: string) => fallback || key,
        getWordSoundsString: (_t: unknown, key: string, params: Record<string, unknown> = {}) => {
          let result = (window as any).__wordSoundsStrings[key.replace('word_sounds.', '')] || key;
          for (const [name, value] of Object.entries(params)) result = result.replace(`{${name}}`, String(value));
          return result;
        },
        onPreparedAudioStatus: (report: unknown) => (window as any).__wordSoundsStatuses.push(report),
        preparedAudioDeliveryAt: 5150,
      });
    }
    (window as any).ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Host));
  });

  const retry = page.getByRole('button', { name: 'Try sound again' });
  await expect(retry).toBeVisible({ timeout: 10_000 });
  await expect(retry).toBeFocused();
  await expect(page.getByText('Your place is saved', { exact: false })).toBeVisible();

  await page.evaluate(() => { (window as any).__wordSoundsPlaybackAllowed = true; });
  await retry.click();
  await expect(retry).toBeHidden();
  await expect(page.getByRole('button', { name: 'common.play_word' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.getElementById('root')?.contains(document.activeElement))).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as any).__wordSoundsStatuses.at(-1))).toMatchObject({
    status: 'ready', failed: 0, deliveryAt: 5150,
  });
});
