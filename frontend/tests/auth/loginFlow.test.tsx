import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginForm } from "../../src/features/auth/components/LoginForm";
import { PasswordField } from "../../src/features/auth/components/PasswordField";
import { AuthContext, AuthContextValue } from "../../src/app/providers/AuthContext";

function renderLoginForm(authOverrides: Partial<AuthContextValue> = {}) {
  const defaultAuthValue: AuthContextValue = {
    status: "UNAUTHENTICATED",
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isLoggingIn: false,
    isRegistering: false,
    isLoggingOut: false,
    error: null,
    login: vi.fn().mockResolvedValue({} as never),
    register: vi.fn().mockResolvedValue({} as never),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshUser: vi.fn().mockResolvedValue(undefined),
    dismissSessionExpired: vi.fn(),
    clearError: vi.fn(),
    ...authOverrides,
  };

  return render(
    <AuthContext.Provider value={defaultAuthValue}>
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("Login Flow & PasswordField UX", () => {
  describe("PasswordField Component", () => {
    it("toggles password visibility and updates accessible label", () => {
      render(<PasswordField label="Secret Key" placeholder="••••••••" />);

      const input = screen.getByPlaceholderText("••••••••");
      expect(input).toHaveAttribute("type", "password");

      const toggleButton = screen.getByRole("button", { name: /show password/i });
      fireEvent.click(toggleButton);

      expect(input).toHaveAttribute("type", "text");
      expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();

      fireEvent.click(toggleButton);
      expect(input).toHaveAttribute("type", "password");
    });
  });

  describe("LoginForm Validation & Submission", () => {
    it("validates empty and invalid email fields on submission", async () => {
      renderLoginForm();

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      fireEvent.click(submitButton);

      expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/password is required/i)).toBeInTheDocument();

      // Enter invalid email
      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: "invalid-email" } });
      fireEvent.click(submitButton);

      expect(await screen.findByText(/please enter a valid email/i)).toBeInTheDocument();
    });

    it("submits valid credentials to auth context", async () => {
      const mockLogin = vi.fn().mockResolvedValueOnce({} as never);
      renderLoginForm({ login: mockLogin });

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByPlaceholderText("••••••••");
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: "user@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "ValidPassword123" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: "user@example.com",
          password: "ValidPassword123",
        });
      });
    });

    it("displays error alert when authentication fails", async () => {
      const mockLogin = vi.fn().mockRejectedValueOnce(new Error("Invalid email or password"));
      renderLoginForm({ login: mockLogin });

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByPlaceholderText("••••••••");
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: "user@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "WrongPassword" } });
      fireEvent.click(submitButton);

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/sign in failed/i)).toBeInTheDocument();
    });
  });
});
