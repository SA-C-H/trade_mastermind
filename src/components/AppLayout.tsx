import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, BookOpen, Bot, CalendarDays, Images, LayoutDashboard, ListOrdered, Plus, Settings, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';
import { ThemeToggle } from '@/components/ThemeToggle';

const navItems = [
  { to: '/', icon: LayoutDashboard, navKey: 'dashboard' as const },
  { to: '/trades', icon: ListOrdered, navKey: 'trades' as const },
  { to: '/trades/new', icon: Plus, navKey: 'newTrade' as const },
  { to: '/analytics', icon: BarChart3, navKey: 'analytics' as const },
  { to: '/calendar', icon: CalendarDays, navKey: 'calendar' as const },
  { to: '/playbook', icon: BookOpen, navKey: 'playbook' as const },
  { to: '/gallery', icon: Images, navKey: 'gallery' as const },
  { to: '/ai', icon: Bot, navKey: 'ai' as const },
  { to: '/settings', icon: Settings, navKey: 'settings' as const },
];

export default function AppLayout() {
  const { t } = useI18n();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-16 lg:w-56 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-sidebar-border">
          <TrendingUp className="h-6 w-6 text-primary flex-shrink-0" />
          <span className="hidden lg:block text-sm font-semibold text-foreground tracking-tight">{t('nav.appName')}</span>
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
              <span className="hidden lg:block">{t(`nav.${item.navKey}`)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t border-sidebar-border flex justify-center lg:justify-start lg:px-3">
          <ThemeToggle />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
