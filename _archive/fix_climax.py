import os

filepath = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

replacement = """          if (aiMasteryScore === undefined && currentClimaxState.isActive) {
              const outcomeType = data.outcomeType || data.rollDetails?.outcomeType || 'neutral';
              let delta = -2; // Default slight penalty to maintain pressure
              if (outcomeType === 'strategic_success') delta = 8;
              else if (outcomeType === 'misconception') delta = -8;
              aiMasteryScore = Math.min(100, Math.max(0, (currentClimaxState.masteryScore || 50) + delta));
          }
          let hiddenMastery = currentClimaxState.masteryScore || 0;
          if (!currentClimaxState.isActive) {
              const outcomeType = data.outcomeType || data.rollDetails?.outcomeType || 'neutral';
              let masteryDelta = -2;
              if (outcomeType === 'strategic_success') masteryDelta = 8;
              else if (outcomeType === 'misconception') masteryDelta = -8;
              hiddenMastery = Math.min(100, Math.max(0, hiddenMastery + masteryDelta));
          }
"""

start_idx = -1
for i, line in enumerate(lines):
    if "if (aiMasteryScore === undefined && currentClimaxState.isActive) {" in line:
        start_idx = i
        break

if start_idx != -1:
    end_idx = -1
    for j in range(start_idx, len(lines)):
        if "hiddenMastery = Math.min(100, Math.max(0, hiddenMastery + masteryDelta));" in lines[j]:
            # The original code has "}" on the next line
            if "}" in lines[j+1]:
                end_idx = j + 1
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
