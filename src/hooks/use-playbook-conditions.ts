import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlaybookCondition } from '@/lib/types';
import { getDefaultPlaybookConditions } from '@/lib/default-playbook';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { useI18n } from '@/hooks/use-i18n';
import { requireUserId } from '@/lib/require-user-id';
import { DEFAULT_STRATEGY_ID } from '@/hooks/use-trading-strategies';

export function usePlaybookConditions(strategyId: string | null) {
  const { session, ready } = useSupabaseSession();
  const { locale } = useI18n();
  const uid = session?.user?.id;

  return useQuery({
    queryKey: ['playbook_conditions', uid, strategyId, locale],
    enabled: ready && !!uid && !!strategyId,
    queryFn: async (): Promise<PlaybookCondition[]> => {
      if (!uid || !strategyId) return [];
      let { data, error } = await supabase
        .from('playbook_conditions')
        .select('id, strategy_id, label, description')
        .eq('strategy_id', strategyId)
        .order('id');
      if (error) throw error;
      if (!data?.length && strategyId === DEFAULT_STRATEGY_ID) {
        const seeds = getDefaultPlaybookConditions(locale).map((c) => ({
          user_id: uid,
          strategy_id: DEFAULT_STRATEGY_ID,
          id: c.id,
          label: c.label,
          description: c.description ?? null,
        }));
        const ins = await supabase.from('playbook_conditions').insert(seeds);
        if (ins.error) throw ins.error;
        ({ data, error } = await supabase
          .from('playbook_conditions')
          .select('id, strategy_id, label, description')
          .eq('strategy_id', strategyId)
          .order('id'));
        if (error) throw error;
      }
      return (data ?? []).map((r) => ({
        id: r.id,
        strategyId: r.strategy_id,
        label: r.label,
        description: r.description ?? undefined,
      }));
    },
  });
}

export function useAddPlaybookCondition() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { strategyId: string; id: string; label: string; description?: string }) => {
      const uid = await requireUserId();
      const { error } = await supabase.from('playbook_conditions').insert({
        user_id: uid,
        strategy_id: input.strategyId,
        id: input.id,
        label: input.label,
        description: input.description ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playbook_conditions'] }),
  });
}

export function useDeletePlaybookCondition() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { strategyId: string; id: string }) => {
      const uid = await requireUserId();
      const { error } = await supabase
        .from('playbook_conditions')
        .delete()
        .eq('user_id', uid)
        .eq('strategy_id', input.strategyId)
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['playbook_conditions'] }),
  });
}
