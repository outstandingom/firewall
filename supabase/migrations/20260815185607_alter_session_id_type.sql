-- Alter session_id from UUID to VARCHAR(64) since SDK uses custom alphanumeric IDs

-- 1. Drop constraints if they exist (usually there are none for session_id in events/page_views)

-- 2. Alter columns
ALTER TABLE sessions ALTER COLUMN id TYPE VARCHAR(64);
ALTER TABLE events ALTER COLUMN session_id TYPE VARCHAR(64);
ALTER TABLE page_views ALTER COLUMN session_id TYPE VARCHAR(64);
ALTER TABLE errors ALTER COLUMN session_id TYPE VARCHAR(64);
ALTER TABLE network_requests ALTER COLUMN session_id TYPE VARCHAR(64);
ALTER TABLE performance_metrics ALTER COLUMN session_id TYPE VARCHAR(64);
