import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { EmptyState } from "../src/components/common/EmptyState";
import { ConfirmDialog } from "../src/components/common/ConfirmDialog";

describe("UI Primitives & Common Components", () => {
  describe("Button Component", () => {
    it("renders children and handles click events", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);

      const button = screen.getByRole("button", { name: /click me/i });
      expect(button).toBeInTheDocument();
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("disables button when disabled or isLoading is true", () => {
      render(<Button isLoading={true}>Processing</Button>);
      const button = screen.getByRole("button", { name: /processing/i });
      expect(button).toBeDisabled();
    });
  });

  describe("Input Component", () => {
    it("renders label and captures typing input", () => {
      const handleChange = vi.fn();
      render(<Input label="Username" placeholder="Enter name" onChange={handleChange} />);

      expect(screen.getByText("Username")).toBeInTheDocument();
      const input = screen.getByPlaceholderText("Enter name");
      fireEvent.change(input, { target: { value: "alice" } });
      expect(handleChange).toHaveBeenCalled();
    });

    it("displays error message when provided", () => {
      render(<Input error="Field is required" placeholder="Email" />);
      expect(screen.getByText("Field is required")).toBeInTheDocument();
    });
  });

  describe("EmptyState Component", () => {
    it("renders title, description, and action button", () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="No items found"
          description="Try creating a new folder."
          actionLabel="Create Folder"
          onAction={handleAction}
        />
      );

      expect(screen.getByText("No items found")).toBeInTheDocument();
      expect(screen.getByText("Try creating a new folder.")).toBeInTheDocument();

      const button = screen.getByRole("button", { name: /create folder/i });
      fireEvent.click(button);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });

  describe("ConfirmDialog Component", () => {
    it("renders confirmation modal and triggers onConfirm", () => {
      const handleConfirm = vi.fn();
      const handleClose = vi.fn();

      render(
        <ConfirmDialog
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title="Delete Resource?"
          description="This action is permanent."
          confirmLabel="Delete Forever"
        />
      );

      expect(screen.getByText("Delete Resource?")).toBeInTheDocument();
      expect(screen.getByText("This action is permanent.")).toBeInTheDocument();

      const confirmButton = screen.getByRole("button", { name: /delete forever/i });
      fireEvent.click(confirmButton);
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });
});
