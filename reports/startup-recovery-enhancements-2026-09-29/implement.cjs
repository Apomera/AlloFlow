const fs=require('fs'),path=require('path'),assert=require('assert');
const out='reports/startup-recovery-enhancements-2026-09-29';
function replaceOnce(s,a,b){assert.equal(s.split(a).length,2,'Missing or ambiguous target: '+a.slice(0,70));return s.replace(a,b);}
let host=fs.readFileSync('AlloFlowANTI.txt','utf8');
const saveOld=`  const executeSaveFile = (interactionOptions) => {
    const _m = window.AlloModules && window.AlloModules.PhaseKHelpers;
    if (_m && typeof _m.executeSaveFile === "function") return _m.executeSaveFile(_alloPhaseKHelpersDeps(), interactionOptions || {});
    throw new Error("[executeSaveFile] PhaseKHelpers module not loaded - reload the page");
  };`;
const saveNew=`  const projectSaveRequestRef = useRef(0);
  const projectSaveBusyRef = useRef(false);
  const projectSaveContextRef = useRef(null);
  const [isProjectSaving, setIsProjectSaving] = useState(false);
  const projectSaveContext = [showSaveModal, saveType, saveFileName, saveEncryptPassword, inputText, history, generatedContent, studentNickname, studentProjectSettings, isTeacherMode, isIndependentMode, activeSessionCode, activeSessionAppId];
  if (!projectSaveContextRef.current || !projectSaveContextRef.current.values.every((value, index) => value === projectSaveContext[index])) {
    projectSaveContextRef.current = { values: projectSaveContext };
  }
  projectSaveContextRef.current.getDeps = _alloPhaseKHelpersDeps;
  useEffect(() => () => { ++projectSaveRequestRef.current; projectSaveContextRef.current = null; }, []);
  const executeSaveFile = async (interactionOptions) => {
    if (projectSaveBusyRef.current) return { ok: false, reason: 'save-in-progress', narration: 'A project save is already in progress.' };
    const context = projectSaveContextRef.current;
    const request = ++projectSaveRequestRef.current;
    const isCurrent = () => request === projectSaveRequestRef.current && context === projectSaveContextRef.current && context.values[0];
    const cancelled = { ok: false, cancelled: true, reason: 'save-context-changed', narration: 'Save cancelled because the dialog or project changed. Save again to download the current project.' };
    if (!isCurrent()) return cancelled;
    projectSaveBusyRef.current = true;
    setIsProjectSaving(true);
    try {
      const modules = [['PhaseKHelpersModule', 'PhaseKHelpers']];
      if (context.values[3]) modules.push(['AlloCrypto', 'AlloCrypto']);
      await _alloAwaitModules(modules, 'project save');
      if (!isCurrent()) return cancelled;
      const api = window.AlloModules && window.AlloModules.PhaseKHelpers;
      if (typeof api?.executeSaveFile !== 'function') throw new Error('Project save is unavailable');
      return await api.executeSaveFile({ ...context.getDeps(), isSaveRequestCurrent: isCurrent }, interactionOptions || {});
    } catch (error) {
      warnLog('Project save failed:', error);
      return { ok: false, reason: 'save-failed', narration: 'The project file was not saved. Check the connection, then try again.' };
    } finally {
      projectSaveBusyRef.current = false;
      if (request === projectSaveRequestRef.current) setIsProjectSaving(false);
    }
  };`;
host=replaceOnce(host,saveOld,saveNew);
host=replaceOnce(host,'    saving: studentSaveVoiceInProgressRef.current,','    saving: studentSaveVoiceInProgressRef.current || isProjectSaving,');
host=replaceOnce(host,"                        onKeyDown={(e) => e.key === 'Enter' && executeSaveFile()}","                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); executeSaveFile(); } }}");
host=replaceOnce(host,'                        disabled={!saveFileName.trim()}','                        disabled={!saveFileName.trim() || isProjectSaving}\n                        aria-busy={isProjectSaving}');
host=replaceOnce(host,'                        <Save size={18} /> {t(\'modals.save_project.save_btn\')}',"                        {isProjectSaving ? <Loader2 size={18} className=\"animate-spin\" aria-hidden=\"true\" /> : <Save size={18} />} {isProjectSaving ? t('common.saving') : t('modals.save_project.save_btn')}");
const diceOld=`  const handleDiceRollComplete = () => {
    const _m = window.AlloModules && window.AlloModules.AdventureSessionHandlers;
    if (_m && typeof _m.handleDiceRollComplete === "function") return _m.handleDiceRollComplete(_alloAdventureSessionHandlersDeps());
    throw new Error("[handleDiceRollComplete] AdventureSessionHandlers module not loaded - reload the page");
  };`;
const diceNew=`  const diceCompleteRequestRef = useRef(0);
  const diceCompleteContextRef = useRef(null);
  const diceCompleteContext = [pendingAdventureUpdate, adventureState.currentScene, adventureState.turnCount, activeView, showDice, activeSessionCode, activeSessionAppId, isTeacherMode, adventureChanceMode, adventureDifficulty, adventureInputMode, adventureFreeResponseEnabled];
  if (!diceCompleteContextRef.current || !diceCompleteContextRef.current.values.every((value, index) => value === diceCompleteContext[index])) {
    diceCompleteContextRef.current = { values: diceCompleteContext };
  }
  diceCompleteContextRef.current.getDeps = _alloAdventureSessionHandlersDeps;
  useEffect(() => () => { ++diceCompleteRequestRef.current; diceCompleteContextRef.current = null; }, []);
  const handleDiceRollComplete = async () => {
    const request = ++diceCompleteRequestRef.current;
    const context = diceCompleteContextRef.current;
    try {
      await _alloAwaitModules([['AdventureSessionHandlersModule', 'AdventureSessionHandlers']], 'adventure turn');
      if (request !== diceCompleteRequestRef.current || context !== diceCompleteContextRef.current) return false;
      const api = window.AlloModules && window.AlloModules.AdventureSessionHandlers;
      if (typeof api?.handleDiceRollComplete !== 'function') throw new Error('Adventure turn is unavailable');
      return api.handleDiceRollComplete(context.getDeps());
    } catch (error) { warnLog('Adventure turn could not finish:', error); return false; }
  };`;
host=replaceOnce(host,diceOld,diceNew);
const startOld=`  const handleStartAdventure = () => {
    const _m = window.AlloModules && window.AlloModules.AdventureHandlers;
    if (_m && typeof _m.handleStartAdventure === "function") return _m.handleStartAdventure(_alloAdventureHandlersDeps());
    throw new Error("[handleStartAdventure] AdventureHandlers module not loaded - reload the page");
  };`;
const startNew=`  const adventureStartRequestRef = useRef(0);
  const adventureStartBusyRef = useRef(false);
  const adventureStartContextRef = useRef(null);
  const adventureStartContext = [activeView, inputText, history, generatedContent, adventureState, showNewGameSetup, isProcessing, isTeacherMode, isIndependentMode, activeSessionCode, activeSessionAppId];
  if (!adventureStartContextRef.current || !adventureStartContextRef.current.values.every((value, index) => value === adventureStartContext[index])) {
    adventureStartContextRef.current = { values: adventureStartContext };
  }
  adventureStartContextRef.current.getDeps = _alloAdventureHandlersDeps;
  useEffect(() => () => { ++adventureStartRequestRef.current; adventureStartContextRef.current = null; }, []);
  const handleStartAdventure = async () => {
    if (adventureStartBusyRef.current) return false;
    const request = ++adventureStartRequestRef.current;
    const context = adventureStartContextRef.current;
    adventureStartBusyRef.current = true;
    try {
      await _alloAwaitModules([['AdventureHandlersModule', 'AdventureHandlers']], 'adventure setup');
      if (request !== adventureStartRequestRef.current || context !== adventureStartContextRef.current) return false;
      const api = window.AlloModules && window.AlloModules.AdventureHandlers;
      if (typeof api?.handleStartAdventure !== 'function') throw new Error('Adventure setup is unavailable');
      return await api.handleStartAdventure(context.getDeps());
    } catch (error) { warnLog('Adventure setup could not open:', error); return false; }
    finally { adventureStartBusyRef.current = false; }
  };`;
host=replaceOnce(host,startOld,startNew);
for(const p of ['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx']){assert(fs.readFileSync(p).equals(fs.readFileSync(path.join(out,'before',p))),'Host changed since capture: '+p);fs.writeFileSync(p,host);}
let source=fs.readFileSync('phase_k_helpers_source.jsx','utf8');
source=replaceOnce(source,'      if (!saveFileName.trim()) return { ok: false, reason: \'filename-required\', narration: \'A filename is required before saving.\' };',`      const saveStillCurrent = () => typeof deps.isSaveRequestCurrent !== 'function' || deps.isSaveRequestCurrent();
      const cancelledSave = { ok: false, cancelled: true, reason: 'save-context-changed', narration: 'Save cancelled because the dialog or project changed. Save again to download the current project.' };
      if (!saveStillCurrent()) return cancelledSave;
      if (!saveFileName.trim()) return { ok: false, reason: 'filename-required', narration: 'A filename is required before saving.' };`);
source=replaceOnce(source,'        setStudentProgressLog(currentLog);\n      }\n      const filename','      }\n      const filename');
source=replaceOnce(source,'      let dataStr = "";','      if (!saveStillCurrent()) return cancelledSave;\n      let dataStr = "";');
source=replaceOnce(source,'      // Optional educator encryption (AES-256-GCM, key derived from the password via','      if (!saveStillCurrent()) return cancelledSave;\n      // Optional educator encryption (AES-256-GCM, key derived from the password via');
source=replaceOnce(source,'      if (deps.saveEncryptPassword && window.AlloModules && window.AlloModules.AlloCrypto) {\n          try {\n              const _env = await window.AlloModules.AlloCrypto.encryptJSON(JSON.parse(dataStr), deps.saveEncryptPassword);',`      if (deps.saveEncryptPassword) {
          try {
              const cryptoApi = window.AlloModules && window.AlloModules.AlloCrypto;
              if (typeof cryptoApi?.encryptJSON !== 'function') throw new Error('Encryption is unavailable');
              const _env = await cryptoApi.encryptJSON(JSON.parse(dataStr), deps.saveEncryptPassword);`);
source=replaceOnce(source,'      const blob = new Blob([dataStr], { type: \'application/json\' });','      if (!saveStillCurrent()) return cancelledSave;\n      const blob = new Blob([dataStr], { type: \'application/json\' });');
source=replaceOnce(source,'      setLastJsonFileSave(Date.now());',"      if (saveType === 'student') setStudentProgressLog(currentLog);\n      setLastJsonFileSave(Date.now());");
assert(fs.readFileSync('phase_k_helpers_source.jsx').equals(fs.readFileSync(path.join(out,'before','phase_k_helpers_source.jsx'))),'Helpers changed since capture');
fs.writeFileSync('phase_k_helpers_source.jsx',source);
console.log('Patched save/start/turn boundaries and requested encryption.');
