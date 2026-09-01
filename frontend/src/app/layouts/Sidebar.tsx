import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  HardDrive,
  Star,
  Users,
  Trash2,
  Activity,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { ROUTES } from "../config/constants";
import { cn } from "../../lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

export function Sidebar({ className = "" }: { className?: string }) {
  const { user } = useAuth();

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: ROUTES.DASHBOARD,
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      label: "My Files",
      href: ROUTES.FILES,
      icon: <HardDrive className="w-4 h-4" />,
    },
    {
      label: "Starred",
      href: ROUTES.STARRED,
      icon: <Star className="w-4 h-4" />,
    },
    {
      label: "Shared",
      href: ROUTES.SHARED,
      icon: <Users className="w-4 h-4" />,
    },
    {
      label: "Trash",
      href: ROUTES.TRASH,
      icon: <Trash2 className="w-4 h-4" />,
    },
    {
      label: "Activity",
      href: ROUTES.ACTIVITY,
      icon: <Activity className="w-4 h-4" />,
    },
    {
      label: "Settings",
      href: ROUTES.SETTINGS,
      icon: <Settings className="w-4 h-4" />,
    },
    ...(user?.is_admin
      ? [
          {
            label: "Audit Logs",
            href: `${ROUTES.ACTIVITY}?tab=audit`,
            icon: <ShieldAlert className="w-4 h-4 text-purple-400" />,
            adminOnly: true,
          },
        ]
      : []),
  ];

  return (
    <aside
      className={cn(
        "w-60 flex-shrink-0 flex flex-col justify-between border-r border-border/70 bg-sidebar p-4 select-none min-h-[calc(100vh-3.5rem)]",
        className
      )}
    >
      <div className="space-y-1">
        <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Storage
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === ROUTES.FILES || item.href === ROUTES.DASHBOARD}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors group",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )
              }
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Cloud Storage Security Indicator */}
      <div className="rounded-xl border border-border/60 bg-card/40 p-3.5 space-y-2 mt-6">
        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
          <span>Storage Quota</span>
          <span className="text-[10px] text-primary font-mono">Encrypted</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div className="bg-primary h-1.5 rounded-full w-[15%]" />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Argon2id auth • Presigned S3 uploads
        </p>
      </div>
    </aside>
  );
}
