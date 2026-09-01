import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, User as UserIcon, ArrowRight } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { PasswordField } from "./PasswordField";
import { Alert } from "../../../components/feedback/Alert";
import { notify } from "../../../components/ui/toast";
import { ROUTES } from "../../../app/config/constants";
import { registerSchema } from "../schemas/authSchemas";
import { getErrorMessage } from "../../../utils/errors";

export interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { register, isRegistering, error: authError } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [formErrors, setFormErrors] = useState<{
    full_name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validation = registerSchema.safeParse({
      full_name: fullName,
      email,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      const fieldErrors: typeof formErrors = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0] as keyof typeof formErrors;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setFormErrors(fieldErrors);
      return;
    }

    setFormErrors({});

    try {
      await register({
        full_name: validation.data.full_name,
        email: validation.data.email,
        password: validation.data.password,
      });

      notify.success("Account created!", "Welcome to SecStorage.");

      if (onSuccess) {
        onSuccess();
      } else {
        navigate(ROUTES.FILES, { replace: true });
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setServerError(msg);
      notify.error("Registration failed", msg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left" noValidate>
      {(serverError || authError) && (
        <Alert variant="destructive" title="Registration Failed">
          {serverError || authError}
        </Alert>
      )}

      <Input
        label="Full Name"
        type="text"
        placeholder="Alice Doe"
        value={fullName}
        onChange={(e) => {
          setFullName(e.target.value);
          if (formErrors.full_name) setFormErrors((prev) => ({ ...prev, full_name: undefined }));
        }}
        error={formErrors.full_name}
        startIcon={<UserIcon className="w-4 h-4" />}
        autoComplete="name"
        required
        disabled={isRegistering}
      />

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
        disabled={isRegistering}
      />

      <PasswordField
        label="Password (min 8 chars)"
        placeholder="••••••••"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: undefined }));
        }}
        error={formErrors.password}
        autoComplete="new-password"
        required
        disabled={isRegistering}
      />

      <PasswordField
        label="Confirm Password"
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          if (formErrors.confirmPassword)
            setFormErrors((prev) => ({ ...prev, confirmPassword: undefined }));
        }}
        error={formErrors.confirmPassword}
        autoComplete="new-password"
        required
        disabled={isRegistering}
      />

      <Button
        type="submit"
        variant="default"
        className="w-full gap-2 shadow-sm mt-2"
        isLoading={isRegistering}
        disabled={isRegistering}
      >
        <span>Create Account</span>
        <ArrowRight className="w-4 h-4" />
      </Button>

      <p className="text-xs text-center text-muted-foreground pt-2">
        Already have an account?{" "}
        <Link to={ROUTES.LOGIN} className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
