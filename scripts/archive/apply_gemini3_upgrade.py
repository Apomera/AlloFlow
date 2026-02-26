"""
Phase 0: Gemini 3 Flash Model Upgrade
"""

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the GEMINI_MODELS block
start_idx = None
for i, line in enumerate(lines):
    if 'Centralized Gemini model identifiers' in line:
        start_idx = i
        break

if start_idx is None:
    print("ERROR: Could not find 'Centralized Gemini model identifiers'")
    exit(1)

# Verify the block looks right
print(f"Found at line {start_idx + 1}:")
for j in range(start_idx, min(start_idx + 7, len(lines))):
    print(f"  {j+1}: {lines[j].rstrip()}")

# Find the closing }; of GEMINI_MODELS
end_idx = None
for i in range(start_idx + 1, start_idx + 10):
    if lines[i].strip() == '};':
        end_idx = i
        break

if end_idx is None:
    print("ERROR: Could not find closing }; of GEMINI_MODELS")
    exit(1)

# Build replacement block
replacement = [
    "// Module-scope Canvas detection for model selection (mirrors isCanvas useMemo)\n",
    "const _isCanvasEnv = (() => {\n",
    "  if (typeof window === 'undefined') return false;\n",
    "  const host = window.location.hostname;\n",
    "  const href = window.location.href;\n",
    "  if (href.startsWith('blob:')) return true;\n",
    "  return host.includes('googleusercontent') ||\n",
    "         host.includes('scf.usercontent') ||\n",
    "         host.includes('code-server') ||\n",
    "         host.includes('idx.google') ||\n",
    "         host.includes('run.app');\n",
    "})();\n",
    "\n",
    "// Centralized Gemini model identifiers — single source of truth\n",
    "// Firebase (non-Canvas) uses Gemini 3 Flash for better reasoning quality\n",
    "const GEMINI_MODELS = {\n",
    "  default: _isCanvasEnv ? 'gemini-2.5-flash-preview-09-2025' : 'gemini-3-flash',\n",
    "  image: 'gemini-2.5-flash-image-preview',\n",
    "  flash: _isCanvasEnv ? 'gemini-2.5-flash-preview' : 'gemini-3-flash',\n",
    "  tts: 'gemini-2.5-flash-preview-tts',\n",
    "};\n",
]

# Replace lines
lines[start_idx:end_idx + 1] = replacement

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("\nSUCCESS: Gemini 3 Flash upgrade applied")
print("  - Added _isCanvasEnv module-scope detection")
print("  - default: Canvas=gemini-2.5-flash-preview-09-2025, Firebase=gemini-3-flash")
print("  - flash:   Canvas=gemini-2.5-flash-preview, Firebase=gemini-3-flash")  
print("  - image/tts: unchanged")
