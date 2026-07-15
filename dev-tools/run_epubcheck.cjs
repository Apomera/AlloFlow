#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function findEpubcheckJar() {
  const explicit = process.env.EPUBCHECK_JAR;
  if (explicit && fs.existsSync(explicit)) return explicit;
  const toolsRoot = path.join(os.homedir(), '.alloflow-tools');
  if (!fs.existsSync(toolsRoot)) return '';
  const versions = fs.readdirSync(toolsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^epubcheck-/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  for (const version of versions) {
    const jar = path.join(toolsRoot, version, 'epubcheck.jar');
    if (fs.existsSync(jar)) return jar;
  }
  return '';
}

async function createSelfTestEpub() {
  const JSZip = require('jszip');
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', '<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  zip.file('OEBPS/content.opf', '<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">urn:uuid:2c32fc67-e0a0-4f5b-b8a2-683793404caa</dc:identifier><dc:title>AlloFlow EPUBCheck self-test</dc:title><dc:language>en</dc:language><meta property="dcterms:modified">2026-07-14T00:00:00Z</meta></metadata><manifest><item id="content" href="content.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="content"/></spine></package>');
  zip.file('OEBPS/content.xhtml', '<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en"><head><title>Self-test</title></head><body><main><h1>Self-test</h1><p>EPUB package validation.</p></main></body></html>');
  zip.file('OEBPS/nav.xhtml', '<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en"><head><title>Contents</title></head><body><nav epub:type="toc"><h1>Contents</h1><ol><li><a href="content.xhtml">Self-test</a></li></ol></nav></body></html>');
  const file = path.join(os.tmpdir(), 'alloflow-epubcheck-self-test.epub');
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' }));
  return file;
}

async function main() {
  const jar = findEpubcheckJar();
  if (!jar) {
    console.error('EPUBCheck not found. Set EPUBCHECK_JAR or install it under ~/.alloflow-tools/epubcheck-<version>/epubcheck.jar.');
    process.exitCode = 2;
    return;
  }

  const requested = process.argv[2];
  const selfTest = !requested || requested === '--self-test';
  const epub = selfTest ? await createSelfTestEpub() : path.resolve(requested);
  if (!fs.existsSync(epub)) {
    console.error('EPUB file not found: ' + epub);
    process.exitCode = 2;
    return;
  }

  const java = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
  console.log('Validating with ' + jar);
  const result = spawnSync(java, ['-jar', jar, epub], { stdio: 'inherit' });
  if (selfTest) {
    try { fs.unlinkSync(epub); } catch (_) {}
  }
  if (result.error) {
    console.error(result.error.message);
    process.exitCode = 2;
    return;
  }
  process.exitCode = Number.isInteger(result.status) ? result.status : 2;
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 2;
});
