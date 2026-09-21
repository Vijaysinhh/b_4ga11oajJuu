# Production auth and RLS cut-over

This release replaces public-table password checks with Supabase Auth. Back up the database and test this process on a branch before production.

`supabase/schema.sql` is a legacy baseline and is not safe to deploy by itself; always apply the migrations through `20260921_production_auth_rls.sql` before exposing a project to clients.

1. Apply `202609210001_prepare_auth.sql`. This only adds `users.auth_user_id` and its index, so the legacy application remains available.
2. Give every account a unique email or phone login. Ten-digit Indian mobile numbers are normalized to `+91` automatically. For legacy display-name usernames, provide a mapping through `AUTH_LOGIN_OVERRIDES_JSON`, for example `AUTH_LOGIN_OVERRIDES_JSON='{"12":"+919876543210"}'`. Export `NEXT_PUBLIC_SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY`, then run `pnpm auth:provision`. The provisioning script validates every login and duplicate before creating any Auth accounts.
3. Verify `select count(*) from public.users where auth_user_id is null;` returns zero.
4. Apply `20260921_production_auth_rls.sql`. It aborts before changing policies if any profile is unmapped.
5. Deploy the application with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY`. Never expose the service-role key with a `NEXT_PUBLIC_` prefix.
6. Test owner, worker, and super-admin sign-in; cross-shop reads/writes; staff creation/password reset/deletion; logout; and session expiry.

After cut-over, the migration nulls mapped legacy passwords. The browser cache is not trusted for authorization, and all tenant access is enforced from the verified Supabase Auth user.
