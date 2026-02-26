"""Remove duplicate fluencyBenchmarkGrade/Season declarations."""
FILE = "AlloFlowANTI.txt"
with open(FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find all lines with fluencyBenchmarkGrade declaration
targets = []
for i, line in enumerate(lines):
    if "const [fluencyBenchmarkGrade, setFluencyBenchmarkGrade]" in line:
        targets.append(i)
    if "const [fluencyBenchmarkSeason, setFluencyBenchmarkSeason]" in line:
        targets.append(i)

print(f"Found declarations at line numbers: {[t+1 for t in targets]}")

if len(targets) == 4:
    # Remove the second pair (indices 2 and 3)
    to_remove = sorted([targets[2], targets[3]], reverse=True)
    for idx in to_remove:
        removed = lines.pop(idx)
        print(f"Removed line {idx+1}: {removed.strip()}")
    with open(FILE, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("Fixed! Duplicate declarations removed.")
elif len(targets) == 2:
    print("Only 2 declarations found — no duplicates to fix.")
else:
    print(f"Unexpected count: {len(targets)}. Manual inspection needed.")
