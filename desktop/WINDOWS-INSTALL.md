# Installing AlloFlow Desktop on Windows

## Recommended download

Use `AlloFlow-Desktop-<version>-setup.exe`. The combined installer contains both supported Windows payloads and selects the correct one automatically.

The architecture-specific downloads are mainly for troubleshooting:

- `x64` is for almost every Intel or AMD Windows computer.
- `arm64` is for Windows computers with a Qualcomm Snapdragon processor.
Do not run the x64-only installer on a Snapdragon/ARM64 computer even though Windows can emulate many x64 applications; use the combined or ARM64 installer. Architecture-specific installers stop before extraction with a clear message and exit code 2 when used on the wrong CPU.

- AlloFlow Desktop does not support 32-bit Windows.

You can check a computer under **Settings > System > About > System type**. AlloFlow Desktop supports 64-bit Windows 10 and Windows 11; Windows 11 is recommended.

## Verify before installing

Production installers must be Authenticode-signed. Right-click the downloaded `.exe`, choose **Properties**, and check **Digital Signatures**. Compare the file's SHA-256 value with `SHA256SUMS-windows.txt` from the same release:

```powershell
Get-FileHash -Algorithm SHA256 .\AlloFlow-Desktop-*-setup.exe
```

If Windows says **Unknown publisher**, the file is an unsigned test build. Do not distribute it as a production installer or bypass the warning unless you trust its exact source and have verified its checksum.

## What the installer needs

- The default installation is per-user and does not require administrator access.
- If you choose a protected location such as `C:\Program Files`, Windows will request administrator approval.
- Windows in S mode only allows Microsoft Store apps. A system administrator must approve a different deployment path, or the device must leave S mode before this installer can run.
- A school or company policy can block all non-approved applications even when an installer is correctly signed. In that case, provide the signed installer and checksum to the administrator.

## If installation fails

Record the exact Windows message and check:

1. The computer is running 64-bit Windows 10 or Windows 11.
2. The selected installer matches the CPU, or use the combined installer.
3. The file has a valid Digital Signatures tab and matches the published SHA-256 checksum.
4. The computer is not in S mode and is not blocking the app through an organization policy.
5. There is enough free disk space for the installer and extracted application.

After the installer starts, AlloFlow writes a diagnostic log here:

```text
%LOCALAPPDATA%\AlloFlow Desktop\install-diagnostics.txt
```

Send that file together with a screenshot of the Windows error when requesting support. If no diagnostic file exists, Windows blocked the installer before AlloFlow code ran; signature, SmartScreen, S mode, or organization policy is the likely cause.
