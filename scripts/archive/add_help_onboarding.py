"""
Add first-visit help onboarding tooltip.
Three changes:
1. Add state + useEffect for help onboarding near existing localStorage pattern (~L30035)
2. Replace handleToggleIsHelpMode to also dismiss onboarding
3. Add tooltip UI next to the header CircleHelp button (~L54927)
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = 0

# =============================================
# CHANGE 1: Add state + useEffect for help onboarding
# Insert after the isHelpMode state declaration
# =============================================
state_anchor = "const [isHelpMode, setIsHelpMode] = useState(false);"
state_insert = """
  // First-visit help onboarding tooltip
  const [showHelpOnboarding, setShowHelpOnboarding] = useState(false);
  useEffect(() => {
      try {
          if (localStorage.getItem('allo_help_onboarded') !== 'true') {
              const timer = setTimeout(() => setShowHelpOnboarding(true), 4000);
              const autoDismiss = setTimeout(() => {
                  setShowHelpOnboarding(false);
                  try { localStorage.setItem('allo_help_onboarded', 'true'); } catch {}
              }, 14000);
              return () => { clearTimeout(timer); clearTimeout(autoDismiss); };
          }
      } catch {}
  }, []);
  const dismissHelpOnboarding = () => { setShowHelpOnboarding(false); try { localStorage.setItem('allo_help_onboarded', 'true'); } catch {} };"""

if state_anchor in content:
    idx = content.index(state_anchor) + len(state_anchor)
    content = content[:idx] + state_insert + content[idx:]
    changes += 1
    print("[1] Added help onboarding state + useEffect")
else:
    print("[1] ERROR: Could not find isHelpMode state anchor")

# =============================================
# CHANGE 2: Replace handleToggleIsHelpMode to also dismiss onboarding
# Old: const handleToggleIsHelpMode = React.useCallback(() => setIsHelpMode(prev => !prev), []);
# New: wrap with onboarding dismissal
# =============================================
old_handler = "const handleToggleIsHelpMode = React.useCallback(() => setIsHelpMode(prev => !prev), []);"
new_handler = "const handleToggleIsHelpMode = React.useCallback(() => { setIsHelpMode(prev => !prev); dismissHelpOnboarding(); }, []);"

if old_handler in content:
    content = content.replace(old_handler, new_handler, 1)
    changes += 1
    print("[2] Extended handleToggleIsHelpMode to dismiss onboarding")
else:
    print("[2] WARNING: Could not find exact handleToggleIsHelpMode pattern")

# =============================================
# CHANGE 3: Add tooltip UI next to CircleHelp button
# Find: <CircleHelp size={20} /> </button> (the help toggle button end)
# Add tooltip as a sibling after the closing </button>
# Need to find the very specific pattern around the help-ignore button
# =============================================
# The help button structure is:
#   <button data-help-ignore="true" onClick={handleToggleIsHelpMode} ...>
#       <CircleHelp size={20} />
#   </button>
# We want to add after this </button>

help_btn_end = '<CircleHelp size={20} />\n                        </button>'
tooltip_insert = """<CircleHelp size={20} />
                        </button>
                        {showHelpOnboarding && !isHelpMode && (
                            <div 
                                onClick={dismissHelpOnboarding}
                                className="absolute -bottom-14 right-0 bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg cursor-pointer animate-bounce z-[10999] whitespace-nowrap border-2 border-indigo-400"
                                style={{ minWidth: '160px', textAlign: 'center' }}
                            >
                                <div className="absolute -top-2 right-4 w-4 h-4 bg-indigo-600 rotate-45 border-l-2 border-t-2 border-indigo-400"></div>
                                💡 Click <strong>?</strong> anytime for help!
                            </div>
                        )}"""

# Try LF version
if help_btn_end in content:
    content = content.replace(help_btn_end, tooltip_insert, 1)
    changes += 1
    print("[3] Added onboarding tooltip next to CircleHelp button (LF)")
else:
    # Try CRLF
    help_btn_end_crlf = help_btn_end.replace('\n', '\r\n')
    tooltip_insert_crlf = tooltip_insert.replace('\n', '\r\n')
    if help_btn_end_crlf in content:
        content = content.replace(help_btn_end_crlf, tooltip_insert_crlf, 1)
        changes += 1
        print("[3] Added onboarding tooltip next to CircleHelp button (CRLF)")
    else:
        print("[3] ERROR: Could not find CircleHelp button end pattern")
        # Debug: show what's actually there
        idx = content.find('<CircleHelp size={20}')
        if idx >= 0:
            snippet = content[idx:idx+200]
            print(f"   Found CircleHelp at char {idx}: {repr(snippet[:100])}")

# We also need the button's parent div to have position: relative for the tooltip
# The help button is inside a div with id="tour-header-tools"
# Let's check if there's already a relative wrapper - if not, we'll make the button wrapper relative
# Actually, the tooltip uses absolute positioning, so the closest relative parent matters.
# Let's wrap the help button area in a relative div.
# Actually simpler: just wrap the help button + tooltip in a relative span

# Find the <button + data-help-ignore block and wrap in relative div
btn_start = '<button \n                            data-help-ignore="true"\n                            onClick={handleToggleIsHelpMode}'
btn_start_crlf = btn_start.replace('\n', '\r\n')

# Check if we can find it
found = btn_start in content or btn_start_crlf in content
if found:
    le = '\r\n' if btn_start_crlf in content else '\n'
    actual_start = btn_start_crlf if btn_start_crlf in content else btn_start
    idx = content.index(actual_start)
    # Wrap with a relative div
    content = content[:idx] + f'<div className="relative">{le}                        ' + content[idx:]
    
    # Find the closing of our tooltip (the last line we added) and close the wrapper
    close_marker = "💡 Click <strong>?</strong> anytime for help!" + le + "                            </div>" + le + "                        )}"
    if close_marker in content:
        ci = content.index(close_marker) + len(close_marker)
        content = content[:ci] + le + "                        </div>" + content[ci:]
        changes += 1
        print("[4] Wrapped help button + tooltip in relative div")
    else:
        print("[4] WARNING: Could not find tooltip close for wrapping")
else:
    print("[4] WARNING: Could not find button start for wrapping")

# Save
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
print("DONE")
