const path=require('path');
module.exports={testDir:path.resolve(__dirname,'../../tests/e2e'),testMatch:['adventure-shared-setup.spec.ts'],workers:1,timeout:120000,retries:0,reporter:'list',use:{browserName:'chromium',video:'off',trace:'off'},outputDir:path.join(__dirname,'contrast-recheck')};
