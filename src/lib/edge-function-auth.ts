import { supabase } from '@/integrations/supabase/client';

/**
 * Edge Functions expect Authorization: Bearer <user JWT>, not the anon key.
 * apikey header must still be the Supabase anon/publishable key.
 */
export async function getBearerTokenForEdgeFunctions(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.session?.access_token) {
    throw new Error('EDGE_AUTH_FAILED');
  }
  return data.session.access_token;
}
