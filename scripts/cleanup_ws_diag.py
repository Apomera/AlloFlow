"""Remove the red banner diagnostic and the useEffect diagnostic."""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# Remove red banner diagnostic
red_banner = """{isWordSoundsMode && <div style={{position:"fixed",top:0,left:0,right:0,zIndex:99999,background:"red",color:"white",padding:"20px",fontSize:"24px",fontWeight:"bold",textAlign:"center"}}>WS-DBG: isWordSoundsMode=TRUE, type={generatedContent?.type}, wsWords={wsPreloadedWords?.length || 0}</div>}"""
if red_banner in content:
    content = content.replace(red_banner, '{/* WS-DBG: diagnostic removed */}', 1)
    changes.append("Removed red banner diagnostic")

# Remove useEffect diagnostic (leave a comment)
ue_diag = """useEffect(() => { console.error("[WS-DBG] isWordSoundsMode CHANGED to:", isWordSoundsMode, "type:", generatedContent?.type); }, [isWordSoundsMode]);"""
if ue_diag in content:
    content = content.replace(ue_diag, '// [WS-DBG useEffect removed after fix]', 1)
    changes.append("Removed useEffect diagnostic")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("Cleanup: %d changes" % len(changes))
for c in changes:
    print("  - %s" % c)
