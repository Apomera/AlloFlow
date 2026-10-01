import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Driver=require('../desktop/mcp/remediation_headless_driver.cjs');
const {PDFDocument}=require('../desktop/mcp/vendor/pdf-lib.min.js');
it('renders the complete selected range and refuses a full document exceeding the evidence budget',async()=>{
 const pdf=await PDFDocument.create();for(let i=1;i<=3;i++){const page=pdf.addPage([300,400]);page.drawText('Source page '+i,{x:20,y:200,size:18});}
 const base64=Buffer.from(await pdf.save()).toString('base64');
 const previous=process.env.ALLOFLOW_MCP_MAX_PAGE_IMAGES;
 process.env.ALLOFLOW_MCP_MAX_PAGE_IMAGES='2';
 const driver=Driver.createDriver({onLog:()=>{}});
 try{
  const selected=await driver.renderPdfToPageImages(base64,{pageRange:[2,3]});
  expect(selected).toMatchObject({totalPages:2,sourceTotalPages:3,pageNumbers:[2,3],renderedPages:2,truncated:false});
  expect(selected.pages.every(page=>Buffer.from(page,'base64').length>100)).toBe(true);
  await expect(driver.renderPdfToPageImages(base64)).rejects.toThrow(/page budget/);
  await expect(driver.renderPdfToPageImages(base64,{pageRange:[4,5]})).rejects.toThrow(/outside the PDF/);
 }finally{await driver.close();if(previous===undefined)delete process.env.ALLOFLOW_MCP_MAX_PAGE_IMAGES;else process.env.ALLOFLOW_MCP_MAX_PAGE_IMAGES=previous;}
},120000);
