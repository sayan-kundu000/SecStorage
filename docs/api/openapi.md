# SecStorage OpenAPI 3.0 Integration

FastAPI automatically generates an interactive OpenAPI 3.0 specification from Pydantic schemas and route annotations.

## Interactive Documentation Endpoints

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc UI:** `http://localhost:8000/redoc`
- **Raw OpenAPI JSON Spec:** `http://localhost:8000/openapi.json`

## Tag Hierarchy

Endpoints are organized into 9 domain tags:
- `Health`
- `Users`
- `Folders`
- `Files`
- `Sharing`
- `Public Links`
- `Stars`
- `Trash`
- `Activities`
