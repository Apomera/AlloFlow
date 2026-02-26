"""Apply the mount prop change (#6) with exact whitespace matching."""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    
    # Find the mount and just insert props after t={t}
    old = '<StudentAnalyticsPanel'
    idx = content.find(old)
    if idx < 0:
        print("StudentAnalyticsPanel mount not found!")
        return
    
    # Find t={t} after the mount
    t_anchor = 't={t}'
    t_idx = content.find(t_anchor, idx)
    if t_idx < 0:
        print("t={t} not found after mount!")
        return
    
    # Check if isIndependentMode is already there
    next_chunk = content[t_idx:t_idx+200]
    if 'isIndependentMode' in next_chunk:
        print("isIndependentMode already present in mount - skipping")
        return
    
    # Find the end of the t={t} line
    end_of_t = t_idx + len(t_anchor)
    
    # Get the whitespace pattern between props by looking at the next line
    # The pattern is: t={t}\r\n\r\n              nextProp
    # We need to insert our props using the same pattern
    
    # Find what the line ending looks like after t={t}
    after_t = content[end_of_t:end_of_t+30]
    line_sep = '\r\n' if '\r\n' in after_t else '\n'
    
    # Create the new props with the same spacing
    ws = '              '
    new_props = ''
    props = [
        'isIndependentMode={isIndependentMode}',
        'globalPoints={globalPoints}',
        'globalLevel={globalLevel}',
        'history={history}',
        'wordSoundsHistory={wordSoundsHistory}',
        'phonemeMastery={phonemeMastery}',
        'wordSoundsBadges={wordSoundsBadges}',
        'gameCompletions={gameCompletions}',
    ]
    for p in props:
        new_props += line_sep + line_sep + ws + p
    
    # Insert after t={t}
    content = content[:end_of_t] + new_props + content[end_of_t:]
    
    SRC.write_text(content, encoding='utf-8')
    print("6. Passed props in mount - Done!")

if __name__ == "__main__":
    main()
