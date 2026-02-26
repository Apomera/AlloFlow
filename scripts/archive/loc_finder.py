
with open('loc_output.txt', 'w') as out:
    try:
        with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
            for i, line in enumerate(f):
                if '_LOAD_INSTRUCTION_AUDIO_RAW' in line:
                    out.write(f"Line {i+1}: _LOAD_INSTRUCTION_AUDIO_RAW found\n")
                if 'checkAnswer =' in line and 'const' in line: # broadly catch
                    out.write(f"Line {i+1}: checkAnswer definition found: {line.strip()[:50]}\n")
                if 'INSTRUCTION_AUDIO' in line and 'const' in line:
                     out.write(f"Line {i+1}: INSTRUCTION_AUDIO const found: {line.strip()[:50]}\n")
    except Exception as e:
        out.write(f"Error: {e}\n")
