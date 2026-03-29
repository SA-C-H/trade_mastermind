import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type SupabaseAuthContextValue = {
  session: Session | null;
  ready: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const SupabaseAuthContext = createContext<SupabaseAuthContextValue>({
  session: null,
  ready: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  const bootstrap = useCallback(async () => {
    const { data: { session: existing } } = await supabase.auth.getSession();
    setSession(existing ?? null);
    setReady(true);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
  }, []);

  useEffect(() => {
    void bootstrap();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, [bootstrap]);

  return <SupabaseAuthContext.Provider value={{ session, ready, signInWithGoogle, signOut }}>{children}</SupabaseAuthContext.Provider>;
}
