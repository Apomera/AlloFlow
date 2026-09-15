const path=require('node:path');
module.exports={...require('./playwright.config.cjs'),workers:1,outputDir:path.join(__dirname,'browser-final')};
