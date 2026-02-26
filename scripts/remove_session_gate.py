"""
remove_session_gate.py — Remove the requirement to generate resources before starting 
a live session. Teachers using Bridge mode should be able to start sessions immediately.
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    changes = 0

    # 1. Replace the hard gate with a soft notification
    old_gate = """  const startClassSession = async () => {
    if (history.length === 0) {
        addToast(t('session.error_no_resources'), "error");
        return;
    }"""
    
    new_gate = """  const startClassSession = async () => {
    if (history.length === 0) {
        addToast(t('session.starting_empty') || '📡 Starting session without resources — use Bridge Mode to send content directly!', "info");
    }"""

    if old_gate in content:
        content = content.replace(old_gate, new_gate, 1)
        changes += 1
        print("✅ 1. Replaced hard gate with soft info toast")
    else:
        print("❌ 1. Could not find gate anchor")
        return

    # 2. Also check if there's a disabled condition on the session button UI
    # Search for button disabled state near the session controls
    
    SRC.write_text(content, encoding='utf-8')
    print(f"\n✅ Done! {changes} changes applied.")

if __name__ == "__main__":
    main()
