import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchService } from "../../src/services/api/search.service";
import { starsService } from "../../src/services/api/stars.service";
import { apiClient } from "../../src/services/api/client";

vi.mock("../../src/services/api/client", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Search & Starred API Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries backend search API with filters and sorting parameters", async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          items: [
            {
              id: "file-1",
              type: "file",
              name: "Financial Report 2026.pdf",
              mime_type: "application/pdf",
              size_bytes: 1048576,
              starred: true,
              trashed: false,
              created_at: "2026-08-29T10:00:00Z",
              updated_at: "2026-08-29T10:00:00Z",
            },
          ],
          total: 1,
          next_cursor: null,
        },
      },
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

    const result = await searchService.searchResources({
      q: "Report",
      type: "file",
      sort_by: "name",
      sort_order: "asc",
      limit: 20,
    });

    expect(apiClient.get).toHaveBeenCalledWith("/search", {
      params: {
        q: "Report",
        type: "file",
        sort_by: "name",
        sort_order: "asc",
        limit: 20,
      },
      signal: undefined,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Financial Report 2026.pdf");
  });

  it("stars and unstars files and folders via real backend endpoints", async () => {
    const mockStarResponse = {
      data: {
        success: true,
        data: {
          id: "star-1",
          user_id: "user-1",
          file_id: "file-1",
          created_at: "2026-08-29T10:00:00Z",
        },
      },
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockStarResponse);
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: {} });

    const starResult = await starsService.starFile("file-1");
    expect(apiClient.post).toHaveBeenCalledWith("/files/file-1/star");
    expect(starResult.file_id).toBe("file-1");

    await starsService.unstarFile("file-1");
    expect(apiClient.delete).toHaveBeenCalledWith("/files/file-1/star");
  });

  it("lists all starred resources for the user", async () => {
    const mockListResponse = {
      data: {
        success: true,
        data: {
          items: [
            {
              id: "file-1",
              type: "file",
              name: "Important Spec.docx",
              mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              starred: true,
              created_at: "2026-08-29T10:00:00Z",
            },
          ],
        },
      },
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockListResponse);

    const result = await starsService.listStarred();
    expect(apiClient.get).toHaveBeenCalledWith("/starred", { params: { cursor: undefined, limit: 20 } });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Important Spec.docx");
  });
});
