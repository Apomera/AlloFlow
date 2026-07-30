PRAGMA foreign_keys = ON;

CREATE TABLE uploads (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (
    status IN (
      'pending',
      'uploading',
      'uploaded',
      'processing',
      'rejected',
      'deleting',
      'deleted'
    )
  ),
  content_type TEXT NOT NULL CHECK (content_type = 'application/pdf'),
  size_bytes INTEGER,
  grant_hash TEXT,
  grant_expires_at INTEGER,
  grant_used_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  uploaded_at INTEGER,
  input_expires_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX uploads_owner_idx
  ON uploads (institution_id, owner_id, id);

CREATE INDEX uploads_cleanup_idx
  ON uploads (status, input_expires_at, deleted_at);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  upload_id TEXT NOT NULL UNIQUE REFERENCES uploads(id),
  institution_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (
    status IN (
      'queued',
      'running',
      'completed',
      'failed',
      'cancelling',
      'cancelled',
      'deleting',
      'deleted'
    )
  ),
  input_key TEXT,
  result_key TEXT,
  report_key TEXT,
  result_content_type TEXT,
  result_size_bytes INTEGER,
  result_sha256 TEXT,
  before_score INTEGER,
  after_score INTEGER,
  target_score INTEGER NOT NULL,
  fix_passes INTEGER NOT NULL,
  error_code TEXT,
  download_grant_hash TEXT,
  download_grant_expires_at INTEGER,
  download_grant_used_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  output_expires_at INTEGER,
  downloaded_at INTEGER,
  deleted_at INTEGER
);

CREATE INDEX jobs_owner_idx
  ON jobs (institution_id, owner_id, id);

CREATE INDEX jobs_cleanup_idx
  ON jobs (status, output_expires_at, deleted_at);
