; AlloFlow Admin - Custom NSIS Uninstall Script
; Prompts user whether to reset configuration on uninstall

!macro customUnInstall
  ; Ask user if they want to remove configuration
  MessageBox MB_YESNO "Do you also want to remove all AlloFlow configuration and data?$\r$\n$\r$\nChoose YES to reset everything (setup wizard will run on next install).$\r$\nChoose NO to keep your settings for a future reinstall." IDYES removeConfig IDNO keepConfig

  removeConfig:
    ; Stop services
    nsExec::ExecToLog 'taskkill /IM "ollama.exe" /F'
    nsExec::ExecToLog 'taskkill /IM "piper.exe" /F'

    ; Remove .alloflow directory (config, binaries, data)
    RMDir /r "$PROFILE\.alloflow"

    ; Remove Ollama user data
    RMDir /r "$PROFILE\.ollama"

    Goto endConfig

  keepConfig:
    ; Only stop services, don't remove data
    nsExec::ExecToLog 'taskkill /IM "ollama.exe" /F'
    nsExec::ExecToLog 'taskkill /IM "piper.exe" /F'

  endConfig:
!macroend
