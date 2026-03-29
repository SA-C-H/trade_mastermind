import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePlaybookConditions,
  useAddPlaybookCondition,
  useDeletePlaybookCondition,
} from '@/hooks/use-playbook-conditions';
import {
  useTradingStrategies,
  useAddTradingStrategy,
  useRenameTradingStrategy,
  useDeleteTradingStrategy,
  DEFAULT_STRATEGY_ID,
} from '@/hooks/use-trading-strategies';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { useI18n } from '@/hooks/use-i18n';

export default function Playbook() {
  const { t } = useI18n();
  const { ready } = useSupabaseSession();
  const { data: strategies = [], isLoading: loadingS } = useTradingStrategies();
  const [selectedStrategyId, setSelectedStrategyId] = useState('');
  const { data: conditions = [], isLoading: loadingPb, isError, error } = usePlaybookConditions(
    selectedStrategyId || null
  );
  const addMutation = useAddPlaybookCondition();
  const deleteMutation = useDeletePlaybookCondition();
  const addStrategyMut = useAddTradingStrategy();
  const renameMut = useRenameTradingStrategy();
  const deleteStratMut = useDeleteTradingStrategy();

  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStrategyName, setNewStrategyName] = useState('');
  const [renameDraft, setRenameDraft] = useState('');

  useEffect(() => {
    if (!strategies.length) return;
    if (!selectedStrategyId || !strategies.some((s) => s.id === selectedStrategyId)) {
      setSelectedStrategyId(strategies[0].id);
    }
  }, [strategies, selectedStrategyId]);

  useEffect(() => {
    const s = strategies.find((x) => x.id === selectedStrategyId);
    setRenameDraft(s?.name ?? '');
  }, [selectedStrategyId, strategies]);

  const addCondition = async () => {
    if (!newLabel.trim() || !selectedStrategyId) return;
    try {
      await addMutation.mutateAsync({
        strategyId: selectedStrategyId,
        id: `pb-${Date.now()}`,
        label: newLabel.trim(),
        description: newDesc.trim() || undefined,
      });
      setNewLabel('');
      setNewDesc('');
      toast.success(t('playbook.added'));
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : t('playbook.errorAdd'));
    }
  };

  const removeCondition = async (id: string) => {
    if (!selectedStrategyId) return;
    try {
      await deleteMutation.mutateAsync({ strategyId: selectedStrategyId, id });
      toast.success(t('playbook.removed'));
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : t('playbook.errorRemove'));
    }
  };

  const addStrategy = async () => {
    if (!newStrategyName.trim()) return;
    try {
      const id = await addStrategyMut.mutateAsync(newStrategyName.trim());
      setNewStrategyName('');
      setSelectedStrategyId(id);
      toast.success(t('playbook.strategyAdded'));
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : t('playbook.errorStrategy'));
    }
  };

  const saveRename = async () => {
    if (!selectedStrategyId || !renameDraft.trim()) return;
    try {
      await renameMut.mutateAsync({ id: selectedStrategyId, name: renameDraft.trim() });
      toast.success(t('playbook.strategyRenamed'));
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : t('playbook.errorStrategy'));
    }
  };

  const removeStrategy = async () => {
    if (!selectedStrategyId) return;
    try {
      await deleteStratMut.mutateAsync(selectedStrategyId);
      toast.success(t('playbook.strategyDeleted'));
      setSelectedStrategyId(DEFAULT_STRATEGY_ID);
    } catch (e) {
      console.error(e);
      if (e instanceof Error && e.message === 'STRATEGY_DEFAULT_PROTECTED') {
        toast.error(t('playbook.strategyProtected'));
        return;
      }
      toast.error(e instanceof Error ? e.message : t('playbook.errorStrategy'));
    }
  };

  if (!ready || loadingS) {
    return <div className="p-4 lg:p-6 text-sm text-muted-foreground">{t('playbook.loading')}</div>;
  }
  if (isError) {
    return (
      <div className="p-4 lg:p-6 text-sm text-destructive">
        {t('common.error')}: {error instanceof Error ? error.message : t('common.unknown')}
      </div>
    );
  }

  const loadingRules = !!selectedStrategyId && loadingPb;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">{t('playbook.title')}</h1>
      </div>
      <p className="text-sm text-muted-foreground">{t('playbook.intro')}</p>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t('playbook.strategiesTitle')}</CardTitle>
          <p className="text-xs font-normal text-muted-foreground">{t('playbook.strategiesHint')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{t('playbook.selectStrategy')}</label>
            <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                {strategies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-xs text-muted-foreground">{t('playbook.newStrategyName')}</label>
              <Input
                value={newStrategyName}
                onChange={(e) => setNewStrategyName(e.target.value)}
                placeholder={t('playbook.newStrategyName')}
                className="bg-secondary border-border"
              />
            </div>
            <Button type="button" onClick={() => void addStrategy()} disabled={addStrategyMut.isPending}>
              <Plus className="mr-1.5 h-4 w-4" /> {t('playbook.addStrategy')}
            </Button>
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-xs text-muted-foreground">{t('playbook.renameStrategy')}</label>
              <Input
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <Button type="button" variant="secondary" onClick={() => void saveRename()} disabled={renameMut.isPending}>
              {t('playbook.saveName')}
            </Button>
            {selectedStrategyId !== DEFAULT_STRATEGY_ID && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => void removeStrategy()}
                disabled={deleteStratMut.isPending}
              >
                {t('playbook.deleteStrategy')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            {t('playbook.rulesFor')}{' '}
            <span className="text-primary">{strategies.find((s) => s.id === selectedStrategyId)?.name ?? '—'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingRules ? (
            <p className="text-sm text-muted-foreground">{t('playbook.loading')}</p>
          ) : conditions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('playbook.noRulesYet')}</p>
          ) : (
            conditions.map((c, i) => (
              <div key={c.id} className="group flex items-center gap-3 rounded-md bg-secondary/50 px-3 py-2">
                <span className="w-5 font-mono text-xs text-muted-foreground">{i + 1}.</span>
                <div className="flex-1">
                  <p className="text-sm text-foreground">{c.label}</p>
                  {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => void removeCondition(c.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t('playbook.add')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder={t('playbook.labelPlaceholder')}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="bg-secondary border-border"
          />
          <Input
            placeholder={t('playbook.descPlaceholder')}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="bg-secondary border-border"
          />
          <Button onClick={() => void addCondition()} disabled={addMutation.isPending || !selectedStrategyId} className="gap-1.5">
            <Plus className="h-4 w-4" /> {t('playbook.addBtn')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
