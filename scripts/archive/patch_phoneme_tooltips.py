"""
Wire PHONEME_GUIDE tooltips into UI:
1. Phoneme Bank Picker: Add rich tooltip showing label, IPA, examples, tip on hover
2. Phoneme chips in review panel: Add basic tooltip  
3. Segmentation pool chips: Add basic tooltip
4. Add CSS for rich tooltip styling
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
changes = 0

# ================================================================
# FIX 1: Phoneme Bank Picker - Rich tooltips with PHONEME_GUIDE
# Replace the simple title on bank buttons with PHONEME_GUIDE data
# ================================================================
# Current: title={`Play sound: ${p}`}  and  title={`Click or drag to add "${p}"`}
# Target: Add rich tooltip using PHONEME_GUIDE

# Replace the bank phoneme button to show guide info
old_bank_play = """                                                                            onClick={() => onPlayAudio && onPlayAudio(p)}
                                                                            className="px-1.5 py-1 bg-slate-100 hover:bg-pink-200 text-slate-500 hover:text-pink-600 transition-colors border-r border-slate-300"
                                                                            title={`Play sound: ${p}`}"""
new_bank_play = """                                                                            onClick={() => onPlayAudio && onPlayAudio(p)}
                                                                            className="px-1.5 py-1 bg-slate-100 hover:bg-pink-200 text-slate-500 hover:text-pink-600 transition-colors border-r border-slate-300"
                                                                            title={PHONEME_GUIDE[p] ? `🔊 ${PHONEME_GUIDE[p].label} (${PHONEME_GUIDE[p].ipa}) — ${PHONEME_GUIDE[p].examples}` : `Play sound: ${p}`}"""
if old_bank_play in content:
    content = content.replace(old_bank_play, new_bank_play)
    changes += 1
    print("1. Updated bank play button with rich tooltip")
else:
    print("1. Bank play button pattern not found")

old_bank_add = """                                                                            className="px-2 py-1 bg-white hover:bg-pink-100 text-sm font-mono transition-colors cursor-grab active:cursor-grabbing"
                                                                            title={`Click or drag to add "${p}"`}"""
new_bank_add = """                                                                            className="px-2 py-1 bg-white hover:bg-pink-100 text-sm font-mono transition-colors cursor-grab active:cursor-grabbing"
                                                                            title={PHONEME_GUIDE[p] ? `${PHONEME_GUIDE[p].label}: ${PHONEME_GUIDE[p].tip}${PHONEME_GUIDE[p].confusesWith?.length ? '\\n⚠️ Often confused with: ' + PHONEME_GUIDE[p].confusesWith.join(', ') : ''}` : `Click or drag to add "${p}"`}"""
if old_bank_add in content:
    content = content.replace(old_bank_add, new_bank_add)
    changes += 1
    print("2. Updated bank add button with rich tooltip + confusion warning")
else:
    print("2. Bank add button pattern not found")

# ================================================================
# FIX 2: Add category descriptions to the bank picker header
# Replace simple category label with guide-informed header
# ================================================================
old_cat_label = """                                                            <div className="text-xs font-bold text-slate-500 uppercase mb-1">{category}</div>"""
new_cat_label = """                                                            <div className="text-xs font-bold text-slate-500 uppercase mb-1" title={
                                                                category === 'Consonants' ? 'Single consonant sounds — pair voiced (b,d,g) with unvoiced (p,t,k)' :
                                                                category === 'Short Vowels' ? 'Quick vowel sounds — as in cat, pet, sit, hot, cup' :
                                                                category === 'Long Vowels' ? 'Vowels that say their letter name — cake, tree, kite, boat, moon' :
                                                                category === 'Digraphs' ? 'Two letters that make ONE sound — sh, ch, th, wh, ng' :
                                                                category === 'R-Controlled' ? 'Bossy R changes the vowel sound — ar, er, ir, or, ur' :
                                                                category === 'Diphthongs' ? 'Vowel sounds that glide — ow (cow), oy (boy), aw (saw)' :
                                                                category
                                                            }>{category}</div>"""
if old_cat_label in content:
    content = content.replace(old_cat_label, new_cat_label)
    changes += 1
    print("3. Added category descriptions to bank picker headers")
else:
    print("3. Category label pattern not found")

# ================================================================
# FIX 3: Review panel phoneme chips - Add tooltip
# Current: <span> with just {p} text
# Add title with PHONEME_GUIDE info
# ================================================================
old_review_chip = """                                                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-pink-100 to-violet-100 text-violet-700 font-bold rounded-lg border-2 border-violet-200">
                                                            <span className="text-slate-500 text-xs mr-1">⠿</span>
                                                             {p}"""
new_review_chip = """                                                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-pink-100 to-violet-100 text-violet-700 font-bold rounded-lg border-2 border-violet-200"
                                                                title={PHONEME_GUIDE[p] ? `${PHONEME_GUIDE[p].label} (${PHONEME_GUIDE[p].ipa}) — ${PHONEME_GUIDE[p].examples}\\n💡 ${PHONEME_GUIDE[p].tip}` : p}
                                                            >
                                                            <span className="text-slate-500 text-xs mr-1">⠿</span>
                                                             {p}"""
if old_review_chip in content:
    content = content.replace(old_review_chip, new_review_chip)
    changes += 1
    print("4. Added tooltip to review panel phoneme chips")
else:
    print("4. Review chip pattern not found - trying alternate")
    # Try a more flexible match
    old_alt = '<span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-pink-100 to-violet-100 text-violet-700 font-bold rounded-lg border-2 border-violet-200">'
    new_alt = '<span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-pink-100 to-violet-100 text-violet-700 font-bold rounded-lg border-2 border-violet-200" title={typeof p === "string" && PHONEME_GUIDE[p] ? `${PHONEME_GUIDE[p].label} (${PHONEME_GUIDE[p].ipa}) — ${PHONEME_GUIDE[p].examples}` : (typeof p === "string" ? p : "")}>'
    if old_alt in content:
        content = content.replace(old_alt, new_alt, 1)  # Only first occurrence
        changes += 1
        print("4b. Added tooltip to review panel phoneme chips (alt pattern)")
    else:
        print("4b. Also not found")

# ================================================================
# FIX 4: Segmentation pool chips - Add tooltip
# Current: title="Drag to box or Click to listen"
# ================================================================
old_seg_title = '                                    title="Drag to box or Click to listen"'
new_seg_title = '                                    title={PHONEME_GUIDE[chip.phoneme] ? `${PHONEME_GUIDE[chip.phoneme].label}: ${PHONEME_GUIDE[chip.phoneme].tip}\\nDrag to box or Click to listen` : "Drag to box or Click to listen"}'
if old_seg_title in content:
    content = content.replace(old_seg_title, new_seg_title)
    changes += 1
    print("5. Added tooltip to segmentation pool chips")
else:
    print("5. Segmentation title pattern not found")

# ================================================================
# FIX 5: Add a "Phoneme Guide" expandable reference card
# Optionally add a ? button near the bank picker header
# ================================================================
old_bank_header = """{/* Phoneme Bank Picker */}
                                            {showPhonemeBank === idx && (
                                                <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3 mt-2 animate-in slide-in-from-top-2">"""
new_bank_header = """{/* Phoneme Bank Picker */}
                                            {showPhonemeBank === idx && (
                                                <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3 mt-2 animate-in slide-in-from-top-2">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs text-slate-500 italic">💡 Hover any sound for teaching tips</span>
                                                    </div>"""
if old_bank_header in content:
    content = content.replace(old_bank_header, new_bank_header)
    changes += 1
    print("6. Added tip hint to bank picker header")
else:
    print("6. Bank header pattern not found")

# Save
content = content.replace('\n', '\r\n')
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"\nTotal changes: {changes}")
