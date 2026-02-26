"""
Cleanup script: Remove the orphaned duplicate code between the end of the
new processMathHTML function and the MathSymbol component.
"""

FILE = r"AlloFlowANTI.txt"

def main():
    with open(FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    print(f"Total lines before cleanup: {len(lines)}")

    # Find the FIRST "return content;" + "};" pair that ends the new processMathHTML
    # Then find "const MathSymbol" — everything between those should be removed
    
    first_return_end = None
    mathsymbol_line = None
    
    # The new function ends with:
    #     return content;
    # };
    # And then there's garbage until:
    # const MathSymbol = ({ text }) => {
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        # Look for the first "return content;" after line 21620 (0-indexed: 21622)
        if i >= 21622 and first_return_end is None:
            if stripped == "return content;":
                # Check if next non-empty line starts with "};"
                for j in range(i+1, min(i+5, len(lines))):
                    next_stripped = lines[j].strip()
                    if next_stripped == "":
                        continue
                    if next_stripped.startswith("};"):
                        # Check what comes after };
                        after_semi = next_stripped[2:]
                        if after_semi and not after_semi.isspace():
                            # This is the corrupted line "};<garbage>"
                            first_return_end = j  # This is the line to start removing from
                        else:
                            # Clean end — check if there's duplicate code after
                            # Look ahead for second processMathHTML markers
                            first_return_end = j + 1
                        break
                    break
        
        if 'const MathSymbol' in stripped and first_return_end is not None:
            mathsymbol_line = i
            break
    
    if first_return_end is None or mathsymbol_line is None:
        print(f"Could not find boundaries: first_return_end={first_return_end}, mathsymbol_line={mathsymbol_line}")
        return
    
    print(f"Removing lines {first_return_end + 1} to {mathsymbol_line} (1-indexed)")
    print(f"  Line {first_return_end + 1}: {lines[first_return_end].rstrip()[:80]}")
    print(f"  Line {mathsymbol_line + 1}: {lines[mathsymbol_line].rstrip()[:80]}")
    
    # The first_return_end line has "};" + garbage. We need to keep the clean "};", discard garbage
    # Replace the corrupted line with a clean "};"\n
    clean_end = "};\n"
    
    # Build new file: everything up to and including the return line,
    # then a clean "};", then empty line, then MathSymbol onwards
    return_line_idx = first_return_end - 1
    # Find the actual return content line
    for k in range(first_return_end, max(first_return_end - 5, 21622), -1):
        if lines[k].strip() == "return content;":
            return_line_idx = k
            break
    
    new_lines = lines[:return_line_idx + 1]  # Up to and including "return content;"
    new_lines.append(clean_end)
    new_lines.append("\n")
    new_lines.extend(lines[mathsymbol_line:])  # MathSymbol onwards
    
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print(f"Total lines after cleanup: {len(new_lines)}")
    print(f"Removed {len(lines) - len(new_lines)} lines")
    
    # Verify
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    count = content.count("const processMathHTML")
    print(f"processMathHTML definitions found: {count}")
    
    if count == 1:
        print("SUCCESS: Exactly one processMathHTML function exists.")
    else:
        print(f"WARNING: Expected 1 definition but found {count}")
    
    # Verify MathSymbol is intact
    if "const MathSymbol = ({ text })" in content:
        print("VERIFIED: MathSymbol component is intact.")
    else:
        print("WARNING: MathSymbol component may be damaged.")

if __name__ == "__main__":
    main()
