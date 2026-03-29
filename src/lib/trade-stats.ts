import type { Trade } from '@/lib/types';

export function computeDashboardStats(trades: Trade[]) {
  const totalTrades = trades.length;
  const wins = trades.filter(t => t.result > 0);
  const losses = trades.filter(t => t.result <= 0);
  const winRate = totalTrades ? ((wins.length / totalTrades) * 100).toFixed(1) : '0.0';
  const totalPnL = trades.reduce((sum, t) => sum + t.result, 0);
  const avgRR = totalTrades ? (trades.reduce((sum, t) => sum + t.rrRatio, 0) / totalTrades).toFixed(2) : '0.00';
  const maxRR = totalTrades ? Math.max(...trades.map(t => t.rrRatio)).toFixed(2) : '0.00';
  const validTrades = trades.filter(t => t.isValid).length;
  const disciplineScore = totalTrades ? ((validTrades / totalTrades) * 100).toFixed(1) : '0.0';

  const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const equityCurve = sortedTrades.reduce<{ date: string; pnl: number }[]>((acc, t) => {
    const prev = acc.length ? acc[acc.length - 1].pnl : 0;
    acc.push({ date: t.date, pnl: Number((prev + t.result).toFixed(2)) });
    return acc;
  }, []);

  const rrSparkline = sortedTrades.map((t, i) => ({ i, rr: t.rrRatio }));

  const avgWin = wins.length ? wins.reduce((s, t) => s + t.result, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.result, 0) / losses.length) : 0;
  const expectancy =
    (Number(winRate) / 100) * avgWin - (1 - Number(winRate) / 100) * avgLoss;
  const profitFactor =
    avgLoss > 0 && losses.length
      ? wins.reduce((s, t) => s + t.result, 0) / Math.abs(losses.reduce((s, t) => s + t.result, 0))
      : 0;
  const profitFactorPct = Math.min(profitFactor / 15 * 100, 100);

  const directionData = [
    { side: 'long' as const, value: trades.filter(t => t.direction === 'long').length, fill: 'hsl(217, 90%, 55%)' },
    { side: 'short' as const, value: trades.filter(t => t.direction === 'short').length, fill: 'hsl(142, 70%, 45%)' },
  ];

  const sessionData = ['London', 'New York', 'Asian'].map(s => {
    const sessionTrades = trades.filter(t => t.session === s);
    const sessionWins = sessionTrades.filter(t => t.result > 0);
    return {
      session: s,
      trades: sessionTrades.length,
      winRate: sessionTrades.length ? Math.round((sessionWins.length / sessionTrades.length) * 100) : 0,
      avgRR: sessionTrades.length
        ? Number((sessionTrades.reduce((acc, t) => acc + t.rrRatio, 0) / sessionTrades.length).toFixed(2))
        : 0,
      profit: Number(sessionTrades.reduce((acc, t) => acc + t.result, 0).toFixed(2)),
    };
  });

  const dayPerf = (() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    return days.map(d => {
      const dayTrades = trades.filter(t => {
        const date = new Date(t.date);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return dayNames[date.getDay()] === d;
      });
      const profit = dayTrades.reduce((s, t) => s + t.result, 0);
      const loss = dayTrades.filter(t => t.result < 0).reduce((s, t) => s + t.result, 0);
      return { day: d, profit: Number(Math.max(profit, 0).toFixed(2)), loss: Number(Math.min(loss, 0).toFixed(2)) };
    });
  })();

  const monthlyBuckets = (() => {
    const agg = new Map<string, { pnl: number; count: number; wins: number }>();
    for (const t of trades) {
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const cur = agg.get(key) ?? { pnl: 0, count: 0, wins: 0 };
      cur.pnl += t.result;
      cur.count += 1;
      if (t.result > 0) cur.wins += 1;
      agg.set(key, cur);
    }
    return [...agg.entries()]
      .map(([key, v]) => {
        const [y, m] = key.split('-').map(Number);
        return {
          year: y,
          month: m,
          pnl: Number(v.pnl.toFixed(2)),
          trades: v.count,
          winRate: v.count ? Math.round((v.wins / v.count) * 100) : 0,
        };
      })
      .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));
  })();

  const last30DaysPnl = (() => {
    const byDay = new Map<string, number>();
    for (const t of trades) {
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) continue;
      const dayKey = d.toISOString().slice(0, 10);
      byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + t.result);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows: { dayKey: string; pnl: number }[] = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayKey = d.toISOString().slice(0, 10);
      rows.push({ dayKey, pnl: Number((byDay.get(dayKey) ?? 0).toFixed(2)) });
    }
    return rows;
  })();

  const missedBE = trades.filter(t => t.result < 0 && t.result > -t.riskAmount * 0.3).length;
  const idealAvgRR = wins.length ? (wins.reduce((s, t) => s + t.rrRatio, 0) / wins.length).toFixed(2) : '0';
  const idealMaxRR = wins.length ? Math.max(...wins.map(t => t.rrRatio)).toFixed(2) : '0';

  return {
    totalTrades,
    wins,
    losses,
    winRate,
    totalPnL,
    avgRR,
    maxRR,
    validTrades,
    disciplineScore,
    sortedTrades,
    equityCurve,
    rrSparkline,
    avgWin,
    avgLoss,
    expectancy,
    profitFactor,
    profitFactorPct,
    directionData,
    sessionData,
    dayPerf,
    monthlyBuckets,
    last30DaysPnl,
    missedBE,
    idealAvgRR,
    idealMaxRR,
  };
}

export function computeAnalyticsStats(trades: Trade[]) {
  const hourData = Array.from({ length: 24 }, (_, h) => {
    const hourTrades = trades.filter(t => parseInt(t.time.split(':')[0], 10) === h);
    return { hour: `${String(h).padStart(2, '0')}:00`, pnl: Number(hourTrades.reduce((s, t) => s + t.result, 0).toFixed(2)) };
  });

  const validTrades = trades.filter(t => t.isValid);
  const invalidTrades = trades.filter(t => !t.isValid);
  const validWinRate = validTrades.length ? (validTrades.filter(t => t.result > 0).length / validTrades.length) * 100 : 0;
  const invalidWinRate = invalidTrades.length ? (invalidTrades.filter(t => t.result > 0).length / invalidTrades.length) * 100 : 0;

  const comparisonData = [
    {
      metricId: 'compWinRate' as const,
      valid: Math.round(validWinRate),
      invalid: Math.round(invalidWinRate),
    },
    {
      metricId: 'compAvgRr' as const,
      valid: Number((validTrades.reduce((s, t) => s + t.rrRatio, 0) / (validTrades.length || 1)).toFixed(2)),
      invalid: Number((invalidTrades.reduce((s, t) => s + t.rrRatio, 0) / (invalidTrades.length || 1)).toFixed(2)),
    },
    {
      metricId: 'compAvgPnl' as const,
      valid: Math.round(validTrades.reduce((s, t) => s + t.result, 0) / (validTrades.length || 1)),
      invalid: Math.round(invalidTrades.reduce((s, t) => s + t.result, 0) / (invalidTrades.length || 1)),
    },
  ];

  const emotionPnL = ['calm', 'confident', 'anxious', 'fearful', 'greedy', 'frustrated', 'neutral']
    .map(e => {
      const tlist = trades.filter(t => t.emotionBefore === e);
      return { emotion: e, trades: tlist.length, avgPnL: tlist.length ? Number((tlist.reduce((s, t) => s + t.result, 0) / tlist.length).toFixed(2)) : 0 };
    })
    .filter(e => e.trades > 0);

  const strategies = [...new Set(trades.map(t => t.strategy))];
  const strategyData = strategies.map(s => {
    const tlist = trades.filter(t => t.strategy === s);
    const w = tlist.filter(t => t.result > 0);
    return {
      strategy: s,
      trades: tlist.length,
      winRate: tlist.length ? Math.round((w.length / tlist.length) * 100) : 0,
      pnl: Number(tlist.reduce((sum, t) => sum + t.result, 0).toFixed(2)),
    };
  });

  const dayFreq = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d, i) => {
    const dayMap = [1, 2, 3, 4, 5, 6, 0];
    return { day: d, count: trades.filter(t => new Date(t.date).getDay() === dayMap[i]).length };
  });

  return { hourData, comparisonData, emotionPnL, strategyData, dayFreq };
}
