import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";
import { DocumentTitle } from "../../components/common/DocumentTitle";
import { notify } from "../../components/ui/toast";
import { ROUTES } from "../../app/config/constants";

const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .trim();

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setError(validation.error.errors[0]?.message || "Invalid email address");
      return;
    }

    setError(null);
    setIsLoading(true);

    // Simulate recovery instructions dispatch (account enumeration safe)
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      notify.info("Recovery requested", "If this account exists, instructions have been sent.");
    }, 600);
  };

  return (
    <>
      <DocumentTitle title="Reset Password" />
      <Card className="w-full shadow-2xl border-border/80 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto shadow-inner">
            <KeyRound className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Enter your email address to receive password recovery instructions
          </CardDescription>
        </CardHeader>

        {isSubmitted ? (
          <CardContent className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              If an account is associated with <span className="font-semibold text-foreground">{email}</span>, you will receive password reset guidance shortly.
            </p>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <CardContent className="space-y-4">
              <Input
                label="Registered Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                error={error || undefined}
                startIcon={<Mail className="w-4 h-4" />}
                required
                disabled={isLoading}
                autoComplete="email"
                inputMode="email"
              />
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button type="submit" variant="default" className="w-full" isLoading={isLoading}>
                Send Recovery Instructions
              </Button>
            </CardFooter>
          </form>
        )}

        <CardFooter className="pt-0 justify-center">
          <Link
            to={ROUTES.LOGIN}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    </>
  );
}

export default ForgotPasswordPage;
