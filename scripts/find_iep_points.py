"""Find exact insertion points and label keys for IEP export."""
FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy\src\App.jsx"
with open(FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find export_csv label translation
print("export_csv label key:")
for i, l in enumerate(lines):
    if "export_csv" in l and (":" in l) and i < 20000:
        print(f"  L{i+1}: {l.strip()[:130]}")

# Find student detail panel close/back button area
print("\nStudent detail back buttons:")
for i, l in enumerate(lines):
    if "selectedStudent" in l and "null" in l and "onClick" in l:
        print(f"  L{i+1}: {l.strip()[:130]}")

# Find where to put the IEP button — look for actions near intervention log section
print("\nIntervention Log button area (L14110-14140):")
for i in range(14110, 14150):
    print(f"  L{i+1}: {lines[i].rstrip()[:130]}")

# Find dashboard_export_csv help key for adding export_iep_report help key after it
print(f"\ndashboard_export_csv key line: L37944")
print(f"  {lines[37943].strip()[:130]}")
