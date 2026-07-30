ALTER TABLE jobs
  ADD COLUMN effort_profile TEXT NOT NULL DEFAULT 'standard'
  CHECK (effort_profile IN ('standard', 'thorough'));

ALTER TABLE jobs
  ADD COLUMN ocr_language TEXT NOT NULL DEFAULT ''
  CHECK (length(ocr_language) <= 40);

ALTER TABLE jobs
  ADD COLUMN polish_passes INTEGER NOT NULL DEFAULT 0
  CHECK (polish_passes BETWEEN 0 AND 3);

ALTER TABLE jobs
  ADD COLUMN auto_continue_rounds INTEGER NOT NULL DEFAULT 0
  CHECK (auto_continue_rounds BETWEEN 0 AND 5);

ALTER TABLE jobs
  ADD COLUMN auto_continue_rounds_run INTEGER
  CHECK (
    auto_continue_rounds_run IS NULL
    OR auto_continue_rounds_run BETWEEN 0 AND 5
  );

ALTER TABLE jobs
  ADD COLUMN report_size_bytes INTEGER
  CHECK (report_size_bytes IS NULL OR report_size_bytes > 0);

ALTER TABLE jobs
  ADD COLUMN report_sha256 TEXT
  CHECK (
    report_sha256 IS NULL
    OR (
      length(report_sha256) = 64
      AND report_sha256 NOT GLOB '*[^0-9a-f]*'
    )
  );

CREATE INDEX uploads_admission_owner_idx
  ON uploads (institution_id, owner_id, status);

CREATE INDEX jobs_admission_active_owner_idx
  ON jobs (institution_id, owner_id, status);

CREATE INDEX jobs_admission_active_institution_idx
  ON jobs (institution_id, status);

CREATE INDEX jobs_admission_daily_owner_idx
  ON jobs (institution_id, owner_id, created_at);

CREATE INDEX jobs_admission_daily_institution_idx
  ON jobs (institution_id, created_at);
