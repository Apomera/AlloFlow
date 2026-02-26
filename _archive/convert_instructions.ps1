$basePath = "c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\Instructions List"
$files = @(
    @{key = 'sound_match_start'; file = 'find_all_the_words_that_start_with_the_sound_instruction.webm' },
    @{key = 'sound_match_end'; file = 'find_all_the_words_that_end_with_the_sound_instruction.webm' },
    @{key = 'which_word_did_you_hear'; file = 'which_word_did_you_hear_instruction.webm' },
    @{key = 'word_families_house'; file = '_which_words_belong_in_this_house___instructions.webm' },
    @{key = 'unscramble'; file = 'unscramble_the_sounds_to_make_the_word__instructions.webm' },
    @{key = 'tap_letters'; file = 'tap_the_letters_to_hear_the_sounds_instructionp.webm' }
)

$output = ""
foreach ($item in $files) {
    $path = Join-Path $basePath $item.file
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $b64 = [Convert]::ToBase64String($bytes)
    $output += "    " + $item.key + ": `"data:audio/webm;base64," + $b64 + "`",`n"
}

$output | Out-File -FilePath "c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\new_instruction_audio.txt" -Encoding utf8 -NoNewline
Write-Host "Done. File size:"
(Get-Item "c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\new_instruction_audio.txt").Length
