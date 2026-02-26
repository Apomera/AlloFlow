$path = 'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
$content = Get-Content -Path $path -Raw

# 1. Inject Helper
$s1 = 'const WordSoundsGenerator = ({ glossaryTerms, onStartGame, onClose, callGemini, callImagen, gradeLevel, t }) => {'
$r1 = 'const WordSoundsGenerator = ({ glossaryTerms, onStartGame, onClose, callGemini, callImagen, gradeLevel, t }) => {
        const ts = React.useCallback((key, params) => getWordSoundsString(t, key, params), [t]);'
$content = $content.Replace($s1, $r1)

# 2. Refactor calls
$content = $content.Replace("t('word_sounds.settings', 'Settings')", "ts('word_sounds.settings')")
$content = $content.Replace("t('word_sounds.count', 'Word Count')", "ts('word_sounds.count')")

# Critical one: Use single quotes for outer, double single quotes for inner to handle backticks/interpolation safely
$s2 = 't(''word_sounds.auto_select_hint'', `Auto-selects ${wordCount} words`)'
$r2 = 'ts(''word_sounds.auto_select_hint'', { count: wordCount })'
$content = $content.Replace($s2, $r2)

$content = $content.Replace("t('word_sounds.sources', 'Active Sources')", "ts('word_sounds.sources')")
$content = $content.Replace("t('word_sounds.source_glossary', 'Glossary')", "ts('word_sounds.source_glossary')")
$content = $content.Replace("t('word_sounds.source_family', 'Word Family')", "ts('word_sounds.source_family')")
$content = $content.Replace("t('word_sounds.select_family', 'Select family...')", "ts('word_sounds.select_family')")
$content = $content.Replace("t('word_sounds.source_custom', 'Custom Manual')", "ts('word_sounds.source_custom')")
$content = $content.Replace("t('word_sounds.type_words', 'Type words here...')", "ts('word_sounds.type_words')")
$content = $content.Replace("t('word_sounds.source_ai', 'AI Topic Gen')", "ts('word_sounds.source_ai')")

$content = $content.Replace("t('word_sounds.preview_title', 'Lesson Preview')", "ts('word_sounds.preview_title')")
$content = $content.Replace("t('word_sounds.of_total', 'of')", "ts('word_sounds.of_total')")
$content = $content.Replace("t('word_sounds.words_selected', 'words selected')", "ts('word_sounds.words_selected')")
$content = $content.Replace("t('word_sounds.deselect_all', 'Deselect All')", "ts('word_sounds.deselect_all')")
$content = $content.Replace("t('word_sounds.select_all', 'Select All')", "ts('word_sounds.select_all')")
$content = $content.Replace("t('word_sounds.start', 'Start Activity')", "ts('word_sounds.start')")
$content = $content.Replace("t('status.generating', 'Generating...')", "ts('status.generating')")
$content = $content.Replace("t('status.analyzing', 'Analyzing...')", "ts('status.analyzing')")

[System.IO.File]::WriteAllText($path, $content)
