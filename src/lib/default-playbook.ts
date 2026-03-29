import type { PlaybookCondition } from '@/lib/types';
import type { Locale } from '@/i18n/translations';

const FR: PlaybookCondition[] = [
  { id: 'pb1', label: 'Confluences identifiées (3+)', description: 'Au moins 3 confluences techniques' },
  { id: 'pb2', label: 'Structure de marché claire', description: 'Tendance ou range bien défini' },
  { id: 'pb3', label: 'RR minimum 2:1', description: 'Risk/Reward minimum de 2:1' },
  { id: 'pb4', label: 'Session de trading appropriée', description: 'Trade pris pendant une session active' },
  { id: 'pb5', label: 'Risque ≤ 1% du capital', description: 'Risque par trade respecté' },
];

const EN: PlaybookCondition[] = [
  { id: 'pb1', label: 'Identified confluences (3+)', description: 'At least 3 technical confluences' },
  { id: 'pb2', label: 'Clear market structure', description: 'Well-defined trend or range' },
  { id: 'pb3', label: 'Minimum 2:1 R:R', description: 'Risk/Reward at least 2:1' },
  { id: 'pb4', label: 'Appropriate session', description: 'Trade taken during an active session' },
  { id: 'pb5', label: 'Risk ≤ 1% of capital', description: 'Per-trade risk respected' },
];

export function getDefaultPlaybookConditions(locale: Locale): PlaybookCondition[] {
  return locale === 'en' ? EN : FR;
}
