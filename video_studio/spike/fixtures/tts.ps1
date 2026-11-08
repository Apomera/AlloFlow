param([string]$LinesJson, [string]$OutDir, [int]$Rate = 1)
# Spike narration only: Windows SAPI voices. Production narration is Kokoro (local) per the tutorial compiler.
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.Rate = $Rate
$voices = $s.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
Write-Output ('voices: ' + ($voices -join ', '))
$json = [System.IO.File]::ReadAllText($LinesJson, [System.Text.Encoding]::UTF8)
$lines = $json | ConvertFrom-Json
foreach ($l in $lines) {
  $p = Join-Path $OutDir ($l.id + '.wav')
  $s.SetOutputToWaveFile($p)
  $s.Speak($l.text)
  $s.SetOutputToNull()
}
$s.Dispose()
