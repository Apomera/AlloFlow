"""
Comprehensive scan of word_sounds_module.js for all references to functions/variables
that are NOT defined within the module itself. These need polyfill stubs.
"""
import re

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Find all function calls that look like standalone functions (not methods)
# Pattern: bare function name followed by ( but not preceded by . or preceded by typeof
func_calls = set(re.findall(r'(?<![.\w])([a-zA-Z_]\w*)\s*\(', content))

# Find all variable references used directly (not as properties)
# Focus on those that might be undefined
var_refs = set(re.findall(r'(?<![.\w"\'])([a-zA-Z_]\w*)\s*(?:[;&|,)\]}]|$)', content))

# Find all defined names within the module
defined_consts = set(re.findall(r'\bconst\s+([a-zA-Z_]\w*)', content))
defined_lets = set(re.findall(r'\blet\s+([a-zA-Z_]\w*)', content))
defined_vars = set(re.findall(r'\bvar\s+([a-zA-Z_]\w*)', content))
defined_funcs = set(re.findall(r'\bfunction\s+([a-zA-Z_]\w*)', content))
defined_params = set(re.findall(r'(?:=>|function)\s*\(([^)]*)\)', content))

all_defined = defined_consts | defined_lets | defined_vars | defined_funcs

# Known globals that are always available
known_globals = {
    'React', 'ReactDOM', 'window', 'document', 'console', 'setTimeout', 'clearTimeout',
    'setInterval', 'clearInterval', 'Promise', 'Array', 'Object', 'String', 'Number',
    'Math', 'JSON', 'Date', 'Set', 'Map', 'Error', 'TypeError', 'ReferenceError',
    'parseInt', 'parseFloat', 'isNaN', 'undefined', 'null', 'true', 'false', 'NaN',
    'Infinity', 'encodeURIComponent', 'decodeURIComponent', 'atob', 'btoa',
    'fetch', 'Audio', 'Image', 'URL', 'Blob', 'FileReader', 'FormData',
    'localStorage', 'sessionStorage', 'navigator', 'location', 'history',
    'alert', 'confirm', 'prompt', 'performance', 'requestAnimationFrame',
    'cancelAnimationFrame', 'Symbol', 'Proxy', 'Reflect', 'WeakMap', 'WeakSet',
    'AbortController', 'TextEncoder', 'TextDecoder', 'crypto', 'self',
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
    'return', 'throw', 'try', 'catch', 'finally', 'new', 'delete', 'typeof',
    'instanceof', 'in', 'of', 'void', 'this', 'class', 'extends', 'super',
    'import', 'export', 'default', 'from', 'as', 'async', 'await', 'yield',
    'const', 'let', 'var', 'function', 'arguments',
    'HTMLElement', 'SVGElement', 'Event', 'CustomEvent',
    'SpeechRecognition', 'webkitSpeechRecognition',
    # Common React/Lucide components expected from outer scope
    'Volume2', 'PlayCircle', 'Check', 'Star', 'X', 'RefreshCw', 'ArrowLeft',
    'ArrowRight', 'Eye', 'EyeOff', 'Maximize2', 'Minimize2', 'ChevronDown',
    'ChevronUp', 'ChevronLeft', 'ChevronRight', 'Sparkles', 'AlertCircle',
    'GripVertical', 'RotateCcw', 'Edit2', 'Edit3', 'Trash2', 'Plus', 'Minus',
    'Play', 'Pause', 'SkipForward', 'SkipBack', 'Settings', 'Info', 'Lock',
    'Unlock', 'Save', 'Download', 'Upload', 'Share2', 'Copy', 'Clipboard',
    'Search', 'Filter', 'SortAsc', 'SortDesc', 'BarChart2', 'PieChart',
    'Mic', 'MicOff', 'Send', 'MessageCircle', 'HelpCircle', 'Award',
    'Zap', 'Target', 'Clock', 'Calendar', 'BookOpen', 'FileText',
    'Shuffle', 'Repeat', 'Hash', 'Layers', 'Grid', 'List',
}

# Check function calls that are NOT defined in the module and NOT known globals
print("=== POTENTIALLY UNDEFINED FUNCTION CALLS ===")
suspicious_funcs = []
for func in sorted(func_calls):
    if func not in all_defined and func not in known_globals:
        # Check if it's used with typeof guard
        has_guard = f"typeof {func}" in content
        # Count occurrences
        count = content.count(f"{func}(")
        if count > 0 and not func.startswith('_') and len(func) > 2:
            guard_status = " (guarded with typeof)" if has_guard else " ⚠️ UNGUARDED"
            suspicious_funcs.append((func, count, guard_status))
            print(f"  {func}() - {count} calls{guard_status}")

# Also specifically check for known problematic patterns
print("\n=== SPECIFIC CHECKS ===")
for name in ['loadWordAudioBank', 'loadAudioFromStorage', 'saveAudioToStorage', 
             'loadPsychometricProbes', 'WordSoundsReviewPanel', 'warnLog', 'debugLog',
             'PHONEME_AUDIO_BANK', 'INSTRUCTION_AUDIO', 'ISOLATION_AUDIO', 
             'LETTER_NAME_AUDIO', '_CACHE_WORD_AUDIO_BANK', 'showWordText', 
             'setShowWordText', 'isGlobalMuted', 'ts']:
    if name in content:
        defined = name in all_defined
        guarded = f"typeof {name}" in content
        count = len(re.findall(r'\b' + re.escape(name) + r'\b', content))
        status = "DEFINED" if defined else ("GUARDED" if guarded else "⚠️ MISSING")
        print(f"  {name}: {status} ({count} refs)")
