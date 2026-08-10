ALTER TABLE jobs
  ADD COLUMN checkpoint_seq INTEGER
  CHECK (
    checkpoint_seq IS NULL
    OR checkpoint_seq BETWEEN 1 AND 1000000
  );

ALTER TABLE jobs
  ADD COLUMN checkpoint_key TEXT
  CHECK (
    checkpoint_key IS NULL
    OR length(checkpoint_key) BETWEEN 1 AND 1024
  );

ALTER TABLE jobs
  ADD COLUMN checkpoint_sha256 TEXT
  CHECK (
    checkpoint_sha256 IS NULL
    OR (
      length(checkpoint_sha256) = 64
      AND checkpoint_sha256 NOT GLOB '*[^0-9a-f]*'
    )
  );

ALTER TABLE jobs
  ADD COLUMN checkpoint_size_bytes INTEGER
  CHECK (
    checkpoint_size_bytes IS NULL
    OR checkpoint_size_bytes > 0
  );

ALTER TABLE jobs
  ADD COLUMN checkpoint_stage TEXT
  CHECK (
    checkpoint_stage IS NULL
    OR length(checkpoint_stage) BETWEEN 1 AND 64
  );

ALTER TABLE jobs
  ADD COLUMN checkpoint_schema TEXT
  CHECK (
    checkpoint_schema IS NULL
    OR length(checkpoint_schema) BETWEEN 1 AND 128
  );

ALTER TABLE jobs
  ADD COLUMN checkpoint_input_sha256 TEXT
  CHECK (
    checkpoint_input_sha256 IS NULL
    OR (
      length(checkpoint_input_sha256) = 64
      AND checkpoint_input_sha256 NOT GLOB '*[^0-9a-f]*'
    )
  );

ALTER TABLE jobs
  ADD COLUMN checkpoint_options_sha256 TEXT
  CHECK (
    checkpoint_options_sha256 IS NULL
    OR (
      length(checkpoint_options_sha256) = 64
      AND checkpoint_options_sha256 NOT GLOB '*[^0-9a-f]*'
    )
  );

ALTER TABLE jobs
  ADD COLUMN checkpoint_engine_sha256 TEXT
  CHECK (
    checkpoint_engine_sha256 IS NULL
    OR (
      length(checkpoint_engine_sha256) = 64
      AND checkpoint_engine_sha256 NOT GLOB '*[^0-9a-f]*'
    )
  );

-- The last column carries the all-or-none invariant for the complete pointer.
-- A blob is not committed until every immutable metadata field is present.
ALTER TABLE jobs
  ADD COLUMN checkpoint_created_at INTEGER
  CHECK (
    (
      checkpoint_created_at IS NULL
      AND checkpoint_seq IS NULL
      AND checkpoint_key IS NULL
      AND checkpoint_sha256 IS NULL
      AND checkpoint_size_bytes IS NULL
      AND checkpoint_stage IS NULL
      AND checkpoint_schema IS NULL
      AND checkpoint_input_sha256 IS NULL
      AND checkpoint_options_sha256 IS NULL
      AND checkpoint_engine_sha256 IS NULL
    )
    OR (
      checkpoint_created_at > 0
      AND checkpoint_seq IS NOT NULL
      AND checkpoint_key IS NOT NULL
      AND checkpoint_sha256 IS NOT NULL
      AND checkpoint_size_bytes IS NOT NULL
      AND checkpoint_stage IS NOT NULL
      AND checkpoint_schema IS NOT NULL
      AND checkpoint_input_sha256 IS NOT NULL
      AND checkpoint_options_sha256 IS NOT NULL
      AND checkpoint_engine_sha256 IS NOT NULL
    )
  );

CREATE UNIQUE INDEX jobs_checkpoint_key_idx
  ON jobs (checkpoint_key)
  WHERE checkpoint_key IS NOT NULL;
