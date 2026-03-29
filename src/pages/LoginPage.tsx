import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { toast } from 'sonner';

export default function LoginPage() {
  const { t } = useI18n();
  const { signInWithGoogle } = useSupabaseSession();
  const [pending, setPending] = useState(false);

  const onGoogleLogin = async () => {
    setPending(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
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
          <Button onClick={() => void onGoogleLogin()} className="w-full" disabled={pending}>
            {pending ? t('login.signingIn') : t('login.signInGoogle')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

