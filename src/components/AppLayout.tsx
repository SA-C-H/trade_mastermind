import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, BookOpen, Bot, CalendarDays, ChartCandlestick, ClipboardList, Images, LayoutDashboard, ListOrdered, Plus, Settings, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';
import { ThemeToggle } from '@/components/ThemeToggle';

const navItems = [
  { to: '/', icon: LayoutDashboard, navKey: 'dashboard' as const },
  { to: '/trades', icon: ListOrdered, navKey: 'trades' as const },
  { to: '/trades/new', icon: Plus, navKey: 'newTrade' as const },
  { to: '/analytics', icon: BarChart3, navKey: 'analytics' as const },
  { to: '/charts', icon: ChartCandlestick, navKey: 'charts' as const },
  { to: '/calendar', icon: CalendarDays, navKey: 'calendar' as const },
  { to: '/playbook', icon: BookOpen, navKey: 'playbook' as const },
  { to: '/plan', icon: ClipboardList, navKey: 'plan' as const },
  { to: '/gallery', icon: Images, navKey: 'gallery' as const },
  { to: '/ai', icon: Bot, navKey: 'ai' as const },
  { to: '/settings', icon: Settings, navKey: 'settings' as const },
];

const mobileNavItems = [
  { to: '/', icon: LayoutDashboard, navKey: 'dashboard' as const },
  { to: '/trades', icon: ListOrdered, navKey: 'trades' as const },
  { to: '/trades/new', icon: Plus, navKey: 'newTrade' as const },
  { to: '/analytics', icon: BarChart3, navKey: 'analytics' as const },
  { to: '/charts', icon: ChartCandlestick, navKey: 'charts' as const },
  { to: '/settings', icon: Settings, navKey: 'settings' as const },
];

export default function AppLayout() {
  const { t } = useI18n();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden lg:flex w-56 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex-col">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-sidebar-border">
          <TrendingUp className="h-6 w-6 text-primary flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground tracking-tight">{t('nav.appName')}</span>
        </div>
        <nav className="flex-1 py-3 space-y-1 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-primary font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{t(`nav.${item.navKey}`)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t border-sidebar-border flex justify-start px-3">
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="shrink-0 lg:hidden h-14 px-4 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">{t('nav.appName')}</span>
          </div>
          <ThemeToggle />
        </header>

        <main className="w-full min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain pb-20 [max-height:calc(100dvh-3.5rem)] lg:max-h-[100dvh] lg:pb-0">
          <Outlet />
        </main>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="grid grid-cols-6 px-0.5 py-1">
            {mobileNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center justify-center gap-0.5 rounded-md py-1.5 text-[9px] font-medium transition-colors sm:gap-1 sm:py-2 sm:text-[10px]',
                    isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
                  )
                }
              >
                <item.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="max-w-[3.75rem] truncate text-center leading-none">{t(`nav.${item.navKey}`)}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
