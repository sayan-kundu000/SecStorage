import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, ArrowRight } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { PasswordField } from "./PasswordField";
import { Alert } from "../../../components/feedback/Alert";
import { notify } from "../../../components/ui/toast";
import { ROUTES } from "../../../app/config/constants";
import { getSafeReturnUrl } from "../../../utils/security";
import { loginSchema } from "../schemas/authSchemas";
import { getErrorMessage } from "../../../utils/errors";

export interface LoginFormProps {
  onSuccess?: () => void;
  returnTo?: string;
}

export function LoginForm({ onSuccess, returnTo: propReturnTo }: LoginFormProps) {
  const { login, isLoggingIn, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Extract safe return URL from props, query string, or router state
  const searchParams = new URLSearchParams(location.search);
  const queryReturnTo = searchParams.get("returnTo");
  const stateFrom = (location.state as { from?: { pathname?: string; search?: string } })?.from;
  const statePath = stateFrom ? `${stateFrom.pathname || ""}${stateFrom.search || ""}` : undefined;

  const resolvedReturnTo = getSafeReturnUrl(propReturnTo || queryReturnTo || statePath);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Validate with Zod schema
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0] as "email" | "password";
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setFormErrors(fieldErrors);
      return;
    }

    setFormErrors({});

    try {
      await login({
        email: validation.data.email,
        password: validation.data.password,
      });

      notify.success("Welcome back!", "Signed in successfully.");

      if (onSuccess) {
        onSuccess();
      } else {
        navigate(resolvedReturnTo, { replace: true });
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setServerError(msg);
      notify.error("Authentication failed", msg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left" noValidate>
      {(serverError || authError) && (
        <Alert variant="destructive" title="Sign In Failed">
          {serverError || authError}
        </Alert>
      )}

      <Input
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: undefined }));
        }}
        error={formErrors.email}
        startIcon={<Mail className="w-4 h-4" />}
        autoComplete="email"
        inputMode="email"
        required
        disabled={isLoggingIn}
      />

      <div className="space-y-1">
        <PasswordField
          label="Password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={formErrors.password}
          autoComplete="current-password"
          required
          disabled={isLoggingIn}
        />
        <div className="text-right pt-0.5">
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="text-xs text-primary hover:underline transition-colors"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <Button
        type="submit"
        variant="default"
        className="w-full gap-2 shadow-sm mt-2"
        isLoading={isLoggingIn}
        disabled={isLoggingIn}
      >
        <span>Sign In</span>
        <ArrowRight className="w-4 h-4" />
      </Button>

      <p className="text-xs text-center text-muted-foreground pt-2">
        Don&apos;t have an account?{" "}
        <Link to={ROUTES.REGISTER} className="text-primary font-medium hover:underline">
          Create one now
        </Link>
      </p>
    </form>
  );
}
