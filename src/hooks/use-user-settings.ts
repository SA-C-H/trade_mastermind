import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { requireUserId } from '@/lib/require-user-id';

export type UserSettings = {
  initialCapital: number;
  riskPerTradePercent: number;
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  initialCapital: 1000,
  riskPerTradePercent: 1,
};

export function useUserSettings() {
  const { session, ready } = useSupabaseSession();
  const uid = session?.user?.id;

  return useQuery({
    queryKey: ['user_settings', uid],
    enabled: ready && !!uid,
    queryFn: async (): Promise<UserSettings> => {
      if (!uid) return DEFAULT_USER_SETTINGS;
      const { data, error } = await supabase
        .from('user_settings')
        .select('initial_capital, risk_per_trade_percent')
        .eq('user_id', uid)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Create defaults row
        const { error: insErr } = await supabase.from('user_settings').insert({
          user_id: uid,
          initial_capital: DEFAULT_USER_SETTINGS.initialCapital,
          risk_per_trade_percent: DEFAULT_USER_SETTINGS.riskPerTradePercent,
        });
        if (insErr) throw insErr;
        return DEFAULT_USER_SETTINGS;
      }
      return {
        initialCapital:
          typeof data.initial_capital === 'number' && Number.isFinite(data.initial_capital)
            ? data.initial_capital
            : DEFAULT_USER_SETTINGS.initialCapital,
        riskPerTradePercent:
          typeof data.risk_per_trade_percent === 'number' && Number.isFinite(data.risk_per_trade_percent)
            ? data.risk_per_trade_percent
            : DEFAULT_USER_SETTINGS.riskPerTradePercent,
      };
    },
  });
}

export function useSaveUserSettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (next: UserSettings) => {
      const uid = await requireUserId();
      const { error } = await supabase.from('user_settings').upsert(
        {
          user_id: uid,
          initial_capital: next.initialCapital,
          risk_per_trade_percent: next.riskPerTradePercent,
        },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['user_settings'] });
    },
  });
}

