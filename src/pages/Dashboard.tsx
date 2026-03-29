import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrades } from '@/hooks/use-trades';
import { computeDashboardStats } from '@/lib/trade-stats';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { useI18n } from '@/hooks/use-i18n';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Target, BarChart3, CheckCircle2, XCircle, Info } from 'lucide-react';

const tooltipWrapperStyle = { outline: 'none', border: 'none', boxShadow: 'none' };

export default function Dashboard() {
  const { t } = useI18n();
  const [pnlTab, setPnlTab] = useState<'all' | 'day' | '1h' | '15m'>('all');
  const { ready } = useSupabaseSession();
  const { data: trades = [], isLoading, isError, error } = useTrades();
  const stats = useMemo(() => computeDashboardStats(trades), [trades]);

  const {
    totalTrades,
    wins,
    losses,
    winRate,
    totalPnL,
    avgRR,
    maxRR,
    validTrades,
    disciplineScore,
    equityCurve,
    rrSparkline,
    sortedTrades,
    avgWin,
    avgLoss,
    expectancy,
    profitFactor,
    profitFactorPct,
    directionData,
    sessionData,
    dayPerf,
    missedBE,
    idealAvgRR,
    idealMaxRR,
  } = stats;

  const tooltipStyle = useMemo(
    () => ({
      background: 'hsl(var(--popover))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
      color: 'hsl(var(--popover-foreground))',
      boxShadow: 'none',
    }),
    []
  );

  const directionPieData = useMemo(
    () => directionData.map((d) => ({ ...d, name: t(`direction.${d.side}`) })),
    [directionData, t]
  );

  const kpis = useMemo(
    () => [
      { label: t('dashboard.kpiTotalTrades'), value: totalTrades, icon: BarChart3, color: 'text-accent' },
      { label: t('dashboard.kpiWinRate'), value: `${winRate}%`, icon: Target, color: 'text-primary' },
      {
        label: t('dashboard.kpiTotalPnl'),
        value: `$${totalPnL.toFixed(2)}`,
        icon: totalPnL >= 0 ? TrendingUp : TrendingDown,
        color: totalPnL >= 0 ? 'text-primary' : 'text-destructive',
      },
      { label: t('dashboard.kpiAvgRr'), value: avgRR, icon: TrendingUp, color: 'text-accent' },
      { label: t('dashboard.kpiValidTrades'), value: `${validTrades}/${totalTrades}`, icon: CheckCircle2, color: 'text-primary' },
      {
        label: t('dashboard.kpiDiscipline'),
        value: `${disciplineScore}%`,
        icon: Number(disciplineScore) >= 70 ? CheckCircle2 : XCircle,
        color: Number(disciplineScore) >= 70 ? 'text-primary' : 'text-destructive',
      },
    ],
    [t, totalTrades, winRate, totalPnL, avgRR, validTrades, disciplineScore]
  );

  const radarCharts = useMemo(
    () =>
      [
        { titleKey: 'dashboard.radarWinRate' as const, dataKey: 'winRate' as const },
        { titleKey: 'dashboard.radarTotalTrades' as const, dataKey: 'trades' as const },
        { titleKey: 'dashboard.radarAvgRr' as const, dataKey: 'avgRR' as const },
        { titleKey: 'dashboard.radarProfit' as const, dataKey: 'profit' as const },
      ].map((c) => ({ ...c, title: t(c.titleKey) })),
    [t]
  );

  if (!ready || isLoading) {
    return (
      <div className="p-4 lg:p-6 text-sm text-muted-foreground">{t('dashboard.loading')}</div>
    );
  }
  if (isError) {
    return (
      <div className="p-4 lg:p-6 text-sm text-destructive">
        {t('dashboard.loadError')}: {error instanceof Error ? error.message : t('common.error')}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={`text-xl font-semibold font-mono ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Profits et pertes - Equity Curve */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">{t('dashboard.pnlTitle')}</CardTitle>
              <p className="text-xs text-muted-foreground">{t('dashboard.pnlSubtitle')}</p>
            </div>
            <div className="flex items-center gap-0 bg-muted/30 rounded-lg border border-border">
              {(['all', 'day', '1h', '15m'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setPnlTab(tab)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors rounded-md ${
                    pnlTab === tab ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'all' ? t('dashboard.tabAll') : tab === 'day' ? t('dashboard.tabDay') : tab === '1h' ? t('dashboard.tab1h') : t('dashboard.tab15m')}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* P&L KPIs row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">{t('dashboard.totalPnl')} <Info className="h-3 w-3" /></p>
              <p className={`text-xl font-semibold font-mono ${totalPnL >= 0 ? 'text-primary' : 'text-destructive'}`}>
                ${totalPnL.toFixed(2)}
              </p>
              <span className="text-xs text-primary">⬆ {((totalPnL / 1000) * 100).toFixed(2)}%</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">{t('dashboard.accountBalance')} <Info className="h-3 w-3" /></p>
              <p className="text-xl font-semibold font-mono text-foreground">${(1000 + totalPnL).toFixed(2)}</p>
              <span className="text-xs text-primary">⬆ {((totalPnL / 1000) * 100).toFixed(2)}%</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">{t('dashboard.winRate')} <Info className="h-3 w-3" /></p>
              <p className="text-xl font-semibold font-mono text-foreground">{winRate}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">{t('dashboard.totalOps')} <Info className="h-3 w-3" /></p>
              <p className="text-xl font-semibold font-mono text-foreground">{totalTrades} <span className="text-sm text-muted-foreground">{wins.length}/{losses.length}</span></p>
            </div>
            <div className="hidden lg:block">
              <p className="text-xs text-muted-foreground flex items-center gap-1">{t('dashboard.breakevenOps')} <Info className="h-3 w-3" /></p>
              <p className="text-xl font-semibold font-mono text-foreground">{trades.filter(t => Math.abs(t.result) < 5).length}</p>
            </div>
          </div>
          {/* Equity curve */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve}>
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(217, 90%, 55%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(217, 90%, 55%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="5 5" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyle} cursor={false} />
                <Area type="monotone" dataKey="pnl" stroke="hsl(217, 90%, 55%)" strokeWidth={2} fill="url(#pnlGrad)" dot={{ r: 3, fill: 'hsl(0, 0%, 100%)', stroke: 'hsl(217, 90%, 55%)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* RR Metrics Cards with sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">{t('dashboard.rrAvg')} <Info className="h-3 w-3" /></p>
                <p className="text-2xl font-semibold font-mono text-foreground">{avgRR}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">{t('dashboard.rrMax')} <Info className="h-3 w-3" /></p>
                <p className="text-2xl font-semibold font-mono text-foreground">{maxRR}</p>
              </div>
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rrSparkline}>
                  <Line type="monotone" dataKey="rr" stroke="hsl(217, 90%, 55%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">{t('dashboard.rrAvgIdeal')} <Info className="h-3 w-3" /></p>
                <p className="text-2xl font-semibold font-mono text-foreground">{idealAvgRR}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">{t('dashboard.rrMaxIdeal')} <Info className="h-3 w-3" /></p>
                <p className="text-2xl font-semibold font-mono text-foreground">{idealMaxRR}</p>
              </div>
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rrSparkline.filter((_, i) => sortedTrades[i]?.result > 0)}>
                  <Line type="monotone" dataKey="rr" stroke="hsl(217, 90%, 55%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground">{t('dashboard.missedBreakeven')}</p>
                <p className="text-2xl font-semibold font-mono text-foreground">{missedBE}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">{t('dashboard.rrMaxIdeal')} <Info className="h-3 w-3" /></p>
                <p className="text-2xl font-semibold font-mono text-foreground">{idealMaxRR}</p>
              </div>
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rrSparkline}>
                  <Line type="monotone" dataKey="rr" stroke="hsl(217, 90%, 55%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expectancy & Profit Factor */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          {t('dashboard.expectancyProfit')} <Info className="h-4 w-4 text-muted-foreground" />
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">{t('dashboard.expectancy')} <Info className="h-3 w-3" /></p>
              <p className={`text-2xl font-semibold font-mono mb-3 ${expectancy >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                ${expectancy.toFixed(2)}
              </p>
              {/* Expectancy bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 rounded-full bg-muted/30 overflow-hidden flex">
                  <div className="h-full bg-primary rounded-l-full" style={{ width: `${avgWin > 0 ? (avgWin / (avgWin + avgLoss)) * 100 : 50}%` }} />
                  <div className="h-full bg-destructive rounded-r-full" style={{ width: `${avgLoss > 0 ? (avgLoss / (avgWin + avgLoss)) * 100 : 50}%` }} />
                </div>
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-primary font-mono">${avgWin.toFixed(2)}</span>
                <span className="text-xs text-destructive font-mono">-${avgLoss.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-5 flex items-center gap-6">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">{t('dashboard.profitFactor')} <Info className="h-3 w-3" /></p>
                <p className="text-2xl font-semibold font-mono text-foreground">{profitFactor.toFixed(2)}</p>
              </div>
              {/* Donut ring */}
              <div className="ml-auto">
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(220, 10%, 15%)" strokeWidth="6" />
                  <circle
                    cx="32" cy="32" r="26" fill="none"
                    stroke="hsl(217, 90%, 55%)" strokeWidth="6"
                    strokeDasharray={`${profitFactorPct * 1.63} 163`}
                    strokeLinecap="round"
                    transform="rotate(-90 32 32)"
                  />
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Direction Pie */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">{t('dashboard.perfByDirection')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={directionPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" stroke="none">
                    {directionPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyle} cursor={false} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {directionPieData.map(d => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-mono text-foreground">{totalTrades ? ((d.value / totalTrades) * 100).toFixed(1) : '0.0'}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Day Performance */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">{t('dashboard.perfByDay')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayPerf} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="day"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    width={40}
                    tickFormatter={(v) => t(`weekday.${v}`)}
                  />
                  <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyle} cursor={false} />
                  <Bar dataKey="profit" fill="hsl(142, 70%, 45%)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="loss" fill="hsl(0, 72%, 55%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performances par session - 4 radar charts */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">{t('dashboard.perfBySession')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {radarCharts.map((chart) => (
            <Card key={chart.dataKey} className="bg-card border-border">
              <CardHeader className="pb-0 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-foreground">{chart.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={sessionData} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid className="stroke-border" />
                      <PolarAngleAxis
                        dataKey="session"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        tickFormatter={(v) => t(`session.${v}`)}
                      />
                      <PolarRadiusAxis tick={false} axisLine={false} />
                      <Radar
                        name={chart.title}
                        dataKey={chart.dataKey}
                        stroke="hsl(217, 90%, 55%)"
                        fill="hsl(217, 90%, 55%)"
                        fillOpacity={0.35}
                        dot={{ r: 4, fill: 'hsl(217, 90%, 55%)', stroke: 'hsl(217, 90%, 55%)' }}
                      />
                      <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyle} cursor={false} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}