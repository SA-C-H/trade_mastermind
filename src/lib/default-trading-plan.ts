import type { TradingPlan } from '@/lib/trading-plan-types';

export function getDefaultTradingPlan(): TradingPlan {
  return {
    title: 'Trading Plan',
    sections: [],
  };
}

