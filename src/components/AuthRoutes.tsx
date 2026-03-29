import { Navigate, Outlet } from 'react-router-dom';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { useI18n } from '@/hooks/use-i18n';

export function RequireAuth() {
  const { session, ready } = useSupabaseSession();
  const { t } = useI18n();

  if (!ready) {
    return <div className="p-6 text-sm text-muted-foreground">{t('common.loading')}</div>;
  }
  if (!session?.user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export function GuestOnly() {
  const { session, ready } = useSupabaseSession();
  const { t } = useI18n();

  if (!ready) {
    return <div className="p-6 text-sm text-muted-foreground">{t('common.loading')}</div>;
  }
  if (session?.user) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

