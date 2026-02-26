import re
from pathlib import Path

SRC = Path(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js')
content = SRC.read_text(encoding='utf-8')

old_block = """      }
      setActiveView('math');
      setShowStemLab(false);
    },
    disabled: !mathInput.trim(),
    className: "w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl text-sm hover:from-indigo-700 hover:to-blue-700 disabled:opacity-40 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 16
  }), " ", stemLabCreateMode === 'solve' ? 'Solve Problem' : 'Generate Problems')"""

if old_block in content:
    new_block = old_block.replace("setShowStemLab(false);", "// setShowStemLab(false); // Removed so users can continue building assessment without the window abruptly closing")
    content = content.replace(old_block, new_block, 1)
    SRC.write_text(content, encoding='utf-8')
    print('✅ Removed setShowStemLab(false) from Generate Problems button')
else:
    print('❌ Could not find the generate block in stem_lab_module.js')
