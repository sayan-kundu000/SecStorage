import { describe, it, expect, vi, beforeEach } from "vitest";
import { sharesService } from "../../src/services/api/shares.service";
import { publicLinksService } from "../../src/services/api/publicLinks.service";
import { apiClient } from "../../src/services/api/client";

vi.mock("../../src/services/api/client", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Sharing & Public Links API Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("grants collaborator access with VIEWER or EDITOR permission", async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          id: "share-123",
          grantor_id: "user-1",
          grantee_email: "colleague@example.com",
          permission: "EDITOR",
          file_id: "file-100",
          created_at: "2026-08-29T10:00:00Z",
        },
      },
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

    const result = await sharesService.createFileShare("file-100", {
      grantee_email: "colleague@example.com",
      permission: "EDITOR",
      file_id: "file-100",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/files/file-100/shares", {
      grantee_email: "colleague@example.com",
      permission: "EDITOR",
      file_id: "file-100",
    });
    expect(result.permission).toBe("EDITOR");
    expect(result.grantee_email).toBe("colleague@example.com");
  });

  it("lists resources shared with the authenticated user", async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          shares: [
            {
              id: "share-1",
              resource_type: "file",
              resource_name: "Shared Spec.pdf",
              permission: "VIEWER",
              file_id: "file-200",
              created_at: "2026-08-29T10:00:00Z",
            },
          ],
        },
      },
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

    const result = await sharesService.listSharesReceived();
    expect(apiClient.get).toHaveBeenCalledWith("/shares");
    expect(result.shares).toHaveLength(1);
    expect(result.shares[0].resource_name).toBe("Shared Spec.pdf");
  });

  it("generates an expirable password-protected public share link", async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          id: "link-999",
          token: "pub_token_abc123",
          permission: "VIEWER",
          file_id: "file-100",
          is_password_protected: true,
          created_at: "2026-08-29T10:00:00Z",
        },
      },
    };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

    const result = await publicLinksService.createFilePublicLink("file-100", {
      file_id: "file-100",
      permission: "VIEWER",
      password: "secretpassword",
      allow_download: true,
    });

    expect(apiClient.post).toHaveBeenCalledWith("/files/file-100/public-links", {
      file_id: "file-100",
      permission: "VIEWER",
      password: "secretpassword",
      allow_download: true,
    });
    expect(result.token).toBe("pub_token_abc123");
    expect(result.is_password_protected).toBe(true);
  });

  it("revokes an active public share link", async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: {} });

    await publicLinksService.revokePublicLink("link-999");
    expect(apiClient.delete).toHaveBeenCalledWith("/public-links/link-999");
  });
});
