// Public deployment settings, never a client secret or access token.
// Enable only after the school's OAuth/data-handling review. See docs/google_classroom_import.md.
window.ALLOFLOW_CLASSROOM_IMPORT_CONFIG = Object.freeze({
  enabled: false,
  reviewedDeployment: false,
  clientId: '',
  allowedOrigins: [],
  allowedAccountIds: []
});
