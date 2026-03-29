import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { rowToTrade } from '@/lib/supabase-mappers';
import { TRADE_IMAGES_BUCKET, uploadTradeImages } from '@/lib/trade-image-upload';
import type { Trade } from '@/lib/types';
import type { TablesInsert } from '@/integrations/supabase/types';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { requireUserId } from '@/lib/require-user-id';

export function useTrades() {
  const { session, ready } = useSupabaseSession();

  return useQuery({
    queryKey: ['trades', session?.user?.id],
    enabled: ready && !!session?.user,
    queryFn: async (): Promise<Trade[]> => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('trade_date', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToTrade);
    },
  });
}

export type NewTradePayload = Omit<TablesInsert<'trades'>, 'user_id' | 'id' | 'created_at'>;

export type CreateTradeWithImagesInput = {
  payload: NewTradePayload;
  filesBefore: File[];
  filesAfter: File[];
};

async function removeStoragePaths(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(TRADE_IMAGES_BUCKET).remove(paths);
  if (error) console.warn('Storage cleanup failed:', error.message);
}

export function useCreateTrade() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ payload, filesBefore, filesAfter }: CreateTradeWithImagesInput) => {
      const uid = await requireUserId();
      const row: TablesInsert<'trades'> = {
        ...payload,
        user_id: uid,
        images_before: null,
        images_after: null,
      };
      const { data: inserted, error } = await supabase.from('trades').insert(row).select('id').single();
      if (error) throw error;
      const tradeId = inserted.id;
      const uploadedPaths: string[] = [];

      try {
        if (filesBefore.length > 0 || filesAfter.length > 0) {
          let beforeUrls: string[] = [];
          let afterUrls: string[] = [];
          if (filesBefore.length > 0) {
            const r = await uploadTradeImages(uid, tradeId, 'before', filesBefore);
            beforeUrls = r.urls;
            uploadedPaths.push(...r.paths);
          }
          if (filesAfter.length > 0) {
            const r = await uploadTradeImages(uid, tradeId, 'after', filesAfter);
            afterUrls = r.urls;
            uploadedPaths.push(...r.paths);
          }
          const { error: upErr } = await supabase
            .from('trades')
            .update({
              images_before: beforeUrls.length ? beforeUrls : null,
              images_after: afterUrls.length ? afterUrls : null,
            })
            .eq('id', tradeId)
            .eq('user_id', uid);
          if (upErr) throw upErr;
        }
        return tradeId;
      } catch (e) {
        await supabase.from('trades').delete().eq('id', tradeId).eq('user_id', uid);
        await removeStoragePaths(uploadedPaths);
        throw e;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trades'] }),
  });
}
