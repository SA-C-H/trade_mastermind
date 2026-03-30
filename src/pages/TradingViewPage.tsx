import { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TradingViewAdvancedChart } from '@/components/TradingViewAdvancedChart';
import { useI18n } from '@/hooks/use-i18n';
import { ExternalLink } from 'lucide-react';

const DEFAULT_SYMBOL = 'FOREXCOM:EURUSD';

const PRESETS = [
  { symbol: 'FOREXCOM:EURUSD', labelKey: 'tradingView.presetEurUsd' as const },
  { symbol: 'OANDA:XAUUSD', labelKey: 'tradingView.presetGold' as const },
  { symbol: 'BINANCE:BTCUSDT', labelKey: 'tradingView.presetBtc' as const },
  { symbol: 'CAPITALCOM:GOLD', labelKey: 'tradingView.presetGoldCfd' as const },
  { symbol: 'SP:SPX', labelKey: 'tradingView.presetSpx' as const },
] as const;

const INTERVALS = ['1', '3', '5', '15', '30', '60', '240', 'D', 'W'] as const;

export default function TradingViewPage() {
  const { t } = useI18n();
  const [symbolInput, setSymbolInput] = useState(DEFAULT_SYMBOL);
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [interval, setInterval] = useState<string>('60');
  const [timezone, setTimezone] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC';
    } catch {
      return 'Etc/UTC';
    }
  });

  const applySymbol = useCallback(() => {
    setSymbol(symbolInput.trim() || DEFAULT_SYMBOL);
  }, [symbolInput]);

  const presets = useMemo(
    () => PRESETS.map((p) => ({ ...p, label: t(p.labelKey) })),
    [t]
  );

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t('tradingView.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('tradingView.subtitle')}</p>
        <a
          href="https://www.tradingview.com/chart/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {t('tradingView.openTradingView')} <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('tradingView.controlsTitle')}</CardTitle>
          <CardDescription>{t('tradingView.symbolHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Button
                key={p.symbol}
                type="button"
                variant={symbol === p.symbol ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={() => {
                  setSymbolInput(p.symbol);
                  setSymbol(p.symbol);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="tv-symbol">{t('tradingView.symbol')}</Label>
              <Input
                id="tv-symbol"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySymbol()}
                placeholder={t('tradingView.symbolPlaceholder')}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('tradingView.interval')}</Label>
              <Select value={interval} onValueChange={setInterval}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVALS.map((iv) => (
                    <SelectItem key={iv} value={iv}>
                      {iv}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('tradingView.timezone')}</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="w-full sm:w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Etc/UTC">UTC</SelectItem>
                  <SelectItem value={Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC'}>
                    {t('tradingView.timezoneLocal')}
                  </SelectItem>
                  <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                  <SelectItem value="America/New_York">America/New_York</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" className="w-full sm:w-auto" onClick={applySymbol}>
              {t('tradingView.apply')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-0 flex-1 overflow-hidden border-border">
        <CardContent className="p-0 sm:p-2">
          <div className="h-[min(720px,calc(100dvh-14rem))] w-full rounded-lg border border-border bg-card sm:h-[min(780px,calc(100dvh-12rem))]">
            <TradingViewAdvancedChart
              symbol={symbol}
              interval={interval}
              timezone={timezone}
              className="rounded-lg"
            />
          </div>
          <p className="px-3 py-2 text-center text-[11px] text-muted-foreground sm:px-4">
            {t('tradingView.attribution')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
