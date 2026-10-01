"""Save and verify the manifest's exact files without loading the archive in memory."""
import hashlib
import json
from pathlib import Path
import sys
import tarfile

manifest_path = Path(sys.argv[1])
archive_path = Path(sys.argv[2])
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
root = Path(manifest["candidate"]).resolve()
expected = {item["path"]: item["integratedSha256"] for item in manifest["files"]}
expected[manifest_path.name] = hashlib.sha256(manifest_path.read_bytes()).hexdigest()
with tarfile.open(archive_path, "w:gz", compresslevel=3) as archive:
    for item in manifest["files"]:
        source = (root / item["path"]).resolve()
        source.relative_to(root)
        archive.add(source, arcname=item["path"], recursive=False)
    archive.add(manifest_path, arcname=manifest_path.name, recursive=False)

seen = set()
with tarfile.open(archive_path, "r|gz") as archive:
    for item in archive:
        if not item.isfile() or item.name not in expected or item.name in seen:
            raise ValueError(f"Unexpected archive entry: {item.name}")
        digest = hashlib.sha256()
        stream = archive.extractfile(item)
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
        if digest.hexdigest() != expected[item.name]:
            raise ValueError(f"Archive content differs: {item.name}")
        seen.add(item.name)
if seen != set(expected):
    raise ValueError("Archive is missing files")
receipt = {"entriesVerified": len(seen), "archiveBytes": archive_path.stat().st_size,
           "expandedFileBytes": sum(item["bytes"] for item in manifest["files"])}
manifest_path.with_name("integration-archive-verification.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
print(json.dumps(receipt))
