/*
# Create license activations table

1. Purpose
- Tracks each device (by IP hash) that accesses the app.
- Each new device gets a 30-day trial period automatically.
- After the trial expires, the app locks until a valid activation code is entered.
- Activation codes are 5 digits followed by the fixed suffix 07041982 (e.g. 0000107041982).

2. New Tables
- `license_activations`
  - `id` (uuid, primary key)
  - `ip_hash` (text, unique) — SHA-256 hash of the client IP (never store raw IP)
  - `trial_started_at` (timestamptz) — when the trial began
  - `trial_expires_at` (timestamptz) — 30 days after trial start
  - `activated_at` (timestamptz, nullable) — when a valid code was entered
  - `activation_code` (text, nullable) — the code that activated this device
  - `is_activated` (boolean, default false) — true once a valid code is entered
  - `created_at` (timestamptz)

3. Security
- Enable RLS on `license_activations`.
- Allow anon + authenticated CRUD: the app has no sign-in screen; the anon-key client must read/write its own activation row.
- `USING (true)` is acceptable here because the table stores only device-level license state (no user data), and the app has no login.

4. Notes
- The activation logic (trial check, code validation) runs in an edge function so the suffix 07041982 is not exposed in client code.
- The client IP is hashed before storage to avoid storing PII.
*/

CREATE TABLE IF NOT EXISTS license_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text UNIQUE NOT NULL,
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  trial_expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  activated_at timestamptz,
  activation_code text,
  is_activated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE license_activations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_license" ON license_activations;
CREATE POLICY "anon_select_license"
ON license_activations FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_license" ON license_activations;
CREATE POLICY "anon_insert_license"
ON license_activations FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_license" ON license_activations;
CREATE POLICY "anon_update_license"
ON license_activations FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_license" ON license_activations;
CREATE POLICY "anon_delete_license"
ON license_activations FOR DELETE
TO anon, authenticated USING (true);
