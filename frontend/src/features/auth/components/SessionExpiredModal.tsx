import { Lock, ArrowRight } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { Dialog } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { ROUTES } from "../../../app/config/constants";

export function SessionExpiredModal() {
  const { status, dismissSessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isExpired = status === "SESSION_EXPIRED";

  const handleSignIn = () => {
    dismissSessionExpired();
    navigate(ROUTES.LOGIN, {
      state: { from: location },
      replace: true,
    });
  };

  return (
    <Dialog
      isOpen={isExpired}
      onClose={dismissSessionExpired}
      maxWidth="sm"
      title={
        <div className="flex items-center gap-2 text-foreground">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <span>Session Expired</span>
        </div>
      }
      description="Your authentication session has expired or was revoked. Please sign in again to continue accessing your secure files."
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="outline" size="sm" onClick={dismissSessionExpired}>
            Dismiss
          </Button>
          <Button variant="default" size="sm" onClick={handleSignIn} className="gap-1.5 shadow-sm">
            <span>Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      }
    />
  );
}
