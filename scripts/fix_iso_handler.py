"""Fix: handleOptionUpdate set_correct for isolation should update 'correctSound' not 'correctAnswer'"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# The set_correct handler for isolation updates correctAnswer but the state uses correctSound
old = """            } else if (wordSoundsActivity === 'isolation') {
                // Update isolationState.correctAnswer
                setIsolationState(prev => ({ ...prev, correctAnswer: newValue }));
                debugLog("✏️ Teacher set correct isolation answer to:", newValue);"""

new = """            } else if (wordSoundsActivity === 'isolation') {
                // Update isolationState.correctSound (the key destructured at rendering)
                setIsolationState(prev => ({ ...prev, correctSound: newValue, correctAnswer: newValue }));
                debugLog("✏️ Teacher set correct isolation answer to:", newValue);"""

if old in content:
    content = content.replace(old, new, 1)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("FIXED: handleOptionUpdate set_correct for isolation now updates correctSound")
else:
    print("[WARN] Pattern not found")
