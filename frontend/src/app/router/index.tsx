import React, { Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ROUTES } from "../config/constants";

// Static Page Imports for Instant & Reliable Rendering
import LoginPage from "../../features/auth/LoginPage";
import RegisterPage from "../../features/auth/RegisterPage";
import ForgotPasswordPage from "../../features/auth/ForgotPasswordPage";
import DashboardPage from "../../features/dashboard/DashboardPage";
import FilesPage from "../../features/files/FilesPage";
import FolderDetailPage from "../../features/files/FolderDetailPage";
import StarredPage from "../../features/starred/StarredPage";
import SharedPage from "../../features/shared/SharedPage";
import TrashPage from "../../features/trash/TrashPage";
import SearchPage from "../../features/search/SearchPage";
import ActivityPage from "../../features/activity/ActivityPage";
import SettingsPage from "../../features/settings/SettingsPage";
import PublicLinkPage from "../../features/public/PublicLinkPage";
import NotFoundPage from "../../features/notFound/NotFoundPage";

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" label="Loading view..." fullScreen />}>
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  // Guest Authentication Routes (redirect to /files if already logged in)
  {
    element: <PublicRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: ROUTES.LOGIN,
            element: (
              <SuspenseWrapper>
                <LoginPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: ROUTES.REGISTER,
            element: (
              <SuspenseWrapper>
                <RegisterPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: ROUTES.FORGOT_PASSWORD,
            element: (
              <SuspenseWrapper>
                <ForgotPasswordPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
    ],
  },

  // Public Share Link Route (Accessible by token)
  {
    path: ROUTES.PUBLIC_LINK_PATTERN,
    element: (
      <SuspenseWrapper>
        <PublicLinkPage />
      </SuspenseWrapper>
    ),
  },

  // Protected Authenticated Application Shell
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: ROUTES.HOME,
            element: <Navigate to={ROUTES.FILES} replace />,
          },
          {
            path: ROUTES.DASHBOARD,
            element: (
              <SuspenseWrapper>
                <DashboardPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: ROUTES.FILES,
            element: (
              <SuspenseWrapper>
                <FilesPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: ROUTES.FOLDER_DETAIL_PATTERN,
            element: (
              <SuspenseWrapper>
                <FolderDetailPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: ROUTES.STARRED,
            element: (
              <SuspenseWrapper>
                <StarredPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: ROUTES.SHARED,
            element: (
              <SuspenseWrapper>
                <SharedPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: ROUTES.TRASH,
            element: (
              <SuspenseWrapper>
                <TrashPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: ROUTES.SEARCH,
            element: (
              <SuspenseWrapper>
                <SearchPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: ROUTES.ACTIVITY,
            element: (
              <SuspenseWrapper>
                <ActivityPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: ROUTES.SETTINGS,
            element: (
              <SuspenseWrapper>
                <SettingsPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
    ],
  },

  // 404 Catch-All Route
  {
    path: "*",
    element: (
      <SuspenseWrapper>
        <NotFoundPage />
      </SuspenseWrapper>
    ),
  },
]);
