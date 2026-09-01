/**
 * Inline File Preview Contracts matching backend preview schemas.
 */

export type PreviewType = "IMAGE" | "PDF" | "TEXT" | "UNSUPPORTED" | string;

export interface PreviewResponse {
  file_id: string;
  version_id?: string | null;
  preview_type: PreviewType;
  mime_type: string;
  preview_url?: string | null;
  text_content?: string | null;
  expires_at?: string | null;
  is_truncated: boolean;
  message?: string | null;
}
