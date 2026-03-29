import { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Trash2, Plus, ArrowUp, ArrowDown, Save } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { useTradingPlan } from '@/hooks/use-trading-plan';

function createSectionId(): string {
  // crypto.randomUUID is supported in modern browsers.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `sec-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function TradingPlan() {
  const { t } = useI18n();
  const { plan, setPlan, savePlan, isHydrated, isSaving } = useTradingPlan();

  const addSection = useCallback(() => {
    const newSection = { id: createSectionId(), heading: '', body: '' };
    setPlan((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
  }, [setPlan]);

  const updateSection = useCallback(
    (id: string, patch: { heading?: string; body?: string }) => {
      setPlan((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === id
            ? {
                ...s,
                heading: patch.heading ?? s.heading,
                body: patch.body ?? s.body,
              }
            : s
        ),
      }));
    },
    [setPlan]
  );

  const deleteSection = useCallback(
    (id: string) => {
      setPlan((prev) => ({
        ...prev,
        sections: prev.sections.filter((s) => s.id !== id),
      }));
    },
    [setPlan]
  );

  const moveSection = useCallback(
    (fromIndex: number, toIndex: number) => {
      setPlan((prev) => {
        const next = [...prev.sections];
        if (toIndex < 0 || toIndex >= next.length) return prev;
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return { ...prev, sections: next };
      });
    },
    [setPlan]
  );

  const onSave = useCallback(async () => {
    try {
      await savePlan(plan);
      toast.success(t('plan.saved'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('plan.saveError'));
    }
  }, [plan, savePlan, t]);

  if (!isHydrated) {
    return <div className="p-4 lg:p-6 text-sm text-muted-foreground">{t('common.loading')}</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">{t('plan.pageTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('plan.subtitle')}</p>
        </div>

        <Button onClick={() => void onSave()} disabled={isSaving} className="gap-1.5">
          <Save className="h-4 w-4" />
          {isSaving ? t('plan.saving') : t('plan.save')}
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t('plan.titleLabel')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={plan.title}
            onChange={(e) => setPlan((prev) => ({ ...prev, title: e.target.value }))}
            className="bg-secondary border-border"
          />
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t('plan.sectionsLabel')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {plan.sections.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('plan.sectionsEmpty')}</p>
          )}

          {plan.sections.map((section, idx) => (
            <div key={section.id} className="space-y-3 border border-border/60 rounded-lg p-3 bg-secondary/10">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground font-mono">
                  {idx + 1}. {t('plan.section')}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveSection(idx, idx - 1)}
                    disabled={idx === 0}
                    aria-label={t('plan.moveUp')}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveSection(idx, idx + 1)}
                    disabled={idx === plan.sections.length - 1}
                    aria-label={t('plan.moveDown')}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => deleteSection(section.id)}
                    aria-label={t('plan.deleteSection')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">{t('plan.sectionHeading')}</label>
                <Input
                  value={section.heading}
                  onChange={(e) => updateSection(section.id, { heading: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">{t('plan.sectionBody')}</label>
                <Textarea
                  value={section.body}
                  onChange={(e) => updateSection(section.id, { body: e.target.value })}
                  className="bg-secondary border-border min-h-[140px]"
                  placeholder={t('plan.sectionBodyPlaceholder')}
                />
              </div>
            </div>
          ))}

          <Button type="button" onClick={() => addSection()} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {t('plan.addSection')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

