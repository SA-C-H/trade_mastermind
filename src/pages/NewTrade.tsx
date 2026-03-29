import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { EmotionalState, TradingSession, TradeDirection } from '@/lib/types';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { usePlaybookConditions } from '@/hooks/use-playbook-conditions';
import { useTradingStrategies } from '@/hooks/use-trading-strategies';
import { useCreateTrade } from '@/hooks/use-trades';
import { computeRrRatio } from '@/lib/supabase-mappers';
import { assertTradeImageFilesAllowed } from '@/lib/trade-image-upload';
import { NOT_SIGNED_IN } from '@/lib/require-user-id';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { useI18n } from '@/hooks/use-i18n';

const emotions: EmotionalState[] = ['calm', 'confident', 'anxious', 'fearful', 'greedy', 'frustrated', 'neutral'];

const sessions: TradingSession[] = ['London', 'New York', 'Asian'];

export default function NewTrade() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { ready, session: authSession } = useSupabaseSession();
  const { data: strategies = [], isLoading: loadingStrat } = useTradingStrategies();
  const [strategyId, setStrategyId] = useState('');
  const { data: conditions = [], isLoading: loadingPb } = usePlaybookConditions(strategyId || null);
  const createTrade = useCreateTrade();

  const [instrument, setInstrument] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [session, setSession] = useState<TradingSession | ''>('');
  const [direction, setDirection] = useState<TradeDirection | ''>('');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [result, setResult] = useState('');
  const [riskPercent, setRiskPercent] = useState('');
  const [riskAmount, setRiskAmount] = useState('');
  const [reason, setReason] = useState('');
  const [emotionBefore, setEmotionBefore] = useState<EmotionalState | ''>('');
  const [emotionDuring, setEmotionDuring] = useState<EmotionalState | ''>('');
  const [emotionAfter, setEmotionAfter] = useState<EmotionalState | ''>('');
  const [playbookChecks, setPlaybookChecks] = useState<Record<string, boolean>>({});
  const [filesBefore, setFilesBefore] = useState<File[]>([]);
  const [filesAfter, setFilesAfter] = useState<File[]>([]);

  useEffect(() => {
    if (!strategies.length) return;
    if (!strategyId || !strategies.some(s => s.id === strategyId)) {
      setStrategyId(strategies[0].id);
    }
  }, [strategies, strategyId]);

  useEffect(() => {
    setPlaybookChecks({});
  }, [strategyId]);

  useEffect(() => {
    if (!conditions.length) return;
    setPlaybookChecks(prev => {
      const next: Record<string, boolean> = {};
      for (const c of conditions) {
        next[c.id] = prev[c.id] ?? false;
      }
      return next;
    });
  }, [conditions]);

  const allChecked = conditions.length === 0 || conditions.every(c => playbookChecks[c.id]);
  const isValid = allChecked;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instrument.trim() || !date || !time || !session || !direction || !strategyId) {
      toast.error(t('newTrade.errors.minFields'));
      return;
    }
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);
    const res = parseFloat(result);
    const rPct = parseFloat(riskPercent);
    const rAmt = parseFloat(riskAmount);
    if (!Number.isFinite(entry) || !Number.isFinite(sl) || !Number.isFinite(tp)) {
      toast.error(t('newTrade.errors.prices'));
      return;
    }
    if (!Number.isFinite(res) || !Number.isFinite(rPct) || !Number.isFinite(rAmt)) {
      toast.error(t('newTrade.errors.risk'));
      return;
    }
    if (!emotionBefore || !emotionDuring || !emotionAfter) {
      toast.error(t('newTrade.errors.emotions'));
      return;
    }

    try {
      assertTradeImageFilesAllowed([...filesBefore, ...filesAfter]);
    } catch {
      toast.error(t('newTrade.errors.unsupportedImage'));
      return;
    }

    const rrRatio = computeRrRatio(direction, entry, sl, tp);
    const checks = conditions.map(c => ({
      conditionId: c.id,
      respected: !!playbookChecks[c.id],
    }));
    const strategyName = strategies.find(s => s.id === strategyId)?.name ?? strategyId;

    try {
      await createTrade.mutateAsync({
        payload: {
          instrument: instrument.trim(),
          trade_date: date,
          trade_time: time,
          session,
          direction,
          entry_price: entry,
          stop_loss: sl,
          take_profit: tp,
          result: res,
          risk_percent: rPct,
          risk_amount: rAmt,
          rr_ratio: rrRatio,
          strategy: strategyName,
          strategy_key: strategyId,
          reason: reason.trim() || '—',
          emotion_before: emotionBefore,
          emotion_during: emotionDuring,
          emotion_after: emotionAfter,
          playbook_checks: checks,
          is_valid: isValid,
        },
        filesBefore,
        filesAfter,
      });
      toast.success(t('newTrade.success'));
      navigate('/trades');
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message === 'UNSUPPORTED_IMAGE') {
        toast.error(t('newTrade.errors.unsupportedImage'));
        return;
      }
      if (err instanceof Error && err.message === NOT_SIGNED_IN) {
        toast.error(t('newTrade.errors.notSignedIn'));
        return;
      }
      toast.error(err instanceof Error ? err.message : t('newTrade.errorSave'));
    }
  };

  if (!ready || loadingStrat || !strategyId || loadingPb) {
    return <div className="p-4 lg:p-6 text-sm text-muted-foreground">{t('newTrade.loading')}</div>;
  }

  if (!authSession?.user) {
    return (
      <div className="p-4 lg:p-6 max-w-lg">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">{t('newTrade.authRequiredTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('newTrade.authRequiredBody')}</p>
            <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
              {t('common.retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-xl font-semibold text-foreground mb-6">{t('newTrade.title')}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t('newTrade.general')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('newTrade.instrument')}</Label>
                <Input
                  value={instrument}
                  onChange={e => setInstrument(e.target.value)}
                  placeholder="EUR/USD"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('newTrade.date')}</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <Label className="text-xs text-muted-foreground">{t('newTrade.time')}</Label>
                <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-secondary border-border" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('newTrade.session')}</Label>
                <Select value={session || undefined} onValueChange={v => setSession(v as TradingSession)}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder={t('common.select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`session.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('newTrade.direction')}</Label>
                <Select value={direction || undefined} onValueChange={v => setDirection(v as TradeDirection)}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder={t('common.select')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">{t('direction.long')}</SelectItem>
                    <SelectItem value="short">{t('direction.short')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('newTrade.strategyPick')}</Label>
              <Select value={strategyId} onValueChange={setStrategyId}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{t('newTrade.strategyHint')}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t('newTrade.data')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('newTrade.entry')}</Label>
              <Input
                type="number"
                step="any"
                value={entryPrice}
                onChange={e => setEntryPrice(e.target.value)}
                placeholder="1.12500"
                className="bg-secondary border-border font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('newTrade.stop')}</Label>
              <Input
                type="number"
                step="any"
                value={stopLoss}
                onChange={e => setStopLoss(e.target.value)}
                placeholder="1.12000"
                className="bg-secondary border-border font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('newTrade.takeProfit')}</Label>
              <Input
                type="number"
                step="any"
                value={takeProfit}
                onChange={e => setTakeProfit(e.target.value)}
                placeholder="1.13500"
                className="bg-secondary border-border font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('newTrade.result')}</Label>
              <Input
                type="number"
                step="any"
                value={result}
                onChange={e => setResult(e.target.value)}
                placeholder="150.00"
                className="bg-secondary border-border font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('newTrade.riskPct')}</Label>
              <Input
                type="number"
                step="0.1"
                value={riskPercent}
                onChange={e => setRiskPercent(e.target.value)}
                placeholder="1.0"
                className="bg-secondary border-border font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('newTrade.riskUsd')}</Label>
              <Input
                type="number"
                step="any"
                value={riskAmount}
                onChange={e => setRiskAmount(e.target.value)}
                placeholder="50"
                className="bg-secondary border-border font-mono"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t('newTrade.context')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('newTrade.contextPlaceholder')}
              className="bg-secondary border-border min-h-[80px]"
            />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t('newTrade.psychology')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('newTrade.emotionBefore')}</Label>
              <Select value={emotionBefore || undefined} onValueChange={v => setEmotionBefore(v as EmotionalState)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  {emotions.map(e => (
                    <SelectItem key={e} value={e}>
                      {t(`emotion.${e}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('newTrade.emotionDuring')}</Label>
              <Select value={emotionDuring || undefined} onValueChange={v => setEmotionDuring(v as EmotionalState)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  {emotions.map(e => (
                    <SelectItem key={e} value={e}>
                      {t(`emotion.${e}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('newTrade.emotionAfter')}</Label>
              <Select value={emotionAfter || undefined} onValueChange={v => setEmotionAfter(v as EmotionalState)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  {emotions.map(e => (
                    <SelectItem key={e} value={e}>
                      {t(`emotion.${e}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {t('newTrade.playbook')}
              <span className={`text-xs px-2 py-0.5 rounded-full ${isValid ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
                {isValid ? t('newTrade.validBadge') : t('newTrade.invalidBadge')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {conditions.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('playbook.noRulesYet')}</p>
            )}
            {conditions.map(condition => (
              <div key={condition.id} className="flex items-start gap-3">
                <Checkbox
                  id={condition.id}
                  checked={!!playbookChecks[condition.id]}
                  onCheckedChange={(checked) => setPlaybookChecks(prev => ({ ...prev, [condition.id]: !!checked }))}
                />
                <label htmlFor={condition.id} className="text-sm cursor-pointer">
                  <span className="text-foreground">{condition.label}</span>
                  {condition.description && <p className="text-xs text-muted-foreground mt-0.5">{condition.description}</p>}
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t('newTrade.captures')}</CardTitle>
            <p className="text-xs text-muted-foreground font-normal">{t('newTrade.capturesHint')}</p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('newTrade.before')}</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="cursor-pointer bg-secondary border-border"
                onChange={(e) => setFilesBefore(Array.from(e.target.files ?? []))}
              />
              {filesBefore.length > 0 && (
                <p className="text-xs text-muted-foreground">{t('newTrade.filesSelected', { count: filesBefore.length })}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('newTrade.after')}</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="cursor-pointer bg-secondary border-border"
                onChange={(e) => setFilesAfter(Array.from(e.target.files ?? []))}
              />
              {filesAfter.length > 0 && (
                <p className="text-xs text-muted-foreground">{t('newTrade.filesSelected', { count: filesAfter.length })}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="sticky z-30 bottom-20 lg:bottom-4 bg-background/95 backdrop-blur border border-border rounded-lg p-3 flex flex-col sm:flex-row gap-3 shadow-sm">
          <Button type="submit" className="gap-1.5 w-full sm:w-auto" disabled={createTrade.isPending}>
            {createTrade.isPending ? t('newTrade.saving') : t('newTrade.save')}
          </Button>
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/trades')}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </div>
  );
}
