import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { getDefaultTradingPlan } from '@/lib/default-trading-plan';
import type { TradingPlan, TradingPlanSection } from '@/lib/trading-plan-types';
import { requireUserId } from '@/lib/require-user-id';

const STORAGE_KEY = 'trade-mastermind-trading-plan-v1';

function safeReadLocalPlan(): TradingPlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TradingPlan>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.title !== 'string') return null;
    if (!Array.isArray(parsed.sections)) return null;

    const sections: TradingPlanSection[] = parsed.sections
      .filter((s): s is TradingPlanSection => {
        return !!s && typeof s === 'object' && typeof (s as any).id === 'string';
      })
      .map((s) => ({
        id: (s as any).id,
        heading: typeof (s as any).heading === 'string' ? (s as any).heading : '',
        body: typeof (s as any).body === 'string' ? (s as any).body : '',
      }));

    return {
      title: parsed.title,
      sections,
    };
  } catch {
    return null;
  }
}

function safeWriteLocalPlan(plan: TradingPlan): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // ignore storage errors (quota / private mode)
  }
}

function normalizePlan(input: any): TradingPlan {
  const fallback = getDefaultTradingPlan();
  if (!input || typeof input !== 'object') return fallback;
  const title = typeof input.title === 'string' ? input.title : fallback.title;
  const sectionsIn = Array.isArray(input.sections) ? input.sections : [];
  const sections: TradingPlanSection[] = sectionsIn
    .filter((s) => !!s && typeof s === 'object')
    .map((s: any) => ({
      id: typeof s.id === 'string' ? s.id : `sec-${Math.random().toString(16).slice(2)}`,
      heading: typeof s.heading === 'string' ? s.heading : '',
      body: typeof s.body === 'string' ? s.body : '',
    }));
  return { title, sections };
}

export function useTradingPlan() {
  const { session, ready } = useSupabaseSession();
  const uid = session?.user?.id ?? null;

  const initial = useMemo(() => {
    // localStorage exists in browser only; hook might render in SSR-less env but this app is client.
    const fromLocal = safeReadLocalPlan();
    return fromLocal ?? getDefaultTradingPlan();
  }, []);

  const [plan, setPlan] = useState<TradingPlan>(initial);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;

    // Always hydrate from local first so the UI is instant.
    const fromLocal = safeReadLocalPlan();
    const next = fromLocal ?? getDefaultTradingPlan();
    setPlan(next);
    safeWriteLocalPlan(next);
    setIsHydrated(true);
  }, [ready]);

  useEffect(() => {
    if (!ready || !uid) return;

    const load = async () => {
      const client = supabase as any;
      const { data, error } = await client
        .from('trading_plans')
        .select('title, sections')
        .eq('user_id', uid)
        .maybeSingle();

      if (error) {
        // In case Supabase table doesn't exist yet, don't kill the UI.
        console.warn('Failed to load trading plan:', error.message ?? error);
        return;
      }
      if (!data) return;

      const normalized = normalizePlan(data);
      setPlan(normalized);
      safeWriteLocalPlan(normalized);
    };

    void load();
  }, [ready, uid]);

  const savePlan = useCallback(
    async (next: TradingPlan) => {
      setIsSaving(true);
      try {
        const normalized = normalizePlan(next);
        setPlan(normalized);
        safeWriteLocalPlan(normalized);

        const userId = uid ?? (await requireUserId());
        const client = supabase as any;
        const { error } = await client
          .from('trading_plans')
          .upsert(
            {
              user_id: userId,
              title: normalized.title,
              sections: normalized.sections,
            },
            { onConflict: 'user_id' }
          );
        if (error) throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [uid]
  );

  return {
    plan,
    setPlan,
    savePlan,
    isHydrated,
    isSaving,
  };
}

