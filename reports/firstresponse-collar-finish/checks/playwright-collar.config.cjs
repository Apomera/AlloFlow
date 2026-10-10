const path=require('node:path');
module.exports={
  testDir:__dirname,testMatch:'firstresponse-collar-preview.spec.ts',
  outputDir:path.resolve(process.env.FIRST_RESPONSE_COLLAR_REPORT || __dirname,'artifacts'),
  workers:1,retries:0,reporter:'list',timeout:300000,
  use:{browserName:'chromium',headless:true,trace:'off',video:'off',screenshot:'off',
    launchOptions:{executablePath:'C:/Users/cabba/AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe',
      args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}}
};
