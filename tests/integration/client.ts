// Test harness for the Supabase-backed integration suites.
//
// These tests run against a *local* Supabase (never staging/prod). They are
// gated on three env vars so they skip cleanly in CI and on machines without a
// database — see tests/integration/README.md for the one-time setup.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

/** True only when a local Supabase is configured. Use to gate the suites:
 *  `describe.skipIf(!hasTestDb)(...)`. */
export const hasTestDb = Boolean(url && anonKey && serviceRoleKey);

const sessionless = { auth: { persistSession: false, autoRefreshToken: false } };

/** Service-role client (bypasses RLS). Only call when `hasTestDb` is true. */
export function adminClient(): SupabaseClient {
  return createClient(url!, serviceRoleKey!, sessionless);
}

export interface TestUser {
  id: string;
  email: string;
  username: string;
  /** A client already authenticated as this user (so `auth.uid()` is set). */
  client: SupabaseClient;
}

let seq = 0;

/**
 * Create a confirmed auth user and return a client signed in as them. The
 * `profiles` row is created by the `handle_new_user` trigger (migration 0001),
 * which reads the username from `user_metadata`.
 */
export async function createTestUser(): Promise<TestUser> {
  const admin = adminClient();
  const stamp = `${Date.now()}${seq++}`;
  const email = `it_${stamp}@example.test`;
  const password = "Password123!";
  const username = `it_${stamp}`.slice(0, 20);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error || !data.user) throw error ?? new Error("createUser returned no user");

  const client = createClient(url!, anonKey!, sessionless);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { id: data.user.id, email, username, client };
}

/** Delete an auth user; FKs cascade to profile, friendships and notifications. */
export async function deleteTestUser(id: string): Promise<void> {
  await adminClient().auth.admin.deleteUser(id);
}
