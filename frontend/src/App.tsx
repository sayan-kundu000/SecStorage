import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProviders } from "./app/providers/AppProviders";
import { PublicRoute } from "./app/router/PublicRoute";
import { ProtectedRoute } from "./app/router/ProtectedRoute";
import { AuthLayout } from "./app/layouts/AuthLayout";
import { AppLayout } from "./app/layouts/AppLayout";
import { ROUTES } from "./app/config/constants";

// Static Direct Page Components
import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import ForgotPasswordPage from "./features/auth/ForgotPasswordPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import FilesPage from "./features/files/FilesPage";
import FolderDetailPage from "./features/files/FolderDetailPage";
import FileViewerPage from "./features/files/FileViewerPage";
import StarredPage from "./features/starred/StarredPage";
import SharedPage from "./features/shared/SharedPage";
import TrashPage from "./features/trash/TrashPage";
import SearchPage from "./features/search/SearchPage";
import ActivityPage from "./features/activity/ActivityPage";
import SettingsPage from "./features/settings/SettingsPage";
import PublicLinkPage from "./features/public/PublicLinkPage";
import NotFoundPage from "./features/notFound/NotFoundPage";

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          {/* Guest Authentication Routes */}
          <Route element={<PublicRoute />}>
            <Route element={<AuthLayout />}>
              <Route path={ROUTES.LOGIN} element={<LoginPage />} />
              <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
              <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
            </Route>
          </Route>

          {/* Public Share Link Route */}
          <Route path={ROUTES.PUBLIC_LINK_PATTERN} element={<PublicLinkPage />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.FILES} replace />} />
              <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
              <Route path={ROUTES.FILES} element={<FilesPage />} />
              <Route path={ROUTES.FOLDER_DETAIL_PATTERN} element={<FolderDetailPage />} />
              <Route path={ROUTES.FILE_VIEWER_PATTERN} element={<FileViewerPage />} />
              <Route path={ROUTES.STARRED} element={<StarredPage />} />
              <Route path={ROUTES.SHARED} element={<SharedPage />} />
              <Route path={ROUTES.TRASH} element={<TrashPage />} />
              <Route path={ROUTES.SEARCH} element={<SearchPage />} />
              <Route path={ROUTES.ACTIVITY} element={<ActivityPage />} />
              <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
