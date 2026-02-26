import os, shutil, sys
sys.stdout.reconfigure(encoding='utf-8')

# Files to KEEP in root (not archive)
KEEP = {
    'AlloFlowANTI.txt',
    'AllowFlow v0.9 Comprehensive User Manual.txt',
}

# Extensions to archive
ARCHIVE_EXTS = {'.py', '.ps1', '.txt', '.json'}

# Create archive directory
archive_dir = '_archive'
os.makedirs(archive_dir, exist_ok=True)

moved = 0
skipped = 0
errors = []

for fname in os.listdir('.'):
    if not os.path.isfile(fname):
        continue
    if fname in KEEP:
        skipped += 1
        continue
    _, ext = os.path.splitext(fname)
    if ext.lower() in ARCHIVE_EXTS:
        try:
            dest = os.path.join(archive_dir, fname)
            # Handle name collisions
            if os.path.exists(dest):
                base, e = os.path.splitext(fname)
                i = 1
                while os.path.exists(dest):
                    dest = os.path.join(archive_dir, f"{base}_{i}{e}")
                    i += 1
            shutil.move(fname, dest)
            moved += 1
        except Exception as ex:
            errors.append(f"{fname}: {ex}")

print(f"Moved: {moved} files to {archive_dir}/")
print(f"Skipped: {skipped} (kept in root)")
if errors:
    print(f"Errors: {len(errors)}")
    for e in errors[:5]:
        print(f"  {e}")

# Count remaining files in root
remaining = [f for f in os.listdir('.') if os.path.isfile(f)]
print(f"Remaining in root: {len(remaining)} files")
for f in sorted(remaining):
    print(f"  {f}")
