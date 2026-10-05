module.exports={
  "testDir": "C:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\tests\\e2e",
  "testMatch": [
    "maine-sld-state-comparison.spec.ts",
    "maine-sld-state-requirements.spec.ts"
  ],
  "fullyParallel": false,
  "workers": 1,
  "retries": 0,
  "timeout": 120000,
  "expect": {
    "timeout": 15000
  },
  "reporter": [
    [
      "list"
    ],
    [
      "json",
      {
        "outputFile": "C:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\reports\\maine-sld-state-comparison-2026-10-04\\browser-02\\results.json"
      }
    ]
  ],
  "use": {
    "browserName": "chromium",
    "viewport": {
      "width": 1280,
      "height": 900
    },
    "trace": "retain-on-failure",
    "screenshot": "only-on-failure",
    "video": "off",
    "actionTimeout": 30000,
    "navigationTimeout": 90000
  },
  "outputDir": "C:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\reports\\maine-sld-state-comparison-2026-10-04\\browser-02\\artifacts"
}