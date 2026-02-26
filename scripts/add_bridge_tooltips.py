"""Add teacher tooltips to Bridge Mode to clarify per-group auto-translation behavior."""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    changes = 0

    # 1. Update Language Blast Preview subtitle with tooltip
    old1 = "Each device generates in its group's language</span>"
    new1 = ('Each student device auto-translates to its group\'s language & reading level</span>'
            '\n                     <div style={{fontSize:\'10px\',color:\'#5eead4\',background:\'rgba(20,184,166,0.08)\',border:\'1px solid rgba(20,184,166,0.15)\',borderRadius:\'8px\',padding:\'6px 10px\',marginTop:\'8px\',lineHeight:1.5}}>'
            '\n                       💡 <strong>How it works:</strong> In a live session, each student device automatically generates the translation using its group\'s configured language and reading level. The language/grade selectors above only affect your teacher preview.'
            '\n                     </div>')

    if old1 in content:
        content = content.replace(old1, new1)
        changes += 1
        print("✅ 1. Updated Language Blast Preview with explanatory tooltip")
    else:
        print("❌ 1. Could not find Language Blast Preview subtitle")

    # 2. Add "(preview)" label next to Target Language
    old2 = ">Target Language</div>"
    # Only replace the first occurrence (in Bridge mode)
    idx = content.find(old2)
    if idx > 69000:  # Ensure it's in the Bridge section
        content = content[:idx] + ">Target Language <span style={{fontSize:'9px',fontWeight:400,color:'#64748b',textTransform:'none'}}>(your preview)</span></div>" + content[idx+len(old2):]
        changes += 1
        print("✅ 2. Added '(your preview)' label to Target Language")
    else:
        print("❌ 2. Could not find Target Language header in Bridge section")

    # 3. Add "(preview)" label next to Reading Level
    old3 = ">Reading Level</div>"
    idx = content.find(old3)
    if idx > 69000:
        content = content[:idx] + ">Reading Level <span style={{fontSize:'9px',fontWeight:400,color:'#64748b',textTransform:'none'}}>(your preview)</span></div>" + content[idx+len(old3):]
        changes += 1
        print("✅ 3. Added '(your preview)' label to Reading Level")
    else:
        print("❌ 3. Could not find Reading Level header in Bridge section")

    SRC.write_text(content, encoding='utf-8')
    print(f"\n✅ Done! {changes} changes applied.")

if __name__ == "__main__":
    main()
