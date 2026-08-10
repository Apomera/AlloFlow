ALTER TABLE jobs
  ADD COLUMN attempt_id TEXT
  CHECK (
    attempt_id IS NULL
    OR (length(attempt_id) BETWEEN 1 AND 255)
  );

ALTER TABLE jobs
  ADD COLUMN attempt_number INTEGER
  CHECK (
    attempt_number IS NULL
    OR attempt_number BETWEEN 0 AND 100
  );

ALTER TABLE jobs
  ADD COLUMN heartbeat_at INTEGER;

ALTER TABLE jobs
  ADD COLUMN lease_expires_at INTEGER;

ALTER TABLE jobs
  ADD COLUMN run_stage TEXT
  CHECK (
    run_stage IS NULL
    OR run_stage IN (
      'claimed',
      'starting',
      'receiving',
      'running',
      'validating',
      'uploading',
      'releasing',
      'verifying',
      'publishing',
      'completed',
      'cancelling',
      'cancelled',
      'failed',
      'deleting',
      'deleted'
    )
  );

-- Give executions already running during rollout enough time to finish their
-- legacy 30-minute Workflow step plus teardown/publication. Those callbacks
-- cannot adopt the new renewable lease until they return. New executions use
-- the normal five-minute lease and renew it every 30 seconds.
UPDATE jobs
SET attempt_number = 0,
    heartbeat_at = unixepoch(),
    lease_expires_at = unixepoch() + 3600,
    run_stage = 'claimed'
WHERE status = 'running';

CREATE INDEX jobs_running_lease_idx
  ON jobs (status, lease_expires_at);

CREATE INDEX jobs_queued_age_idx
  ON jobs (status, created_at);
