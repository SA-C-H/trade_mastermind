import { useState } from 'react';
import { useTrades } from '@/hooks/use-trades';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { useI18n } from '@/hooks/use-i18n';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TradingSession } from '@/lib/types';

export default function Trades() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { ready } = useSupabaseSession();
  const { data: trades = [], isLoading, isError, error } = useTrades();
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [validFilter, setValidFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');

  const filteredTrades = trades.filter((tr) => {
    if (sessionFilter !== 'all' && tr.session !== sessionFilter) return false;
    if (validFilter === 'valid' && !tr.isValid) return false;
    if (validFilter === 'invalid' && tr.isValid) return false;
    if (directionFilter !== 'all' && tr.direction !== directionFilter) return false;
    return true;
  });

  const hasFilters = sessionFilter !== 'all' || validFilter !== 'all' || directionFilter !== 'all';

  const sessionLabel = (s: TradingSession) => t(`session.${s}`);

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
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{t('trades.title')}</h1>
        <Button onClick={() => navigate('/trades/new')} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> {t('trades.newTrade')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-36 h-8 text-xs bg-secondary border-border">
            <SelectValue placeholder={t('trades.filterDirection')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('trades.allDirections')}</SelectItem>
            <SelectItem value="long">{t('direction.long')}</SelectItem>
            <SelectItem value="short">{t('direction.short')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sessionFilter} onValueChange={setSessionFilter}>
          <SelectTrigger className="w-36 h-8 text-xs bg-secondary border-border">
            <SelectValue placeholder={t('trades.filterSession')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('trades.allSessions')}</SelectItem>
            <SelectItem value="London">{sessionLabel('London')}</SelectItem>
            <SelectItem value="New York">{sessionLabel('New York')}</SelectItem>
            <SelectItem value="Asian">{sessionLabel('Asian')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={validFilter} onValueChange={setValidFilter}>
          <SelectTrigger className="w-36 h-8 text-xs bg-secondary border-border">
            <SelectValue placeholder={t('trades.filterValidity')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('trades.allTrades')}</SelectItem>
            <SelectItem value="valid">{t('trades.valid')}</SelectItem>
            <SelectItem value="invalid">{t('trades.invalid')}</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => {
              setSessionFilter('all');
              setValidFilter('all');
              setDirectionFilter('all');
            }}
          >
            <X className="h-3 w-3" /> {t('common.clear')}
          </Button>
        )}
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {[
                  t('trades.tableDate'),
                  t('trades.tableInstrument'),
                  t('trades.tableDirection'),
                  t('trades.tablePnl'),
                  t('trades.tableEntry'),
                  t('trades.tableStop'),
                  t('trades.tableRr'),
                  t('trades.tableSession'),
                  t('trades.tableStatus'),
                ].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((trade) => (
                <tr key={trade.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{trade.date}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{trade.instrument}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        trade.direction === 'long' ? 'border-primary/50 text-primary' : 'border-destructive/50 text-destructive'
                      )}
                    >
                      {t(`direction.${trade.direction}`)}
                    </Badge>
                  </td>
                  <td
                    className={cn(
                      'px-4 py-3 font-mono font-medium',
                      trade.result >= 0 ? 'text-primary' : 'text-destructive'
                    )}
                  >
                    {trade.result >= 0 ? '+' : ''}
                    {trade.result.toFixed(2)} $
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{trade.entryPrice}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{trade.stopLoss}</td>
                  <td className="px-4 py-3 font-mono text-foreground">{trade.rrRatio.toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{sessionLabel(trade.session)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        trade.isValid
                          ? 'border-primary/50 text-primary bg-primary/10'
                          : 'border-destructive/50 text-destructive bg-destructive/10'
                      )}
                    >
                      {trade.isValid ? t('trades.valid') : t('trades.invalid')}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('trades.count', { count: filteredTrades.length })}</span>
        </div>
      </Card>
    </div>
  );
}
