import type { Trade } from '@/lib/types';
import type { Locale } from '@/i18n/translations';

export function buildTradeContext(trades: Trade[], locale: Locale): string {
  if (!trades.length) {
    return locale === 'fr'
      ? "Le trader n'a encore aucun trade enregistré dans le journal."
      : 'The trader has no recorded trades in the journal yet.';
  }
  const wins = trades.filter(t => t.result > 0);
  const losses = trades.filter(t => t.result <= 0);
  const totalPnL = trades.reduce((s, t) => s + t.result, 0);
  const winRate = ((wins.length / trades.length) * 100).toFixed(1);
  const avgRR = (trades.reduce((s, t) => s + t.rrRatio, 0) / trades.length).toFixed(2);
  const validCount = trades.filter(t => t.isValid).length;

  if (locale === 'fr') {
    return `Données du trader :
- Total trades : ${trades.length} (${wins.length} gagnants, ${losses.length} perdants)
- Taux de gain : ${winRate}%
- P&L total : $${totalPnL.toFixed(2)}
- R/R moyen : ${avgRR}
- Trades valides : ${validCount}/${trades.length} (${((validCount / trades.length) * 100).toFixed(1)}% discipline)
- Instruments : ${[...new Set(trades.map(t => t.instrument))].join(', ')}
- Stratégies : ${[...new Set(trades.map(t => t.strategy))].join(', ')}

Trades récents :
${trades.slice(0, 5).map(t => `${t.date} | ${t.instrument} ${t.direction} | ${t.strategy} | P&L : $${t.result.toFixed(2)} | R/R : ${t.rrRatio.toFixed(2)} | Émotion : ${t.emotionBefore}→${t.emotionAfter} | Valide : ${t.isValid}`).join('\n')}`;
  }

  return `Here is the trader's data:
- Total trades: ${trades.length} (${wins.length} wins, ${losses.length} losses)
- Win rate: ${winRate}%
- Total P&L: $${totalPnL.toFixed(2)}
- Average RR: ${avgRR}
- Valid trades: ${validCount}/${trades.length} (${((validCount / trades.length) * 100).toFixed(1)}% discipline)
- Instruments: ${[...new Set(trades.map(t => t.instrument))].join(', ')}
- Strategies: ${[...new Set(trades.map(t => t.strategy))].join(', ')}

Recent trades:
${trades.slice(0, 5).map(t => `${t.date} | ${t.instrument} ${t.direction} | ${t.strategy} | P&L: $${t.result.toFixed(2)} | RR: ${t.rrRatio.toFixed(2)} | Emotion: ${t.emotionBefore}→${t.emotionAfter} | Valid: ${t.isValid}`).join('\n')}`;
}

export function aiUserQuestionPrefix(locale: Locale): string {
  return locale === 'fr' ? 'Question :' : 'User question:';
}
