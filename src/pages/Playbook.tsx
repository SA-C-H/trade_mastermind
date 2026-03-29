import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePlaybookConditions,
  useAddPlaybookCondition,
  useDeletePlaybookCondition,
} from '@/hooks/use-playbook-conditions';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { useI18n } from '@/hooks/use-i18n';

export default function Playbook() {
  const { t } = useI18n();
  const { ready } = useSupabaseSession();
  const { data: conditions = [], isLoading, isError, error } = usePlaybookConditions();
  const addMutation = useAddPlaybookCondition();
  const deleteMutation = useDeletePlaybookCondition();
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const addCondition = async () => {
    if (!newLabel.trim()) return;
    try {
      await addMutation.mutateAsync({
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
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t('playbook.removed'));
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : t('playbook.errorRemove'));
    }
  };

  if (!ready || isLoading) {
    return <div className="p-4 lg:p-6 text-sm text-muted-foreground">{t('playbook.loading')}</div>;
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
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">{t('playbook.title')}</h1>
      </div>
      <p className="text-sm text-muted-foreground">{t('playbook.intro')}</p>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t('playbook.current')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {conditions.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 py-2 px-3 rounded-md bg-secondary/50 group">
              <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}.</span>
              <div className="flex-1">
                <p className="text-sm text-foreground">{c.label}</p>
                {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                onClick={() => void removeCondition(c.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t('playbook.add')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder={t('playbook.labelPlaceholder')}
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            className="bg-secondary border-border"
          />
          <Input
            placeholder={t('playbook.descPlaceholder')}
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            className="bg-secondary border-border"
          />
          <Button onClick={() => void addCondition()} disabled={addMutation.isPending} className="gap-1.5">
            <Plus className="h-4 w-4" /> {t('playbook.addBtn')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
