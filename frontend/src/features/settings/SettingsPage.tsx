import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { PageHeader } from "../../components/common/PageHeader";
import { DocumentTitle } from "../../components/common/DocumentTitle";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { authService } from "../../services";
import { notify } from "../../components/ui/toast";
import { formatDate } from "../../utils/formatters";
import { getErrorMessage } from "../../utils/errors";
import { Lock, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../app/config/constants";

export function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  // Profile Form
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setIsUpdatingProfile(true);
    try {
      await authService.updateProfile({ full_name: fullName.trim() });
      await refreshUser();
      notify.success("Profile updated successfully");
    } catch (err) {
      notify.error("Failed to update profile", getErrorMessage(err));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      notify.error("Please fill in all password fields");
      return;
    }

    if (newPassword.length < 8) {
      notify.error("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      notify.error("Passwords do not match");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      notify.success("Password changed", "Active sessions have been invalidated. Please sign in again.");
      await logout();
      navigate(ROUTES.LOGIN);
    } catch (err) {
      notify.error("Password update failed", getErrorMessage(err));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await authService.logoutAll();
      notify.success("Signed out from all devices");
      navigate(ROUTES.LOGIN);
    } catch (err) {
      notify.error("Logout failed", getErrorMessage(err));
    }
  };

  return (
    <>
      <DocumentTitle title="Settings" />
      <div className="space-y-8 max-w-4xl">
        <PageHeader
          title="Account Settings"
          description="Manage your profile information, password security, and active sessions"
        />

        {/* Profile Details Card */}
        <Card className="border-border/80 bg-card/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Profile Identity</CardTitle>
                <CardDescription className="text-xs">
                  Your registered personal display name and email address
                </CardDescription>
              </div>
              <Badge variant={user?.is_admin ? "default" : "secondary"}>
                {user?.is_admin ? "ADMINISTRATOR" : "USER"}
              </Badge>
            </div>
          </CardHeader>

          <form onSubmit={handleUpdateProfile}>
            <CardContent className="space-y-4">
              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <Input
                label="Email Address"
                value={user?.email || ""}
                disabled
                helperText="Email address changes are restricted for security reasons."
              />

              <div className="text-xs text-muted-foreground pt-1">
                Account created: {formatDate(user?.created_at)}
              </div>
            </CardContent>

            <CardFooter className="flex justify-end border-t border-border/40 pt-4">
              <Button type="submit" variant="default" size="sm" isLoading={isUpdatingProfile}>
                Save Profile
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Security & Password Card */}
        <Card className="border-border/80 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              Password & Authentication Security
            </CardTitle>
            <CardDescription className="text-xs">
              Update your account password with Argon2id hash verification
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleChangePassword}>
            <CardContent className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />

              <Input
                label="New Password (min 8 chars)"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </CardContent>

            <CardFooter className="flex justify-end border-t border-border/40 pt-4">
              <Button type="submit" variant="default" size="sm" isLoading={isUpdatingPassword}>
                Change Password
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Active Sessions & Global Revocation */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Session Revocation
            </CardTitle>
            <CardDescription className="text-xs">
              Revoke active authentication refresh tokens across all browsers and devices
            </CardDescription>
          </CardHeader>

          <CardFooter className="flex justify-between items-center pt-2">
            <span className="text-xs text-muted-foreground">
              This will immediately sign out all existing active sessions.
            </span>
            <Button variant="destructive" size="sm" onClick={handleLogoutAll}>
              Sign Out All Devices
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}

export default SettingsPage;
