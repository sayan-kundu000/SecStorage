# SecStorage Cursor Pagination Architecture

Collection endpoints supporting pagination use cursor-based pagination metadata.

## Paginated Response Format

```json
{
  "items": [],
  "pagination": {
    "has_more": true,
    "next_cursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wOC0yNlQxMDozMDowMFoiLCJpZCI6IjEyM2U0NTY3In0=",
    "total_count": 42
  }
}
```

## Query Parameters

- `limit`: Number of items per page (default: `20`, max: `100`).
- `cursor`: Opaque base64 cursor token returned from previous request `next_cursor`.
