-- Dagligt nudge kl. 08:00: kalder captain-nudge edge function, som finder frister
-- inden for 14 dage og skriver en assistant-besked i chat_messages.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'captain-nudge-daily') THEN
    PERFORM cron.unschedule('captain-nudge-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'captain-nudge-daily',
  '0 8 * * *',
  $$
    SELECT net.http_post(
      url := 'https://cevmfwrcpwnyijqabspx.supabase.co/functions/v1/captain-nudge',
      headers := '{"Content-Type":"application/json","apikey":"sb_publishable_LBg3kWXETAC1Tk7EaxWGKA_0G5mo8mE"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);
