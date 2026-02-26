"""
Fix: Remove out-of-scope 'cancelled' references by line content matching.
"""

FILE = r"AlloFlowANTI.txt"

def main():
    with open(FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()

    fixes = 0
    lines_to_remove = []

    for i, line in enumerate(lines):
        stripped = line.strip()
        # Only remove standalone 'if (cancelled) return;' lines
        # that are OUTSIDE the useEffect scope (which is at line ~7266-7476)
        if stripped == "if (cancelled) return;" and (i + 1 > 7480 or i + 1 < 7260):
            lines_to_remove.append(i)
            print("Found out-of-scope 'cancelled' at line " + str(i + 1) + ": " + repr(stripped))

    # Remove lines in reverse order to preserve indices
    for idx in reversed(lines_to_remove):
        del lines[idx]
        fixes += 1

    with open(FILE, "w", encoding="utf-8") as f:
        f.writelines(lines)

    print("\nRemoved " + str(fixes) + " out-of-scope 'cancelled' references")

if __name__ == "__main__":
    main()
