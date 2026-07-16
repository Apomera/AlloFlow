!ifndef BUILD_UNINSTALLER
  !include LogicLib.nsh
  !include nsDialogs.nsh

  ; The "Choose your experience" (Full vs Document Remediation) step only
  ; applies to the AlloFlow Desktop product. The Admin Server flavor shares
  ; this script (scripts/build-edition.cjs) but keeps just the shortcut page.
  !ifdef PRODUCT_NAME
    !if "${PRODUCT_NAME}" == "AlloFlow Desktop"
      !define ALLO_EXPERIENCE_CHOICE
    !endif
  !endif

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
  Var ExperienceFullRadio
  Var ExperienceRemediationRadio
  Var ExperienceChoice
  Var EditionMarkerHandle
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

  ; "Choose your experience" + desktop-shortcut page. The experience choice is
  ; how the Document Remediation edition ships: same installer, same app - the
  ; choice is written to a small marker file the desktop shell reads at boot
  ; (see desktop/electron/main.cjs readInstallEditionChoice). Full is the
  ; default; remediation locks the app to the focused document-remediation
  ; screen. Re-running the installer lets the user change the choice.
  Function DesktopShortcutPage
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}

    !ifdef ALLO_EXPERIENCE_CHOICE
      ${NSD_CreateLabel} 0 0 100% 12u "Choose your AlloFlow experience:"
      Pop $0

      ${NSD_CreateRadioButton} 0 14u 100% 12u "Full AlloFlow Desktop (recommended)"
      Pop $ExperienceFullRadio
      ${NSD_AddStyle} $ExperienceFullRadio ${WS_GROUP}
      ${NSD_CreateLabel} 12u 27u 95% 12u "Lessons, classroom sessions, accessibility tools, and more."
      Pop $0

      ${NSD_CreateRadioButton} 0 42u 100% 12u "Document remediation only"
      Pop $ExperienceRemediationRadio
      ${NSD_CreateLabel} 12u 55u 95% 20u "A focused screen that makes PDF, Word, and PowerPoint documents accessible. The rest of the app stays hidden."
      Pop $0

      ${NSD_Check} $ExperienceFullRadio

      ${NSD_CreateCheckbox} 0 84u 100% 12u "Add a shortcut to my desktop"
      Pop $AddDesktopShortcutCheckbox
      ${NSD_AddStyle} $AddDesktopShortcutCheckbox ${WS_GROUP}
    !else
      ${NSD_CreateLabel} 0 0 100% 24u "Choose whether ${PRODUCT_NAME} should add a shortcut to your desktop."
      Pop $0

      ${NSD_CreateCheckbox} 0 34u 100% 12u "Add a shortcut to my desktop"
      Pop $AddDesktopShortcutCheckbox
    !endif
    ${NSD_Check} $AddDesktopShortcutCheckbox

    nsDialogs::Show
  FunctionEnd

  Function DesktopShortcutPageLeave
    ${NSD_GetState} $AddDesktopShortcutCheckbox $AddDesktopShortcut
    !ifdef ALLO_EXPERIENCE_CHOICE
      ${NSD_GetState} $ExperienceRemediationRadio $0
      ${If} $0 == ${BST_CHECKED}
        StrCpy $ExperienceChoice "remediation"
      ${Else}
        StrCpy $ExperienceChoice "desktop"
      ${EndIf}
    !endif
  FunctionEnd

  !macro customPageAfterChangeDir
    Page custom DesktopShortcutPage DesktopShortcutPageLeave
  !macroend

  !macro customInstall
    CreateDirectory "$LOCALAPPDATA\AlloFlow Desktop"
    Delete "$LOCALAPPDATA\AlloFlow Desktop\install-diagnostics.txt"

    !insertmacro LogInstallDiagnostic "---- AlloFlow Desktop install ----"
    !insertmacro LogInstallDiagnostic "INSTDIR=$INSTDIR"

    ; Persist the "Choose your experience" selection where the app reads it
    ; (Electron userData for package name alloflow-desktop). Interactive
    ; installs always write it; silent installs (auto-updates) skip this whole
    ; block so an update never resets the user's choice. Choosing Full deletes
    ; the marker so the baked build flavor decides again.
    !ifdef ALLO_EXPERIENCE_CHOICE
      ${IfNot} ${Silent}
        ${If} $ExperienceChoice == "remediation"
          CreateDirectory "$APPDATA\alloflow-desktop"
          ClearErrors
          FileOpen $EditionMarkerHandle "$APPDATA\alloflow-desktop\desktop-edition.json" w
          ${IfNot} ${Errors}
            FileWrite $EditionMarkerHandle '{ "edition": "remediation" }'
            FileClose $EditionMarkerHandle
          ${EndIf}
        ${Else}
          Delete "$APPDATA\alloflow-desktop\desktop-edition.json"
        ${EndIf}
        !insertmacro LogInstallDiagnostic "experienceChoice=$ExperienceChoice"
      ${EndIf}
    !endif
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
