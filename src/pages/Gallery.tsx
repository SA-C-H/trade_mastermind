import { useMemo, useState } from 'react';
import { useTrades } from '@/hooks/use-trades';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { useI18n } from '@/hooks/use-i18n';
import type { Trade } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, ImageIcon, XCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type GalleryItem = {
  key: string;
  trade: Trade;
  url: string;
  phase: 'before' | 'after';
};

function tradeToItems(trade: Trade): GalleryItem[] {
  const items: GalleryItem[] = [];
  (trade.imagesBefore ?? []).forEach((url, i) => {
    items.push({ key: `${trade.id}-b-${i}`, trade, url, phase: 'before' });
  });
  (trade.imagesAfter ?? []).forEach((url, i) => {
    items.push({ key: `${trade.id}-a-${i}`, trade, url, phase: 'after' });
  });
  return items;
}

type GroupBy = 'all' | 'week' | 'month';

function parseTradeDateUTC(dateStr: string): Date | null {
  // Expect YYYY-MM-DD, parse in UTC to avoid timezone drift.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  return new Date(Date.UTC(year, month - 1, day));
}

function startOfISOWeekUTC(d: Date): Date {
  // ISO: Monday is the first day. getUTCDay => 0..6 (Sun..Sat)
  const day = d.getUTCDay();
  const isoDay = day === 0 ? 7 : day; // 1..7
  const monday = new Date(d.getTime());
  monday.setUTCDate(monday.getUTCDate() - (isoDay - 1));
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function isoWeekYearAndWeek(d: Date): { isoYear: number; week: number } {
  // https://en.wikipedia.org/wiki/ISO_week_date#Algorithms
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = thursday.getUTCDay();
  const isoDay = day === 0 ? 7 : day; // 1..7
  thursday.setUTCDate(thursday.getUTCDate() + (4 - isoDay));

  const isoYear = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDay = firstThursday.getUTCDay();
  const firstIsoDay = firstDay === 0 ? 7 : firstDay;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + (4 - firstIsoDay));

  const week = Math.floor((thursday.getTime() - firstThursday.getTime()) / 86400000 / 7) + 1;
  return { isoYear, week };
}

function monthLabel(locale: string, dateUTC: Date): string {
  const fmtLocale = locale === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.DateTimeFormat(fmtLocale, { month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(dateUTC.getUTCFullYear(), dateUTC.getUTCMonth(), 1))
  );
}

export default function Gallery() {
  const { t, locale } = useI18n();
  const { ready } = useSupabaseSession();
  const { data: trades = [], isLoading, isError, error } = useTrades();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('all');

  const { validItems, invalidItems } = useMemo(() => {
    const valid: GalleryItem[] = [];
    const invalid: GalleryItem[] = [];
    for (const tr of trades) {
      const items = tradeToItems(tr);
      if (tr.isValid) valid.push(...items);
      else invalid.push(...items);
    }
    return { validItems: valid, invalidItems: invalid };
  }, [trades]);

  const grouped = useMemo(() => {
    if (groupBy === 'all') return null;

    const groupItems = (items: GalleryItem[]) => {
      const map = new Map<
        string,
        { key: string; label: string; sortMs: number; items: GalleryItem[] }
      >();

      for (const item of items) {
        const d = parseTradeDateUTC(item.trade.date);
        if (!d) continue;

        let key: string;
        let sortMs: number;
        let label: string;

        if (groupBy === 'month') {
          key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
          const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
          sortMs = start.getTime();
          label = monthLabel(locale, d);
        } else {
          const { isoYear, week } = isoWeekYearAndWeek(d);
          key = `${isoYear}-W${week}`;
          const start = startOfISOWeekUTC(d);
          sortMs = start.getTime();
          label = t('gallery.weekLabel', { week, year: isoYear });
        }

        const g = map.get(key);
        if (!g) {
          map.set(key, { key, label, sortMs, items: [item] });
        } else {
          g.items.push(item);
        }
      }

      const groups = Array.from(map.values()).sort((a, b) => b.sortMs - a.sortMs);
      // Stable ordering within a group: before -> after, then instrument.
      const phaseRank = (p: GalleryItem['phase']) => (p === 'before' ? 0 : 1);
      for (const g of groups) {
        g.items.sort((a, b) => {
          const pr = phaseRank(a.phase) - phaseRank(b.phase);
          if (pr !== 0) return pr;
          return a.trade.instrument.localeCompare(b.trade.instrument);
        });
      }
      return groups;
    };

    return {
      validGroups: groupItems(validItems),
      invalidGroups: groupItems(invalidItems),
    };
  }, [groupBy, invalidItems, locale, t, validItems]);

  const renderGrid = (items: GalleryItem[]) => {
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border border-dashed border-border rounded-lg">
          <ImageIcon className="h-10 w-10 mb-3 opacity-50" />
          <p className="text-sm">{t('gallery.empty')}</p>
          <p className="text-xs mt-1 max-w-sm">{t('gallery.emptyHint')}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setLightbox(item.url)}
            className="group text-left rounded-lg overflow-hidden border border-border bg-secondary/30 hover:border-primary/40 transition-colors"
          >
            <div className="aspect-video relative bg-muted">
              <img
                src={item.url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-2 space-y-0.5">
              <p className="text-xs font-medium text-foreground truncate">{item.trade.instrument}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{item.trade.date}</p>
              <Badge variant="outline" className="text-[10px] h-5">
                {item.phase === 'before' ? t('gallery.phaseBefore') : t('gallery.phaseAfter')}
              </Badge>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderGrouped = (groups: NonNullable<typeof grouped>['validGroups']) => {
    if (groups.length === 0) return renderGrid([]);
    return (
      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.key} className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">{g.label}</h2>
            {renderGrid(g.items)}
          </div>
        ))}
      </div>
    );
  };

  if (!ready || isLoading) {
    return <div className="p-4 lg:p-6 text-sm text-muted-foreground">{t('gallery.loading')}</div>;
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
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t('gallery.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('gallery.intro')}</p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs defaultValue="valid" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="valid" className="gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            {t('gallery.tabValid')}
            <Badge variant="secondary" className="ml-1 h-5 min-w-[1.25rem] px-1">
              {validItems.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="invalid" className="gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            {t('gallery.tabInvalid')}
            <Badge variant="secondary" className="ml-1 h-5 min-w-[1.25rem] px-1">
              {invalidItems.length}
            </Badge>
          </TabsTrigger>
          </TabsList>

          <TabsContent value="valid" className="mt-6">
            <Card className="p-4 bg-card border-border">
              {groupBy === 'all' ? renderGrid(validItems) : renderGrouped(grouped?.validGroups ?? [])}
            </Card>
          </TabsContent>

          <TabsContent value="invalid" className="mt-6">
            <Card className="p-4 bg-card border-border">
              {groupBy === 'all' ? renderGrid(invalidItems) : renderGrouped(grouped?.invalidGroups ?? [])}
            </Card>
          </TabsContent>
        </Tabs>

        <div className="min-w-[220px]">
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="bg-secondary border-border h-9">
              <SelectValue placeholder={t('gallery.groupByLabel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('gallery.groupAll')}</SelectItem>
              <SelectItem value="week">{t('gallery.groupWeek')}</SelectItem>
              <SelectItem value="month">{t('gallery.groupMonth')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-4xl p-2 border-border bg-card">
          <DialogHeader className="sr-only">
            <DialogTitle>{t('gallery.previewTitle')}</DialogTitle>
          </DialogHeader>
          {lightbox && (
            <img src={lightbox} alt="" className="w-full h-auto max-h-[85vh] object-contain rounded-md" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
