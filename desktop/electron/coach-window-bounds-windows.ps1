param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9]+$')]
  [string]$Handle
)

$source = @'
using System;
using System.Runtime.InteropServices;
public static class AlloCoachWindowBounds {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr hWnd, uint flags);
  public static bool IsActiveFamily(IntPtr hWnd) {
    IntPtr foreground = GetForegroundWindow();
    if (foreground == hWnd) return true;
    IntPtr targetRoot = GetAncestor(hWnd, 3);
    IntPtr foregroundRoot = GetAncestor(foreground, 3);
    return targetRoot != IntPtr.Zero && targetRoot == foregroundRoot;
  }
}
'@

Add-Type -TypeDefinition $source
$hwnd = [IntPtr]::new([Int64]::Parse($Handle))

while ([AlloCoachWindowBounds]::IsWindow($hwnd)) {
  if ([AlloCoachWindowBounds]::IsWindowVisible($hwnd) -and -not [AlloCoachWindowBounds]::IsIconic($hwnd)) {
    $rect = New-Object AlloCoachWindowBounds+RECT
    if ([AlloCoachWindowBounds]::GetWindowRect($hwnd, [ref]$rect)) {
      $width = $rect.Right - $rect.Left
      $height = $rect.Bottom - $rect.Top
      if ($width -gt 40 -and $height -gt 40) {
        [Console]::Out.WriteLine((@{
          visible = $true
          active = [AlloCoachWindowBounds]::IsActiveFamily($hwnd)
          x = $rect.Left
          y = $rect.Top
          width = $width
          height = $height
        } | ConvertTo-Json -Compress))
      }
    }
  } else {
    [Console]::Out.WriteLine('{"visible":false}')
  }
  Start-Sleep -Milliseconds 250
}

[Console]::Out.WriteLine('{"closed":true}')
