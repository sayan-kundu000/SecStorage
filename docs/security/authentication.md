# SecStorage Authentication & Account Security Architecture

This document details the authentication system, JWT token lifecycle, session model, and security controls in **SecStorage**.

## Architecture Overview

```text
Frontend (Vercel)
   │
   │ POST /api/v1/auth/login (email + password)
   ▼
FastAPI (Render)
   │
   ├── Argon2id Password Verification
   ├── Session Record Created in PostgreSQL (sessions table)
   ├── SHA-256 Refresh Token Fingerprint Stored
   │
   ▼
Issue Tokens:
   ├── Access Token: Short-Lived JWT Bearer (15 minutes)
   └── Refresh Token: Long-Lived Rotated Token (30 days)
```

## JWT Token Strategy

### 1. Access Token
- **Format:** Signed JWT (`HS256` or algorithm configured via `ALGORITHM`).
- **Claims:** `sub` (User ID), `jti` (Token UUID), `type` (`"access"`), `iat`, `exp`.
- **Lifetime:** Short-lived (`ACCESS_TOKEN_EXPIRE_MINUTES`, default 15 mins).
- **Transport:** HTTP Authorization Header (`Authorization: Bearer <access_token>`).

### 2. Refresh Token & Session Model
- **Format:** Signed JWT containing `sub` (User ID), `sid` (Session ID), `jti`, `type` (`"refresh"`).
- **Database Tracking:** Stored as `Session` entity in PostgreSQL table `sessions`.
- **Raw Secret Safety:** The raw refresh token is **never** saved in PostgreSQL; only its SHA-256 fingerprint (`refresh_token_hash`) is stored.
- **Refresh Token Rotation:** On every call to `POST /api/v1/auth/refresh`, the presented refresh token's session is revoked and replaced with a newly generated session and tokens.
- **Reuse Detection:** Presenting an already-revoked or non-existent refresh token triggers immediate emergency revocation of all sessions for that user.

## Authentication Endpoints (`/api/v1/auth`)

| Method | Path | Summary | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/v1/auth/register` | Create new user account & return tokens | No |
| `POST` | `/api/v1/auth/login` | Authenticate credentials & return tokens | No |
| `POST` | `/api/v1/auth/refresh` | Rotate refresh token & issue new access token | No |
| `POST` | `/api/v1/auth/logout` | Revoke active session | Yes |
| `POST` | `/api/v1/auth/logout-all` | Revoke all sessions across devices | Yes |
| `GET` | `/api/v1/auth/me` | Return authenticated user profile | Yes |
| `POST` | `/api/v1/auth/change-password` | Update password & invalidate active sessions | Yes |

## Security Mitigations Matrix

| Threat | Mitigation |
| :--- | :--- |
| **Plaintext Credential Theft** | Passwords hashed using Argon2id with salt |
| **Token Theft / Eavesdropping** | HTTPS transport required; short access token lifetime |
| **Database Compromise** | Raw refresh tokens omitted from DB; only SHA-256 hashes stored |
| **Refresh Token Theft / Reuse** | Refresh token rotation & reuse detection revokes all user sessions |
| **Account Brute Force** | Single generic `INVALID_CREDENTIALS` (401) error; account enumeration minimized |
