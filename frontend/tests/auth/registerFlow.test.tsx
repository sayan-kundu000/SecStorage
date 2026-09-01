import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RegisterForm } from "../../src/features/auth/components/RegisterForm";
import { AuthContext, AuthContextValue } from "../../src/app/providers/AuthContext";

function renderRegisterForm(authOverrides: Partial<AuthContextValue> = {}) {
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
        <RegisterForm />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("Register Flow & Form Validation", () => {
  it("validates empty fields on submission", async () => {
    renderRegisterForm();

    const submitButton = screen.getByRole("button", { name: /create account/i });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/full display name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });

  it("validates password length (min 8 characters)", async () => {
    renderRegisterForm();

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "Alice Smith" } });
    fireEvent.change(emailInput, { target: { value: "alice@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "short" } });
    fireEvent.change(confirmInput, { target: { value: "short" } });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/at least 8 characters long/i)).toBeInTheDocument();
  });

  it("validates password confirmation mismatch", async () => {
    renderRegisterForm();

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "Alice Smith" } });
    fireEvent.change(emailInput, { target: { value: "alice@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "StrongPassword123" } });
    fireEvent.change(confirmInput, { target: { value: "DifferentPassword123" } });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it("submits valid registration data to auth context", async () => {
    const mockRegister = vi.fn().mockResolvedValueOnce({} as never);
    renderRegisterForm({ register: mockRegister });

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole("button", { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: "Alice Smith" } });
    fireEvent.change(emailInput, { target: { value: "alice@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "StrongPassword123" } });
    fireEvent.change(confirmInput, { target: { value: "StrongPassword123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        full_name: "Alice Smith",
        email: "alice@example.com",
        password: "StrongPassword123",
      });
    });
  });
});
