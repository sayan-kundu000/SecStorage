/**
 * Activity Feed & Audit Log Contracts matching backend activity schemas.
 */

export interface ActivityResponse {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata_json?: string | null;
  ip_address?: string | null;
  created_at: string;
}

export interface ActivityListResponse {
  items: ActivityResponse[];
  total: number;
  page: number;
  page_size: number;
}
