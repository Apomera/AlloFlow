"""Fix remaining stale rhymeOptions in the instruction effect (L7018-7023)."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

changes = 0

# Find the specific rhyme section in the INSTRUCTION effect (around L7018)
# Look for: if (wordSoundsActivity === 'rhyming' && rhymeOptions && rhymeOptions.length > 0) {
# This is the one near "Auto-play all options with highlighting"
for i, l in enumerate(lines):
    if "Auto-play all options with highlighting" in l:
        print("Found rhyme section comment at L%d" % (i+1))
        # The if condition should be right after
        for j in range(i, i + 5):
            if "rhymeOptions && rhymeOptions.length > 0" in lines[j]:
                lines[j] = lines[j].replace(
                    "rhymeOptions && rhymeOptions.length > 0",
                    "rhymeOptionsRef.current && rhymeOptionsRef.current.length > 0"
                )
                print("Fixed condition at L%d" % (j+1))
                changes += 1
                
                # Fix the for loop and handleAudio call
                for k in range(j + 1, j + 15):
                    if 'rhymeOptions.length' in lines[k] and 'for' in lines[k]:
                        lines[k] = lines[k].replace('rhymeOptions.length', 'rhymeOptionsRef.current.length')
                        print("Fixed for loop at L%d" % (k+1))
                        changes += 1
                    if 'handleAudio(rhymeOptions[' in lines[k]:
                        lines[k] = lines[k].replace('rhymeOptions[', 'rhymeOptionsRef.current[')
                        print("Fixed handleAudio at L%d" % (k+1))
                        changes += 1
                
                # Add TTS pre-cache before the for loop
                for k in range(j + 1, j + 10):
                    if 'for (let i = 0;' in lines[k]:
                        precache = [
                            '                    // PRE-CACHE TTS for all rhyme options simultaneously\n',
                            '                    try {\n',
                            '                        await Promise.allSettled(rhymeOptionsRef.current.map(w => callTTS(w)));\n',
                            "                    } catch(e) { debugLog('Rhyme TTS pre-cache error:', e); }\n",
                        ]
                        for m, pl in enumerate(precache):
                            lines.insert(k + m, pl)
                        print("Added TTS pre-cache at L%d" % (k+1))
                        changes += 1
                        break
                break
        break

# Write
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

# Fix double CRs
with open(FILE, 'rb') as f:
    raw = f.read()
dbl = raw.count(b'\r\r\n')
if dbl > 0:
    raw = raw.replace(b'\r\r\n', b'\r\n')
    with open(FILE, 'wb') as f:
        f.write(raw)
    print("Fixed %d double CRs" % dbl)

print("Total changes: %d" % changes)
print("DONE")
