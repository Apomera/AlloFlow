#!/usr/bin/env node
/** Build the shared Document Builder review-session state module. */
require('./_build_simple_iife_module.js').build({
  name: 'review_document_session',
  guardKey: 'ReviewDocumentSessionModule',
  logTag: 'ReviewDocumentSession'
});
