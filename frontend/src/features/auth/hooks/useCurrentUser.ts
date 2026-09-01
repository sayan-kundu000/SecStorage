import { useAuth } from "../../../hooks/useAuth";

/**
 * Hook to retrieve the current authenticated user identity and role.
 */
export function useCurrentUser() {
  const { user, isAuthenticated, isLoading, status } = useAuth();

  return {
    user,
    isAuthenticated,
    isLoading,
    status,
    isAdmin: !!user?.is_admin,
    email: user?.email,
    fullName: user?.full_name,
    id: user?.id,
  };
}
