import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/hooks/use-i18n';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

function readMetaNumber(m: Record<string, unknown> | undefined, key: string): string {
  if (!m) return '';
  const v = m[key];
  if (typeof v === 'number' && !Number.isNaN(v)) return String(v);
  if (typeof v === 'string' && v.trim() !== '') return v;
  return '';
}

function readMetaString(m: Record<string, unknown> | undefined, key: string): string {
  if (!m) return '';
  const v = m[key];
  return typeof v === 'string' ? v : '';
}

export default function SettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { session, ready, signOut } = useSupabaseSession();

  const [displayName, setDisplayName] = useState('');
  const [initialCapital, setInitialCapital] = useState('');
  const [maxRisk, setMaxRisk] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [emailDraft, setEmailDraft] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const user = session?.user;
    if (!user) {
      setDisplayName('');
      setInitialCapital('');
      setMaxRisk('');
      setEmailDraft('');
      return;
    }
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    setDisplayName(readMetaString(meta, 'display_name'));
    setInitialCapital(readMetaNumber(meta, 'initial_capital'));
    setMaxRisk(readMetaNumber(meta, 'max_risk_percent'));
    setEmailDraft(user.email ?? '');
  }, [session?.user?.id, session?.user?.email, session?.user?.user_metadata]);

  const handleSaveProfile = useCallback(async () => {
    if (!session?.user) {
      toast({ title: t('settings.notConnected'), variant: 'destructive' });
      return;
    }
    const capitalNum = parseFloat(initialCapital.replace(',', '.'));
    const riskNum = parseFloat(maxRisk.replace(',', '.'));
    if (Number.isNaN(capitalNum) || capitalNum < 0) {
      toast({ title: t('settings.invalidCapital'), variant: 'destructive' });
      return;
    }
    if (Number.isNaN(riskNum) || riskNum < 0 || riskNum > 100) {
      toast({ title: t('settings.invalidRisk'), variant: 'destructive' });
      return;
    }
    setSavingProfile(true);
    const prev = (session.user.user_metadata ?? {}) as Record<string, unknown>;
    const { error } = await supabase.auth.updateUser({
      data: {
        ...prev,
        display_name: displayName.trim(),
        initial_capital: capitalNum,
        max_risk_percent: riskNum,
      },
    });
    setSavingProfile(false);
    if (error) {
      toast({ title: t('settings.profileError'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('settings.profileSaved') });
  }, [session, displayName, initialCapital, maxRisk, toast, t]);

  const handleSaveEmail = useCallback(async () => {
    if (!session?.user) {
      toast({ title: t('settings.notConnected'), variant: 'destructive' });
      return;
    }
    const trimmed = emailDraft.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      toast({ title: t('settings.invalidEmail'), variant: 'destructive' });
      return;
    }
    if (trimmed === session.user.email) {
      toast({ title: t('settings.emailUnchanged') });
      return;
    }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setSavingEmail(false);
    if (error) {
      toast({ title: t('settings.emailError'), description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: t('settings.emailUpdateSent'), description: t('settings.emailUpdateHint') });
  }, [session, emailDraft, toast, t]);

  const handleSavePassword = useCallback(async () => {
    if (!session?.user) {
      toast({ title: t('settings.notConnected'), variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: t('login.passwordMin'), variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t('settings.passwordMismatch'), variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast({ title: t('settings.passwordError'), description: error.message, variant: 'destructive' });
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    toast({ title: t('settings.passwordSaved') });
  }, [session, newPassword, confirmPassword, toast, t]);

  return (
    <div className="space-y-6 px-3 py-4 sm:px-4 lg:p-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t('settings.title')}</h1>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.appearance')}</CardTitle>
            <CardDescription>{t('settings.appearanceHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('settings.appearanceBody')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.auth')}</CardTitle>
            <CardDescription>
              {session?.user ? t('settings.connectedAs', { email: session.user.email ?? '' }) : t('settings.notConnected')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {session?.user ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="settings-email">{t('login.email')}</Label>
                  <Input
                    id="settings-email"
                    type="email"
                    autoComplete="email"
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    disabled={!ready}
                  />
                </div>
                <Button type="button" variant="secondary" onClick={handleSaveEmail} disabled={!ready || savingEmail}>
                  {savingEmail ? t('settings.saving') : t('settings.saveEmail')}
                </Button>
                <Button type="button" variant="outline" onClick={() => signOut()}>
                  {t('settings.logout')}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('settings.notConnected')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.passwordSection')}</CardTitle>
            <CardDescription>{t('settings.passwordHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!session?.user ? (
              <p className="text-sm text-muted-foreground">{t('settings.passwordNeedLogin')}</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="settings-new-pw">{t('settings.newPassword')}</Label>
                  <Input
                    id="settings-new-pw"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={!ready}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-confirm-pw">{t('settings.confirmPassword')}</Label>
                  <Input
                    id="settings-confirm-pw"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={!ready}
                  />
                </div>
                <Button type="button" onClick={handleSavePassword} disabled={!ready || savingPassword}>
                  {savingPassword ? t('settings.saving') : t('settings.savePassword')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.profile')}</CardTitle>
            <CardDescription>{t('settings.profileHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!session?.user ? (
              <p className="text-sm text-muted-foreground">{t('settings.profileNeedLogin')}</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="settings-name">{t('settings.name')}</Label>
                  <Input
                    id="settings-name"
                    placeholder={t('settings.namePlaceholder')}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={!ready}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-capital">{t('settings.initialCapital')}</Label>
                  <Input
                    id="settings-capital"
                    type="text"
                    inputMode="decimal"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(e.target.value)}
                    disabled={!ready}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-risk">{t('settings.maxRisk')}</Label>
                  <Input
                    id="settings-risk"
                    type="text"
                    inputMode="decimal"
                    value={maxRisk}
                    onChange={(e) => setMaxRisk(e.target.value)}
                    disabled={!ready}
                  />
                </div>
                <Button type="button" onClick={handleSaveProfile} disabled={!ready || savingProfile}>
                  {savingProfile ? t('settings.saving') : t('settings.saveProfile')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
