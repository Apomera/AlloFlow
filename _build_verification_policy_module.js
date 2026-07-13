#!/usr/bin/env node
/** Build the canonical remediation verification policy module. */
require('./_build_simple_iife_module.js').build({
  name: 'verification_policy',
  guardKey: 'VerificationPolicyModule',
  logTag: 'VerificationPolicy'
});
