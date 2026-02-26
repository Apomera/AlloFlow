"""
Add a visible diagnostic INSIDE the WS modal section.
Place it BEFORE the isWordSoundsMode guard but INSIDE the activeView gate.
This will tell us if the gate opens or not.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# The parent gate at L65102 is:
# {(activeView === 'glossary' || activeView === 'word-sounds') && (
#   <div className="space-y-6">
# The WS modal is at L65778:
# {isWordSoundsMode && (generatedContent?.type === 'glossary' || ...

# Let's add a visible diagnostic div at the START of the <div className="space-y-6">
# right after the gate opens
old_marker = """{(activeView === 'glossary' || activeView === 'word-sounds') && (
                  <div className="space-y-6">"""

new_marker = """{(activeView === 'glossary' || activeView === 'word-sounds') && (
                  <div className="space-y-6">
                    {activeView === 'word-sounds' && <div style={{position:"fixed",top:0,left:0,right:0,zIndex:99999,background:"lime",color:"black",padding:"10px",fontSize:"18px",fontWeight:"bold",textAlign:"center"}}>GATE OPEN: activeView=word-sounds, isWordSoundsMode={String(isWordSoundsMode)}</div>}"""

if old_marker in content:
    content = content.replace(old_marker, new_marker, 1)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: Added lime green diagnostic banner inside gate")
else:
    print("[WARN] Pattern not found, trying with \\r\\n...")
    old_marker2 = "{(activeView === 'glossary' || activeView === 'word-sounds') && (\r\n                  <div className=\"space-y-6\">"
    if old_marker2 in content:
        new_marker2 = old_marker2 + """\r\n                    {activeView === 'word-sounds' && <div style={{position:"fixed",top:0,left:0,right:0,zIndex:99999,background:"lime",color:"black",padding:"10px",fontSize:"18px",fontWeight:"bold",textAlign:"center"}}>GATE OPEN: activeView=word-sounds, isWordSoundsMode={String(isWordSoundsMode)}</div>}"""
        content = content.replace(old_marker2, new_marker2, 1)
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print("SUCCESS (CRLF): Added lime green diagnostic banner inside gate")
    else:
        print("[FAILED] Could not find the pattern. Looking...")
        for i, l in enumerate(content.split('\n')):
            if "activeView === 'glossary' || activeView === 'word-sounds'" in l:
                print("  L%d: %s" % (i+1, l.strip()[:200]))
