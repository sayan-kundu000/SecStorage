import { describe, it, expect, vi, beforeEach } from "vitest";
import { trashService } from "../../src/services/api/trash.service";
import { apiClient } from "../../src/services/api/client";

vi.mock("../../src/services/api/client", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Trash & Recovery API Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists soft-deleted resources in trash", async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          items: [
            {
              id: "file-99",
              type: "file",
              name: "Old Draft.txt",
              mime_type: "text/plain",
              size_bytes: 512,
              deleted_at: "2026-08-29T10:00:00Z",
            },
          ],
        },
      },
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

    const result = await trashService.listTrash();
    expect(apiClient.get).toHaveBeenCalledWith("/trash", {
      params: {
        cursor: undefined,
        limit: 20,
        sortBy: "deletedAt",
        sortOrder: "desc",
      },
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Old Draft.txt");
  });

  it("restores soft-deleted resource back to drive", async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          id: "file-99",
          type: "file",
          name: "Old Draft.txt",
          restored: true,
        },
      },
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

    const result = await trashService.restoreResource("file-99");
    expect(apiClient.post).toHaveBeenCalledWith("/trash/file-99/restore");
    expect(result.id).toBe("file-99");
  });

  it("permanently purges resource from storage", async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: {} });

    await trashService.purgeResource("file-99");
    expect(apiClient.delete).toHaveBeenCalledWith("/trash/file-99");
  });
});
