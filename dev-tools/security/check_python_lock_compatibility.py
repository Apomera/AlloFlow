"""Check installed wheel metadata against lock entries across supported environments.

This checks dependency completeness, including conditional requirements and extras.
It does not execute another Python version or replace platform installation tests.
Run after installing the selected lock with --require-hashes in a clean environment.
"""
import argparse
import importlib.metadata
import pathlib
import sys

from packaging.markers import default_environment
from packaging.requirements import Requirement
from packaging.specifiers import SpecifierSet
from packaging.utils import canonicalize_name


def read_lock(source):
    entries = {}
    for line in source.replace("\\\r\n", " ").replace("\\\n", " ").splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        requirement = Requirement(line.split("--hash=", 1)[0].strip())
        pins = list(requirement.specifier)
        if len(pins) != 1 or pins[0].operator != "==" or "*" in pins[0].version:
            raise ValueError("Expected an exact lock entry: " + requirement.name)
        key = canonicalize_name(requirement.name)
        if key in entries:
            raise ValueError("Duplicate lock entry: " + key)
        entries[key] = (requirement, pins[0].version)
    return entries


def check_lock(entries, metadata, environment):
    errors = set()
    active = {key: value for key, value in entries.items()
              if value[0].marker is None or value[0].marker.evaluate(environment)}
    extras = {key: set(requirement.extras) for key, (requirement, _version) in active.items()}
    changed = True
    while changed:
        changed = False
        for name, (_requirement, version) in active.items():
            package = metadata.get(name)
            if package is None:
                errors.add("Missing installed metadata: " + name)
                continue
            if package["version"] != version:
                errors.add("Installed version differs from lock: " + name)
            if package.get("requires_python") and not SpecifierSet(package["requires_python"]).contains(environment["python_full_version"]):
                errors.add(name + " does not support Python " + environment["python_version"])
            for text in package.get("requires_dist", []):
                dependency = Requirement(text)
                if dependency.marker and not any(dependency.marker.evaluate({**environment, "extra": extra})
                                                 for extra in ["", *extras[name]]):
                    continue
                target = canonicalize_name(dependency.name)
                if dependency.url or target not in active:
                    errors.add(name + " requires an unpinned dependency: " + str(dependency))
                    continue
                if not dependency.specifier.contains(active[target][1]):
                    errors.add(name + " requires a different locked version: " + str(dependency))
                if not dependency.extras.issubset(extras[target]):
                    extras[target].update(dependency.extras)
                    changed = True
    return sorted(errors)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("lock", nargs="?", type=pathlib.Path, default=pathlib.Path(__file__).with_name("requirements.txt"))
    args = parser.parse_args()
    entries = read_lock(args.lock.read_text(encoding="utf-8"))
    metadata = {}
    for name in entries:
        try:
            distribution = importlib.metadata.distribution(name)
        except importlib.metadata.PackageNotFoundError:
            continue
        metadata[name] = {"version": distribution.version,
                          "requires_python": distribution.metadata.get("Requires-Python"),
                          "requires_dist": distribution.requires or []}
    failures = []
    for version in ("3.11", "3.12", "3.13", "3.14"):
        for platform, system, os_name in (("linux", "Linux", "posix"), ("win32", "Windows", "nt")):
            environment = {**default_environment(), "python_version": version, "python_full_version": version + ".0",
                           "implementation_name": "cpython", "implementation_version": version + ".0",
                           "platform_python_implementation": "CPython", "sys_platform": platform,
                           "platform_system": system, "os_name": os_name, "extra": ""}
            failures.extend(version + "/" + platform + ": " + error for error in check_lock(entries, metadata, environment))
    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1
    print(f"{args.lock}: dependency metadata is complete for Python 3.11-3.14 on Linux/Windows ({len(entries)} pins).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
