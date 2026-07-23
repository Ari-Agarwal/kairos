-- Fires the n8n growth-tracking workflow (docs/Launch_Plan.md §5's automation
-- stack) on every waitlist signup, replacing manual re-runs of
-- scripts/waitlist-growth-report.mjs.
--
-- Uses pg_net's net.http_post() directly via a custom trigger function,
-- rather than Supabase's supabase_functions.http_request() wrapper -- that
-- wrapper's schema isn't provisioned on this project (the Database Webhooks
-- dashboard UI depends on it and fails with "schema supabase_functions does
-- not exist"). net.http_post() only needs the pg_net extension, already
-- enabled via Database > Extensions.

create or replace function public.notify_waitlist_growth_webhook()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url := 'https://kairosadmissions.app.n8n.cloud/webhook/waitlist-growth',
    headers := '{"Content-type":"application/json","X-Webhook-Secret":"kairos-wg-9f3k2Lp8qXz4Rt7Vb1Nc6Ym0Wd5Ju"}'::jsonb,
    body := to_jsonb(NEW)
  );
  return NEW;
end;
$$;

create trigger waitlist_signups_growth
  after insert on public.waitlist_signups
  for each row execute function public.notify_waitlist_growth_webhook();
