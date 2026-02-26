"""Fix: Add Bridge Mode button to the teacher UI."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
fixed = 0

# 1) Add Bridge Mode button next to roster settings gear
#    Find the settings button div (flex items-center gap-1) at L61222
for i, l in enumerate(lines):
    if 'setIsRosterKeyOpen(true)' in l and 'roster_manage_button' in l:
        # This is the settings button. Insert Bridge Mode button BEFORE it
        bridge_btn = (
            "                        <button onClick={() => setBridgeSendOpen(true)} className=\"p-1.5 rounded-md hover:bg-teal-100 text-teal-600\" title={t('roster.bridge_mode_btn') || '🌐 Bridge Mode'} aria-label=\"Bridge Mode\" data-help-key=\"bridge_mode_button\">\r\n"
            "                            🌐\r\n"
            "                        </button>\r\n"
        )
        lines.insert(i, bridge_btn)
        fixed += 1
        print("[OK] 1: Added Bridge Mode button at L%d" % (i + 1))
        break

# 2) Also add a 🧪 Test Bridge button after the Differentiate by Group button
#    so teachers can test the BridgeMessagePanel display
for i, l in enumerate(lines):
    if "Differentiate by Group" in l and i > 61000:
        # Find the closing of this button
        for j in range(i, min(i + 5, len(lines))):
            if '</button>' in lines[j]:
                nearby = ''.join(lines[j:j+10])
                if 'Test Bridge' in nearby:
                    print("[OK] 2: Test Bridge button already present")
                    break
                test_btn = (
                    "                            <button onClick={() => { setBridgeMessage({ english: 'Photosynthesis is the process by which green plants use sunlight, water, and carbon dioxide to make their own food and release oxygen.', translated: 'Sawir-ka-buuxa waa habka ay dhirta cagaaran u isticmaalaan iftiinka qorraxda, biyaha, iyo kaarboon dayaxsaydka si ay u sameeyaan cuntadooda isaga oo sii daayaya ogsiijiin.', language: 'Somali', languageName: '🇸🇴 Soomaali', imageUrl: null, terms: ['photosynthesis', 'chlorophyll', 'carbon dioxide', 'oxygen'], timestamp: Date.now() }); }} className=\"w-full px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-xs font-bold hover:bg-teal-100 transition-colors flex items-center justify-center gap-1.5 border border-teal-200 mt-1\">\r\n"
                    "                                🧪 {t('roster.bridge_test') || 'Test Bridge Panel'}\r\n"
                    "                            </button>\r\n"
                )
                lines.insert(j + 1, test_btn)
                fixed += 1
                print("[OK] 2: Added Test Bridge button at L%d" % (j + 2))
                break
        break

# 3) Add help_strings for bridge mode button  
for i, l in enumerate(lines):
    if 'roster_manage_button:' in l and 'help' in lines[max(0,i-5):i+1].__repr__().lower():
        nearby = ''.join(lines[i:i+5])
        if 'bridge_mode_button' in nearby:
            print("[OK] 3: Bridge mode help string already present")
            break
        help_str = "    bridge_mode_button: 'Opens Bridge Mode — send bilingual explanations, translations, and visual aids to students in real-time. Content is adapted to each group\\'s language and reading level.',\r\n"
        lines.insert(i + 1, help_str)
        fixed += 1
        print("[OK] 3: Added bridge mode help string at L%d" % (i + 2))
        break
    elif 'roster_manage_button' in l and 'help' not in l:
        continue

open('AlloFlowANTI.txt', 'w', encoding='utf-8').write(''.join(lines))
print("\nFixed %d items" % fixed)
