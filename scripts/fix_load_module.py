import re
from pathlib import Path

SRC = Path(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt')
content = SRC.read_text(encoding='utf-8')

# Search for loadModule implementation
old_load = """    const loadModule = (name, url) => {
      console.log('[CDN] Attempting to load ' + name + ' from: ' + url);
      const prevOnError = window.onerror;"""

new_load = """    const loadModule = (name, url) => {
      if (document.querySelector(`script[src="${url}"]`)) return;
      if (window.AlloModules && window.AlloModules[name]) return;
      console.log('[CDN] Attempting to load ' + name + ' from: ' + url);
      const prevOnError = window.onerror;"""

if old_load in content:
    content = content.replace(old_load, new_load, 1)
    print('✅ Fixed loadModule double loading')
else:
    print('❌ Could not find loadModule start block')

old_calls = """    loadModule('StemLab', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@b7cad97b5a257ca011f81bd2c42ef3445eede6a9/stem_lab_module.js');
    loadModule('WordSoundsModal', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@b7cad97b5a257ca011f81bd2c42ef3445eede6a9/word_sounds_module.js');"""

new_calls = """    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
    loadModule('StemLab', isLocal ? './stem_lab_module.js' : 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@latest/libs/stem_lab_clean.js');
    loadModule('WordSoundsModal', isLocal ? './word_sounds_module.js' : 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@latest/libs/word_sounds_clean.js');"""

if old_calls in content:
    content = content.replace(old_calls, new_calls, 1)
    print('✅ Fixed loadModule specific CDN calls')
else:
    print('❌ Could not find specific CDN calls')

SRC.write_text(content, encoding='utf-8')
