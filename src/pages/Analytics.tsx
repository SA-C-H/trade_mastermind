import { useMemo } from 'react';
import { useTrades } from '@/hooks/use-trades';
import { computeAnalyticsStats } from '@/lib/trade-stats';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { useI18n } from '@/hooks/use-i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const tooltipWrapperStyle = { outline: 'none', border: 'none', boxShadow: 'none' };

export default function Analytics() {
  const { t } = useI18n();
  const { ready } = useSupabaseSession();
  const { data: trades = [], isLoading, isError, error } = useTrades();
  const { hourData, comparisonData, emotionPnL, strategyData, dayFreq } = useMemo(
    () => computeAnalyticsStats(trades),
    [trades]
  );

  const dayFreqLabeled = useMemo(
    () => dayFreq.map((d) => ({ ...d, dayLabel: t(`dayShort.${d.day}`) })),
    [dayFreq, t]
  );

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

  if (!ready || isLoading) {
    return <div className="p-4 lg:p-6 text-sm text-muted-foreground">{t('common.loading')}</div>;
  }
  if (isError) {
    return (
      <div className="p-4 lg:p-6 text-sm text-destructive">
        {t('common.error')}: {error instanceof Error ? error.message : t('common.unknown')}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h1 className="text-xl font-semibold text-foreground">{t('analytics.title')}</h1>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('analytics.byHour')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourData.filter((h) => h.pnl !== 0)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="hour" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyle} cursor={false} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {hourData
                    .filter((h) => h.pnl !== 0)
                    .map((entry, i) => (
                      <Cell key={i} fill={entry.pnl >= 0 ? 'hsl(142, 70%, 45%)' : 'hsl(0, 72%, 55%)'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.validVsInvalid')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="metricId"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(v) => t(`analytics.${v}`)}
                  />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyle} cursor={false} />
                  <Bar dataKey="valid" fill="hsl(142, 70%, 45%)" radius={[4, 4, 0, 0]} name={t('trades.valid')} />
                  <Bar dataKey="invalid" fill="hsl(0, 72%, 55%)" radius={[4, 4, 0, 0]} name={t('trades.invalid')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.emotion')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={emotionPnL}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="emotion"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickFormatter={(v) => t(`emotion.${v}`)}
                  />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyle} cursor={false} />
                  <Bar dataKey="avgPnL" radius={[4, 4, 0, 0]} name="P&L">
                    {emotionPnL.map((entry, i) => (
                      <Cell key={i} fill={entry.avgPnL >= 0 ? 'hsl(142, 70%, 45%)' : 'hsl(0, 72%, 55%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.byStrategy')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {strategyData.map((s) => (
                <div key={s.strategy} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm text-foreground">{s.strategy}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('analytics.tradesCount', { n: s.trades })} · {s.winRate}% {t('analytics.winRateShort')}
                    </p>
                  </div>
                  <span className={`font-mono text-sm font-medium ${s.pnl >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {s.pnl >= 0 ? '+' : ''}
                    {s.pnl.toFixed(2)}$
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.frequency')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayFreqLabeled}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="dayLabel" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} wrapperStyle={tooltipWrapperStyle} cursor={false} />
                  <Bar dataKey="count" fill="hsl(217, 90%, 55%)" radius={[4, 4, 0, 0]} name={t('nav.trades')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
