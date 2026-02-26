"""
Add custom font/background color controls with preset dropdown to ImmersiveToolbar.

Changes:
1. Add bgColor and fontColor to immersiveSettings initial state
2. Add Colors UI section to ImmersiveToolbar (preset dropdown + color pickers)
3. Apply colors to the immersive reader container div
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# 1. Find and update immersiveSettings initial state to include colors
# Search for the immersiveSettings useState
import re
match = re.search(r'const \[immersiveSettings, setImmersiveSettings\] = useState\((\{[^}]+\})\)', content)
if match:
    old_settings = match.group(0)
    settings_obj = match.group(1)
    print(f"Found immersiveSettings: {settings_obj[:80]}...")
    
    if 'bgColor' not in settings_obj:
        # Add bgColor and fontColor
        new_settings_obj = settings_obj.rstrip('}').rstrip() + ", bgColor: '#fdfbf7', fontColor: '#1e293b' }"
        new_settings = old_settings.replace(settings_obj, new_settings_obj)
        content = content.replace(old_settings, new_settings, 1)
        fixes += 1
        print("1. Added bgColor and fontColor to immersiveSettings")
    else:
        print("1. SKIP: colors already in settings")
else:
    print("1. SKIP: immersiveSettings not found")

# 2. Add Colors section to ImmersiveToolbar after Grammar Highlighting section
old_grammar_end = """        </div>
      </div>
      {/* Close Button */}"""

new_grammar_end = """        </div>
        <div className="h-4 w-px bg-slate-300 shrink-0"></div>
        {/* Custom Colors */}
        <div className="flex items-center gap-2 shrink-0 relative">
            <span className="text-xs font-bold text-slate-500">{t('immersive.colors') || 'Colors'}</span>
            <select
              value=""
              onChange={(e) => {
                const presets = {
                  'warm': { bgColor: '#fdfbf7', fontColor: '#1e293b' },
                  'dark': { bgColor: '#1a1a2e', fontColor: '#e2e8f0' },
                  'high-contrast': { bgColor: '#000000', fontColor: '#ffff00' },
                  'sepia': { bgColor: '#f4ecd8', fontColor: '#5c4033' },
                  'blue-wash': { bgColor: '#d6eaf8', fontColor: '#1b2631' },
                  'green-tint': { bgColor: '#e8f5e9', fontColor: '#1b5e20' },
                  'rose': { bgColor: '#fce4ec', fontColor: '#880e4f' },
                };
                if (presets[e.target.value]) {
                  setSettings(prev => ({...prev, ...presets[e.target.value]}));
                }
              }}
              className="text-xs bg-slate-100 border border-slate-200 rounded-full px-2 py-1 cursor-pointer hover:bg-slate-200 transition-all font-medium text-slate-600"
              aria-label={t('immersive.color_presets') || 'Color presets'}
            >
              <option value="" disabled>{t('immersive.presets') || 'Presets'}</option>
              <option value="warm">☀️ Warm</option>
              <option value="dark">🌙 Dark</option>
              <option value="high-contrast">◼️ High Contrast</option>
              <option value="sepia">📜 Sepia</option>
              <option value="blue-wash">💧 Blue Wash</option>
              <option value="green-tint">🌿 Green Tint</option>
              <option value="rose">🌸 Rose</option>
            </select>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-slate-500">{t('immersive.bg') || 'Bg'}</label>
              <input type="color" value={settings.bgColor || '#fdfbf7'} onChange={(e) => setSettings(prev => ({...prev, bgColor: e.target.value}))} className="w-5 h-5 rounded-full border border-slate-200 cursor-pointer p-0 appearance-none" style={{backgroundColor: settings.bgColor}} aria-label={t('immersive.bg_color') || 'Background color'}/>
              <label className="text-[10px] text-slate-500">{t('immersive.text') || 'Text'}</label>
              <input type="color" value={settings.fontColor || '#1e293b'} onChange={(e) => setSettings(prev => ({...prev, fontColor: e.target.value}))} className="w-5 h-5 rounded-full border border-slate-200 cursor-pointer p-0 appearance-none" style={{backgroundColor: settings.fontColor}} aria-label={t('immersive.text_color') || 'Text color'}/>
            </div>
        </div>
      </div>
      {/* Close Button */}"""

if old_grammar_end in content:
    content = content.replace(old_grammar_end, new_grammar_end, 1)
    fixes += 1
    print("2. Added Colors section to ImmersiveToolbar")
else:
    print("2. SKIP: grammar end pattern not found")

# 3. Apply colors to the immersive reader container
old_container = 'className="fixed inset-0 z-[200] bg-[#fdfbf7] overflow-y-auto animate-in fade-in zoom-in-95 duration-300 flex flex-col font-sans"'
new_container = 'className="fixed inset-0 z-[200] overflow-y-auto animate-in fade-in zoom-in-95 duration-300 flex flex-col font-sans" style={{backgroundColor: immersiveSettings.bgColor || \'#fdfbf7\'}}'

if old_container in content:
    content = content.replace(old_container, new_container, 1)
    fixes += 1
    print("3. Applied dynamic background color to container")
else:
    print("3. SKIP: container pattern not found")

# 4. Apply font color to the text wrapper div
old_text_wrapper = 'className={`max-w-4xl mx-auto text-slate-900 transition-all duration-300`}'
new_text_wrapper = 'className={`max-w-4xl mx-auto transition-all duration-300`} style={{color: immersiveSettings.fontColor || \'#1e293b\'}}'

# This might have been renamed, so check
if old_text_wrapper in content:
    content = content.replace(old_text_wrapper, new_text_wrapper, 1)
    fixes += 1
    print("4. Applied dynamic font color to text wrapper")
else:
    print("4. SKIP: text wrapper pattern not found, searching...")
    idx = content.find('max-w-4xl mx-auto text-slate-900')
    if idx > 0:
        line_num = content[:idx].count('\n') + 1
        print(f"   Found at line {line_num}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nApplied {fixes} changes")
