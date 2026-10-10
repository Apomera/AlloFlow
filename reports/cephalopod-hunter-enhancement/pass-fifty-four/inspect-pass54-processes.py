import ctypes, ctypes.wintypes as W, json, hashlib, re

K = ctypes.WinDLL('kernel32', use_last_error=True)
N = ctypes.WinDLL('ntdll')
class Entry(ctypes.Structure):
    _fields_ = [('dwSize', W.DWORD), ('cntUsage', W.DWORD), ('pid', W.DWORD),
                ('heap', ctypes.c_size_t), ('module', W.DWORD), ('threads', W.DWORD),
                ('parent', W.DWORD), ('priority', W.LONG), ('flags', W.DWORD), ('exe', W.WCHAR * 260)]
class Unicode(ctypes.Structure):
    _fields_ = [('length', W.USHORT), ('maximum', W.USHORT), ('buffer', ctypes.c_void_p)]
class Memory(ctypes.Structure):
    _fields_ = [('length', W.DWORD), ('load', W.DWORD)] + [(s, ctypes.c_ulonglong) for s in
                ['totalPhys', 'availablePhys', 'totalPage', 'availablePage', 'totalVirtual', 'availableVirtual', 'extended']]
K.CreateToolhelp32Snapshot.argtypes = [W.DWORD, W.DWORD]; K.CreateToolhelp32Snapshot.restype = W.HANDLE
K.Process32FirstW.argtypes = [W.HANDLE, ctypes.POINTER(Entry)]; K.Process32FirstW.restype = W.BOOL
K.Process32NextW.argtypes = [W.HANDLE, ctypes.POINTER(Entry)]; K.Process32NextW.restype = W.BOOL
K.OpenProcess.argtypes = [W.DWORD, W.BOOL, W.DWORD]; K.OpenProcess.restype = W.HANDLE
K.CloseHandle.argtypes = [W.HANDLE]; K.CloseHandle.restype = W.BOOL
N.NtQueryInformationProcess.argtypes = [W.HANDLE, W.ULONG, ctypes.c_void_p, W.ULONG, ctypes.POINTER(W.ULONG)]
N.NtQueryInformationProcess.restype = W.LONG

def command_line(pid):
    h = K.OpenProcess(0x1000, False, pid)
    if not h: return ''
    try:
        size = W.ULONG()
        N.NtQueryInformationProcess(h, 60, None, 0, ctypes.byref(size))
        if not (ctypes.sizeof(Unicode) <= size.value <= 1024 * 1024): return ''
        buf = ctypes.create_string_buffer(size.value)
        if N.NtQueryInformationProcess(h, 60, buf, size.value, ctypes.byref(size)) != 0: return ''
        s = ctypes.cast(buf, ctypes.POINTER(Unicode)).contents
        start = ctypes.addressof(buf)
        if not s.buffer or not (start <= s.buffer and s.buffer + s.length <= start + len(buf)): return ''
        return ctypes.wstring_at(s.buffer, s.length // 2)
    finally: K.CloseHandle(h)

snapshot = K.CreateToolhelp32Snapshot(2, 0)
if snapshot == ctypes.c_void_p(-1).value: raise ctypes.WinError(ctypes.get_last_error())
rows = []
try:
    e = Entry(); e.dwSize = ctypes.sizeof(e)
    more = K.Process32FirstW(snapshot, ctypes.byref(e))
    while more:
        if e.exe.lower() in ['node.exe', 'chrome.exe']:
            cmd = command_line(e.pid)
            rows.append(dict(pid=int(e.pid), parent=int(e.parent), exe=e.exe.lower(), cmd=cmd))
        more = K.Process32NextW(snapshot, ctypes.byref(e))
finally: K.CloseHandle(snapshot)

prefix = 'c:/users/cabba/documents/codex/2026-09-29/new-chat-10/pass54-test-temp'
roots = [r for r in rows if r['exe'] == 'chrome.exe' and '--headless' in r['cmd'] and '--user-data-dir' in r['cmd'] and prefix in r['cmd'].replace('\\', '/').lower()]
ids = {r['pid'] for r in roots}
for _ in range(5): ids |= {r['pid'] for r in rows if r['exe'] == 'chrome.exe' and r['parent'] in ids}
owned = [dict(pid=r['pid'], parent=r['parent'], executable=r['exe'], role='task_headless_browser', commandSHA=hashlib.sha256(r['cmd'].encode()).hexdigest()) for r in rows if r['pid'] in ids]
test_roots = [dict(pid=r['pid'], parent=r['parent'], executable=r['exe'], role='task_test_script', script=re.search(r'run-pass54-[^\s"\']+\.cjs',r['cmd']).group(0)) for r in rows if r['exe']=='node.exe' and re.search(r'run-pass54-[^\s"\']+\.cjs',r['cmd'])]
m = Memory(); m.length = ctypes.sizeof(m); K.GlobalMemoryStatusEx(ctypes.byref(m))
result = dict(ownedHeadlessBrowsers=owned, taskTestScripts=test_roots, availableGB=m.availablePhys / 2**30, availableCommitGB=m.availablePage / 2**30)
print(json.dumps(result))
with open('pass54-owned-process-inspection.json', 'w', encoding='utf-8') as f: json.dump(result, f, indent=2)
