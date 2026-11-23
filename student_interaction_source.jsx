// Student Interaction Components — extracted from AlloFlowANTI.txt

// ═══ StudentSubmitModal (lines 5776-5961) ═══
const StudentInteractionThemeFallbackContext = (typeof window !== 'undefined' && window.React && window.React.createContext)
  ? window.React.createContext({ theme: 'light', colorOverlay: 'none' })
  : null;
const StudentInteractionLangFallbackContext = (typeof window !== 'undefined' && window.React && window.React.createContext)
  ? window.React.createContext({ t: (k) => k })
  : null;
const _SI_CRISIS_RE = /\b(?:kill\s+my\s*self|end\s+my\s+life|want\s+to\s+die|commit\s+suicide|suicidal|hurt\s+myself|harm\s+myself|self[\s-]?harm|cut\s+myself|overdose\s+on|shoot\s+myself|hang\s+myself)\b/i;
const _SI_CRISIS_MESSAGE = 'It sounds like you may be going through a difficult time. Please pause and talk with a trusted adult right away. You can call or text 988 (Suicide & Crisis Lifeline), text HOME to 741741 (Crisis Text Line), or call 911 in an emergency.';
function _siScreenCrisis(text) {
  const s = String(text || '').trim();
  if (!s) return null;
  try {
    const checker = typeof window !== 'undefined' && ((window.__alloShared && window.__alloShared.SafetyContentChecker) || window.SafetyContentChecker || (window.AlloModules && window.AlloModules.SafetyContentChecker));
    if (checker && typeof checker.check === 'function') {
      const res = checker.check(s);
      if (Array.isArray(res) && res.some(f => f && (f.category === 'self_harm' || f.severity === 'crisis'))) return { blocked: true, message: _SI_CRISIS_MESSAGE };
      if (res && typeof res === 'object' && (res.severity === 'crisis' || res.category === 'self_harm' || res.crisis === true || res.blocked === true)) return { blocked: true, message: _SI_CRISIS_MESSAGE };
    }
  } catch (_) {}
  if (_SI_CRISIS_RE.test(s)) return { blocked: true, message: _SI_CRISIS_MESSAGE };
  return null;
}

const cx = (...parts) => parts.filter(Boolean).join(' ');

function getStudentInteractionThemeStyles(themeContext = {}) {
  const theme = themeContext.theme || 'light';
  const colorOverlay = themeContext.colorOverlay || 'none';
  if (theme === 'contrast') {
    return {
      overlay: 'bg-black/95',
      dialog: 'bg-black text-white border-4 border-yellow-400 shadow-none',
      panel: 'bg-black text-white border-2 border-yellow-400 shadow-none',
      panelSoft: 'bg-black text-white border-2 border-white',
      header: 'bg-black text-yellow-400 border-b-4 border-yellow-400',
      headerText: 'text-white',
      iconBubble: 'bg-black text-yellow-400 border-2 border-yellow-400',
      title: 'text-yellow-400',
      text: 'text-white',
      muted: 'text-yellow-400',
      input: 'bg-black border-2 border-yellow-400 text-yellow-400 placeholder:text-yellow-200 focus:ring-yellow-400 focus:border-yellow-400',
      primary: 'bg-yellow-400 hover:bg-yellow-300 text-black border-2 border-yellow-400 shadow-none',
      secondary: 'bg-black border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black',
      focusOffset: 'focus:ring-offset-black',
      positive: 'bg-black border-yellow-400 text-yellow-400',
      needsWork: 'bg-black border-white text-white',
      stat: 'bg-black border-2 border-yellow-400 text-yellow-400',
    };
  }
  if (theme === 'dark') {
    return {
      overlay: 'bg-slate-950/90',
      dialog: 'bg-slate-900 text-slate-100 border-2 border-indigo-800 shadow-2xl shadow-slate-950/80',
      panel: 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm',
      panelSoft: 'bg-slate-950 text-slate-200 border border-slate-700',
      header: 'bg-indigo-950 text-indigo-100 border-b border-indigo-800',
      headerText: 'text-indigo-100',
      iconBubble: 'bg-indigo-950 text-indigo-200 border border-indigo-700',
      title: 'text-slate-100',
      text: 'text-slate-200',
      muted: 'text-slate-300',
      input: 'bg-slate-950 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:ring-indigo-500/40 focus:border-indigo-400',
      primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-none',
      secondary: 'bg-slate-950 border border-slate-600 text-slate-100 hover:bg-slate-800 hover:text-white',
      focusOffset: 'focus:ring-offset-slate-900',
      positive: 'bg-emerald-950 border-emerald-700 text-emerald-100',
      needsWork: 'bg-amber-950 border-amber-700 text-amber-100',
      stat: 'bg-slate-800 border border-slate-700 text-slate-100',
    };
  }
  const dialogTint = colorOverlay === 'blue' ? 'bg-blue-50 border-blue-200'
    : colorOverlay === 'peach' ? 'bg-orange-50 border-orange-200'
    : colorOverlay === 'yellow' ? 'bg-yellow-50 border-yellow-300'
    : 'bg-white border-indigo-100';
  return {
    overlay: 'bg-slate-900/90',
    dialog: `${dialogTint} text-slate-800 shadow-2xl`,
    panel: 'bg-white text-slate-800 border border-slate-400 shadow-sm',
    panelSoft: 'bg-slate-50 text-slate-700 border border-slate-400',
    header: 'bg-indigo-600 text-white',
    headerText: 'text-indigo-100',
    iconBubble: 'bg-indigo-100 text-indigo-700 border-2 border-indigo-200',
    title: 'text-slate-900',
    text: 'text-slate-700',
    muted: 'text-slate-600',
    input: 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:ring-indigo-500/20 focus:border-indigo-500',
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg',
    secondary: 'bg-white border-2 border-slate-300 text-slate-700 hover:border-indigo-400 hover:text-indigo-700',
    focusOffset: 'focus:ring-offset-white',
    positive: 'bg-green-50 border-green-400 text-green-800',
    needsWork: 'bg-orange-50 border-orange-400 text-orange-800',
    stat: 'bg-white border border-slate-400 text-slate-700',
  };
}

function normalizeStudentSubmitVoiceText(value) {
  return String(value == null ? '' : value)
    .toLocaleLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function resolveStudentSubmitVoiceOption(options, reference) {
  const values = Array.isArray(options) ? options : [];
  const normalized = normalizeStudentSubmitVoiceText(reference)
    .replace(/^(?:option|choice|number)\s+/, '')
    .replace(/\s+(?:option|choice)$/, '');
  const ordinalWords = {
    one: 1, first: 1, two: 2, second: 2, three: 3, third: 3,
    four: 4, fourth: 4, five: 5, fifth: 5, six: 6, sixth: 6,
    seven: 7, seventh: 7, eight: 8, eighth: 8, nine: 9, ninth: 9,
    ten: 10, tenth: 10, eleven: 11, eleventh: 11, twelve: 12, twelfth: 12
  };
  const numericMatch = normalized.match(/^(\d{1,3})(?:st|nd|rd|th)?$/);
  const oneBasedIndex = numericMatch ? Number(numericMatch[1]) : (Object.prototype.hasOwnProperty.call(ordinalWords, normalized) ? ordinalWords[normalized] : undefined);
  if (Number.isInteger(oneBasedIndex) && oneBasedIndex >= 1 && oneBasedIndex <= values.length) {
    return { value: values[oneBasedIndex - 1], index: oneBasedIndex };
  }
  const matches = values.reduce((out, value, index) => {
    if (normalizeStudentSubmitVoiceText(value) === normalized) out.push({ value, index: index + 1 });
    return out;
  }, []);
  return matches.length === 1 ? matches[0] : null;
}

function parseStudentSubmitVoiceCommand(value) {
  const raw = String(value || '').trim().slice(0, 200);
  const text = normalizeStudentSubmitVoiceText(raw);
  if (/^(?:where am i|describe (?:this|the) (?:screen|dialog)|describe submission|submission status)$/.test(text)) return { commandId: 'student_submit_describe', confidence: 1 };
  if (/^(?:what can i do(?: here)?|list (?:available )?actions|list my choices|help)$/.test(text)) return { commandId: 'student_submit_list_actions', confidence: 1 };
  if (/^(?:read|describe|speak|tell me) (?:my |the )?work summary$/.test(text) || /^what (?:work|content) (?:will be|is) submitted$/.test(text)) return { commandId: 'student_submit_read_summary', confidence: 1 };
  let match = raw.match(/^(?:select|choose|set|use)\s+(?:the\s+)?(?:codename\s+)?adjective(?:\s+(?:to|as|number))?\s+(.+)$/i);
  if (match) return { commandId: 'student_submit_select_adjective', params: { choice: match[1].trim() }, confidence: 0.99 };
  match = raw.match(/^(?:select|choose|set|use)\s+(?:the\s+)?(?:codename\s+)?animal(?:\s+(?:to|as|number))?\s+(.+)$/i);
  if (match) return { commandId: 'student_submit_select_animal', params: { choice: match[1].trim() }, confidence: 0.99 };
  if (/^(?:randomize|change|choose|give me)(?: (?:a|the))? (?:different |new )?(?:private )?codename$/.test(text) || /^(?:different|new) codename$/.test(text)) return { commandId: 'student_submit_randomize_codename', confidence: 1 };
  if (/^(?:submit|send|turn in|hand in)(?: my| the)? (?:work|assignment|submission)?$/.test(text) || /^(?:confirm|finish) submission$/.test(text)) return { commandId: 'student_submit_confirm', confidence: 1 };
  if (/^(?:cancel|go back|back|keep reviewing|close (?:this|the) (?:screen|dialog))$/.test(text)) return { commandId: 'student_submit_cancel', confidence: 1 };
  return null;
}

function executeStudentSubmitVoiceCommand(scopeRef, commandId, params) {
  const current = scopeRef.current;
  if (!current || !current.isOpen) return { ok: false, narration: 'The submission dialog is no longer open.' };
  if (commandId === 'student_submit_describe') {
    const destination = current.submissionMethod === 'mailbox' ? "your teacher's private class mailbox" : 'a submission file on this device';
    return { ok: true, narration: 'Submit work dialog. Your private codename is ready and will not be spoken. Your complete work will go to ' + destination + '. You can read the work summary, choose either codename part by name or number, randomize the codename, submit, or cancel.' };
  }
  if (commandId === 'student_submit_list_actions') return { ok: true, narration: 'Available actions: read work summary; select adjective by name or number; select animal by name or number; randomize codename; submit work; or cancel.' };
  if (commandId === 'student_submit_read_summary') {
    const summary = current.summary || {};
    return { ok: true, narration: 'Work summary: ' + (summary.quizzes || 0) + ' quizzes, ' + (summary.readings || 0) + ' readings, ' + (summary.adventures || 0) + ' adventures, and ' + (summary.scaffolds || 0) + ' scaffolds.' };
  }
  if (commandId === 'student_submit_select_adjective' || commandId === 'student_submit_select_animal') {
    const isAdjective = commandId === 'student_submit_select_adjective';
    const choice = isAdjective ? current.selectAdjective(params && params.choice) : current.selectAnimal(params && params.choice);
    if (!choice) {
      const count = isAdjective ? current.adjectiveCount : current.animalCount;
      return { ok: false, narration: 'That ' + (isAdjective ? 'adjective' : 'animal') + ' option was not found. Choose an accessible option name or a number from 1 to ' + count + '.' };
    }
    return { ok: true, narration: (isAdjective ? 'Adjective' : 'Animal') + ' option ' + choice.index + ' selected. The private codename was not spoken.' };
  }
  if (commandId === 'student_submit_randomize_codename') {
    current.randomize();
    return { ok: true, narration: 'A different private codename is ready. It was not spoken.' };
  }
  if (commandId === 'student_submit_confirm') {
    if (current.submitting) return { ok: false, narration: 'Submission is already in progress.' };
    if (!current.codenameReady) return { ok: false, narration: 'Both private codename choices are required before submission.' };
    return Promise.resolve(current.submit()).then((result) => {
      if (result === false || (result && result.ok === false)) return { ok: false, narration: (result && result.narration) || 'Submission did not finish. Your work remains available.' };
      if (result && result.delivery === 'mailbox') return { ok: true, narration: "Submission delivered to your teacher's private class mailbox." };
      if (result && result.delivery === 'backup') return { ok: true, narration: 'The teacher mailbox could not receive the submission, so a backup submission file was downloaded to this device.' };
      if (result && result.delivery === 'standard-live-download') return { ok: true, narration: 'Live activity responses remain synced, and the complete work file was downloaded for your teacher or learning system.' };
      return { ok: true, narration: 'Submission file downloaded. Send it to your teacher or upload it to your learning system.' };
    });
  }
  if (commandId === 'student_submit_cancel') {
    if (current.submitting) return { ok: false, narration: 'Submission is already in progress and cannot be closed yet.' };
    current.cancel();
    return { ok: true, narration: 'Submission cancelled. Your work remains available.' };
  }
  return { ok: false, narration: 'That submission action is not available.' };
}

const STUDENT_SUBMIT_VOICE_COMMANDS = Object.freeze([
  { id: 'student_submit_describe', label: 'Describe submission dialog', risk: 'none', confirmation: 'never' },
  { id: 'student_submit_list_actions', label: 'List submission actions', risk: 'none', confirmation: 'never' },
  { id: 'student_submit_read_summary', label: 'Read work summary', risk: 'none', confirmation: 'never' },
  { id: 'student_submit_select_adjective', label: 'Select codename adjective', params: ['choice'], risk: 'state-change', confirmation: 'never' },
  { id: 'student_submit_select_animal', label: 'Select codename animal', params: ['choice'], risk: 'state-change', confirmation: 'never' },
  { id: 'student_submit_randomize_codename', label: 'Choose a different private codename', risk: 'state-change', confirmation: 'never' },
  {
    id: 'student_submit_confirm',
    label: 'Submit work to the configured destination',
    risk: 'destructive',
    confirmation: 'always',
    confirmMessage: 'Submit your complete work to the destination described in this dialog? Say yes to submit, or no to keep reviewing.',
  },
  { id: 'student_submit_cancel', label: 'Cancel submission', risk: 'state-change', confirmation: 'never' },
]);

function createStudentSubmitVoiceScopeSpec(scopeRef) {
  return {
    id: 'student-submit-dialog',
    priority: 140,
    isActive: () => !!(scopeRef.current && scopeRef.current.isOpen),
    getCapabilities: () => {
      const current = scopeRef.current;
      return {
        semanticSubmission: true, describe: true, listActions: true,
        chooseCodenameParts: true, randomizeCodename: true, readWorkSummary: true,
        submit: !!(current && current.canSubmit), cancel: true,
      };
    },
    getState: () => {
      const current = scopeRef.current;
      return {
        phase: current && current.submitting ? 'submitting' : 'review',
        codenameReady: !!(current && current.codenameReady),
        adjectiveOptionCount: current ? current.adjectiveCount : 0,
        animalOptionCount: current ? current.animalCount : 0,
        delivery: current && current.submissionMethod === 'mailbox' ? 'teacher-mailbox' : 'device-download',
      };
    },
    getCommands: () => STUDENT_SUBMIT_VOICE_COMMANDS.map((command) => {
      if (command.id !== 'student_submit_confirm') return command;
      const mailboxDelivery = !!(scopeRef.current && scopeRef.current.submissionMethod === 'mailbox');
      return {
        ...command,
        confirmMessage: mailboxDelivery
          ? "Submit your complete work to your teacher's private class mailbox? Say yes to submit, or no to keep reviewing."
          : 'Download your complete work as a submission file on this device? Say yes to download it, or no to keep reviewing.',
      };
    }),
    parse: parseStudentSubmitVoiceCommand,
    execute: (commandId, params) => executeStudentSubmitVoiceCommand(scopeRef, commandId, params),
  };
}

const StudentSubmitModal = React.memo(({ isOpen, onClose, onSubmit, history = [], currentNickname = "", submissionMethod = "download", submissionContext = "file" }) => {
  const langCtx = useContext((typeof window !== 'undefined' && window.AlloLanguageContext) || LanguageContext || StudentInteractionLangFallbackContext) || {};
  const t = typeof langCtx.t === 'function' ? langCtx.t : (k) => k;
  const themeContext = useContext((typeof window !== 'undefined' && window.AlloThemeContext) || StudentInteractionThemeFallbackContext);
  const styles = getStudentInteractionThemeStyles(themeContext);
  const dialogRef = useRef(null);
  const titleId = 'student-submit-modal-title';
  const descId = 'student-submit-modal-desc';
  const summaryId = 'student-submit-summary-title';
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submitInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  // The student already chose a codename on the way in: send as that one, and
  // show the pickers only when they ask to change it (or none was chosen).
  const [changingName, setChangingName] = useState(false);
  // A receipt that stays until the student closes it; the toast alone was gone in seconds.
  const [receipt, setReceipt] = useState(null);
  const receiptDoneRef = useRef(null);
  useEffect(() => { if (isOpen) { setChangingName(false); setReceipt(null); setSubmitError(''); } }, [isOpen]);
  useEffect(() => { if (receipt && receiptDoneRef.current && receiptDoneRef.current.isConnected) { try { receiptDoneRef.current.focus(); } catch (_) {} } }, [receipt]);
  const say = (key, fallback) => { try { const v = key ? t(key) : ''; return typeof v === 'string' && v && v !== key ? v : fallback; } catch (_) { return fallback; } };
  const submitVoiceScopeRef = useRef(null);
  const rawAdjectives = t('codenames.adjectives', { returnObjects: true });
  const rawAnimals = t('codenames.animals', { returnObjects: true });
  const adjectives = Array.isArray(rawAdjectives) ? rawAdjectives : [];
  const animals = Array.isArray(rawAnimals) ? rawAnimals : [];
  const parseNickname = useCallback((nickname) => {
    if (!nickname || typeof nickname !== 'string') return { adj: '', animal: '' };
    const parts = nickname.trim().split(' ');
    if (parts.length >= 2) {
      const potentialAdj = parts[0];
      const potentialAnimal = parts.slice(1).join(' ');
      if (adjectives.includes(potentialAdj) && animals.includes(potentialAnimal)) {
        return { adj: potentialAdj, animal: potentialAnimal };
      }
    }
    return { adj: '', animal: '' };
  }, [adjectives, animals]);
  const [selectedAdj, setSelectedAdj] = useState('');
  const [selectedAnimal, setSelectedAnimal] = useState('');
  const randomizeName = useCallback(() => {
    if (adjectives.length > 0 && animals.length > 0) {
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const animal = animals[Math.floor(Math.random() * animals.length)];
      setSelectedAdj(adj);
      setSelectedAnimal(animal);
    }
  }, [adjectives, animals]);
  useEffect(() => {
    if (isOpen) {
      const parsed = parseNickname(currentNickname);
      if (parsed.adj && parsed.animal) {
        setSelectedAdj(parsed.adj);
        setSelectedAnimal(parsed.animal);
      } else {
        randomizeName();
      }
    }
  }, [isOpen, currentNickname, parseNickname, randomizeName]);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const submittingRef = useRef(submitting);
  submittingRef.current = submitting;
  const focusTrapRef = useRef(null);
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const stack = typeof window !== 'undefined'
      ? (window.__alloFocusTrapStack = window.__alloFocusTrapStack || [])
      : null;
    const trap = { root: dialog };
    focusTrapRef.current = trap;
    if (stack) stack.push(trap);
    const lockState = typeof window !== 'undefined'
      ? (window.__alloScrollLockState = window.__alloScrollLockState || { count: 0, overflow: '' })
      : null;
    if (lockState && typeof document !== 'undefined' && document.body) {
      if (lockState.count === 0) lockState.overflow = document.body.style.overflow;
      lockState.count += 1;
      document.body.style.overflow = 'hidden';
    }
    const hiddenNodes = [];
    const liveSel = '[aria-live], [role="status"], [role="alert"], [role="log"], [data-toast-region]';
    if (typeof document !== 'undefined' && dialog) {
      const rootEl = document.getElementById('root');
      const siblings = rootEl ? Array.from(rootEl.children) : Array.from(document.body?.children || []);
      siblings.forEach((node) => {
        if (!node || node === dialog || node.contains(dialog)) return;
        if (/^(SCRIPT|STYLE|LINK|TEMPLATE)$/i.test(node.tagName)) return;
        if (node.matches?.(liveSel) || node.querySelector?.(liveSel)) return;
        const hadInert = node.hasAttribute('inert');
        const prevHidden = node.getAttribute('aria-hidden');
        if (!hadInert) node.setAttribute('inert', '');
        try { node.inert = true; } catch (_) {}
        node.setAttribute('aria-hidden', 'true');
        hiddenNodes.push({ node, hadInert, prevHidden });
      });
    }
    const isTopTrap = () => {
      if (!stack || !stack.length) return true;
      const top = stack[stack.length - 1];
      return top === trap || Boolean(top && top.root && dialog && dialog.contains(top.root) && top.root === dialog);
    };
    const focusTimer = window.setTimeout(() => {
      const currentDialog = dialogRef.current;
      if (!currentDialog) return;
      const focusable = currentDialog.querySelector('button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
      if (focusable && typeof focusable.focus === 'function') focusable.focus();
      else currentDialog.focus();
    }, 0);
    const onDocKeyDown = (e) => {
      if (e.defaultPrevented || e.isComposing || e.keyCode === 229 || !isTopTrap()) return;
      const currentDialog = dialogRef.current;
      if (!currentDialog) return;
      if (e.key === 'Escape') {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        e.stopPropagation();
        if (submittingRef.current) return;
        if (typeof onCloseRef.current === 'function') onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = Array.from(currentDialog.querySelectorAll('button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'))
        .filter((el) => {
          if (!el || el.disabled || el.hidden || el.closest('[hidden], [inert], [aria-hidden="true"]') || el.getAttribute('aria-hidden') === 'true') return false;
          if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
            for (let cur = el; cur && cur !== currentDialog.parentElement; cur = cur.parentElement) {
              const cs = window.getComputedStyle(cur);
              if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return false;
              if (cur === currentDialog) break;
            }
          }
          return true;
        });
      if (!focusable.length) {
        e.preventDefault();
        currentDialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === currentDialog || !currentDialog.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !currentDialog.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onDocKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onDocKeyDown);
      hiddenNodes.forEach(({ node, hadInert, prevHidden }) => {
        try {
          if (!hadInert) { node.removeAttribute('inert'); node.inert = false; }
          if (prevHidden === null) node.removeAttribute('aria-hidden');
          else node.setAttribute('aria-hidden', prevHidden);
        } catch (_) {}
      });
      if (lockState && typeof document !== 'undefined' && document.body) {
        lockState.count = Math.max(0, lockState.count - 1);
        if (lockState.count === 0) document.body.style.overflow = (lockState.overflow ?? lockState.prev ?? '');
      }
      if (stack) {
        const idx = stack.lastIndexOf(trap);
        if (idx >= 0) stack.splice(idx, 1);
      }
      if (focusTrapRef.current === trap) focusTrapRef.current = null;
      if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [isOpen]);
  const getFullName = () => `${selectedAdj} ${selectedAnimal}`;
  const getSummaryStats = () => {
    const stats = {
      quizzes: 0,
      adventures: 0,
      readings: 0,
      scaffolds: 0,
    };
    (Array.isArray(history) ? history : []).forEach(item => {
      if (!item || typeof item !== 'object') return;
      if (item.type === 'quiz') stats.quizzes++;
      else if (item.type === 'adventure') stats.adventures++;
      else if (item.type === 'simplified') stats.readings++;
      else if (item.type === 'sentence-frames') stats.scaffolds++;
    });
    return stats;
  };
  const stats = getSummaryStats();
  const totalSummaryItems = stats.quizzes + stats.readings + stats.adventures + stats.scaffolds;
  const sayCount = (key, count, fallback) => {
    try {
      const v = key ? t(key, { count }) : '';
      return typeof v === 'string' && v && v !== key ? v : fallback;
    } catch (_) {
      return fallback;
    }
  };
  const getSummaryString = () => {
    const parts = [];
    if (stats.quizzes > 0) {
        const key = stats.quizzes === 1 ? 'modals.summary_details.quiz' : 'modals.summary_details.quizzes';
        parts.push(sayCount(key, stats.quizzes, `${stats.quizzes} ${stats.quizzes === 1 ? 'quiz' : 'quizzes'}`));
    }
    if (stats.adventures > 0) {
        const key = stats.adventures === 1 ? 'modals.summary_details.adventure' : 'modals.summary_details.adventures';
        parts.push(sayCount(key, stats.adventures, `${stats.adventures} ${stats.adventures === 1 ? 'adventure' : 'adventures'}`));
    }
    if (stats.readings > 0) {
        const key = stats.readings === 1 ? 'modals.summary_details.reading' : 'modals.summary_details.readings';
        parts.push(sayCount(key, stats.readings, `${stats.readings} ${stats.readings === 1 ? 'reading' : 'readings'}`));
    }
    if (stats.scaffolds > 0) {
        parts.push(`${stats.scaffolds} ${stats.scaffolds === 1 ? 'scaffold' : 'scaffolds'}`);
    }
    if (parts.length === 0) return say('modals.summary_details.empty', 'No completed activities yet');
    return parts.join(', ');
  };
  const mailboxDelivery = submissionMethod === 'mailbox';
  const submitLabel = mailboxDelivery ? "Submit to teacher's Drive" : say('modals.download_submission', 'Download submission file');
  const submitHint = mailboxDelivery
    ? "Your complete work will be saved automatically as a JSON file in your teacher's private AlloFlow Class Mailbox Drive folder. If delivery fails, a backup file downloads instead."
    : submissionContext === 'standard-live'
      ? 'Live quiz and activity responses sync during class. Your complete portfolio downloads as a file for your teacher or LMS.'
      : 'Your complete work downloads as a file. Send it to your teacher or upload it to your LMS.';
  const knownName = parseNickname(currentNickname);
  const hasKnownName = !!(knownName.adj && knownName.animal);
  const pickingName = !hasKnownName || changingName;
  const oldNameLabel = say('modals.student_name_label', '');
  const nameLabel = pickingName
    ? say('modals.submit_pick_codename', oldNameLabel && oldNameLabel !== 'Student Name / Nickname' ? oldNameLabel : 'Pick a codename')
    : say('modals.submit_sending_as', 'Sending as');
  const receiptTitle = !receipt ? '' : receipt.delivery === 'mailbox'
    ? say('modals.submit_receipt_sent_title', 'Sent to your teacher')
    : receipt.delivery === 'backup'
      ? say('modals.submit_receipt_backup_title', 'Not sent yet')
      : say('modals.submit_receipt_file_title', 'File downloaded');
  const receiptBody = !receipt ? '' : receipt.delivery === 'mailbox'
    ? say('modals.submit_receipt_sent_body', 'Your teacher has your work. You do not need to send anything else.')
    : receipt.delivery === 'backup'
      ? say('modals.submit_receipt_backup_body', 'The class mailbox could not take your work, so a backup file was downloaded to this device. Give that file to your teacher.')
      : say('modals.submit_receipt_file_body', 'Your work is in a file on this device. Your teacher does not have it yet: send them the file or upload it to your LMS.');
  const handleSubmit = async () => {
    const fullName = getFullName();
    if (!selectedAdj || !selectedAnimal || submitInFlightRef.current || submitting || receipt) return false;
    submitInFlightRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      const completed = typeof onSubmit === 'function' ? await Promise.resolve(onSubmit(fullName, stats)) : false;
      const succeeded = completed !== false && !(completed && completed.ok === false);
      if (succeeded && mountedRef.current) {
        setReceipt({ delivery: (completed && completed.delivery) || (mailboxDelivery ? 'mailbox' : 'download'), name: fullName, time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) });
      } else if (!succeeded && mountedRef.current) {
        const msg = (completed && typeof completed === 'object' && (completed.error || completed.message || completed.narration))
          || say('modals.submit_error', 'Could not send your work right now. Please try again.');
        setSubmitError(String(msg));
      }
      return succeeded ? (completed || true) : false;
    } catch (_) {
      if (mountedRef.current) setSubmitError(say('modals.submit_error', 'Could not send your work right now. Please try again.'));
      return false;
    } finally {
      submitInFlightRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  };
  submitVoiceScopeRef.current = {
    isOpen: !!isOpen,
    submitting: !!submitting,
    codenameReady: !!(selectedAdj && selectedAnimal),
    canSubmit: !!(selectedAdj && selectedAnimal && !submitting && !receipt),
    adjectiveCount: adjectives.length,
    animalCount: animals.length,
    summary: stats,
    submissionMethod,
    randomize: randomizeName,
    selectAdjective: (reference) => {
      const choice = resolveStudentSubmitVoiceOption(adjectives, reference);
      if (!choice) return null;
      setSelectedAdj(choice.value);
      return choice;
    },
    selectAnimal: (reference) => {
      const choice = resolveStudentSubmitVoiceOption(animals, reference);
      if (!choice) return null;
      setSelectedAnimal(choice.value);
      return choice;
    },
    submit: handleSubmit,
    cancel: () => { if (typeof onClose === 'function') onClose(); },
  };
  // Keep one high-priority semantic scope for the lifetime of this open
  // consequential dialog. The private codename never enters command state,
  // confirmation prompts, or narration.
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return undefined;
    let disposed = false;
    let unregister = null;
    let retryTimer = null;
    let retryAttempts = 0;
    const attach = () => {
      if (disposed || unregister) return;
      const commands = window.AlloModules && window.AlloModules.AlloCommands;
      if (!commands || typeof commands.registerCommandScope !== 'function') {
        if (retryAttempts < 25) {
          retryAttempts += 1;
          retryTimer = window.setTimeout(attach, 200);
        }
        return;
      }
      unregister = commands.registerCommandScope(createStudentSubmitVoiceScopeSpec(submitVoiceScopeRef));
    };
    attach();
    const onRegistry = () => attach();
    if (typeof window.addEventListener === 'function') window.addEventListener('alloflow:module-registry-changed', onRegistry);
    return () => {
      disposed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      if (typeof window.removeEventListener === 'function') window.removeEventListener('alloflow:module-registry-changed', onRegistry);
      try { if (typeof unregister === 'function') unregister(); } catch (_) {}
    };
  }, [isOpen]);
  const handleDialogKeyDown = (e) => {
    if (e.defaultPrevented || e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229 || e.nativeEvent?.keyCode === 229) return;
    const dialog = dialogRef.current;
    const stack = typeof window !== 'undefined' ? window.__alloFocusTrapStack : null;
    const trap = focusTrapRef.current;
    if (Array.isArray(stack) && stack.length > 0 && trap) {
      const top = stack[stack.length - 1];
      if (top !== trap && !(top && top.root && dialog && dialog.contains(top.root) && top.root === dialog)) return;
    }
    if (e.key === 'Escape') {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();
      if (submittingRef.current) return;
      if (typeof onClose === 'function') onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll('button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'))
      .filter((el) => {
        if (!el || el.disabled || el.hidden || el.closest('[hidden], [inert], [aria-hidden="true"]') || el.getAttribute('aria-hidden') === 'true') return false;
        if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
          for (let cur = el; cur && cur !== dialog.parentElement; cur = cur.parentElement) {
            const cs = window.getComputedStyle(cur);
            if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return false;
            if (cur === dialog) break;
          }
        }
        return true;
      });
    if (!focusable.length) {
      e.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  if (!isOpen) return null;
  return (
    <div role="presentation" className={cx('fixed inset-0 z-[300] backdrop-blur-sm flex items-center justify-center p-4 animate-in motion-reduce:animate-none fade-in duration-300', styles.overlay)}>
      <div
        ref={dialogRef}
        className={cx('rounded-2xl p-6 max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto relative transform transition-all motion-reduce:transition-none animate-in motion-reduce:animate-none zoom-in-95 duration-300', styles.dialog)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
      >
        <button
            type="button"
            disabled={submitting}
            onClick={() => { if (!submittingRef.current && typeof onClose === 'function') onClose(); }}
            className={cx('absolute top-4 right-4 min-h-11 min-w-11 inline-flex items-center justify-center p-2 rounded-full disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 transition-colors motion-reduce:transition-none', styles.secondary, styles.focusOffset)}
            aria-label={say('common.close', 'Close')}
        >
            <X size={20} aria-hidden="true" />
        </button>
        <div className="text-center mb-6 relative">
            <div className={cx('w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4', styles.iconBubble)} aria-hidden="true">
                <Send size={32} className="ml-1" />
            </div>
            <h2 id={titleId} className={cx('text-2xl font-black mb-1', styles.title)}>{receipt ? receiptTitle : say('modals.submit_title', 'Submit Work')}</h2>
            <p id={descId} className={cx('text-sm font-medium', styles.text)}>{receipt ? receiptBody : say('modals.submit_ready', 'Review your codename and work summary before submitting.')}</p>
        </div>
        {receipt ? (
          <div data-submit-receipt={receipt.delivery}>
            <div role="status" className={cx('rounded-xl p-4 mb-6 text-center', styles.panelSoft)}>
              <div
                data-submit-receipt-badge={receipt.delivery}
                className={cx('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border mb-2', receipt.delivery === 'mailbox' ? styles.positive : styles.needsWork)}
              >
                <span aria-hidden="true">{receipt.delivery === 'mailbox' ? '✓' : '!'}</span>
                <span>{receipt.delivery === 'mailbox' ? say('modals.submit_receipt_status_sent', 'Delivered') : receipt.delivery === 'backup' ? say('modals.submit_receipt_status_backup', 'Backup file saved') : say('modals.submit_receipt_status_file', 'Saved on device')}</span>
              </div>
              <div className={cx('text-xs font-bold uppercase tracking-wider mb-1', styles.muted)}>{say('modals.submit_receipt_as', 'Codename')}</div>
              <div className={cx('text-xl font-black tracking-tight break-words', styles.title)}>{receipt.name}</div>
              <div className={cx('text-sm font-medium mt-2', styles.text)}>{receipt.time}</div>
            </div>
            <button type="button" ref={receiptDoneRef} onClick={() => { if (typeof onClose === 'function') onClose(); }} data-submit-receipt-done="" className={cx('w-full min-h-11 font-bold py-3 rounded-xl transition-all motion-reduce:transition-none active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500', styles.primary, styles.focusOffset)}>{say('modals.submit_receipt_done', 'Done')}</button>
          </div>
        ) : (<React.Fragment>
        <div className="mb-6">
            <p className={cx('block text-xs font-bold uppercase tracking-wider mb-2 text-center', styles.muted)}>{nameLabel}</p>
            <div className={cx('p-4 rounded-xl', styles.panelSoft)}>
                {pickingName && (
                <div className="flex gap-2 mb-3">
                    <select
                        value={selectedAdj}
                        onChange={(e) => setSelectedAdj(e.target.value)}
                        className={cx('w-1/2 min-h-11 p-2 rounded-lg border font-bold text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 focus:ring-2 cursor-pointer', styles.input)}
                        aria-label={say('modals.entry.select_adjective', 'Select adjective')}
                        data-help-key="entry_adjective"
                    >
                        {adjectives.map((adj, i) => (
                            <option key={i} value={adj}>{adj}</option>
                        ))}
                    </select>
                    <select
                        value={selectedAnimal}
                        onChange={(e) => setSelectedAnimal(e.target.value)}
                        className={cx('w-1/2 min-h-11 p-2 rounded-lg border font-bold text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 focus:ring-2 cursor-pointer', styles.input)}
                        aria-label={say('modals.entry.select_animal', 'Select animal')}
                        data-help-key="entry_animal"
                    >
                        {animals.map((anim, i) => (
                            <option key={i} value={anim}>{anim}</option>
                        ))}
                    </select>
                </div>
                )}
                <div className={cx('flex items-center justify-between p-3 rounded-xl shadow-sm', styles.panel)}>
                    <div role="status" aria-live="polite" className={cx('text-xl font-black tracking-tight truncate mr-2', styles.title)}>
                        {selectedAdj} {selectedAnimal}
                    </div>
                    {pickingName ? (
                    <button
                        type="button"
                        onClick={randomizeName}
                        className={cx('min-h-11 min-w-11 inline-flex items-center justify-center p-2 rounded-full hover:scale-110 transition-all motion-reduce:transition-none shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500', styles.secondary, styles.focusOffset)}
                        title={say('modals.entry.randomize_codename', 'Randomize codename')}
                        aria-label={say('modals.entry.randomize_codename', 'Randomize codename')}
                        data-help-key="entry_randomize_btn"
                    >
                        <RefreshCw size={18} aria-hidden="true" />
                    </button>
                    ) : (
                    <button type="button" onClick={() => setChangingName(true)} data-submit-change-codename="" className={cx('min-h-11 px-3 rounded-lg text-sm font-bold underline shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500', styles.secondary, styles.focusOffset)}>{say('modals.submit_change_codename', 'Change')}</button>
                    )}
                </div>
            </div>
        </div>
        <div role="group" className={cx('rounded-xl p-4 mb-6', styles.panelSoft)} aria-labelledby={summaryId}>
            <div className="flex items-center justify-between gap-2 mb-3 border-b pb-2">
                <h3 id={summaryId} className={cx('text-xs font-bold uppercase tracking-widest', styles.muted)}>{say('modals.work_summary', 'Work Summary')}</h3>
                <span data-submit-total-count={String(totalSummaryItems)} className={cx('px-2.5 py-0.5 rounded-full text-xs font-bold border', styles.stat)}>
                    {totalSummaryItems} {totalSummaryItems === 1 ? say('modals.summary_item_singular', 'item') : say('modals.summary_item_plural', 'items')}
                </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className={cx('flex items-center gap-2 text-sm', styles.text)}>
                    <CheckSquare size={16} className="text-teal-600" aria-hidden="true"/>
                    <span className="font-bold">{stats.quizzes}</span> {say('modals.summary_quizzes', 'Quizzes')}
                </div>
                <div className={cx('flex items-center gap-2 text-sm', styles.text)}>
                    <BookOpen size={16} className="text-green-600" aria-hidden="true"/>
                    <span className="font-bold">{stats.readings}</span> {say('modals.summary_readings', 'Readings')}
                </div>
                <div className={cx('flex items-center gap-2 text-sm', styles.text)}>
                    <MapIcon size={16} className="text-purple-600" aria-hidden="true"/>
                    <span className="font-bold">{stats.adventures}</span> {say('modals.summary_adventures', 'Adventures')}
                </div>
                <div className={cx('flex items-center gap-2 text-sm', styles.text)}>
                    <Quote size={16} className="text-rose-600" aria-hidden="true"/>
                    <span className="font-bold">{stats.scaffolds}</span> {say('modals.summary_scaffolds', 'Scaffolds')}
                </div>
            </div>
            <div className={cx('text-xs italic text-center mt-2 pt-2 border-t', styles.muted)}>
                "{getSummaryString()}"
            </div>
        </div>
        <div className="flex flex-col gap-3">
            {submitError && (
                <p role="alert" className={cx('rounded-xl border px-3 py-2 text-xs font-bold text-center', styles.needsWork)}>
                    {submitError}
                </p>
            )}
            <button
                type="button"
                aria-label={submitLabel}
                aria-busy={submitting ? 'true' : undefined}
                onClick={handleSubmit}
                disabled={!selectedAdj || !selectedAnimal || submitting}
                className={cx('w-full min-h-11 font-bold py-3 rounded-xl transition-all motion-reduce:transition-none disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500', styles.primary, styles.focusOffset)}
                data-help-key="submit_confirm_btn"
            >
                {mailboxDelivery ? <Send size={18} aria-hidden="true" /> : <Download size={18} aria-hidden="true" />} {submitting ? 'Submitting…' : submitLabel}
            </button>
            <p className={cx('text-xs text-center font-medium px-4', styles.text)}>
                {submitHint}
            </p>
            <button
                type="button"
                onClick={() => { if (typeof onClose === 'function') onClose(); }}
                disabled={submitting}
                className={cx('w-full min-h-11 font-bold py-3 rounded-xl transition-all motion-reduce:transition-none active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500', styles.secondary, styles.focusOffset)}
            >
                {say('common.cancel', 'Cancel')}
            </button>
        </div>
        </React.Fragment>)}
      </div>
    </div>
  );
});

// ═══ DraftFeedbackInterface (lines 8998-9198) ═══
const DraftFeedbackInterface = React.memo(({
  status = 'writing',
  rubricCriteria = [],
  gradingDetails = null,
  draftText = '',
  setDraftText,
  previousDraft,
  onSubmit,
  onCancel,
  draftCount = 1,
  finalScore = null,
  xpEarned = null
}) => {
  const langCtx = useContext((typeof window !== 'undefined' && window.AlloLanguageContext) || LanguageContext || StudentInteractionLangFallbackContext) || {};
  const t = typeof langCtx.t === 'function' ? langCtx.t : (k) => k;
  const themeContext = useContext((typeof window !== 'undefined' && window.AlloThemeContext) || StudentInteractionThemeFallbackContext);
  const styles = getStudentInteractionThemeStyles(themeContext);
  const [crisisBanner, setCrisisBanner] = useState('');
  const safeDraftCount = Math.max(1, Math.trunc(Number(draftCount) || 1));
  const safeCancel = () => { if (typeof onCancel === 'function') onCancel(); };
  const handleScreenedSubmit = () => {
    const crisis = _siScreenCrisis(normalizedDraft);
    if (crisis) {
      setCrisisBanner(crisis.message);
      return;
    }
    setCrisisBanner('');
    if (typeof onSubmit === 'function') onSubmit();
  };
  const say = (key, fallback, opts) => {
    try {
      const v = key ? (opts ? t(key, opts) : t(key)) : '';
      return typeof v === 'string' && v && v !== key ? v : fallback;
    } catch (_) {
      return fallback;
    }
  };
  const focusRing = cx('focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500', styles.focusOffset);
  const normalizedDraft = String(draftText || '');
  const trimmedDraft = normalizedDraft.trim();
  const wordCount = trimmedDraft ? trimmedDraft.split(/\s+/).length : 0;
  const charCount = normalizedDraft.length;
  const prevWordCount = String(previousDraft || '').trim() ? String(previousDraft || '').trim().split(/\s+/).length : 0;
  const wordDelta = prevWordCount > 0 ? wordCount - prevWordCount : null;
  const normalizedCriteria = Array.isArray(rubricCriteria)
    ? rubricCriteria.map((item) => (typeof item === 'string' ? item : (item && (item.criterion || item.name || item.title || item.description)))).filter(Boolean)
    : [];
  const renderRubric = () => {
    if (!gradingDetails || !Array.isArray(gradingDetails.breakdown)) return null;
    const hasRawScore = typeof gradingDetails.rawScore === 'number' && Number.isFinite(gradingDetails.rawScore);
    return (
      <div className={cx('rounded-xl shadow-sm overflow-hidden mb-6', styles.panel)}>
        <div className={cx('p-4 border-b flex justify-between items-center gap-3', styles.panelSoft)}>
          <h3 className={cx('font-bold', styles.title)}>{say('mastery.feedback', 'Feedback')} & {say('mastery.score', 'Score')}</h3>
          {hasRawScore && (
            <div className={cx('px-4 py-1 rounded-full text-sm font-black border', status === 'mastery' ? styles.positive : styles.stat)}>
              {say('mastery.score', 'Score')}: {gradingDetails.rawScore}/100
            </div>
          )}
        </div>
        <div className="divide-y divide-slate-200/40">
          {gradingDetails.breakdown.map((grade, idx) => {
            if (!grade || typeof grade !== 'object') return null;
            const maxVal = Number(grade.max) > 0 ? Number(grade.max) : 5;
            const scoreVal = Number.isFinite(Number(grade.score)) ? Number(grade.score) : 0;
            const pct = Math.max(0, Math.min(100, Math.round((scoreVal / maxVal) * 100)));
            const isMet = scoreVal >= maxVal * 0.8;
            const criterionName = grade.criterion || 'Criterion';
            return (
              <div key={idx} className="p-4 md:p-6">
                <div className="mb-2 flex flex-wrap justify-between items-center gap-2">
                    <h4 className={cx('font-bold text-sm uppercase tracking-wider', styles.title)}>{criterionName}</h4>
                    <div className="flex items-center gap-2">
                      <span
                        data-rubric-criterion-status={isMet ? 'met' : 'revise'}
                        className={cx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border', isMet ? styles.positive : styles.needsWork)}
                      >
                        <span aria-hidden="true">{isMet ? '✓' : '!'}</span>
                        <span>{isMet ? say('mastery.status_met', 'Met') : say('mastery.status_revise', 'Needs revision')}</span>
                      </span>
                      <span className={cx('text-xs font-semibold', styles.muted)}>{say('mastery.achieved_level', 'Score')}: {scoreVal}/{maxVal}</span>
                    </div>
                </div>
                <div
                  role="progressbar"
                  aria-label={criterionName}
                  aria-valuemin={0}
                  aria-valuemax={maxVal}
                  aria-valuenow={scoreVal}
                  aria-valuetext={`${criterionName}: ${scoreVal} of ${maxVal} (${pct}%), ${isMet ? 'Met' : 'Needs revision'}`}
                  className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-2"
                >
                  <div className={cx('h-full rounded-full', isMet ? 'bg-emerald-600' : 'bg-amber-600')} style={{ width: `${pct}%` }} />
                </div>
                {grade.reason && (
                    <div className={cx('mt-2 text-sm p-3 rounded-lg border-l-4', isMet ? styles.positive : styles.needsWork)}>
                        <span className="font-bold mr-1">{say('mastery.feedback', 'Feedback')}:</span> {grade.reason}
                    </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  if (status === 'writing') {
    const draftTitle = say('mastery.draft_label', `Draft ${safeDraftCount}`, { count: safeDraftCount });
    return (
      <div className="max-w-4xl mx-auto p-2">
        <div className={cx('rounded-2xl shadow-xl overflow-hidden', styles.panel)}>
            <div className={cx('p-4 flex items-center justify-between gap-3', styles.header)}>
                <div className="flex items-center gap-3">
                    <div className={cx('p-2 rounded-full', styles.iconBubble)} aria-hidden="true"><BookOpen size={20} /></div>
                    <div>
                        <h2 className="font-bold text-lg">{draftTitle}</h2>
                        <p className={cx('text-xs', styles.headerText)}>{say('mastery.instruction', 'Write your response below, then submit for feedback.')}</p>
                    </div>
                </div>
                <button type="button" onClick={safeCancel} className={cx('min-h-11 min-w-11 inline-flex items-center justify-center p-2 rounded-full transition-colors motion-reduce:transition-none', styles.secondary, focusRing)} aria-label={say('common.close', 'Close')}><X size={20} aria-hidden="true" /></button>
            </div>
            <div className="p-6">
                {crisisBanner && (
                  <div role="alert" className="mb-4 rounded-xl border-2 border-rose-500 bg-rose-50 p-4 text-sm font-semibold text-rose-950">
                    {crisisBanner}
                  </div>
                )}
                {normalizedCriteria.length > 0 && (
                  <details data-draft-rubric-disclosure="true" className={cx('mb-4 rounded-xl border p-3', styles.panelSoft)}>
                    <summary className={cx('min-h-11 flex items-center cursor-pointer text-xs font-bold uppercase tracking-wider rounded-lg px-2', styles.title, focusRing)}>
                      {say('mastery.rubric_checklist', `Rubric checklist (${normalizedCriteria.length})`, { count: normalizedCriteria.length })}
                    </summary>
                    <ul className={cx('mt-2 pl-5 list-disc space-y-1 text-sm', styles.text)}>
                      {normalizedCriteria.map((criterion, idx) => (
                        <li key={idx}>{criterion}</li>
                      ))}
                    </ul>
                  </details>
                )}
                <label htmlFor="mastery-writing-draft-textarea" className="sr-only">{say('mastery.draft_aria', 'Draft response')}</label>
                <textarea
                    id="mastery-writing-draft-textarea"
                    aria-label={say('mastery.draft_aria', say('mastery.placeholder', 'Draft response'))}
                    aria-describedby="mastery-writing-meta"
                    value={normalizedDraft}
                    onChange={(e) => setDraftText && setDraftText(e.target.value)}
                    className={cx('w-full h-64 p-4 border-2 rounded-xl focus:ring-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 resize-none text-base leading-relaxed', styles.input)}
                    placeholder={say('mastery.placeholder', 'Write your draft here...')}
                    autoFocus
                    data-help-key="mastery_draft_input"
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span id="mastery-writing-meta" data-draft-word-count="true" role="status" aria-live="polite" className={cx('text-xs font-semibold', styles.muted)}>
                        {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} {charCount === 1 ? 'character' : 'characters'}
                      </span>
                      {trimmedDraft.length > 0 && typeof setDraftText === 'function' && (
                        <button
                          type="button"
                          data-draft-clear="true"
                          onClick={() => setDraftText('')}
                          className={cx('min-h-11 px-3 rounded-lg text-xs font-bold transition-colors motion-reduce:transition-none', styles.secondary, focusRing)}
                        >
                          {say('common.clear', 'Clear draft')}
                        </button>
                      )}
                    </div>
                    <button type="button"
                        onClick={handleScreenedSubmit}
                        disabled={!trimmedDraft}
                        className={cx('min-h-11 font-bold py-3 px-8 rounded-full transition-transform motion-reduce:transition-none motion-reduce:transform-none hover:scale-105 active:scale-95 disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed flex items-center gap-2', styles.primary, focusRing)}
                    >
                        {say('mastery.submit_feedback', 'Submit for Feedback')} <ArrowRight size={18} aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
      </div>
    );
  }
  if (status === 'grading') {
    return (
      <div className={cx('flex flex-col items-center justify-center h-96 p-8', styles.panel)} role="status" aria-live="polite" aria-atomic="true" aria-busy="true">
        <div className="relative" aria-hidden="true">
            <div className="w-20 h-20 border-4 border-indigo-100 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-t-indigo-600 border-r-indigo-600 border-b-transparent border-l-transparent rounded-full animate-spin motion-reduce:animate-none absolute top-0 left-0"></div>
            <div className={cx('absolute inset-0 flex items-center justify-center', styles.title)}>
                <RefreshCw size={24} className="animate-spin motion-reduce:animate-none" />
            </div>
        </div>
        <h2 className={cx('mt-6 text-xl font-bold animate-pulse motion-reduce:animate-none', styles.title)}>{t('mastery.analyzing')}</h2>
        <p className={cx('mt-2', styles.text)}>{t('mastery.criteria_check')}</p>
      </div>
    );
  }
  if (status === 'revision') {
    const newDraftLabel = say('mastery.new_draft', `Draft ${safeDraftCount + 1}`, { count: safeDraftCount + 1 });
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8 animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-4 duration-500">
        {crisisBanner && (
          <div role="alert" className="rounded-xl border-2 border-rose-500 bg-rose-50 p-4 text-sm font-semibold text-rose-950">
            {crisisBanner}
          </div>
        )}
        <div className={cx('flex justify-between items-center p-4 rounded-xl', styles.needsWork)}>
             <div className="flex items-center gap-3">
                 <div className={cx('p-2 rounded-full', styles.iconBubble)} aria-hidden="true">
                     <RefreshCw size={24} />
                 </div>
                 <div>
                     <h2 className={cx('text-xl font-black', styles.title)}>{say('mastery.revision_required', 'Revision Needed')}</h2>
                     <span className="sr-only" role="status" aria-live="polite">{t('mastery.revision_required')}</span>
                     <p className={cx('text-sm', styles.text)}>{say('mastery.revision_desc', 'Use the rubric feedback below to strengthen your next draft.')}</p>
                 </div>
             </div>
             <div className="flex items-center gap-2">
                 {typeof gradingDetails?.rawScore === 'number' && Number.isFinite(gradingDetails.rawScore) && (
                   <div className={cx('hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm mr-2', styles.panel)}>
                       <Star size={16} className="text-yellow-500 fill-current" aria-hidden="true" />
                       <span className={cx('text-xs font-bold', styles.text)}>{say('mastery.current_progress', 'Current score')}: {gradingDetails.rawScore}/100</span>
                   </div>
                 )}
                 <button type="button" onClick={safeCancel} className={cx('min-h-11 min-w-11 inline-flex items-center justify-center p-2 rounded-full transition-colors motion-reduce:transition-none', styles.secondary, focusRing)} aria-label={say('common.close', 'Close')}><X size={20} aria-hidden="true" /></button>
             </div>
        </div>
        {renderRubric()}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
                <div id="mastery-locked-draft-heading" className={cx('text-xs font-bold uppercase tracking-wider flex items-center gap-2', styles.muted)}>
                    <History size={14} aria-hidden="true" /> {say('mastery.locked_draft', `Previous Draft ${safeDraftCount}`, { count: safeDraftCount })}
                </div>
                <div role="region" tabIndex={0} aria-labelledby="mastery-locked-draft-heading" className={cx('p-6 rounded-xl h-96 overflow-y-auto font-serif relative whitespace-pre-wrap', styles.panelSoft, focusRing)}>
                    <div className={cx('absolute top-4 right-4', styles.muted)} aria-hidden="true">
                        <Lock size={20} aria-hidden="true" />
                    </div>
                    {previousDraft}
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="mastery-new-draft-textarea" className={cx('text-xs font-bold uppercase tracking-wider flex items-center gap-2', styles.title)}>
                      <BookOpen size={14} aria-hidden="true" /> {newDraftLabel}
                  </label>
                  {trimmedDraft.length > 0 && typeof setDraftText === 'function' && (
                    <button
                      type="button"
                      data-draft-clear="true"
                      onClick={() => setDraftText('')}
                      className={cx('min-h-11 px-3 rounded-lg text-xs font-bold transition-colors motion-reduce:transition-none', styles.secondary, focusRing)}
                    >
                      {say('common.clear', 'Clear draft')}
                    </button>
                  )}
                </div>
                <div className="relative h-96">
                    <textarea
                        id="mastery-new-draft-textarea"
                        aria-label={newDraftLabel}
                        aria-describedby="mastery-revision-meta"
                        value={normalizedDraft}
                        onChange={(e) => setDraftText && setDraftText(e.target.value)}
                        className={cx('w-full h-full p-6 border-2 rounded-xl focus:ring-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 resize-none font-serif text-lg leading-relaxed shadow-sm', styles.input)}
                        placeholder={say('mastery.rewrite_placeholder', 'Write your revised response here...')}
                    />
                </div>
                <div id="mastery-revision-meta" data-draft-word-count="true" role="status" aria-live="polite" className={cx('text-xs font-semibold', styles.muted)}>
                  {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} {charCount === 1 ? 'character' : 'characters'}
                  {wordDelta !== null ? ` (${wordDelta >= 0 ? '+' : ''}${wordDelta} vs previous draft)` : ''}
                </div>
            </div>
        </div>
        <div className="sticky bottom-6 z-50 flex justify-center">
            <button type="button"
                onClick={handleScreenedSubmit}
                disabled={!trimmedDraft}
                className={cx('min-h-11 font-bold py-4 px-10 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all motion-reduce:transition-none flex items-center gap-3 active:scale-95 disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed', styles.primary, focusRing)}
            >
                {say('mastery.submit_revision', 'Submit Revision')} <ArrowRight size={20} aria-hidden="true" />
            </button>
        </div>
      </div>
    );
  }
  if (status === 'mastery') {
    const hasFiniteFinalScore = typeof finalScore === 'number' && Number.isFinite(finalScore);
    const hasFiniteRawScore = typeof gradingDetails?.rawScore === 'number' && Number.isFinite(gradingDetails.rawScore);
    const hasFiniteXp = typeof xpEarned === 'number' && Number.isFinite(xpEarned);
    return (
      <div className="max-w-4xl mx-auto p-8 text-center animate-in motion-reduce:animate-none zoom-in duration-500">
        <div className="mb-8 relative inline-block">
            <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-20 rounded-full animate-pulse motion-reduce:animate-none" aria-hidden="true"></div>
            <Trophy size={120} className="text-yellow-500 fill-yellow-200 relative z-10 drop-shadow-lg mx-auto" aria-hidden="true" />
            <div className={cx('absolute -top-4 -right-12 border-2 px-4 py-1 rounded-full font-black text-sm rotate-12 shadow-md', styles.stat)}>
                {say('mastery.mastery_achieved', 'Mastery Achieved')}
            </div>
        </div>
        <h2 className={cx('text-5xl font-black mb-4 tracking-tight', styles.title)}>{say('mastery.excellent_work', 'Excellent Work!')}</h2>
        <span className="sr-only" role="status" aria-live="polite">{t('mastery.excellent_work')}</span>
        <p className={cx('text-xl mb-8 max-w-2xl mx-auto', styles.text)}>
            {say('mastery.mastery_desc', 'You met the mastery standard for this assignment.')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
            {(hasFiniteFinalScore || hasFiniteRawScore) && <div className={cx('p-6 rounded-2xl', styles.stat)}>
                <div className={cx('font-bold uppercase text-xs mb-2', styles.muted)}>{say('mastery.final_score', 'Final Score')}</div>
                <div className={cx('text-5xl font-black', styles.title)}>{hasFiniteFinalScore ? finalScore : gradingDetails.rawScore}</div>
            </div>}
            <div className={cx('p-6 rounded-2xl', styles.stat)}>
                <div className={cx('font-bold uppercase text-xs mb-2', styles.muted)}>{say('mastery.drafts', 'Drafts')}</div>
                <div className={cx('text-5xl font-black', styles.title)}>{safeDraftCount}</div>
            </div>
            {hasFiniteXp && <div className={cx('p-6 rounded-2xl', styles.stat)}>
                <div className={cx('font-bold uppercase text-xs mb-2', styles.muted)}>{say('mastery.xp_earned', 'XP Earned')}</div>
                <div className={cx('text-5xl font-black', styles.title)}>+{xpEarned}</div>
            </div>}
        </div>
        {gradingDetails?.feedback?.strength && (
             <div className={cx('p-6 rounded-2xl shadow-sm text-left mb-8 max-w-3xl mx-auto', styles.panel)}>
                 <h3 className={cx('font-bold flex items-center gap-2 mb-2', styles.title)}>
                     <Star size={16} className="text-yellow-500 fill-current" aria-hidden="true"/> {say('mastery.teacher_feedback', 'Strengths')}
                 </h3>
                 <p className={cx('italic', styles.text)}>"{gradingDetails.feedback.strength}"</p>
             </div>
        )}
        <button type="button"
            onClick={safeCancel}
            className={cx('min-h-11 font-bold py-3 px-12 rounded-full shadow-lg transition-transform motion-reduce:transition-none motion-reduce:transform-none hover:scale-105 active:scale-95', styles.primary, focusRing)}
        >
            {say('mastery.continue', 'Continue')}
        </button>
      </div>
    );
  }
  return null;
});
