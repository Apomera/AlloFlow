#!/usr/bin/env node
'use strict';

// Compatibility entry point retained for replay scripts and older callers.
// The cycle-02 implementation owns docket generation and all exported behavior.
module.exports = require('./build_eppp_distractor_action_docket_v2.cjs');