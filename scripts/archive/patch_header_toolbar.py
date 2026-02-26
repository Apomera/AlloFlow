"""
Patch script: Header Rendering Fix + Analysis Editing Toolbar

Changes:
1. Fix header normalization in renderFormattedText() - ensures ## headers are properly separated
2. Generalize handleFormatText() to accept optional ref/text/callback params  
3. Add analysisEditorRef
4. Add formatting toolbar to analysis edit mode
"""

import re
import sys

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

original = content
changes = []

# ============================================================
# PATCH 1: Fix header normalization in renderFormattedText
# ============================================================
old_normalization = """    // Fix compact markdown: insert line breaks before inline headers (e.g., "text ### Header" -> "text\\n\\n### Header")
    normalizedText = normalizedText.replace(/([^\\n])\\s+(#{1,6}\\s)/g, '$1\\n\\n$2');"""

new_normalization = """    // Fix compact markdown: ensure headers are always on their own line with blank-line separators
    // 1. Any ## directly after non-newline text -> force line break before it
    normalizedText = normalizedText.replace(/([^\\n])(#{1,6}\\s)/g, '$1\\n\\n$2');
    // 2. Header followed by text on next line without blank separator -> add blank line after header
    normalizedText = normalizedText.replace(/(#{1,6}\\s[^\\n]+)\\n(?!\\n|#{1,6}\\s|$)/g, '$1\\n\\n');
    // 3. Collapse triple+ newlines back to double to prevent excessive spacing
    normalizedText = normalizedText.replace(/\\n{3,}/g, '\\n\\n');"""

if old_normalization in content:
    content = content.replace(old_normalization, new_normalization, 1)
    changes.append("PATCH 1: Fixed header normalization in renderFormattedText")
else:
    print("ERROR: Could not find old normalization pattern")
    sys.exit(1)

# ============================================================
# PATCH 2: Generalize handleFormatText to accept optional params
# ============================================================
old_format_text = """  const handleFormatText = (formatType) => {
      const textarea = textEditorRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = generatedContent.data;
      const selection = text.substring(start, end);
      const before = text.substring(0, start);
      const after = text.substring(end);

      let newText = "";
      let newCursorPos = end;

      switch (formatType) {
          case 'bold':
              newText = `${before}**${selection}**${after}`;
              newCursorPos = end + 4; 
              break;
          case 'italic':
              newText = `${before}*${selection}*${after}`;
              newCursorPos = end + 2;
              break;
          case 'highlight':
              newText = `${before}==${selection}==${after}`;
              newCursorPos = end + 4;
              break;
          case 'h1':
              newText = `${before}\\n# ${selection}${after}`;
              newCursorPos = end + 3;
              break;
          case 'h2':
              newText = `${before}\\n## ${selection}${after}`;
              newCursorPos = end + 4;
              break;
          case 'list':
              newText = `${before}\\n- ${selection}${after}`;
              newCursorPos = end + 3;
              break;
          default:
              return;
      }
      handleSimplifiedTextChange(newText);
      setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
  };"""

new_format_text = """  const handleFormatText = (formatType, overrideRef, overrideText, overrideCallback) => {
      const textarea = (overrideRef || textEditorRef).current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = overrideText !== undefined ? overrideText : generatedContent.data;
      const selection = text.substring(start, end);
      const before = text.substring(0, start);
      const after = text.substring(end);

      let newText = "";
      let newCursorPos = end;

      switch (formatType) {
          case 'bold':
              newText = `${before}**${selection}**${after}`;
              newCursorPos = end + 4; 
              break;
          case 'italic':
              newText = `${before}*${selection}*${after}`;
              newCursorPos = end + 2;
              break;
          case 'highlight':
              newText = `${before}==${selection}==${after}`;
              newCursorPos = end + 4;
              break;
          case 'h1':
              newText = `${before}\\n# ${selection}${after}`;
              newCursorPos = end + 3;
              break;
          case 'h2':
              newText = `${before}\\n## ${selection}${after}`;
              newCursorPos = end + 4;
              break;
          case 'list':
              newText = `${before}\\n- ${selection}${after}`;
              newCursorPos = end + 3;
              break;
          default:
              return;
      }
      (overrideCallback || handleSimplifiedTextChange)(newText);
      setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
  };"""

if old_format_text in content:
    content = content.replace(old_format_text, new_format_text, 1)
    changes.append("PATCH 2: Generalized handleFormatText with optional ref/text/callback params")
else:
    print("ERROR: Could not find handleFormatText pattern")
    sys.exit(1)

# ============================================================
# PATCH 3: Add analysisEditorRef next to textEditorRef
# ============================================================
old_ref = "  const textEditorRef = useRef(null); "
new_ref = """  const textEditorRef = useRef(null); 
  const analysisEditorRef = useRef(null);"""

if old_ref in content:
    content = content.replace(old_ref, new_ref, 1)
    changes.append("PATCH 3: Added analysisEditorRef")
else:
    print("ERROR: Could not find textEditorRef declaration")
    sys.exit(1)

# ============================================================  
# PATCH 4: Add formatting toolbar to analysis edit mode
# ============================================================
old_analysis_editor = """                             {isEditingAnalysis ? (
                                <textarea
                                    value={generatedContent.data.originalText}
                                    onChange={(e) => handleAnalysisTextChange(e.target.value)}
                                    className="w-full min-h-[300px] bg-white border border-slate-300 rounded-lg p-4 text-sm text-slate-700 font-serif focus:ring-2 focus:ring-indigo-200 outline-none resize-y leading-relaxed"
                                    placeholder={t('common.edit_source_text')}
                                />"""

new_analysis_editor = """                             {isEditingAnalysis ? (
                                <div className="w-full bg-white border border-indigo-200 rounded-lg overflow-hidden shadow-sm">
                                    {/* Formatting Toolbar */}
                                    <div className="flex items-center gap-1 p-2 bg-indigo-50 border-b border-indigo-100">
                                        <button 
                                          onClick={() => handleFormatText('bold', analysisEditorRef, generatedContent.data.originalText, handleAnalysisTextChange)}
                                          className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors"
                                          title={t('formatting.bold')}
                                        >
                                            <Bold size={16} strokeWidth={3} />
                                        </button>
                                        <button 
                                          onClick={() => handleFormatText('italic', analysisEditorRef, generatedContent.data.originalText, handleAnalysisTextChange)}
                                          className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors"
                                          title={t('formatting.italic')}
                                        >
                                            <Italic size={16} />
                                        </button>
                                        <button 
                                          onClick={() => handleFormatText('highlight', analysisEditorRef, generatedContent.data.originalText, handleAnalysisTextChange)}
                                          className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors"
                                          title={t('formatting.highlight')}
                                        >
                                            <Highlighter size={16} />
                                        </button>
                                        <div className="w-px h-4 bg-indigo-200 mx-1"></div>
                                        <button 
                                          onClick={() => handleFormatText('h1', analysisEditorRef, generatedContent.data.originalText, handleAnalysisTextChange)}
                                          className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors font-bold text-xs"
                                          title={t('formatting.h1')}
                                        >
                                            H1
                                        </button>
                                        <button 
                                          onClick={() => handleFormatText('h2', analysisEditorRef, generatedContent.data.originalText, handleAnalysisTextChange)}
                                          className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors font-bold text-xs"
                                          title={t('formatting.h2')}
                                        >
                                            H2
                                        </button>
                                        <div className="w-px h-4 bg-indigo-200 mx-1"></div>
                                        <button 
                                          onClick={() => handleFormatText('list', analysisEditorRef, generatedContent.data.originalText, handleAnalysisTextChange)}
                                          className="p-1.5 rounded hover:bg-indigo-200 text-indigo-800 transition-colors"
                                          title={t('formatting.list')}
                                        >
                                            <List size={16} />
                                        </button>
                                    </div>
                                    <textarea
                                        ref={analysisEditorRef}
                                        value={generatedContent.data.originalText}
                                        onChange={(e) => handleAnalysisTextChange(e.target.value)}
                                        className="w-full min-h-[300px] bg-white p-4 focus:outline-none text-sm text-slate-700 font-serif leading-relaxed resize-y"
                                        placeholder={t('common.edit_source_text')}
                                        spellCheck="false"
                                    />
                                </div>"""

if old_analysis_editor in content:
    content = content.replace(old_analysis_editor, new_analysis_editor, 1)
    changes.append("PATCH 4: Added formatting toolbar to analysis edit mode")
else:
    print("ERROR: Could not find analysis editor pattern")
    sys.exit(1)

# Write the patched file
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nAll {len(changes)} patches applied successfully:")
for c in changes:
    print(f"  ✓ {c}")
print(f"\nFile size: {len(content):,} bytes")
