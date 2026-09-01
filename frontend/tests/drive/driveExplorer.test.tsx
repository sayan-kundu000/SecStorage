import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StorageUsageWidget } from "../../src/components/drive/StorageUsageWidget";
import { MoveDialog } from "../../src/components/files/MoveDialog";
import { ShareDialog } from "../../src/components/files/ShareDialog";
import { FileContextMenu } from "../../src/components/files/FileContextMenu";
import { searchService } from "../../src/services";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../src/services/api/search.service", () => ({
  searchService: {
    searchResources: vi.fn(),
  },
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

describe("Drive Explorer Components & Dialogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("StorageUsageWidget", () => {
    it("renders storage usage byte percentage correctly", () => {
      render(
        <StorageUsageWidget usedBytes={5000000000} totalBytes={10000000000} />
      );

      expect(screen.getByText("Storage Space")).toBeInTheDocument();
      expect(screen.getByText("50%")).toBeInTheDocument();
    });
  });

  describe("MoveDialog", () => {
    it("renders available folders and calls onMove with selected destination", async () => {
      const mockSearch = searchService.searchResources as ReturnType<typeof vi.fn>;
      mockSearch.mockResolvedValueOnce({
        items: [
          { id: "folder-1", name: "Projects", type: "folder" },
          { id: "folder-2", name: "Archive", type: "folder" },
        ],
        total: 2,
      });

      const handleMove = vi.fn().mockResolvedValue(undefined);
      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <MoveDialog
            isOpen={true}
            onClose={vi.fn()}
            targetId="file-1"
            targetName="report.pdf"
            isFolder={false}
            onMove={handleMove}
          />
        </QueryClientProvider>
      );

      expect(screen.getByText(/move "report.pdf"/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Projects")).toBeInTheDocument();
      });

      // Select Projects folder
      fireEvent.click(screen.getByText("Projects"));

      const moveButton = screen.getByRole("button", { name: /move here/i });
      fireEvent.click(moveButton);

      await waitFor(() => {
        expect(handleMove).toHaveBeenCalledWith("folder-1");
      });
    });
  });

  describe("ShareDialog", () => {
    it("validates grantee email and submits share permission request", async () => {
      const handleShare = vi.fn().mockResolvedValue(undefined);

      const { container } = render(
        <ShareDialog
          isOpen={true}
          onClose={vi.fn()}
          targetId="file-1"
          targetName="budget.xlsx"
          isFolder={false}
          onShare={handleShare}
        />
      );

      expect(screen.getByText(/share file/i)).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/grantee email address/i);
      const form = container.querySelector("form")!;

      // Enter invalid email and submit form
      fireEvent.change(emailInput, { target: { value: "invalid-email" } });
      fireEvent.submit(form);

      expect(await screen.findByText("Please enter a valid user email address.")).toBeInTheDocument();

      // Enter valid email and submit form
      fireEvent.change(emailInput, { target: { value: "colleague@example.com" } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(handleShare).toHaveBeenCalledWith("colleague@example.com", "VIEWER");
      });
    });
  });

  describe("FileContextMenu", () => {
    it("renders options and triggers action handlers on click", () => {
      const handleOpen = vi.fn();
      const handleRename = vi.fn();
      const handleTrash = vi.fn();

      render(
        <FileContextMenu
          isOpen={true}
          x={100}
          y={100}
          onClose={vi.fn()}
          isFolder={true}
          onOpen={handleOpen}
          onRename={handleRename}
          onTrash={handleTrash}
        />
      );

      expect(screen.getByText(/open folder/i)).toBeInTheDocument();
      expect(screen.getByText(/rename/i)).toBeInTheDocument();
      expect(screen.getByText(/move to trash/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText(/open folder/i));
      expect(handleOpen).toHaveBeenCalled();
    });
  });
});
