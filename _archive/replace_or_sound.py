#!/usr/bin/env python3
"""
Replace the 'or' sound in PHONEME_AUDIO_BANK with new audio from audio_input4/or.webm
"""

import base64
from pathlib import Path
import re

def replace_or_sound(file_path: Path, audio_path: Path):
    # 1. Read the new audio and convert to base64
    audio_data = audio_path.read_bytes()
    b64_audio = base64.b64encode(audio_data).decode('utf-8')
    print(f"✓ Converted {audio_path.name} to base64 ({len(b64_audio)} chars)")
    
    # 2. Read the source file
    content = file_path.read_text(encoding='utf-8')
    
    # 3. Find and replace the 'or' entry
    # Pattern: 'or': "data:audio/webm;base64,..." followed by next entry or comma
    # The 'or' entry should look like: 'or': "data:audio/webm;base64,GkXfo......"
    
    new_data_uri = f'"data:audio/webm;base64,{b64_audio}"'
    
    # Match 'or': followed by a data:audio string
    pattern = r"'or':\s*\"data:audio/webm;base64,[A-Za-z0-9+/=]+\""
    
    matches = list(re.finditer(pattern, content))
    print(f"Found {len(matches)} 'or' entries")
    
    if matches:
        for m in matches:
            start = m.start()
            line_num = content[:start].count('\n') + 1
            snippet = m.group()[:50] + "..."
            print(f"  L{line_num}: {snippet}")
        
        # Replace all matches
        new_value = f"'or': {new_data_uri}"
        content = re.sub(pattern, new_value, content)
        
        file_path.write_text(content, encoding='utf-8')
        print(f"\n✓ Replaced {len(matches)} 'or' entries with new audio")
        return True
    else:
        print("✗ No 'or' entries found with audio data")
        return False

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    audio_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\audio_input4\or.webm")
    
    replace_or_sound(file_path, audio_path)
