!ifndef BUILD_UNINSTALLER
  !include LogicLib.nsh
  !include nsDialogs.nsh

  ; Friendly, teacher-facing installer chrome. customWelcomePage is the hook
  ; the electron-builder template inserts BEFORE the page flow (customHeader
  ; comes after the pages exist, so MUI defines there are silent no-ops).
  ; The "license" page doubles as an About-this-beta page (installer-about.txt):
  ; what AlloFlow Desktop is, the local-first privacy stance, and an honest
  ; explanation of the unsigned-beta SmartScreen warning.
  !macro customWelcomePage
    !define MUI_WELCOMEPAGE_TITLE "Welcome to AlloFlow Desktop (Beta)"
    !define MUI_WELCOMEPAGE_TEXT "AlloFlow turns your materials into accessible, differentiated learning resources - leveled readers, glossaries, quizzes, visual supports, STEM tools, and live classroom sessions.$\r$\n$\r$\nThe Desktop edition is local-first: classroom sessions stay on your computer and school network, with optional built-in AI (text, images, and voices) that needs no cloud account.$\r$\n$\r$\nClick Next to learn more."
    !define MUI_LICENSEPAGE_TEXT_TOP "A quick word about this beta - including why Windows showed a publisher warning."
    !define MUI_LICENSEPAGE_TEXT_BOTTOM "This beta is provided as-is. Click below to continue."
    !define MUI_LICENSEPAGE_BUTTON "I Understand"
    !define MUI_FINISHPAGE_TITLE "AlloFlow Desktop is ready"
    !define MUI_FINISHPAGE_TEXT "The command center opens on launch. Good first stops: the Classroom Setup Wizard (School Box tab), Voice Engine, and the Built-in AI Engine panel.$\r$\n$\r$\nThank you for teaching with AlloFlow."
    !insertmacro MUI_PAGE_WELCOME
  !macroend

  Var AddDesktopShortcutCheckbox
  Var AddDesktopShortcut
  Var InstallDiagnosticLog
  Var InstallDiagnosticHandle
  Var ResolvedAppExe

  !macro LogInstallDiagnostic LINE
    CreateDirectory "$LOCALAPPDATA\AlloFlow Desktop"
    StrCpy $InstallDiagnosticLog "$LOCALAPPDATA\AlloFlow Desktop\install-diagnostics.txt"
    ClearErrors
    FileOpen $InstallDiagnosticHandle "$InstallDiagnosticLog" a
    ${IfNot} ${Errors}
      FileWrite $InstallDiagnosticHandle "${LINE}$\r$\n"
      FileClose $InstallDiagnosticHandle
    ${EndIf}
  !macroend

  !macro RepairInstalledFile FILE_NAME
    ${IfNot} ${FileExists} "$INSTDIR\${FILE_NAME}"
    ${AndIf} ${FileExists} "$PLUGINSDIR\7z-out\${FILE_NAME}"
      ClearErrors
      CopyFiles /SILENT "$PLUGINSDIR\7z-out\${FILE_NAME}" "$INSTDIR"
      ${If} ${Errors}
        !insertmacro LogInstallDiagnostic "repairFailed=${FILE_NAME}"
      ${Else}
        !insertmacro LogInstallDiagnostic "repairCopied=${FILE_NAME}"
      ${EndIf}
    ${EndIf}
  !macroend

  !macro customInstallMode
    StrCpy $isForceCurrentInstall "1"
  !macroend

  Function DesktopShortcutPage
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 0 100% 24u "Choose whether AlloFlow Desktop should add a shortcut to your desktop."
    Pop $0

    ${NSD_CreateCheckbox} 0 34u 100% 12u "Add a shortcut to my desktop"
    Pop $AddDesktopShortcutCheckbox
    ${NSD_Check} $AddDesktopShortcutCheckbox

    nsDialogs::Show
  FunctionEnd

  Function DesktopShortcutPageLeave
    ${NSD_GetState} $AddDesktopShortcutCheckbox $AddDesktopShortcut
  FunctionEnd

  !macro customPageAfterChangeDir
    Page custom DesktopShortcutPage DesktopShortcutPageLeave
  !macroend

  !macro customInstall
    CreateDirectory "$LOCALAPPDATA\AlloFlow Desktop"
    Delete "$LOCALAPPDATA\AlloFlow Desktop\install-diagnostics.txt"

    !insertmacro LogInstallDiagnostic "---- AlloFlow Desktop install ----"
    !insertmacro LogInstallDiagnostic "INSTDIR=$INSTDIR"
    !insertmacro LogInstallDiagnostic "appExe=$appExe"
    !insertmacro LogInstallDiagnostic "installMode=$installMode"
    !insertmacro LogInstallDiagnostic "newStartMenuLink=$newStartMenuLink"
    !insertmacro LogInstallDiagnostic "newDesktopLink=$newDesktopLink"

    !insertmacro RepairInstalledFile "AlloFlow Desktop.exe"
    !insertmacro RepairInstalledFile "d3dcompiler_47.dll"
    !insertmacro RepairInstalledFile "ffmpeg.dll"
    !insertmacro RepairInstalledFile "libEGL.dll"
    !insertmacro RepairInstalledFile "libGLESv2.dll"
    !insertmacro RepairInstalledFile "vk_swiftshader.dll"
    !insertmacro RepairInstalledFile "vulkan-1.dll"

    StrCpy $ResolvedAppExe "$appExe"
    ${IfNot} ${FileExists} "$ResolvedAppExe"
      StrCpy $ResolvedAppExe "$INSTDIR\AlloFlow Desktop.exe"
    ${EndIf}
    !insertmacro LogInstallDiagnostic "resolvedAppExe=$ResolvedAppExe"

    Delete "$newStartMenuLink"
    Delete "$newDesktopLink"

    ${If} ${FileExists} "$ResolvedAppExe"
      !insertmacro LogInstallDiagnostic "appExeExists=true"

      ${StdUtils.GetParentPath} $R5 "$newStartMenuLink"
      CreateDirectory "$R5"
      CreateShortCut "$newStartMenuLink" "$ResolvedAppExe" "" "$ResolvedAppExe" 0 "" "" "${APP_DESCRIPTION}"
      ClearErrors
      WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"
      !insertmacro LogInstallDiagnostic "createdStartMenuShortcut=$newStartMenuLink"

      ${If} $AddDesktopShortcut == ${BST_CHECKED}
      ${OrIf} ${Silent}
        CreateShortCut "$newDesktopLink" "$ResolvedAppExe" "" "$ResolvedAppExe" 0 "" "" "${APP_DESCRIPTION}"
        ClearErrors
        WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
        !insertmacro LogInstallDiagnostic "createdDesktopShortcut=$newDesktopLink"
      ${Else}
        !insertmacro LogInstallDiagnostic "createdDesktopShortcut=false"
      ${EndIf}

      StrCpy $launchLink "$ResolvedAppExe"
      !insertmacro LogInstallDiagnostic "launchLink=$launchLink"
    ${Else}
      StrCpy $launchLink ""
      !insertmacro LogInstallDiagnostic "appExeExists=false"
      !insertmacro LogInstallDiagnostic "ERROR=Installed app executable is missing after file extraction."
      MessageBox MB_ICONEXCLAMATION|MB_OK "AlloFlow Desktop did not finish installing its app file, so shortcuts were not created. Diagnostic log: $LOCALAPPDATA\AlloFlow Desktop\install-diagnostics.txt"
    ${EndIf}
  !macroend
!endif
