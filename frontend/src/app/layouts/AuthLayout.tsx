import { Suspense } from "react";
import { Outlet, Link } from "react-router-dom";
import { ShieldCheck, Lock } from "lucide-react";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ROUTES } from "../config/constants";

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Brand Header */}
      <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
        <Link to={ROUTES.HOME} className="flex items-center gap-2 font-bold text-foreground tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
            SecStorage
          </span>
        </Link>
      </div>

      {/* Main Form Center Card */}
      <div className="flex-1 flex items-center justify-center py-10">
        <div className="w-full max-w-md">
          <Suspense fallback={<LoadingSpinner size="lg" label="Loading..." />}>
            <Outlet />
          </Suspense>
        </div>
      </div>

      {/* Security Footer */}
      <div className="max-w-6xl mx-auto w-full text-center text-xs text-muted-foreground py-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px]">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Argon2id Hash Encryption & Server-Enforced RBAC</span>
        </div>
        <span className="text-[11px]">© {new Date().getFullYear()} SecStorage Monorepo. All rights reserved.</span>
      </div>
    </div>
  );
}
