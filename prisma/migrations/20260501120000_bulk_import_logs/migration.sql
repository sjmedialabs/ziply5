-- Optional additive tables for bulk product import audit (no impact on existing product flows).

CREATE TABLE IF NOT EXISTS bulk_import_logs (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    upload_type TEXT NOT NULL,
    total_rows INTEGER NOT NULL,
    success_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT
);

CREATE TABLE IF NOT EXISTS bulk_import_log_items (
    id TEXT PRIMARY KEY,
    log_id TEXT NOT NULL REFERENCES bulk_import_logs(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    sku TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bulk_import_log_items_log_id_idx ON bulk_import_log_items (log_id);
