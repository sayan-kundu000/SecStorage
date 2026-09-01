import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ROUTES } from "../config/constants";
import { getSafeReturnUrl } from "../../utils/security";

export function PublicRoute() {
  const { isAuthenticated, isLoading, status } = useAuth();
  const location = useLocation();

  if (isLoading || status === "INITIALIZING") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" label="Checking authentication..." />
      </div>
    );
  }

  if (isAuthenticated) {
    const fromState = (location.state as { from?: { pathname?: string; search?: string } })?.from;
    const targetUrl = fromState
      ? `${fromState.pathname || ""}${fromState.search || ""}`
      : undefined;

    const safeUrl = getSafeReturnUrl(targetUrl, ROUTES.FILES);
    return <Navigate to={safeUrl} replace />;
  }

  return <Outlet />;
}
