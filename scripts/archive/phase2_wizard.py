"""Phase 2: Student Welcome Wizard Redesign
Converts StudentEntryModal into multi-step wizard with learning preferences collection.
Also updates handleStudentEntryConfirm and joinClassSession to sync preferences.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
changes = 0

# --- CHANGE 1: Replace StudentEntryModal with multi-step wizard ---
old_modal = """const StudentEntryModal = React.memo(({ isOpen, onClose, onConfirm }) => {
  const { t } = useContext(LanguageContext);
  const [selectedAdj, setSelectedAdj] = useState('');
  const [selectedAnimal, setSelectedAnimal] = useState('');
  const entryRef = useRef(null);
  useFocusTrap(entryRef, isOpen);
  const adjectives = t('codenames.adjectives') || [];
  const animals = t('codenames.animals') || [];
  const randomizeName = useCallback(() => {
    if (adjectives.length > 0 && animals.length > 0) {
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const animal = animals[Math.floor(Math.random() * animals.length)];
        setSelectedAdj(adj);
        setSelectedAnimal(animal);
    }
  }, [adjectives, animals]);
  useEffect(() => {
    if (isOpen && (!selectedAdj || !selectedAnimal)) {
      randomizeName();
    }
  }, [isOpen, randomizeName]);
  const getFullName = () => `${selectedAdj} ${selectedAnimal}`;
  const handleConfirm = (mode) => {
    if (selectedAdj && selectedAnimal) {
      onConfirm(getFullName(), mode);
    }
  };
  if (!isOpen) return null;
  return (
    <div 
        ref={entryRef}
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-indigo-100 transform transition-all animate-in zoom-in-95 duration-300 relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            aria-label={t('common.close')}
        >
            <X size={20} />
        </button>
        <h2 className="text-2xl font-black text-slate-800 mb-2">{t('modals.student_entry')}</h2>
        <p className="text-slate-500 mb-6 font-medium">{t('modals.student_entry_sub')}</p>
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6">
            <div className="flex gap-2 mb-4">
                <select 
                    value={selectedAdj}
                    onChange={(e) => setSelectedAdj(e.target.value)}
                    className="w-1/2 p-2 rounded-lg border border-indigo-200 text-indigo-900 font-bold text-sm focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer"
                    aria-label={t('modals.entry.select_adjective')}
                    data-help-key="entry_adjective"
                >
                    {adjectives.map((adj, i) => (
                        <option key={i} value={adj}>{adj}</option>
                    ))}
                </select>
                <select 
                    value={selectedAnimal}
                    onChange={(e) => setSelectedAnimal(e.target.value)}
                    className="w-1/2 p-2 rounded-lg border border-indigo-200 text-indigo-900 font-bold text-sm focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer"
                    aria-label={t('modals.entry.select_animal')}
                    data-help-key="entry_animal"
                >
                    {animals.map((anim, i) => (
                        <option key={i} value={anim}>{anim}</option>
                    ))}
                </select>
            </div>
            <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-indigo-100">
                <div className="text-xl font-black text-indigo-600 tracking-tight truncate mr-2">
                    {selectedAdj} {selectedAnimal}
                </div>
                <button 
                    onClick={randomizeName}
                    className="p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 hover:scale-110 transition-all shrink-0"
                    title={t('modals.entry.randomize_codename')}
                    aria-label={t('modals.entry.randomize_codename')}
                    data-help-key="entry_randomize_btn"
                >
                    <RefreshCw size={18} />
                </button>
            </div>
        </div>
        <p className="text-xs text-slate-500 font-bold flex items-center justify-center gap-1 mb-6">
            <ShieldCheck size={12} className="text-green-500"/> {t('entry.warning')}
        </p>
        <div className="flex flex-col gap-3">
            <button 
                aria-label="Generate"
                onClick={() => handleConfirm('new')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                data-help-key="entry_start_new"
            >
                <Sparkles size={18} className="text-yellow-400 fill-current" /> {t('entry.start')}
            </button>
            <button 
                aria-label="Upload"
                onClick={() => handleConfirm('load')}
                className="w-full bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 font-bold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                data-help-key="entry_load_exist"
            >
                <Upload size={18} /> {t('entry.load')}
            </button>
        </div>
        <button onClick={onClose} className="mt-6 text-sm text-slate-500 hover:text-slate-600 underline focus:outline-none focus:ring-2 focus:ring-slate-400 rounded">{t('common.cancel')}</button>
      </div>
    </div>
  );
});"""

new_modal = """const StudentEntryModal = React.memo(({ isOpen, onClose, onConfirm }) => {
  const { t } = useContext(LanguageContext);
  const [wizardStep, setWizardStep] = useState(0); // 0=codename, 1=preferences, 2=confirm
  const [selectedAdj, setSelectedAdj] = useState('');
  const [selectedAnimal, setSelectedAnimal] = useState('');
  // Learning preference state
  const [prefLanguage, setPrefLanguage] = useState('');
  const [prefReadingSpeed, setPrefReadingSpeed] = useState('regular');
  const [prefTtsSupport, setPrefTtsSupport] = useState('both');
  const [prefVisualSupport, setPrefVisualSupport] = useState('normal');
  const entryRef = useRef(null);
  useFocusTrap(entryRef, isOpen);
  const adjectives = t('codenames.adjectives') || [];
  const animals = t('codenames.animals') || [];
  const randomizeName = useCallback(() => {
    if (adjectives.length > 0 && animals.length > 0) {
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const animal = animals[Math.floor(Math.random() * animals.length)];
        setSelectedAdj(adj);
        setSelectedAnimal(animal);
    }
  }, [adjectives, animals]);
  useEffect(() => {
    if (isOpen && (!selectedAdj || !selectedAnimal)) {
      randomizeName();
      setWizardStep(0);
    }
  }, [isOpen, randomizeName]);
  const getFullName = () => `${selectedAdj} ${selectedAnimal}`;
  const getPreferences = () => ({
      homeLanguage: prefLanguage || null,
      readingSpeed: prefReadingSpeed,
      ttsPreference: prefTtsSupport,
      visualSupport: prefVisualSupport,
  });
  const handleConfirm = (mode) => {
    if (selectedAdj && selectedAnimal) {
      onConfirm(getFullName(), mode, getPreferences());
    }
  };
  if (!isOpen) return null;
  const LANGUAGES = ['English', 'Spanish', 'Somali', 'Arabic', 'Vietnamese', 'Portuguese', 'Mandarin', 'French', 'Korean', 'Tagalog', 'Russian', 'Japanese'];
  const LANG_FLAGS = { English: '🇺🇸', Spanish: '🇪🇸', Somali: '🇸🇴', Arabic: '🇸🇦', Vietnamese: '🇻🇳', Portuguese: '🇧🇷', Mandarin: '🇨🇳', French: '🇫🇷', Korean: '🇰🇷', Tagalog: '🇵🇭', Russian: '🇷🇺', Japanese: '🇯🇵' };
  const stepTitles = [
    t('wizard.step_codename') || 'Pick Your Codename!',
    t('wizard.step_preferences') || 'How Do You Learn Best?',
  ];
  const stepIndicator = (
    <div className="flex items-center justify-center gap-2 mb-4">
        {[0, 1].map(i => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${wizardStep === i ? 'bg-indigo-500 scale-125' : wizardStep > i ? 'bg-green-400' : 'bg-slate-200'}`} />
        ))}
    </div>
  );
  return (
    <div 
        ref={entryRef}
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-indigo-100 transform transition-all animate-in zoom-in-95 duration-300 relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            aria-label={t('common.close')}
        >
            <X size={20} />
        </button>
        {stepIndicator}
        {/* STEP 0: Codename */}
        {wizardStep === 0 && (<>
        <h2 className="text-2xl font-black text-slate-800 mb-2">{stepTitles[0]}</h2>
        <p className="text-slate-500 mb-6 font-medium">{t('modals.student_entry_sub')}</p>
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6">
            <div className="flex gap-2 mb-4">
                <select 
                    value={selectedAdj}
                    onChange={(e) => setSelectedAdj(e.target.value)}
                    className="w-1/2 p-2 rounded-lg border border-indigo-200 text-indigo-900 font-bold text-sm focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer"
                    aria-label={t('modals.entry.select_adjective')}
                    data-help-key="entry_adjective"
                >
                    {adjectives.map((adj, i) => (
                        <option key={i} value={adj}>{adj}</option>
                    ))}
                </select>
                <select 
                    value={selectedAnimal}
                    onChange={(e) => setSelectedAnimal(e.target.value)}
                    className="w-1/2 p-2 rounded-lg border border-indigo-200 text-indigo-900 font-bold text-sm focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer"
                    aria-label={t('modals.entry.select_animal')}
                    data-help-key="entry_animal"
                >
                    {animals.map((anim, i) => (
                        <option key={i} value={anim}>{anim}</option>
                    ))}
                </select>
            </div>
            <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-indigo-100">
                <div className="text-xl font-black text-indigo-600 tracking-tight truncate mr-2">
                    {selectedAdj} {selectedAnimal}
                </div>
                <button 
                    onClick={randomizeName}
                    className="p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 hover:scale-110 transition-all shrink-0"
                    title={t('modals.entry.randomize_codename')}
                    aria-label={t('modals.entry.randomize_codename')}
                    data-help-key="entry_randomize_btn"
                >
                    <RefreshCw size={18} />
                </button>
            </div>
        </div>
        <p className="text-xs text-slate-500 font-bold flex items-center justify-center gap-1 mb-6">
            <ShieldCheck size={12} className="text-green-500"/> {t('entry.warning')}
        </p>
        <div className="flex flex-col gap-3">
            <button 
                onClick={() => setWizardStep(1)}
                disabled={!selectedAdj || !selectedAnimal}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                data-help-key="entry_next_step"
            >
                {t('wizard.next') || 'Next'} →
            </button>
        </div>
        </>)}
        {/* STEP 1: Learning Preferences */}
        {wizardStep === 1 && (<>
        <h2 className="text-2xl font-black text-slate-800 mb-2">{stepTitles[1]}</h2>
        <p className="text-slate-500 mb-4 font-medium text-sm">{t('wizard.preferences_sub') || 'These help your teacher personalize your experience. All optional!'}</p>
        <div className="space-y-4 text-left mb-6">
            {/* Language */}
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{t('wizard.home_language') || '🌍 What language do you speak at home?'}</label>
                <div className="grid grid-cols-4 gap-1.5">
                    {LANGUAGES.map(lang => (
                        <button key={lang} onClick={() => setPrefLanguage(lang === prefLanguage ? '' : lang)}
                            className={`text-xs p-1.5 rounded-lg border transition-all font-medium ${prefLanguage === lang ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                        >
                            {LANG_FLAGS[lang] || ''} {lang}
                        </button>
                    ))}
                </div>
            </div>
            {/* Reading Comfort */}
            <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{t('wizard.reading_comfort') || '📖 How do you like to read?'}</label>
                <div className="grid grid-cols-3 gap-2">
                    {[{v: 'slow', label: '🐢 Slow & steady', desc: 'Take my time'}, {v: 'regular', label: '🚶 Regular', desc: 'Just right'}, {v: 'fast', label: '🏃 Fast reader', desc: 'Speed ahead'}].map(opt => (
                        <button key={opt.v} onClick={() => setPrefReadingSpeed(opt.v)}
                            className={`p-2 rounded-lg border transition-all text-center ${prefReadingSpeed === opt.v ? 'bg-green-500 text-white border-green-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-green-300'}`}
                        >
                            <div className="text-sm font-bold">{opt.label}</div>
                            <div className="text-[10px] mt-0.5 opacity-75">{opt.desc}</div>
                        </button>
                    ))}
                </div>
            </div>
            {/* TTS Preference */}
            <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{t('wizard.tts_preference') || '🔊 How do you like to hear text?'}</label>
                <div className="grid grid-cols-3 gap-2">
                    {[{v: 'read-to-me', label: '🔊 Read to me', desc: 'Listen along'}, {v: 'self-read', label: '📖 I\\'ll read', desc: 'On my own'}, {v: 'both', label: '🔊📖 Both', desc: 'Listen + read'}].map(opt => (
                        <button key={opt.v} onClick={() => setPrefTtsSupport(opt.v)}
                            className={`p-2 rounded-lg border transition-all text-center ${prefTtsSupport === opt.v ? 'bg-purple-500 text-white border-purple-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}
                        >
                            <div className="text-sm font-bold">{opt.label}</div>
                            <div className="text-[10px] mt-0.5 opacity-75">{opt.desc}</div>
                        </button>
                    ))}
                </div>
            </div>
            {/* Visual Support */}
            <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{t('wizard.visual_support') || '🖼️ Do pictures help you learn?'}</label>
                <div className="grid grid-cols-3 gap-2">
                    {[{v: 'high', label: '🖼️ Lots!', desc: 'More pictures'}, {v: 'normal', label: '📝 Some', desc: 'A good mix'}, {v: 'minimal', label: '📄 Just text', desc: 'Words are fine'}].map(opt => (
                        <button key={opt.v} onClick={() => setPrefVisualSupport(opt.v)}
                            className={`p-2 rounded-lg border transition-all text-center ${prefVisualSupport === opt.v ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'}`}
                        >
                            <div className="text-sm font-bold">{opt.label}</div>
                            <div className="text-[10px] mt-0.5 opacity-75">{opt.desc}</div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => setWizardStep(0)}
                className="flex-1 bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-300 font-bold py-3 rounded-xl transition-all active:scale-95"
            >
                ← {t('wizard.back') || 'Back'}
            </button>
            <button 
                aria-label="Generate"
                onClick={() => handleConfirm('new')}
                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                data-help-key="entry_start_new"
            >
                <Sparkles size={18} className="text-yellow-400 fill-current" /> {t('entry.start')}
            </button>
        </div>
        <button 
            aria-label="Upload"
            onClick={() => handleConfirm('load')}
            className="w-full mt-2 bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 font-bold py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
            data-help-key="entry_load_exist"
        >
            <Upload size={16} /> {t('entry.load')}
        </button>
        </>)}
        <button onClick={onClose} className="mt-4 text-sm text-slate-500 hover:text-slate-600 underline focus:outline-none focus:ring-2 focus:ring-slate-400 rounded">{t('common.cancel')}</button>
      </div>
    </div>
  );
});"""

count = content.count(old_modal)
if count != 1:
    print(f"ERROR: StudentEntryModal match count: {count}")
    if count == 0:
        # Try finding a smaller unique fragment to verify the issue
        test1 = "const StudentEntryModal = React.memo(({ isOpen, onClose, onConfirm }) => {"
        test2 = '<ShieldCheck size={12} className="text-green-500"/> {t(\'entry.warning\')}'
        print(f"  Signature found: {content.count(test1)}")
        print(f"  ShieldCheck found: {content.count(test2)}")
    sys.exit(1)

content = content.replace(old_modal, new_modal)
changes += 1
print(f"[OK] Replaced StudentEntryModal with multi-step wizard")

# --- CHANGE 2: Update handleStudentEntryConfirm to accept preferences ---
old_confirm = """  const handleStudentEntryConfirm = (name, mode) => {
      setStudentNickname(name);
      setStudentProjectSettings(prev => ({
          ...prev,
          nickname: name
      }));
      setShowStudentEntry(false);
      addToast(`Welcome, ${name}!`, "success");
      if (mode === 'load') {
          setTimeout(() => {
              if (projectFileInputRef.current) {
                  projectFileInputRef.current.click();
              }
          }, 100);
      } 
  };"""

new_confirm = """  const handleStudentEntryConfirm = (name, mode, preferences = null) => {
      setStudentNickname(name);
      setStudentProjectSettings(prev => ({
          ...prev,
          nickname: name,
          preferences: preferences || prev.preferences || null
      }));
      if (preferences) setStudentPreferences(preferences);
      setShowStudentEntry(false);
      addToast(`Welcome, ${name}!`, "success");
      if (mode === 'load') {
          setTimeout(() => {
              if (projectFileInputRef.current) {
                  projectFileInputRef.current.click();
              }
          }, 100);
      } 
  };"""

count = content.count(old_confirm)
if count != 1:
    print(f"ERROR: handleStudentEntryConfirm match count: {count}")
    sys.exit(1)
content = content.replace(old_confirm, new_confirm)
changes += 1
print(f"[OK] Updated handleStudentEntryConfirm to accept preferences")

# --- CHANGE 3: Add studentPreferences state variable near showStudentEntry ---
old_state = "  const [showStudentEntry, setShowStudentEntry] = useState(false);"
new_state = """  const [showStudentEntry, setShowStudentEntry] = useState(false);
  const [studentPreferences, setStudentPreferences] = useState(null); // {homeLanguage, readingSpeed, ttsPreference, visualSupport}"""

count = content.count(old_state)
if count != 1:
    print(f"ERROR: showStudentEntry state match count: {count}")
    sys.exit(1)
content = content.replace(old_state, new_state)
changes += 1
print(f"[OK] Added studentPreferences state variable")

# --- CHANGE 4: Expand roster entry in joinClassSession to include preferences ---
old_roster = """          const userEntry = {
              uid: user?.uid || 'anon-' + Date.now(),
              name: studentNickname || "Student",
              joinedAt: new Date().toISOString(),
              status: 'active',
          };"""

new_roster = """          const userEntry = {
              uid: user?.uid || 'anon-' + Date.now(),
              name: studentNickname || "Student",
              joinedAt: new Date().toISOString(),
              status: 'active',
              ...(studentPreferences ? { preferences: studentPreferences } : {}),
          };"""

count = content.count(old_roster)
if count != 1:
    print(f"ERROR: Roster entry match count: {count}")
    sys.exit(1)
content = content.replace(old_roster, new_roster)
changes += 1
print(f"[OK] Expanded roster entry with preferences")

# Write
open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nAll {changes} Phase 2 changes applied successfully.")
