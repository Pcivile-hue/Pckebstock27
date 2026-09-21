/*
# Add user_id to license_activations for per-account trial tracking

1. Changes
- Add `user_id` (uuid, nullable) to `license_activations` — links a trial/activation to a specific auth account.
- Add unique constraint on `user_id` so each account has exactly one license row.
- Update RLS: only authenticated users can read/write their own license row (scoped by user_id = auth.uid()).
- Remove the old anon-open policies since the app now requires sign-in.

2. Security
- SELECT: user can only read their own row (user_id = auth.uid()).
- INSERT: user can only insert a row for themselves (user_id = auth.uid()).
- UPDATE: user can only update their own row.
- DELETE: user can only delete their own row.
- The `user_id` column defaults to auth.uid() so inserts that omit it still work.
*/

ALTER TABLE license_activations
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE license_activations
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Drop old anon-open policies
DROP POLICY IF EXISTS "anon_select_license" ON license_activations;
DROP POLICY IF EXISTS "anon_insert_license" ON license_activations;
DROP POLICY IF EXISTS "anon_update_license" ON license_activations;
DROP POLICY IF EXISTS "anon_delete_license" ON license_activations;

-- New owner-scoped policies
DROP POLICY IF EXISTS "select_own_license" ON license_activations;
CREATE POLICY "select_own_license"
ON license_activations FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_license" ON license_activations;
CREATE POLICY "insert_own_license"
ON license_activations FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_license" ON license_activations;
CREATE POLICY "update_own_license"
ON license_activations FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_license" ON license_activations;
CREATE POLICY "delete_own_license"
ON license_activations FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Ensure one license row per user
DROP INDEX IF EXISTS license_activations_user_id_key;
CREATE UNIQUE INDEX license_activations_user_id_key
ON license_activations (user_id)
WHERE user_id IS NOT NULL;
