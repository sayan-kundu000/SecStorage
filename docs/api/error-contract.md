# SecStorage Error Contract Specification

All API errors return a consistent, structured JSON envelope.

## Error Response Structure

```json
{
  "success": false,
  "data": null,
  "message": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "body -> email",
        "message": "value is not a valid email address"
      }
    ]
  }
}
```

## Machine-Readable Error Codes

- `VALIDATION_ERROR`: Input payload failed Pydantic schema validation.
- `AUTHENTICATION_ERROR`: Missing, expired, or invalid session token.
- `AUTHORIZATION_ERROR`: Lacks required RBAC permission.
- `RESOURCE_NOT_FOUND`: Target entity ID does not exist.
- `CONFLICT`: Unique constraint or active duplicate name collision.
- `INTERNAL_SERVER_ERROR`: Unhandled 500 error (zero stack traces or SQL strings leak to client).
- `SERVICE_UNAVAILABLE`: External dependency probe failure.
