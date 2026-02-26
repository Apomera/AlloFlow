import os

filepath = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

replacement = """    React.useEffect(() => {
        if (initialShowReviewPanel) {
            hasStartedFromReview.current = false;
            debugLog("📋 initialShowReviewPanel is true - forcing Review Panel open");
            setShowReviewPanel(true);
        }
    }, [initialShowReviewPanel]);
"""

start_idx = -1
for i, line in enumerate(lines):
    if "if (initialShowReviewPanel && preloadedWords.length > 0) {" in line:
        # We need to look a bit higher to catch the start of the useEffect
        for offset in range(1, 5):
            if "React.useEffect(() => {" in lines[i - offset]:
                start_idx = i - offset
                break
        if start_idx != -1:
            break

if start_idx != -1:
    end_idx = -1
    for j in range(start_idx, start_idx + 30):
        if "}, [initialShowReviewPanel, preloadedWords.length]);" in lines[j]:
            end_idx = j
            break
            
    if end_idx != -1:
        new_lines = lines[:start_idx] + [replacement] + lines[end_idx+1:]
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print(f"Replacement successful! Replaced lines {start_idx} to {end_idx}.")
    else:
        print("Found start but not end.")
else:
    print("Could not find start index.")
