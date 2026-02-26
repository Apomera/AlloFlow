import os

def inject_logs():
    file_path = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    marker = "// --- Throttled Audio Feedback Injection ---"
    
    if marker not in content:
        print("Could not find the injection marker. Has the feedback logic been injected?")
        return

    # Check if logs are already there to avoid double injection
    if "VERIFY_AUDIO: Checking INSTRUCTION_AUDIO..." in content:
        print("Logs already injected.")
        return

    # The marker is followed by "if (isCorrect) {"
    # We want to inject inside that block.
    
    # Let's find the marker index
    marker_index = content.find(marker)
    
    # Find the next "if (isCorrect) {"
    target_str = "if (isCorrect) {"
    insertion_point = content.find(target_str, marker_index)
    
    if insertion_point == -1:
        print("Could not find 'if (isCorrect) {' after marker.")
        return
    
    # Calculate insertion index: end of "if (isCorrect) {" which is insertion_point + len(target_str)
    insert_idx = insertion_point + len(target_str)
    
    log_code = """
             // --- VERIFICATION LOGS ---
             try {
               console.log('VERIFY_AUDIO: Checking INSTRUCTION_AUDIO...');
               if (typeof INSTRUCTION_AUDIO !== 'undefined') {
                   console.log('VERIFY_AUDIO: INSTRUCTION_AUDIO exists');
                   const testKey = 'fb_on_fire';
                   const hasKey = testKey in INSTRUCTION_AUDIO;
                   console.log('VERIFY_AUDIO: Has ' + testKey + '?', hasKey);
                   
                   const val = INSTRUCTION_AUDIO[testKey];
                   console.log('VERIFY_AUDIO: typeof ' + testKey + ':', typeof val);
                   if (typeof val === 'string') {
                       console.log('VERIFY_AUDIO: ' + testKey + ' start:', val.substring(0, 50));
                   } else {
                       console.log('VERIFY_AUDIO: ' + testKey + ' value:', val);
                   }
               } else {
                   console.log('VERIFY_AUDIO: INSTRUCTION_AUDIO is UNDEFINED');
               }
             } catch(e) { console.log('VERIFY_AUDIO: Error in logging', e); }
             // -------------------------
"""
    
    new_content = content[:insert_idx] + log_code + content[insert_idx:]
    
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully injected verification logs.")
    except Exception as e:
        print(f"Error writing file: {e}")

if __name__ == "__main__":
    inject_logs()
