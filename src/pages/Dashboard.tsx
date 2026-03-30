import { useMemo, useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrades } from '@/hooks/use-trades';
import { computeDashboardStats } from '@/lib/trade-stats';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { useIsMobile } from '@/hooks/use-mobile';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';
import { TrendingUp, TrendingDown, Target, BarChart3, CheckCircle2, XCircle, Info } from 'lucide-react';
import { useUserSettings } from '@/hooks/use-user-settings';

const tooltipWrapperStyleLight = { outline: 'none', border: 'none', boxShadow: 'none' };

/** Min width for scrollable plot area (mobile) when many categories */
function scrollMinWidthDense(pointCount: number, perPoint: number, min = 300): number {
  return Math.max(min, pointCount * perPoint + 48);
}

function barMaxSizeColumn(pointCount: number, isMobile: boolean): number {
  if (pointCount <= 1) return isMobile ? 96 : 128;
  if (pointCount <= 2) return isMobile ? 72 : 96;
  if (pointCount <= 4) return isMobile ? 52 : 68;
  if (pointCount <= 8) return isMobile ? 38 : 48;
  return isMobile ? 30 : 36;
}

function barCategoryGapRatio(pointCount: number): string {
  if (pointCount <= 1) return '2%';
  if (pointCount <= 2) return '8%';
  if (pointCount <= 4) return '16%';
  if (pointCount <= 8) return '22%';
  return '28%';
}

function barMaxSizeHorizontal(pointCount: number): number {
  if (pointCount <= 1) return 40;
  if (pointCount <= 3) return 30;
  return 22;
}

function xAxisTickInterval(pointCount: number, isMobile: boolean): number {
  if (pointCount <= 8) return 0;
  if (!isMobile) return pointCount > 20 ? 2 : 0;
  if (pointCount <= 15) return 2;
  if (pointCount <= 24) return 3;
  return 4;
}

function ChartFrame({
  title,
  subtitle,
  children,
  scrollMinWidth,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  scrollMinWidth?: number;
}) {
  return (
    <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <CardHeader className="space-y-0 pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold leading-tight text-foreground">{title}</CardTitle>
            {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          <Info className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-4">
        {scrollMinWidth != null ? (
          <div className="overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]">
            <div className="min-h-[220px] w-full" style={{ minWidth: scrollMinWidth }}>
              {children}
            </div>
          </div>
        ) : (
          <div className="min-h-[220px] w-full min-w-0">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { t, locale } = useI18n();
  const isMobile = useIsMobile();
  const [pnlTab, setPnlTab] = useState<'all' | 'day' | '1h' | '15m'>('all');
  const { ready } = useSupabaseSession();
  const { data: trades = [], isLoading, isError, error } = useTrades();
  const { data: userSettings } = useUserSettings();
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
    monthlyBuckets,
    last30DaysPnl,
    missedBE,
    idealAvgRR,
    idealMaxRR,
  } = stats;

  const monthLabelFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
        month: 'short',
        year: '2-digit',
      }),
    [locale]
  );

  const shortDayFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
        month: 'short',
        day: 'numeric',
      }),
    [locale]
  );

  const monthlyRows = useMemo(
    () =>
      monthlyBuckets.map((b) => ({
        ...b,
        label: monthLabelFmt.format(new Date(b.year, b.month, 1)),
      })),
    [monthlyBuckets, monthLabelFmt]
  );

  const dailyRows = useMemo(
    () =>
      last30DaysPnl.map((d) => ({
        ...d,
        label: shortDayFmt.format(new Date(`${d.dayKey}T12:00:00`)),
      })),
    [last30DaysPnl, shortDayFmt]
  );

  const monthlyPnLThisMonth = useMemo(() => {
    const n = new Date();
    const hit = monthlyBuckets.find((b) => b.year === n.getFullYear() && b.month === n.getMonth());
    return hit ? hit.pnl : 0;
  }, [monthlyBuckets]);

  const initialCapital = userSettings?.initialCapital ?? 1000;
  const accountBalance = initialCapital + totalPnL;

  const equityScrollMin = useMemo(() => {
    if (!isMobile || equityCurve.length <= 10) return undefined;
    return scrollMinWidthDense(equityCurve.length, 17);
  }, [isMobile, equityCurve.length]);

  const monthlyColumnScrollMin = useMemo(() => {
    if (!isMobile || monthlyRows.length <= 5) return undefined;
    return scrollMinWidthDense(monthlyRows.length, 44);
  }, [isMobile, monthlyRows.length]);

  const dailyScrollMin = useMemo(() => {
    if (!isMobile) return undefined;
    return scrollMinWidthDense(dailyRows.length, 11, 300);
  }, [isMobile, dailyRows.length]);

  const monthColBarMax = useMemo(() => barMaxSizeColumn(monthlyRows.length, isMobile), [monthlyRows.length, isMobile]);
  const monthColGap = useMemo(() => barCategoryGapRatio(monthlyRows.length), [monthlyRows.length]);
  const dailyColBarMax = useMemo(() => barMaxSizeColumn(dailyRows.length, isMobile), [dailyRows.length, isMobile]);
  const dailyColGap = useMemo(() => barCategoryGapRatio(dailyRows.length), [dailyRows.length]);
  const monthlyHorizontalBarMax = useMemo(() => barMaxSizeHorizontal(monthlyRows.length), [monthlyRows.length]);

  const monthlyChartHeight = useMemo(() => Math.max(200, monthlyRows.length * 36 + 56), [monthlyRows.length]);

  const monthLabelAngle = monthlyRows.length > 5 ? -32 : monthlyRows.length > 2 ? -22 : 0;
  const dailyTickInterval = xAxisTickInterval(dailyRows.length, isMobile);

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
      {
        label: t('dashboard.kpiTotalPnl'),
        value: `$${totalPnL.toFixed(2)}`,
        icon: totalPnL >= 0 ? TrendingUp : TrendingDown,
        color: totalPnL >= 0 ? 'text-primary' : 'text-destructive',
      },
      { label: t('dashboard.kpiWinRate'), value: `${winRate}%`, icon: Target, color: 'text-accent' },
      { label: t('dashboard.kpiAvgRr'), value: avgRR, icon: TrendingUp, color: 'text-accent' },
      {
        label: t('dashboard.kpiMonthlyPnl'),
        value: `$${monthlyPnLThisMonth.toFixed(2)}`,
        icon: monthlyPnLThisMonth >= 0 ? TrendingUp : TrendingDown,
        color: monthlyPnLThisMonth >= 0 ? 'text-primary' : 'text-destructive',
      },
      { label: t('dashboard.kpiTotalTrades'), value: String(totalTrades), icon: BarChart3, color: 'text-foreground' },
      {
        label: t('dashboard.kpiValidTrades'),
        value: `${validTrades}/${totalTrades}`,
        icon: CheckCircle2,
        color: 'text-primary',
      },
      {
        label: t('dashboard.kpiDiscipline'),
        value: `${disciplineScore}%`,
        icon: Number(disciplineScore) >= 70 ? CheckCircle2 : XCircle,
        color: Number(disciplineScore) >= 70 ? 'text-primary' : 'text-destructive',
      },
    ],
    [t, totalTrades, winRate, totalPnL, avgRR, validTrades, disciplineScore, monthlyPnLThisMonth]
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
      <div className="p-4 text-sm text-muted-foreground lg:p-6">{t('dashboard.loading')}</div>
    );
  }
  if (isError) {
    return (
      <div className="p-4 text-sm text-destructive lg:p-6">
        {t('dashboard.loadError')}: {error instanceof Error ? error.message : t('common.error')}
      </div>
    );
  }

  return (
    <div className="space-y-4 px-3 py-4 sm:space-y-6 sm:px-4 lg:p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>

      <p className="text-[11px] text-muted-foreground lg:hidden">{t('dashboard.scrollCharts')}</p>

      {/* KPI — single column on phone, like reference */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="rounded-xl border border-border bg-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-muted-foreground">{kpi.label}</span>
                <kpi.icon className={`h-4 w-4 flex-shrink-0 ${kpi.color}`} aria-hidden />
              </div>
              <p className={`mt-4 font-mono text-2xl font-semibold tracking-tight sm:text-3xl ${kpi.color}`}>
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mobile-first charts: time invested + win rate + monthly/daily bars */}
      {monthlyRows.length > 0 ? (
        <div className="space-y-4">
          <ChartFrame
            title={t('dashboard.timeInvested')}
            subtitle={t('dashboard.timeInvestedHint')}
            scrollMinWidth={monthlyColumnScrollMin}
          >
            <div className="h-56 w-full min-w-0 px-1 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyRows}
                  margin={{ top: 8, right: 12, left: 4, bottom: monthLabelAngle !== 0 ? 8 : 4 }}
                  barCategoryGap={monthColGap}
                >
                  <defs>
                    <linearGradient id="timeInvestedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(35, 95%, 55%)" />
                      <stop offset="100%" stopColor="hsl(25, 90%, 45%)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} className="stroke-border" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 9 : 11 }}
                    interval={0}
                    angle={monthLabelAngle}
                    textAnchor={monthLabelAngle !== 0 ? 'end' : 'middle'}
                    height={monthLabelAngle !== 0 ? 56 : 28}
                  />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} allowDecimals={false} width={36} />
                  <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyleLight} cursor={false} />
                  <Bar dataKey="trades" fill="url(#timeInvestedGrad)" radius={[6, 6, 0, 0]} maxBarSize={monthColBarMax} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>

          <ChartFrame title={t('dashboard.winRateByMonth')} scrollMinWidth={monthlyColumnScrollMin}>
            <div className="h-56 w-full min-w-0 px-1 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyRows}
                  margin={{ top: 8, right: 12, left: 4, bottom: monthLabelAngle !== 0 ? 8 : 4 }}
                  barCategoryGap={monthColGap}
                >
                  <defs>
                    <linearGradient id="winRateGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217, 95%, 58%)" />
                      <stop offset="100%" stopColor="hsl(217, 85%, 42%)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} className="stroke-border" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 9 : 11 }}
                    interval={0}
                    angle={monthLabelAngle}
                    textAnchor={monthLabelAngle !== 0 ? 'end' : 'middle'}
                    height={monthLabelAngle !== 0 ? 56 : 28}
                  />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} domain={[0, 100]} width={32} />
                  <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyleLight} cursor={false} />
                  <Bar dataKey="winRate" fill="url(#winRateGrad)" radius={[6, 6, 0, 0]} maxBarSize={monthColBarMax} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>

          <ChartFrame title={t('dashboard.monthlyBars')}>
            <div className="w-full min-w-0" style={{ height: monthlyChartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyRows}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
                  barCategoryGap="18%"
                >
                  <CartesianGrid strokeDasharray="4 4" horizontal={false} className="stroke-border" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={isMobile ? 68 : 88}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 9 : 10 }}
                  />
                  <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyleLight} cursor={false} />
                  <Bar dataKey="pnl" radius={[0, 8, 8, 0]} maxBarSize={monthlyHorizontalBarMax}>
                    {monthlyRows.map((row, i) => (
                      <Cell key={i} fill={row.pnl >= 0 ? 'hsl(142, 70%, 42%)' : 'hsl(0, 72%, 50%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>
        </div>
      ) : null}

      <ChartFrame title={t('dashboard.dailyBars')} subtitle={t('dashboard.dailyBarsHint')} scrollMinWidth={dailyScrollMin}>
        <div className="h-56 w-full min-w-0 px-1 sm:h-64 md:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dailyRows}
              margin={{ top: 8, right: 8, left: 4, bottom: isMobile ? 8 : 6 }}
              barCategoryGap={dailyColGap}
            >
              <CartesianGrid strokeDasharray="4 4" className="stroke-border" />
              <XAxis
                dataKey="label"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 8 : 10 }}
                interval={dailyTickInterval}
                angle={isMobile ? -48 : -32}
                textAnchor="end"
                height={isMobile ? 58 : 48}
              />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} width={40} />
              <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyleLight} cursor={false} />
              <Bar dataKey="pnl" radius={[6, 6, 0, 0]} maxBarSize={dailyColBarMax}>
                {dailyRows.map((row, i) => (
                  <Cell key={i} fill={row.pnl >= 0 ? 'hsl(217, 90%, 52%)' : 'hsl(0, 65%, 48%)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartFrame>

      {/* P&L + equity */}
      <Card className="rounded-xl border border-border bg-card">
        <CardHeader className="space-y-3 pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">{t('dashboard.pnlTitle')}</CardTitle>
              <p className="text-xs text-muted-foreground">{t('dashboard.pnlSubtitle')}</p>
            </div>
            <div className="-mx-1 flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/30 p-1 scrollbar-thin sm:mx-0 sm:flex-wrap">
              {(['all', 'day', '1h', '15m'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setPnlTab(tab)}
                  className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    pnlTab === tab
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'all'
                    ? t('dashboard.tabAll')
                    : tab === 'day'
                      ? t('dashboard.tabDay')
                      : tab === '1h'
                        ? t('dashboard.tab1h')
                        : t('dashboard.tab15m')}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {t('dashboard.totalPnl')} <Info className="h-3 w-3" />
              </p>
              <p className={`font-mono text-lg font-semibold sm:text-xl ${totalPnL >= 0 ? 'text-primary' : 'text-destructive'}`}>
                ${totalPnL.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {t('dashboard.accountBalance')} <Info className="h-3 w-3" />
              </p>
              <p className="font-mono text-lg font-semibold text-foreground sm:text-xl">
                ${accountBalance.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {t('dashboard.winRate')} <Info className="h-3 w-3" />
              </p>
              <p className="font-mono text-lg font-semibold text-foreground sm:text-xl">{winRate}%</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {t('dashboard.totalOps')} <Info className="h-3 w-3" />
              </p>
              <p className="font-mono text-lg font-semibold text-foreground sm:text-xl">
                {totalTrades}{' '}
                <span className="text-sm text-muted-foreground">
                  {wins.length}/{losses.length}
                </span>
              </p>
            </div>
            <div className="hidden lg:block">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {t('dashboard.breakevenOps')} <Info className="h-3 w-3" />
              </p>
              <p className="font-mono text-lg font-semibold text-foreground sm:text-xl">
                {trades.filter((tr) => Math.abs(tr.result) < 5).length}
              </p>
            </div>
          </div>

          <div
            className={cn(
              'pb-1',
              equityScrollMin != null &&
                'overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]'
            )}
          >
            <div
              className="h-64 w-full min-w-0 md:h-72"
              style={equityScrollMin != null ? { minWidth: equityScrollMin } : undefined}
            >
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
                  <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyleLight} cursor={false} />
                  <Area
                    type="monotone"
                    dataKey="pnl"
                    stroke="hsl(217, 90%, 55%)"
                    strokeWidth={2}
                    fill="url(#pnlGrad)"
                    dot={{
                      r: 3,
                      fill: 'hsl(0, 0%, 100%)',
                      stroke: 'hsl(217, 90%, 55%)',
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RR Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-2 flex justify-between gap-2">
              <div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  {t('dashboard.rrAvg')} <Info className="h-3 w-3" />
                </p>
                <p className="font-mono text-2xl font-semibold text-foreground">{avgRR}</p>
              </div>
              <div className="text-right">
                <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  {t('dashboard.rrMax')} <Info className="h-3 w-3" />
                </p>
                <p className="font-mono text-2xl font-semibold text-foreground">{maxRR}</p>
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

        <Card className="rounded-xl border border-border bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-2 flex justify-between gap-2">
              <div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  {t('dashboard.rrAvgIdeal')} <Info className="h-3 w-3" />
                </p>
                <p className="font-mono text-2xl font-semibold text-foreground">{idealAvgRR}</p>
              </div>
              <div className="text-right">
                <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  {t('dashboard.rrMaxIdeal')} <Info className="h-3 w-3" />
                </p>
                <p className="font-mono text-2xl font-semibold text-foreground">{idealMaxRR}</p>
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

        <Card className="rounded-xl border border-border bg-card sm:col-span-2 lg:col-span-1">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-2 flex justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">{t('dashboard.missedBreakeven')}</p>
                <p className="font-mono text-2xl font-semibold text-foreground">{missedBE}</p>
              </div>
              <div className="text-right">
                <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  {t('dashboard.rrMaxIdeal')} <Info className="h-3 w-3" />
                </p>
                <p className="font-mono text-2xl font-semibold text-foreground">{idealMaxRR}</p>
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

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
          {t('dashboard.expectancyProfit')} <Info className="h-4 w-4 text-muted-foreground" />
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="rounded-xl border border-border bg-card">
            <CardContent className="p-5">
              <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                {t('dashboard.expectancy')} <Info className="h-3 w-3" />
              </p>
              <p className={`mb-3 font-mono text-2xl font-semibold ${expectancy >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                ${expectancy.toFixed(2)}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex flex-1 overflow-hidden rounded-full bg-muted/30">
                  <div
                    className="h-3 rounded-l-full bg-primary"
                    style={{ width: `${avgWin > 0 ? (avgWin / (avgWin + avgLoss)) * 100 : 50}%` }}
                  />
                  <div
                    className="h-3 rounded-r-full bg-destructive"
                    style={{ width: `${avgLoss > 0 ? (avgLoss / (avgWin + avgLoss)) * 100 : 50}%` }}
                  />
                </div>
              </div>
              <div className="mt-1.5 flex justify-between">
                <span className="font-mono text-xs text-primary">${avgWin.toFixed(2)}</span>
                <span className="font-mono text-xs text-destructive">-${avgLoss.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border bg-card">
            <CardContent className="flex items-center gap-6 p-5">
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                  {t('dashboard.profitFactor')} <Info className="h-3 w-3" />
                </p>
                <p className="font-mono text-2xl font-semibold text-foreground">{profitFactor.toFixed(2)}</p>
              </div>
              <div className="ml-auto">
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(220, 10%, 15%)" strokeWidth="6" />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    fill="none"
                    stroke="hsl(217, 90%, 55%)"
                    strokeWidth="6"
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-xl border border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-foreground">
              {t('dashboard.perfByDirection')}
              <Info className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={directionPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="value"
                    stroke="none"
                  >
                    {directionPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyleLight} cursor={false} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-4">
              {directionPieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-mono text-foreground">
                    {totalTrades ? ((d.value / totalTrades) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-foreground">
              {t('dashboard.perfByDay')}
              <Info className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="h-56 min-w-[280px]">
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
                  <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyleLight} cursor={false} />
                  <Bar dataKey="profit" fill="hsl(142, 70%, 45%)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="loss" fill="hsl(0, 72%, 55%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">{t('dashboard.perfBySession')}</h2>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
          {radarCharts.map((chart) => (
            <Card
              key={chart.dataKey}
              className="w-[min(92vw,320px)] flex-shrink-0 snap-center rounded-xl border border-border bg-card lg:w-auto"
            >
              <CardHeader className="px-4 pb-0 pt-4">
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
                      <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyleLight} cursor={false} />
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
