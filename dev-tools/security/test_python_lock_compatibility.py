import unittest
from packaging.markers import default_environment
from check_python_lock_compatibility import check_lock, read_lock


class PythonLockCompatibility(unittest.TestCase):
    def test_python_conditional_dependency_cannot_be_lost_on_a_newer_host(self):
        entries = read_lock("example==1.0\n")
        metadata = {"example": {"version": "1.0", "requires_dist": ['typing-extensions>=4.6; python_version < "3.13"']}}
        older = {**default_environment(), "python_version": "3.12", "python_full_version": "3.12.0"}
        newer = {**older, "python_version": "3.14", "python_full_version": "3.14.0"}
        self.assertEqual(check_lock(entries, metadata, newer), [])
        self.assertTrue(any("unpinned" in error for error in check_lock(entries, metadata, older)))
        entries.update(read_lock("typing-extensions==4.16.0\n"))
        metadata["typing-extensions"] = {"version": "4.16.0"}
        self.assertEqual(check_lock(entries, metadata, older), [])

    def test_extras_are_followed_and_incompatible_versions_fail(self):
        entries = read_lock("root==1.0\ncache==1.0\nfilelock==4.0\n")
        metadata = {"root": {"version": "1.0", "requires_dist": ["cache[filecache]"]},
                    "cache": {"version": "1.0", "requires_dist": ['filelock>=5; extra == "filecache"']},
                    "filelock": {"version": "4.0"}}
        self.assertTrue(any("different locked version" in error for error in check_lock(entries, metadata, default_environment())))

    def test_platform_marker_is_respected(self):
        entries = read_lock('root==1.0\nconsole==1.0; sys_platform == "win32"\n')
        metadata = {"root": {"version": "1.0", "requires_dist": ['console; sys_platform == "win32"']},
                    "console": {"version": "1.0"}}
        for platform in ("linux", "win32"):
            self.assertEqual(check_lock(entries, metadata, {**default_environment(), "sys_platform": platform}), [])


if __name__ == "__main__":
    unittest.main()
