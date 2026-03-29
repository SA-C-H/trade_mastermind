import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TradingStrategy } from '@/lib/types';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { useI18n } from '@/hooks/use-i18n';
import { requireUserId } from '@/lib/require-user-id';

export const DEFAULT_STRATEGY_ID = 'default';

export function defaultStrategyLabel(locale: 'fr' | 'en'): string {
  return locale === 'fr' ? 'Général' : 'General';
}

export function useTradingStrategies() {
  const { session, ready } = useSupabaseSession();
  const { locale } = useI18n();
  const uid = session?.user?.id;

  return useQuery({
    queryKey: ['trading_strategies', uid, locale],
    enabled: ready && !!uid,
    queryFn: async (): Promise<TradingStrategy[]> => {
      if (!uid) return [];
      let { data, error } = await supabase
        .from('trading_strategies')
        .select('id, name, sort_order')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      if (!data?.length) {
        const { error: insErr } = await supabase.from('trading_strategies').insert({
          user_id: uid,
          id: DEFAULT_STRATEGY_ID,
          name: defaultStrategyLabel(locale),
          sort_order: 0,
        });
        if (insErr) throw insErr;
        ({ data, error } = await supabase
          .from('trading_strategies')
          .select('id, name, sort_order')
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true }));
        if (error) throw error;
      }
      return (data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        sortOrder: r.sort_order,
      }));
    },
  });
}

export function useAddTradingStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const uid = await requireUserId();
      const id = `s-${Date.now()}`;
      const { data: existing } = await supabase
        .from('trading_strategies')
        .select('sort_order')
        .eq('user_id', uid)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      const sortOrder = (existing?.sort_order ?? 0) + 1;
      const { error } = await supabase.from('trading_strategies').insert({
        user_id: uid,
        id,
        name: name.trim(),
        sort_order: sortOrder,
      });
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading_strategies'] });
    },
  });
}

export function useRenameTradingStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const uid = await requireUserId();
      const { error } = await supabase
        .from('trading_strategies')
        .update({ name: name.trim() })
        .eq('user_id', uid)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trading_strategies'] }),
  });
}

export function useDeleteTradingStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (id === DEFAULT_STRATEGY_ID) {
        throw new Error('STRATEGY_DEFAULT_PROTECTED');
      }
      const uid = await requireUserId();
      const { error: delPb } = await supabase
        .from('playbook_conditions')
        .delete()
        .eq('user_id', uid)
        .eq('strategy_id', id);
      if (delPb) throw delPb;
      const { error } = await supabase.from('trading_strategies').delete().eq('user_id', uid).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trading_strategies'] });
      qc.invalidateQueries({ queryKey: ['playbook_conditions'] });
    },
  });
}
