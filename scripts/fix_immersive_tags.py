"""
fix_immersive_tags.py — Fix POS tag leaking in immersive reader and harden parseTaggedContent.

Issues:
1. parseTaggedContent's regex doesn't handle malformed/unclosed POS tags from Gemini
2. Raw POS tags (<v>, <n>, etc.) can show through in the immersive reader
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    changes = 0

    # 1. Harden the untagged content handler in parseTaggedContent to strip any remaining POS tags
    # The issue is at L37146: when tags are malformed, raw "<v>word" passes through
    old_untagged = """} else {
                  const tokens = part.split(/([a-zA-Z0-9\u00C0-\u00FF\u00B7]+)|(\\s+)|([^a-zA-Z0-9\u00C0-\u00FF\u00B7\\s]+)/g).filter(Boolean);"""
    new_untagged = """} else {
                  const cleanPart = part.replace(/<\\/?[nvadbi]>/g, '');
                  const tokens = cleanPart.split(/([a-zA-Z0-9\u00C0-\u00FF\u00B7]+)|(\\s+)|([^a-zA-Z0-9\u00C0-\u00FF\u00B7\\s]+)/g).filter(Boolean);"""
    if old_untagged in content:
        content = content.replace(old_untagged, new_untagged, 1)
        changes += 1
        print("✅ 1. Added POS tag stripping to untagged content handler")
    else:
        print("❌ 1. Could not find untagged handler anchor")
        return

    # 2. Also strip orphaned/unclosed POS tags BEFORE the main split 
    # This catches cases like "<v>drink" (no closing tag) that the regex can't match
    old_split = "const parts = line.split(/(<[nvadbi]>.*?<\\/[nvadbi]>)/g);"
    new_split = """line = line.replace(/<([nvadbi])>([^<]*?)(?=<[nvadbi]>|$)/g, (m, tag, content) => {
                  if (m.includes('</' + tag + '>')) return m;
                  return '<' + tag + '>' + content + '</' + tag + '>';
              });
              const parts = line.split(/(<[nvadbi]>.*?<\\/[nvadbi]>)/g);"""
    if old_split in content:
        content = content.replace(old_split, new_split, 1)
        changes += 1
        print("✅ 2. Added auto-close for orphaned POS tags before split")
    else:
        print("❌ 2. Could not find split anchor")
        return

    SRC.write_text(content, encoding='utf-8')
    print(f"\n✅ Done! {changes} changes applied.")

if __name__ == "__main__":
    main()
