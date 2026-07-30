CREATE INDEX uploads_admission_daily_owner_idx
  ON uploads (institution_id, owner_id, created_at);

CREATE INDEX uploads_admission_daily_institution_idx
  ON uploads (institution_id, created_at);
