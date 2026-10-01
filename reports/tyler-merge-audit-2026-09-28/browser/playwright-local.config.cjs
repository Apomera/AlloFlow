module.exports = {
  "testDir": "C:\\tmp\\tyler_integration_candidate\\tests\\e2e",
  "timeout": 180000,
  "globalTimeout": 1200000,
  "workers": 1,
  "retries": 0,
  "expect": {
    "timeout": 60000
  },
  "reporter": [
    [
      "line"
    ],
    [
      "json",
      {
        "outputFile": "C:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\reports\\tyler-merge-audit-2026-09-28\\browser\\launch-pad-e2e.json"
      }
    ]
  ],
  "outputDir": "C:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\reports\\tyler-merge-audit-2026-09-28\\browser\\e2e-results",
  "use": {
    "baseURL": "http://127.0.0.1:51382/app/",
    "browserName": "chromium",
    "viewport": {
      "width": 1440,
      "height": 1050
    },
    "actionTimeout": 60000,
    "navigationTimeout": 90000,
    "trace": "off",
    "video": "off",
    "screenshot": "only-on-failure"
  }
}