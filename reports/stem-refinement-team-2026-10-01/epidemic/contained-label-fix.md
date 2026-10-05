# Contained observation labels

The coordinator authorized one bounded production change after the 320px browser failure: each new Inquiry table Remove button now establishes a containing block for its absolutely positioned, visually hidden observation number. The accessible name remains “Remove observation N”. Table scrolling, state handlers and model equations are unchanged.

Before editing, source SHA256 was verified as `90b6ea7d146bac5595fd7da4c307d48ed9cc4c2d7c0fa0e0948110f1c29de1a5`, and browser spec SHA256 as `1ebaf84ccc4af6c957c75df6418f521ae76740199e5331f31c12d1356e530ac2`.

The browser regression retains its initial document-width assertion and now verifies that the table is wider than its local scrolling region at 320px, focusing Remove observation 3 scrolls that region, the focused button has its complete accessible name, and document width stays within the viewport after focus, removal, undo, restoration and discard. These behavior checks do not inspect the implementation's CSS property.

The ten mounted state/name/focus tests remain unchanged. No test, browser or build runner was started by this worker. Validation and guarded runtime mirror synchronization remain coordinator-owned.
