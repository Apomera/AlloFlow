'use strict';

// This intentionally does not implement ZIP extraction. Supported EPUB input
// goes through remediation_epub_archive.cjs and reaches Ace as an expanded
// directory. An accidental return to the legacy extractor must fail before I/O.
module.exports = async function disabledExtractZip() {
  const error = new Error('Third-party ZIP extraction is disabled. Use the bounded AlloFlow EPUB extraction path.');
  error.code = 'ALLOFLOW_ZIP_EXTRACTION_DISABLED';
  throw error;
};
