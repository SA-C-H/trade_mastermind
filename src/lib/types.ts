export type TradingSession = 'London' | 'New York' | 'Asian';
export type TradeDirection = 'long' | 'short';
export type EmotionalState = 'calm' | 'confident' | 'anxious' | 'fearful' | 'greedy' | 'frustrated' | 'neutral';

/** User-defined strategy (slug id + display name); playbook rules are per strategy. */
export interface TradingStrategy {
  id: string;
  name: string;
  sortOrder: number;
}

export interface PlaybookCondition {
  id: string;
  strategyId: string;
  label: string;
  description?: string;
}

export interface TradePlaybookCheck {
  conditionId: string;
  respected: boolean;
}

export interface Trade {
  id: string;
  instrument: string;
  date: string;
  time: string;
  session: TradingSession;
  direction: TradeDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  result: number;
  riskAmount: number;
  riskPercent: number;
  rrRatio: number;
  strategy: string;
  /** Slug id of trading_strategies row; playbook validated against this strategy's rules */
  strategyKey: string;
  reason: string;
  emotionBefore: EmotionalState;
  emotionDuring: EmotionalState;
  emotionAfter: EmotionalState;
  playbookChecks: TradePlaybookCheck[];
  isValid: boolean;
  imagesBefore?: string[];
  imagesAfter?: string[];
  createdAt: string;
}
