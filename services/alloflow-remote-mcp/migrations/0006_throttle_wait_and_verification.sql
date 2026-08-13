ALTER TABLE jobs
  ADD COLUMN throttle_wait_until INTEGER
  CHECK (
    throttle_wait_until IS NULL
    OR throttle_wait_until > 0
  );

ALTER TABLE jobs
  ADD COLUMN verification_state TEXT
  CHECK (
    verification_state IS NULL
    OR verification_state IN (
      'complete',
      'complete-for-tested-scope',
      'review-required',
      'partial',
      'unavailable'
    )
  );

-- Existing completed jobs predate persisted verification state. Treat them as
-- unavailable instead of silently presenting them as fully verified.
UPDATE jobs
SET verification_state = 'unavailable'
WHERE status = 'completed'
  AND verification_state IS NULL;

CREATE INDEX jobs_throttle_wait_idx
  ON jobs (status, throttle_wait_until)
  WHERE throttle_wait_until IS NOT NULL;
