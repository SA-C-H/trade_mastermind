import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { translate, type Locale } from '@/i18n/translations';
import { toast } from 'sonner';

function getLocale(): Locale {
  try {
    const s = localStorage.getItem('trade-mastermind-locale');
    if (s === 'fr' || s === 'en') return s;
  } catch {
    /* ignore */
  }
  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export type SupabaseAuthContextValue = {
  session: Session | null;
  ready: boolean;
};

export const SupabaseAuthContext = createContext<SupabaseAuthContextValue>({ session: null, ready: false });

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  const bootstrap = useCallback(async () => {
    const { data: { session: existing } } = await supabase.auth.getSession();
    if (existing) {
      setSession(existing);
      setReady(true);
      return;
    }
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error(error);
      toast.error(translate(getLocale(), 'toast.authAnonymous'));
      setSession(null);
    } else {
      setSession(data.session);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void bootstrap();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, [bootstrap]);

  return (
    <SupabaseAuthContext.Provider value={{ session, ready }}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}
