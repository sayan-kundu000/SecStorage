import { LogOut, Settings, Shield } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { DropdownMenu, DropdownItem } from "../../components/ui/dropdown";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../config/constants";

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const menuItems: DropdownItem[] = [
    {
      id: "header-user",
      label: user.email,
      disabled: true,
      onClick: () => {},
    },
    { id: "div-1", label: "", divider: true, onClick: () => {} },
    {
      id: "settings",
      label: "Account Settings",
      icon: <Settings className="w-4 h-4" />,
      onClick: () => navigate(ROUTES.SETTINGS),
    },
    ...(user.is_admin
      ? [
          {
            id: "admin-audit",
            label: "Security Audit Trail",
            icon: <Shield className="w-4 h-4 text-purple-400" />,
            onClick: () => navigate(ROUTES.ACTIVITY),
          },
        ]
      : []),
    { id: "div-2", label: "", divider: true, onClick: () => {} },
    {
      id: "logout",
      label: "Sign Out",
      icon: <LogOut className="w-4 h-4" />,
      destructive: true,
      onClick: async () => {
        await logout();
        navigate(ROUTES.LOGIN);
      },
    },
  ];

  return (
    <DropdownMenu
      trigger={
        <button
          className="flex items-center gap-2.5 p-1 rounded-full hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Open user menu"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 text-primary font-semibold text-xs flex items-center justify-center shadow-inner select-none">
            {getInitials(user.full_name || user.email)}
          </div>
          <span className="hidden md:block text-xs font-medium text-foreground text-left max-w-[120px] truncate">
            {user.full_name || user.email}
          </span>
        </button>
      }
      items={menuItems}
      align="right"
    />
  );
}
