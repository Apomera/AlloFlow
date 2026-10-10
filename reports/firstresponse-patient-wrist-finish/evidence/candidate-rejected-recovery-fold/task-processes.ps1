Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='chrome.exe'" |
  Where-Object { $_.CommandLine -match 'firstresponse|new-chat-14|reclaim-archived-task-copies' } |
  Select-Object ProcessId, ParentProcessId, CommandLine |
  ConvertTo-Json -Depth 3
