
import os

file_path = "AlloFlowANTI.txt"
audio_path = "or_base64.txt"

# Read audio base64 content
if os.path.exists(audio_path):
    with open(audio_path, 'r', encoding='utf-8', errors='ignore') as f:
        # The file contains "PHONEME_AUDIO_BANK['or'] = 'data:...';"
        # We need to extract the data URI part: 'data:...'
        # Or simpler: just grab the whole line and parse it? 
        # But wait, I recall the output was "PHONEME_AUDIO_BANK['or'] = '...';"
        # I want to insert it as a key-value pair in the object: 'or': '...',
        
        content = f.read().strip()
        # Extract content between single quotes
        start_q = content.find("'")
        end_q = content.rfind("'")
        if start_q != -1 and end_q != -1:
            # First quote is usually around 'or', second/third around data.
            # The format is PHONEME_AUDIO_BANK['or'] = 'data...';
            # Finding first quote gives start of 'or'.
            # Finding LAST quote gives end of data.
            # We need the data part.
            parts = content.split(" = ")
            if len(parts) > 1:
                data_part = parts[1].strip().strip(';')
                # data_part is 'data:...' (with quotes)
                # Ensure it has quotes
                if not (data_part.startswith("'") or data_part.startswith('"')):
                     # Maybe already stripped?
                     pass
                
                new_entry = f"    'or': {data_part},"
            else:
                # Fallback if format is weird
                new_entry = None
                print("Could not parse audio file format")
        else:
             new_entry = None
else:
    new_entry = None
    print("Audio file not found")

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = 0

for i, line in enumerate(lines):
    if skip > 0:
        skip -= 1
        continue
        
    line_stripped = line.strip()
    
    # 1. Update PHONEME_AUDIO_BANK
    if "const PHONEME_AUDIO_BANK = {" in line and new_entry:
        new_lines.append(line)
        new_lines.append(new_entry + "\n")
        continue

    # 2. Update RhymeView Definition
    if "const RhymeView = ({ data, showLetterHints, onPlayAudio, onCheckAnswer, isEditing, onUpdateOption }) => {" in line:
        new_lines.append(line.replace("onUpdateOption })", "onUpdateOption, highlightedIndex })"))
        continue

    # 3. Update RhymeView Button Class
    if "className={`p-6 rounded-2xl bg-white border-2 transition-all group text-left cursor-pointer" in line and "playingIndex === i ?" in line:
        new_lines.append(line.replace("playingIndex === i ?", "playingIndex === i || highlightedIndex === i ?"))
        continue

    # 4. Instruction Chaining
    # Match: if (wordSoundsActivity === 'rhyming' && rhymeOptions && rhymeOptions.length > 0) {
    if "if (wordSoundsActivity === 'rhyming' && rhymeOptions && rhymeOptions.length > 0) {" in line:
        new_lines.append(line)
        # Add the fix logic
        new_lines.append("                // FIX: Play target word before options\n")
        new_lines.append("                await new Promise(r => setTimeout(r, 400));\n")
        new_lines.append("                await handleAudio(currentWordSoundsWord);\n")
        continue

    # 5. RhymeView Usage
    # Look for the data prop block start
    # <RhymeView
    #   data={{
    #       word: currentWordSoundsWord,
    #       rhymeWord: wordSoundsPhonemes?.rhymeWord,
    #       options: rhymeOptions
    #   }}
    
    # I'll enable highlightedIndex after `options: rhymeOptions` line or after `}}`
    if "options: rhymeOptions" in line_stripped:
        new_lines.append(line)
        # Check if next line closes the object
        # Since I can't easily peek, I'll just rely on inserting it after `options: rhymeOptions`
        # But wait, `data={{` object. `highlightedIndex` is a separate prop!
        # It must be OUTSIDE `data={{}}`.
        # So I should look for the closing `}}` of data prop? Or find `showLetterHints=` and insert before it?
        continue
        
    if "showLetterHints={showLetterHints}" in line_stripped and "<RhymeView" not in line_stripped:
         # Found likely place to insert prop
         new_lines.append("                            highlightedIndex={highlightedRhymeIndex}\n")
         new_lines.append(line)
         continue
         
    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Patch applied.")
