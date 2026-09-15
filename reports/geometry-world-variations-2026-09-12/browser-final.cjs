const fs=require('fs');let source=fs.readFileSync(__dirname+'/browser.cjs','utf8');
source=source.replace("check('Duplicate reveals a third project without opening it'", "await frames();check('Keyboard focus follows the newly duplicated project',await page.evaluate(()=>document.activeElement===document.querySelector('.gwe-project-pick[aria-pressed=true]')));check('Duplicate reveals a third project without opening it'");
source=source.replace("await shot('03-focused-piece');", "check('Focused corners stand out while the full-selection frame is hidden',await page.evaluate(()=>!__geoWorldEngine._builderSelectionFrame.visible&&__geoWorldEngine._builderPrintGuide.children[0].material.opacity<.5));await shot('03-focused-piece');");
source=source.replace("check('Return camera restores the previous view'", "await frames();check('Full selection frame returns after inspection',await page.evaluate(()=>__geoWorldEngine._builderSelectionFrame.visible));check('Return camera restores the previous view'");
source=source.replace("bundle:StemLab.geometryWorldBuilderPure.buildGeometryWorldStl(e,e._builderSelection.blocks).connectedComponents", "bundle:StemLab.geometryWorldBuilderPure.buildGeometryWorldStl(e,e._builderSelection.blocks).connectedComponents");
source=source.replace("applied.bundle===1,applied", "applied.bundle===1,{history:applied.history,baseBlocks:applied.base.length,pieces:applied.bundle}");
source=source.replace("path.join(out,'browser.json')", "path.join(out,'browser-final.json')");
new Function('require','__dirname',source)(require,__dirname);
