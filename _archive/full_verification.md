=== BRACE ANALYSIS ===
Current file: 23699 open, 23707 close, diff=-8
Backup (AlloFlowANTI.txt.bak): 23429 open, 23437 close, diff=-8
Brace diff change: 0 (0 = no change)

=== TIER 2 BLOCK DETAIL ===
  L35192:   // === PHASE 1 TIER 2: Extracted useCallback Handlers ===
  L35193:   const handleToggleIsEditing = React.useCallback(() => setIsEditing(prev => !prev), []);
  L35194:   const handleToggleIsFullscreen = React.useCallback(() => setIsFullscreen(prev => !prev), []);
  L35195:   const handleToggleIsMapLocked = React.useCallback(() => setIsMapLocked(prev => !prev), []);
  L35196:   const handleToggleFocusMode = React.useCallback(() => setFocusMode(prev => !prev), []);
  L35197:   const handleTogglePersonaAutoSend = React.useCallback(() => setPersonaAutoSend(prev => !prev), []);
  L35198:   const handleToggleShowPersonaHints = React.useCallback(() => setShowPersonaHints(prev => !prev), []);
  L35199:   const handleToggleShowFlashcardImages = React.useCallback(() => setShowFlashcardImages(prev => !prev), []);
  L35200:   const handleSetIsMinimizedToFalse = React.useCallback(() => setIsMinimized(false), []);
  L35201:   const handleSetIsMinimizedToTrue = React.useCallback(() => setIsMinimized(true), []);
  L35202:   const handleSetStepTo4 = React.useCallback(() => setStep(4), []);
  L35203:   const handleSetStandardModeToAi = React.useCallback(() => setStandardMode('ai'), []);
  L35204:   const handleSetStandardModeToManual = React.useCallback(() => setStandardMode('manual'), []);
  L35205:   const handleSetShowSessionModalToFalse = React.useCallback(() => setShowSessionModal(false), []);
  L35206:   const handleSetShowGroupModalToFalse = React.useCallback(() => setShowGroupModal(false), []);
  L35207:   const handleSetShowLedgerToFalse = React.useCallback(() => setShowLedger(false), []);
  L35208:   const handleSetShowSaveModalToFalse = React.useCallback(() => setShowSaveModal(false), []);
  L35209:   const handleSetIsProjectSettingsOpenToFalse = React.useCallback(() => setIsProjectSettingsOpen(false), []);
  L35210:   const handleSetKeyboardSelectedItemIdToNull = React.useCallback(() => setKeyboardSelectedItemId(null), []);
  L35211:   const handleSetShowClearConfirmToFalse = React.useCallback(() => setShowClearConfirm(false), []);
  L35212:   const handleSetShowSubmitModalToTrue = React.useCallback(() => setShowSubmitModal(true), []);
  L35213:   const handleSetShowInfoModalToFalse = React.useCallback(() => setShowInfoModal(false), []);
  L35214:   const handleSetShowHintsModalToFalse = React.useCallback(() => setShowHintsModal(false), []);
  L35215:   const handleSetShowXPModalToFalse = React.useCallback(() => setShowXPModal(false), []);
  L35216:   const handleSetShowStorybookExportModalToFalse = React.useCallback(() => setShowStorybookExportModal(false), []);

  Tier 2 block braces: 0 open, 0 close, diff=0

=== SYNTAX PATTERN CHECK ===
Found 41 potential issues:
  PAREN MISMATCH L1402: 2 open, 1 close: const countSyllables = React.useCallback((word) => {
  PAREN MISMATCH L3310: 2 open, 1 close: const shouldAdvanceActivity = React.useCallback((activityId, lessonPlanConfig) => {
  PAREN MISMATCH L3325: 2 open, 1 close: const updateMasteryStats = React.useCallback((activityId, isCorrect, word) => {
  PAREN MISMATCH L3381: 2 open, 1 close: const showError = React.useCallback((message, duration = 3000) => {
  PAREN MISMATCH L3388: 2 open, 1 close: const handleAudio = React.useCallback(async (input, playImmediately = true) => {
  PAREN MISMATCH L3664: 2 open, 1 close: const playBlending = React.useCallback(async () => {
  PAREN MISMATCH L3695: 2 open, 0 close: const PhonologyView = React.useCallback(({
  PAREN MISMATCH L4523: 2 open, 1 close: const extractWords = React.useCallback((term) => {
  PAREN MISMATCH L4551: 2 open, 1 close: const estimatePhonemesBasic = React.useCallback((word) => {
  PAREN MISMATCH L4663: 2 open, 1 close: const getRandomWord = React.useCallback(() => {
  PAREN MISMATCH L4678: 2 open, 1 close: const categorizeWordDifficulty = React.useCallback((word) => {
  PAREN MISMATCH L4708: 2 open, 1 close: const getEffectiveDifficulty = React.useCallback(() => {
  PAREN MISMATCH L4733: 2 open, 1 close: const getDifficultyFilteredPool = React.useCallback(() => {
  PAREN MISMATCH L4761: 2 open, 1 close: const getAdaptiveRandomWord = React.useCallback((excludeWord = null) => {
  PAREN MISMATCH L4800: 2 open, 1 close: const generateSessionQueue = React.useCallback((activityId, difficulty) => {
  PAREN MISMATCH L4892: 2 open, 1 close: const generateSoundChips = React.useCallback((phonemes) => {
  PAREN MISMATCH L4941: 2 open, 1 close: const updatePhonemeMastery = React.useCallback((phonemes, isCorrect) => {
  PAREN MISMATCH L4961: 2 open, 1 close: const trackConfusion = React.useCallback((expected, actual) => {
  PAREN MISMATCH L4976: 2 open, 1 close: const updateDailyProgress = React.useCallback((isCorrect) => {
  PAREN MISMATCH L4994: 2 open, 1 close: const checkAndAwardBadges = React.useCallback((activity, isCorrect, currentStreak) => {

=== ONCLICK REPLACEMENT CHECK ===
All onClick={handleXxx} replacements look well-formed

=== SUMMARY ===
Total lines: 73712
Total bytes: 7,608,152
useCallback count: 83
useMemo count: 23
React.memo count: 17
Remaining inline onClick arrows: 599
onClick using handler refs: 223
inline style count: 143