import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('arcade_mode_concept_pictionary.js','utf8');
describe('Solo Pictionary accessible response modes',()=>{
 it('retains a labeled keyboard and nonvisual alternative to drawing',()=>{expect(source).toContain("label:'Describe with words'");expect(source).toContain("htmlFor:'arcade-pictionary-description'");expect(source).toContain("'aria-describedby':'arcade-pictionary-description-help'");});
 it('names the canvas and provides named response and drawing controls',()=>{expect(source).toContain("role:'img'");expect(source).toContain("'aria-describedby':'arcade-pictionary-drawing-instructions'");expect(source).toContain("'aria-label':'Response mode'");expect(source).toContain("h('legend',null,'Drawing tools')");});
 it('supports keyboard undo and redo while preserving the description alternative',()=>{expect(source).toContain("e.ctrlKey||e.metaKey");expect(source).toContain("if(e.shiftKey)redoStroke();else undoStroke()");expect(source).toContain('Interactive drawing canvas. Use the Describe with words mode');});
 it('moves focus to round feedback and announces waiting, notices, and errors',()=>{expect(source).toContain('feedbackRef.current.focus()');expect(source).toContain("role:'status'");expect(source).toContain("role:'alert'");expect(source).toContain('headingRef.current.focus()');});
 it('uses native challenge selection and sufficiently large, visible focus targets',()=>{expect(source).toContain("'data-pic-difficulty':true");expect(source).toContain('min-height:44px');expect(source).toContain('.arcade-pictionary-control:focus-visible');expect(source).toContain('@media(forced-colors:active)');});
 it('keeps AI recognition separate from judgments about learner understanding',()=>{expect(source).toContain('This is not a grade.');expect(source).not.toContain('concepts are still fuzzy in your head');expect(source).not.toContain('% confident');});
});
