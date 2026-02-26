"""Remove the lime green diagnostic banner and any remaining WS-DBG diagnostics."""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# Remove lime green banner line
lime = """                    {activeView === 'word-sounds' && <div style={{position:"fixed",top:0,left:0,right:0,zIndex:99999,background:"lime",color:"black",padding:"10px",fontSize:"18px",fontWeight:"bold",textAlign:"center"}}>GATE OPEN: activeView=word-sounds, isWordSoundsMode={String(isWordSoundsMode)}</div>}"""
if lime in content:
    content = content.replace(lime, '', 1)
    changes.append("Removed lime green diagnostic banner")

# Remove the {/* WS-DBG: diagnostic removed */} placeholder
old_placeholder = '{/* WS-DBG: diagnostic removed */}'
if old_placeholder in content:
    content = content.replace(old_placeholder, '', 1)
    changes.append("Removed WS-DBG placeholder comment")

# Remove the // [WS-DBG useEffect removed after fix] comment
old_ue = '  // [WS-DBG useEffect removed after fix]\r\n'
if old_ue in content:
    content = content.replace(old_ue, '', 1)
    changes.append("Removed useEffect placeholder comment")
else:
    old_ue2 = '  // [WS-DBG useEffect removed after fix]\n'
    if old_ue2 in content:
        content = content.replace(old_ue2, '', 1)
        changes.append("Removed useEffect placeholder comment")

# Remove console.error WS-DBG lines from handleRestoreView
old_dbg1 = """       console.error("[WS-DBG] handleRestoreView CALLED with type:", item?.type, "data length:", item?.data?.length || 0);\r\n"""
if old_dbg1 in content:
    content = content.replace(old_dbg1, '', 1)
    changes.append("Removed handleRestoreView entry diagnostic")

old_dbg2 = """           console.error("[WS-DBG] handleRestoreView: word-sounds detected, isWordSoundsMode->true");\r\n"""
if old_dbg2 in content:
    content = content.replace(old_dbg2, '', 1)
    changes.append("Removed word-sounds detected diagnostic")

# Remove Auto-open diagnostic
old_dbg3 = 'console.error("[WS-DBG] Auto-open:'
for i, l in enumerate(content.split('\n')):
    if old_dbg3 in l:
        # Replace this line with nothing
        old_line = l + '\n'
        content = content.replace(old_line, '', 1)
        changes.append("Removed Auto-open diagnostic at L%d" % (i+1))
        break

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("Cleanup complete: %d changes" % len(changes))
for c in changes:
    print("  - %s" % c)

# Verify no WS-DBG remains
remaining = []
for i, l in enumerate(content.split('\n')):
    if 'WS-DBG' in l:
        remaining.append("L%d: %s" % (i+1, l.strip()[:100]))

if remaining:
    print("\nRemaining WS-DBG references:")
    for r in remaining:
        print("  %s" % r)
else:
    print("\n✅ All WS-DBG diagnostics removed!")
