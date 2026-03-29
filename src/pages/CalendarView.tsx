import { useState, useMemo } from 'react';
import type { Trade } from '@/lib/types';
import { useTrades } from '@/hooks/use-trades';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { useI18n } from '@/hooks/use-i18n';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const weekdayIds = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export default function CalendarView() {
  const { t, locale } = useI18n();
  const { ready } = useSupabaseSession();
  const { data: trades = [], isLoading, isError, error } = useTrades();
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthTitle = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
        month: 'long',
        year: 'numeric',
      }).format(currentDate),
    [currentDate, locale]
  );

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const tradesByDate = useMemo(() => {
    const map: Record<string, Trade[]> = {};
    trades.forEach(tr => {
      if (!map[tr.date]) map[tr.date] = [];
      map[tr.date].push(tr);
    });
    return map;
  }, [trades]);

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  if (!ready || isLoading) {
    return <div className="p-4 lg:p-6 text-sm text-muted-foreground">{t('calendar.loading')}</div>;
  }
  if (isError) {
    return (
      <div className="p-4 lg:p-6 text-sm text-destructive">
        {t('common.error')}: {error instanceof Error ? error.message : t('common.unknown')}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h1 className="text-xl font-semibold text-foreground">{t('calendar.title')}</h1>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base font-medium capitalize">{monthTitle}</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <div className="px-4 pb-4">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekdayIds.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                {t(`weekday.${d}`)}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((day, di) => {
                if (day === null) return <div key={di} className="aspect-square rounded-md bg-muted/30" />;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayTrades = tradesByDate[dateStr] || [];
                const dayPnL = dayTrades.reduce((s, tr) => s + tr.result, 0);
                const hasTrades = dayTrades.length > 0;
                return (
                  <div
                    key={di}
                    className={cn(
                      'aspect-square rounded-md border border-border/50 p-1.5 flex flex-col justify-between transition-colors',
                      hasTrades && dayPnL >= 0 && 'bg-primary/10 border-primary/30',
                      hasTrades && dayPnL < 0 && 'bg-destructive/10 border-destructive/30',
                      !hasTrades && 'bg-secondary/20'
                    )}
                  >
                    <span className="text-[10px] font-medium text-muted-foreground">{day}</span>
                    {hasTrades && (
                      <span className={cn('text-[10px] font-mono font-medium', dayPnL >= 0 ? 'text-primary' : 'text-destructive')}>
                        {dayPnL >= 0 ? '+' : ''}
                        {dayPnL.toFixed(0)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
