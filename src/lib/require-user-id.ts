import { supabase } from '@/integrations/supabase/client';

/** Error message when no Supabase user session (anonymous auth off or failed). */
export const NOT_SIGNED_IN = 'NOT_SIGNED_IN';

/**
 * Returns auth user id from the current session, or tries anonymous sign-in once.
 * Use inside mutations so the id is always read from Supabase at execution time (no stale React closure).
 */
export async function requireUserId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.session?.user?.id) {
    throw new Error(NOT_SIGNED_IN);
  }
  return data.session.user.id;
}
