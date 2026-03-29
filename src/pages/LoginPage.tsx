import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { toast } from 'sonner';

export default function LoginPage() {
  const { t } = useI18n();
  const { signInWithPassword, signUpWithPassword } = useSupabaseSession();
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const validate = () => {
    if (!email.trim() || !password.trim()) {
      toast.error(t('login.fillFields'));
      return false;
    }
    if (password.length < 6) {
      toast.error(t('login.passwordMin'));
      return false;
    }
    return true;
  };

  const onSignIn = async () => {
    if (!validate()) return;
    setPending(true);
    try {
      await signInWithPassword(email.trim(), password);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setPending(false);
    }
  };

  const onSignUp = async () => {
    if (!validate()) return;
    setPending(true);
    try {
      await signUpWithPassword(email.trim(), password);
      toast.success(t('login.signUpSuccess'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">{t('nav.appName')}</CardTitle>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{t('login.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('login.subtitle')}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('login.email')}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('login.password')}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <Button onClick={() => void onSignIn()} className="w-full" disabled={pending}>
            {pending ? t('login.signingIn') : t('login.signIn')}
          </Button>
          <Button variant="outline" onClick={() => void onSignUp()} className="w-full" disabled={pending}>
            {t('login.signUp')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

