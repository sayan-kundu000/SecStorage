# SecStorage REST API Conventions

This document outlines communication standards for SecStorage REST endpoints.

## Content Type & Encoding

- **Requests & Responses:** All standard endpoints consume and produce `application/json; charset=utf-8`.
- **Uploads:** Binary upload endpoints use `multipart/form-data`. Binary payloads are never encoded inside raw JSON.

## Timestamps & UUIDs

- **Timestamps:** Standard ISO 8601 UTC format (`2026-08-26T10:30:00Z`).
- **Identifiers:** All resource IDs use RFC 4122 UUID v4 strings (`123e4567-e89b-12d3-a456-426614174000`).

## HTTP Status Codes

| Status Code | Usage |
| :--- | :--- |
| `200 OK` | Successful retrieval, update, or sync operation |
| `201 Created` | Successful creation of resource |
| `204 No Content` | Successful deletion or action returning no body |
| `400 Bad Request` | Request validation failure or malformed payload |
| `401 Unauthorized` | Missing or invalid authentication token/cookie |
| `403 Forbidden` | Authenticated user lacks permission for target resource |
| `404 Not Found` | Requested resource does not exist |
| `409 Conflict` | Unique state constraint violation (e.g. duplicate active folder name) |
| `500 Internal Server Error` | Unexpected server failure (safe generic error returned) |
| `503 Service Unavailable` | Readiness probe failure (database connectivity down) |
