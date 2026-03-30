import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

const TV_SCRIPT = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';

export type TradingViewChartProps = {
  symbol: string;
  interval?: string;
  timezone?: string;
  className?: string;
};

/**
 * Embeds TradingView's free Advanced Chart widget (external script).
 * @see https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/
 */
export function TradingViewAdvancedChart({
  symbol,
  interval = 'D',
  timezone = 'Etc/UTC',
  className,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const { locale } = useI18n();

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    root.replaceChildren();

    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.height = 'calc(100% - 32px)';
    widget.style.width = '100%';
    root.appendChild(widget);

    const script = document.createElement('script');
    script.src = TV_SCRIPT;
    script.type = 'text/javascript';
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true,
      symbol: symbol.trim() || 'FOREXCOM:EURUSD',
      interval,
      timezone,
      theme: resolvedTheme === 'light' ? 'light' : 'dark',
      style: '1',
      locale: locale === 'fr' ? 'fr' : 'en',
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      hide_volume: false,
      withdateranges: true,
      details: true,
      support_host: 'https://www.tradingview.com',
    });
    root.appendChild(script);

    return () => {
      root.replaceChildren();
    };
  }, [symbol, interval, timezone, resolvedTheme, locale]);

  return (
    <div
      ref={containerRef}
      className={cn('tradingview-widget-container h-full w-full min-h-[320px]', className)}
    />
  );
}
