; Custom NSIS script for AlloFlow Admin Center to enable UAC elevation
; This script is executed by electron-builder to modify the NSIS installer

RequestExecutionLevel admin

; Add custom installer header code to request admin

!macro preInit
  SetCompress off
  ;SetDatablockOptimize on
  SetBrandingImage "${NSISDIR}\Contrib\Graphics\Icons\modern-header.bmp"
  SpaceTexts none
!macroend

!macro customInit
  ${GetParameters} $0
  ${GetOptions} $0 "/?" $1
  ${If} $1 != ""
    MessageBox MB_OK "AlloFlow Admin Setup"
    ExitCode 0
  ${Endif}
!macroend
