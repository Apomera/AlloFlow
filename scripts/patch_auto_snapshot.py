"""
Patch AlloFlowANTI.txt to auto-capture snapshots from AI-generated manipulativeSupport/Response.
Also add auto-snapshot toggle next to the auto-attach toggle.
"""
from pathlib import Path

SRC = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
txt = SRC.read_text(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────
# PATCH 1: Add auto-snapshot state variable after autoAttachManipulatives
# ─────────────────────────────────────────────────────────────────────
old_state = "const [autoAttachManipulatives, setAutoAttachManipulatives] = useState(true);"
new_state = """const [autoAttachManipulatives, setAutoAttachManipulatives] = useState(true);
  const [autoSnapshotManipulatives, setAutoSnapshotManipulatives] = useState(true);"""

if old_state in txt:
    txt = txt.replace(old_state, new_state)
    print("PATCH 1 ✅ Added autoSnapshotManipulatives state")
else:
    print("PATCH 1 ❌ Could not find autoAttachManipulatives state")

# ─────────────────────────────────────────────────────────────────────
# PATCH 2: Add auto-snapshot logic after setGeneratedContent in math handler
# ─────────────────────────────────────────────────────────────────────
old_gen = """setGeneratedContent({ type: 'math', data: normalizedContent, id: newItem.id });
          setHistory(prev => [...prev, newItem]);
          console.error('[MATH] Success! Problems generated:', normalizedContent.problems?.length);"""

new_gen = """setGeneratedContent({ type: 'math', data: normalizedContent, id: newItem.id });
          setHistory(prev => [...prev, newItem]);
          // Auto-snapshot: capture manipulative states from AI-generated problems
          if (autoSnapshotManipulatives && normalizedContent.problems) {
            const newSnaps = [];
            normalizedContent.problems.forEach((p, idx) => {
              const manip = p.manipulativeSupport || p.manipulativeResponse;
              if (manip && manip.tool && manip.state) {
                newSnaps.push({
                  id: 'auto-' + Date.now() + '-' + idx,
                  tool: manip.tool,
                  label: 'P' + (idx + 1) + ': ' + (manip.tool === 'base10' ? (manip.state.hundreds || 0) + 'H ' + (manip.state.tens || 0) + 'T ' + (manip.state.ones || 0) + 'O' : manip.tool === 'coordinate' ? (manip.state.points?.length || 0) + ' points' : manip.tool),
                  mode: 'auto',
                  data: manip.state,
                  timestamp: Date.now()
                });
              }
            });
            if (newSnaps.length > 0) {
              setToolSnapshots(prev => [...prev, ...newSnaps]);
              addToast('📸 Auto-captured ' + newSnaps.length + ' manipulative snapshot(s)', 'info');
            }
          }
          console.error('[MATH] Success! Problems generated:', normalizedContent.problems?.length);"""

count2 = txt.count(old_gen)
if count2 > 0:
    txt = txt.replace(old_gen, new_gen, 1)
    print(f"PATCH 2 ✅ Injected auto-snapshot logic ({count2} matches, replaced 1)")
else:
    print("PATCH 2 ❌ Could not find setGeneratedContent block")

# Write back
SRC.write_text(txt, encoding="utf-8")
lines = txt.split("\n")
print(f"\nDone. Lines: {len(lines)}")
