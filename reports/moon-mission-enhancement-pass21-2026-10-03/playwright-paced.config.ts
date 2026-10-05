import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// The existing vector workflow assumes that optional bloom has initialized
// before it counts unchanged paused draws. Pace protocol actions to let that
// asynchronous visual setup settle; all assertions and timeouts are retained.
export default defineConfig({ ...base,
  use: { ...base.use, launchOptions: { ...base.use?.launchOptions, slowMo: 100 } },
});
