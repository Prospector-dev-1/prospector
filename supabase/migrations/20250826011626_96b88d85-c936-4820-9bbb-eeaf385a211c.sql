-- Enable pg_cron extension for scheduled cleanup tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup functions to run daily at 2 AM
SELECT cron.schedule(
  'cleanup-old-audit-logs-daily',
  '0 2 * * *', -- Daily at 2 AM
  'SELECT cleanup_old_audit_logs();'
);

SELECT cron.schedule(
  'cleanup-old-sensitive-data-daily', 
  '0 2 * * *', -- Daily at 2 AM
  'SELECT cleanup_old_sensitive_data();'
);

SELECT cron.schedule(
  'cleanup-old-api-logs-daily',
  '0 2 * * *', -- Daily at 2 AM  
  'SELECT cleanup_old_api_logs();'
);

-- Update monthly limits monthly on the 1st at 3 AM
SELECT cron.schedule(
  'reset-monthly-limits-monthly',
  '0 3 1 * *', -- Monthly on 1st at 3 AM
  'SELECT reset_monthly_limits();'
);

-- Update consecutive days daily at 1 AM
SELECT cron.schedule(
  'update-consecutive-days-daily',
  '0 1 * * *', -- Daily at 1 AM
  'SELECT update_consecutive_days();'
);