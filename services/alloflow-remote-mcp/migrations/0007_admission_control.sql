CREATE TABLE pilot_admission_control (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  admissions_open INTEGER NOT NULL CHECK (admissions_open IN (0, 1)),
  changed_at INTEGER NOT NULL CHECK (changed_at >= 0),
  changed_by TEXT NOT NULL CHECK (length(changed_by) BETWEEN 1 AND 128),
  change_reason TEXT NOT NULL CHECK (length(change_reason) BETWEEN 1 AND 256),
  paused_at INTEGER,
  pause_token TEXT,
  CHECK (
    (admissions_open = 1 AND paused_at IS NULL AND pause_token IS NULL)
    OR (
      admissions_open = 0
      AND paused_at IS NOT NULL
      AND pause_token IS NOT NULL
      AND length(pause_token) = 36
    )
  )
);

-- Backward compatible: applying the migration does not interrupt admissions.
INSERT INTO pilot_admission_control (
  singleton,
  admissions_open,
  changed_at,
  changed_by,
  change_reason,
  paused_at,
  pause_token
) VALUES (
  1,
  1,
  unixepoch(),
  'migration-0007',
  'default-open admission control',
  NULL,
  NULL
);
