import type { Trade, TradePlaybookCheck } from '@/lib/types';
import type { Tables } from '@/integrations/supabase/types';

type TradeRow = Tables<'trades'>;

export function rowToTrade(row: TradeRow): Trade {
  const checks = (row.playbook_checks ?? []) as TradePlaybookCheck[];
  return {
    id: row.id,
    instrument: row.instrument,
    date: row.trade_date,
    time: row.trade_time,
    session: row.session as Trade['session'],
    direction: row.direction as Trade['direction'],
    entryPrice: row.entry_price,
    stopLoss: row.stop_loss,
    takeProfit: row.take_profit,
    result: row.result,
    riskAmount: row.risk_amount,
    riskPercent: row.risk_percent,
    rrRatio: row.rr_ratio,
    strategy: row.strategy,
    strategyKey: row.strategy_key ?? 'default',
    reason: row.reason,
    emotionBefore: row.emotion_before as Trade['emotionBefore'],
    emotionDuring: row.emotion_during as Trade['emotionDuring'],
    emotionAfter: row.emotion_after as Trade['emotionAfter'],
    playbookChecks: checks,
    isValid: row.is_valid,
    imagesBefore: (row.images_before as string[] | null) ?? undefined,
    imagesAfter: (row.images_after as string[] | null) ?? undefined,
    createdAt: row.created_at,
  };
}

export function computeRrRatio(
  direction: Trade['direction'],
  entry: number,
  stop: number,
  takeProfit: number
): number {
  if (direction === 'long') {
    const risk = entry - stop;
    const reward = takeProfit - entry;
    return risk > 0 ? reward / risk : 0;
  }
  const risk = stop - entry;
  const reward = entry - takeProfit;
  return risk > 0 ? reward / risk : 0;
}
