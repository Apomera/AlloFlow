
import os
import re

# File paths
BASE_DIR = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated'
ALLOFLOW_PATH = os.path.join(BASE_DIR, 'AlloFlowANTI.txt')
FEEDBACK_JS_PATH = os.path.join(BASE_DIR, 'feedback_base64.js')

def load_feedback_data():
    """Reads the feedback_base64.js file and extracts key-value pairs."""
    feedback_data = {}
    with open(FEEDBACK_JS_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
        # Regex to find 'fb_key': "base64...", format
        # Matches: indented 'key': "value",
        matches = re.findall(r"'(\w+)':\s*\"([^\"]+)\"", content)
        for key, val in matches:
            feedback_data[key] = val
    return feedback_data

def inject_audio_data(content, feedback_data):
    """Injects the audio data into the _LOAD_INSTRUCTION_AUDIO_RAW calls."""
    # Find the last _LOAD_INSTRUCTION_AUDIO_RAW call
    # We'll inject our new calls after the last one we find in the top section
    
    lines = content.split('\n')
    insertion_index = -1
    
    # Look for the block of _LOAD calls around line 1200
    for i, line in enumerate(lines):
        if '_LOAD_INSTRUCTION_AUDIO_RAW' in line:
            insertion_index = i
        if i > 2000: # detailed search only in first 2000 lines
            break
            
    if insertion_index == -1:
        print("Could not find insertion point for audio data.")
        return content

    print(f"Injecting audio data after line {insertion_index + 1}")
    
    injection_code = []
    for key, base64 in feedback_data.items():
        # Using the same format as likely existing calls
        # _LOAD_INSTRUCTION_AUDIO_RAW('key', 'base64');
        injection_code.append(f"_LOAD_INSTRUCTION_AUDIO_RAW('{key}', '{base64}');")
    
    lines.insert(insertion_index + 1, '\n'.join(injection_code))
    return '\n'.join(lines)

def inject_feedback_logic(content):
    """Injects the feedback logic into the checkAnswer function."""
    
    # Locate the specific checkAnswer function definition for WordSounds
    # Based on previous context: const checkAnswer = React.useCallback((answer, exp 
    # And logic insertion point around 'const streakCelebration ='
    
    pattern = r'(const streakCelebration = \(newStreak === 5 \|\| newStreak === 10 \|\| newStreak === 25\)\s*\? `.*?`\s*:\s*\'\';)'
    
    # This logic block we want to insert BEFORE setWordSoundsFeedback or AFTER streakCelebration
    # Let's insert it right after streakCelebration definition
    
    if pattern not in content and 'const streakCelebration' in content:
        # Fallback to simple string match if regex fails due to whitespace
        print("Regex for streakCelebration failed, trying simple search...")
        parts = content.split('const streakCelebration = (newStreak === 5 || newStreak === 10 || newStreak === 25)')
        if len(parts) > 1:
            # Reconstruct with insertion
            # The original code continues with ? ... : '';
            # matches the ternary.
            # We will use string replacement on a larger block to be safe.
            pass

    # Better approach: Iterate lines to find the insertion point
    lines = content.split('\n')
    insertion_index = -1
    
    target_line_content = "const streakCelebration = (newStreak === 5 || newStreak === 10 || newStreak === 25)"
    
    for i, line in enumerate(lines):
        if target_line_content in line:
            # We want to insert AFTER the full ternary statement. 
            # The ternary usually spans 3 lines: ? ... : '';
            # Let's look for "setWordSoundsFeedback" which comes shortly after
            for j in range(i, i + 20):
                if 'setWordSoundsFeedback?.({' in lines[j]:
                    insertion_index = i - 1 # Insert BEFORE streakCelebration to define our logic, or AFTER?
                    # The prompt implies we want to play audio. 
                    # Let's insert BEFORE "setWordSoundsFeedback" but AFTER "streakCelebration"
                    insertion_index = j 
                    break
            break
            
    if insertion_index == -1:
        print("Could not find insertion point for feedback logic.")
        return content

    print(f"Injecting feedback logic at line {insertion_index + 1}")
    
    logic_code = """
        // --- Throttled Audio Feedback Injection ---
        if (isCorrect) {
             const feedbackAudioKey = (() => {
                if (newStreak === 5) return 'fb_on_fire';
                if (newStreak === 10) return 'fb_excellent';
                if (newStreak === 25) return 'fb_wow';
                
                // Random positive feedback for high streaks (throttled)
                if (newStreak > 5 && Math.random() < 0.3) {
                     const positiveKeys = ['fb_great_job', 'fb_nice', 'fb_keep_going', 'fb_way_to_go', 'fb_perfect', 'fb_super', 'fb_terrific'];
                     return positiveKeys[Math.floor(Math.random() * positiveKeys.length)];
                }

                // Regular correct answers (throttled)
                if (newStreak < 5 && newStreak % 2 === 0) { 
                     return Math.random() < 0.5 ? 'fb_correct' : 'fb_you_got_it';
                }
                
                return null; 
             })();

             if (feedbackAudioKey) {
                 try {
                     // Check if INSTRUCTION_AUDIO is available globally
                     if (typeof INSTRUCTION_AUDIO !== 'undefined' && INSTRUCTION_AUDIO[feedbackAudioKey]) {
                         const audio = new Audio(INSTRUCTION_AUDIO[feedbackAudioKey]);
                         audio.volume = 0.6; // Slightly lower volume so it doesn't blast
                         audio.play().catch(e => console.log('Audio play error', e));
                     }
                 } catch(err) { console.log('Audio init error', err); }
             }
        }
        // ------------------------------------------
    """
    
    # Check if logic is already injected
    if 'const feedbackAudioKey = (() => {' in content:
        print("Feedback logic already present. Skipping injection.")
        return content

    lines.insert(insertion_index, logic_code)
    return '\n'.join(lines)


def main():
    print("Loading feedback data...")
    feedback_data = load_feedback_data()
    print(f"Loaded {len(feedback_data)} audio keys.")
    
    print("Reading AlloFlowANTI.txt...")
    with open(ALLOFLOW_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
        
    print("Injecting audio data...")
    content = inject_audio_data(content, feedback_data)
    
    print("Injecting feedback logic...")
    content = inject_feedback_logic(content)
    
    print("Writing modified content...")
    with open(ALLOFLOW_PATH, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Done!")

if __name__ == "__main__":
    main()
