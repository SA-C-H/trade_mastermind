import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useI18n } from '@/hooks/use-i18n';
import type { Locale } from '@/i18n/translations';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { session, signOut } = useSupabaseSession();

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">{t('settings.title')}</h1>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t('settings.appearance')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('language.label')}</Label>
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">{t('language.fr')}</SelectItem>
                <SelectItem value="en">{t('language.en')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('theme.label')}</Label>
            <Select value={theme === 'light' || theme === 'dark' ? theme : 'dark'} onValueChange={(v) => setTheme(v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t('theme.light')}</SelectItem>
                <SelectItem value="dark">{t('theme.dark')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t('settings.auth')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {session?.user?.email
              ? t('settings.connectedAs', { email: session.user.email })
              : t('settings.notConnected')}
          </p>
          {session ? (
            <Button
              variant="outline"
              onClick={() => {
                void signOut()
                  .then(() => toast.success(t('settings.logoutSuccess')))
                  .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')));
              }}
            >
              {t('settings.logout')}
            </Button>
          ) : (
            <Button variant="secondary" disabled>{t('settings.notConnected')}</Button>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t('settings.profile')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('settings.name')}</Label>
            <Input placeholder={t('settings.namePlaceholder')} className="bg-secondary border-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('settings.initialCapital')}</Label>
            <Input type="number" placeholder="10000" className="bg-secondary border-border font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('settings.maxRisk')}</Label>
            <Input type="number" step="0.1" placeholder="1.0" className="bg-secondary border-border font-mono" />
          </div>
          <Button size="sm">{t('common.save')}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
