"""
Replace the IIFE diagnostic with a VISIBLE test div that will show up 
in the UI when isWordSoundsMode is true. If the user sees a bright red box, 
the render path is fine and the issue is inside WordSoundsModal.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the IIFE
old_iife = '{(() => { if (isWordSoundsMode) { console.error("[WS-DBG] RENDER CHECK: isWordSoundsMode=true, type=" + (generatedContent?.type) + ", wsWords=" + (wsPreloadedWords?.length || 0) + ", GUARD=" + !!(generatedContent?.type === \'glossary\' || generatedContent?.type === \'word-sounds\' || (wsPreloadedWords && wsPreloadedWords.length > 0))); } return null; })()}'

# Replace with a visible div
new_diag = '{isWordSoundsMode && <div style={{position:"fixed",top:0,left:0,right:0,zIndex:99999,background:"red",color:"white",padding:"20px",fontSize:"24px",fontWeight:"bold",textAlign:"center"}}>WS-DBG: isWordSoundsMode=TRUE, type={generatedContent?.type}, wsWords={wsPreloadedWords?.length || 0}</div>}'

if old_iife in content:
    content = content.replace(old_iife, new_diag, 1)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("REPLACED: IIFE with visible red banner diagnostic")
else:
    print("[WARN] IIFE pattern not found exactly, searching...")
    # Find the line containing the IIFE
    lines = content.split('\n')
    for i, l in enumerate(lines):
        if '[WS-DBG] RENDER CHECK' in l:
            print("Found at L%d: %s" % (i+1, l.strip()[:200]))
            # Replace this entire line
            lines[i] = '                    ' + new_diag + '\r'
            content = '\n'.join(lines)
            with open(FILE, 'w', encoding='utf-8') as f:
                f.write(content)
            print("REPLACED via line replacement")
            break
    else:
        print("Could not find RENDER CHECK diagnostic at all")
