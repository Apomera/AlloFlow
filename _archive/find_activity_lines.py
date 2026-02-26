
FILE_PATH = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

def find_lines():

    try:
        with open(FILE_PATH, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        with open("found_lines.txt", "w", encoding="utf-8") as out:
            for i, line in enumerate(lines):
                if 'word_families' in line:
                    out.write(f"L{i+1}: {line.strip()[:80]}...\n")
                if 'WordFamiliesView' in line:
                    out.write(f"L{i+1}: {line.strip()[:80]}...\n")
                if 'renderActivityContent' in line:
                    out.write(f"L{i+1}: [FUNC] {line.strip()[:80]}...\n")
                if 'checkAnswer =' in line or 'function checkAnswer' in line:
                     out.write(f"L{i+1}: [DEF] {line.strip()[:80]}...\n")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    find_lines()
