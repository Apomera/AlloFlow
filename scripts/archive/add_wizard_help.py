"""
Add a persistent ? help toggle to the wizard header with step-specific help panel.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

original_count = len(lines)
print(f"Starting: {original_count} lines")

# === 1. Add showWizardHelp state and wizardStepHelp data ===
# Find: "const [isSearching, setIsSearching] = useState(false);"
# Add after it: showWizardHelp state and step help descriptions

target1 = "  const [isSearching, setIsSearching] = useState(false);\n"
insert1_after = [
    "  const [showWizardHelp, setShowWizardHelp] = useState(false);\n",
    "  const wizardStepHelp = {\n",
    "    1: { title: 'Step 1: Grade Level', text: 'Select the grade level for your content. This determines vocabulary complexity, sentence structure, and concept depth. All generated materials will be calibrated to this level. You can always change it later in settings.' },\n",
    "    2: { title: 'Step 2: Source Material', text: 'Choose how to provide your lesson content. You can paste or type text directly, fetch content from a URL, upload a file, or let the AI generate content from a topic. Each option creates a rich source document for all tools to work from.' },\n",
    "    3: { title: 'Step 3: Standards & Customization', text: 'Align your content to academic standards (Common Core, NGSS, state-specific). You can search by AI or enter codes manually. Also set DOK level, output format, writing tone, languages, and student interests for personalized content.' },\n",
    "    4: { title: 'Step 4: Review & Personalize', text: 'Final review of your settings. Add vocabulary terms, a learning goal, citation preferences, and any custom instructions for the AI. Click Finish to generate your lesson with all configured options applied.' },\n",
    "  };\n",
]

# Find the target line
idx1 = None
for i, l in enumerate(lines):
    if 'const [isSearching, setIsSearching]' in l:
        idx1 = i
        break

if idx1 is None:
    print("!! Could not find isSearching state")
    sys.exit(1)

print(f"Found isSearching at L{idx1+1}")

# Insert after idx1
for j, nl in enumerate(insert1_after):
    lines.insert(idx1 + 1 + j, nl)

offset = len(insert1_after)
print(f"  Added {offset} lines for state + step help data")

# === 2. Add ? button to the header ===
# Find the "flex items-center gap-4" div that contains skip and close
# We need to add the ? button BEFORE the skip button
# Target: <div className="flex items-center gap-4">
#                  <button 
#                    onClick={handleSkip}

# Find the header buttons div
target2_found = False
for i in range(idx1 + offset, min(idx1 + offset + 250, len(lines))):
    if 'flex items-center gap-4' in lines[i] and 'div' in lines[i]:
        # Insert the ? button right after this div opens
        help_btn_lines = [
            '                  <button \n',
            '                    onClick={() => setShowWizardHelp(h => !h)}\n',
            "                    className={`p-2 rounded-full transition-all ${showWizardHelp ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-300' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}\n",
            '                    aria-label="Toggle wizard help"\n',
            '                    title="What does this step do?"\n',
            '                  >\n',
            '                    <HelpCircle size={20}/>\n',
            '                  </button>\n',
        ]
        
        for j, nl in enumerate(help_btn_lines):
            lines.insert(i + 1 + j, nl)
        
        offset += len(help_btn_lines)
        target2_found = True
        print(f"  Added ? button at L{i+2} ({len(help_btn_lines)} lines)")
        break

if not target2_found:
    print("!! Could not find header buttons div")
    sys.exit(1)

# === 3. Add collapsible help panel before the content area ===
# Find: <div className="p-8 overflow-y-auto custom-scrollbar">
# Insert help panel BEFORE it

for i in range(idx1 + offset, min(idx1 + offset + 300, len(lines))):
    if 'p-8 overflow-y-auto custom-scrollbar' in lines[i]:
        help_panel_lines = [
            '          {showWizardHelp && wizardStepHelp[step] && (\n',
            '            <div className="mx-6 mt-4 mb-0 p-4 bg-indigo-50 border border-indigo-200 rounded-xl animate-in slide-in-from-top-2 duration-200">\n',
            '              <div className="flex items-start gap-3">\n',
            '                <HelpCircle size={18} className="text-indigo-500 mt-0.5 shrink-0" />\n',
            '                <div>\n',
            '                  <p className="font-bold text-sm text-indigo-800">{wizardStepHelp[step].title}</p>\n',
            '                  <p className="text-xs text-indigo-700 mt-1 leading-relaxed">{wizardStepHelp[step].text}</p>\n',
            '                </div>\n',
            '                <button onClick={() => setShowWizardHelp(false)} className="text-indigo-400 hover:text-indigo-600 shrink-0 p-1"><X size={14}/></button>\n',
            '              </div>\n',
            '            </div>\n',
            '          )}\n',
        ]
        
        for j, nl in enumerate(help_panel_lines):
            lines.insert(i + j, nl)
        
        offset += len(help_panel_lines)
        print(f"  Added help panel at L{i+1} ({len(help_panel_lines)} lines)")
        break

# === Write ===
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

final_count = len(lines)
print(f"\nFinal: {final_count} lines (+{final_count - original_count})")
print("Done!")
