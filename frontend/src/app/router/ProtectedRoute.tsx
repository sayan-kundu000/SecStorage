import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ErrorState } from "../../components/common/ErrorState";
import { ROUTES } from "../config/constants";

export interface ProtectedRouteProps {
  adminOnly?: boolean;
}

export function ProtectedRoute({ adminOnly = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, status, user } = useAuth();
  const location = useLocation();

  // Show full-page spinner while checking session on startup to prevent UI flash
  if (isLoading || status === "INITIALIZING") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" label="Validating session..." />
      </div>
    );
  }

  // If unauthenticated or session expired, redirect to login preserving current location
  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Role-based access control check (Prompt 09 RBAC)
  if (adminOnly && !user.is_admin) {
    return (
      <div className="py-16">
        <ErrorState
          title="Administrative Access Required"
          description="You do not have the required administrative permissions to access this security resource."
          onBack={() => window.history.back()}
        />
      </div>
    );
  }

  return <Outlet />;
}
