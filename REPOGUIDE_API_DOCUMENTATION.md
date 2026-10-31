# RepoGuide AI — Verified API Documentation

**Source:** `backend/server.js` (Express 5.3.0). All routes verified by reading the source.  
**Base URL (development):** `http://localhost:5000`  
**Frontend origin (CORS allowed):** `http://localhost:5173`  
**Authentication:** None — every endpoint is unauthenticated.  
**Status conventions:** IMPLEMENTED = route exists and is handled in source.

---

## Route Index

| Method | Endpoint | Purpose | Authentication | Status |
|--------|----------|---------|----------------|--------|
| GET | `/api/health` | Health check | None | IMPLEMENTED |
| POST | `/api/analyze` | Analyze pasted README via AI | None | IMPLEMENTED |
| POST | `/api/guide` | Generate contribution guide via AI | None | IMPLEMENTED |
| POST | `/api/repository/upload` | Upload & extract a repository ZIP | None | IMPLEMENTED (backend only; no frontend UI) |
| GET | `/api/repository/:repositoryId/tree` | Return extracted file tree for a session | None | IMPLEMENTED |
| GET | `/api/repository/:repositoryId/file` | Return text content of one file in a session | None | IMPLEMENTED |

**No other routes exist.** There are no `/api/auth/*`, `/api/users`, `/api/repositories` (list), `/api/chat` (conversation), `/api/models`, or webhook endpoints. No OpenAPI/Swagger spec is present.

---

## 1. GET /api/health

**Purpose:** Confirm the backend is running.

**Authentication:** None.

**Request:** No parameters, no body.

**Query parameters:** None.

**Response (200):**
```json
{
  "status": "ok",
  "message": "RepoGuide AI backend is running."
}
```

**Validation:** None.

**Error handling:** None special; Express handles the route directly.

**Relevant code:** `backend/server.js`, route handler at the `/api/health` definition (inline, no controller/service split).

---

## 2. POST /api/analyze

**Purpose:** AI-powered analysis of pasted project documentation. Returns a project overview, detected technologies, setup instructions, exactly three beginner contribution suggestions, and maintainer questions.

**Authentication:** None.

**Request body (JSON):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `readme` | string | Yes | Project documentation/README text. Must be non-empty after `.trim()`. |

**Example request:**
```http
POST http://localhost:5000/api/analyze
Content-Type: application/json

{ "readme": "# My Project\n\n...documentation..." }
```

**Validation:**
- If `readme` is not a string or is empty/whitespace → `400` `{ error: "Please provide project documentation to analyze." }`.

**Backend AI call (Ollama):**
- `POST http://localhost:11434/api/chat`
- Headers: `Content-Type: application/json`
- Timeout: 120s (`AbortSignal.timeout`)
- Body: `{ model: "gemma4:e2b", stream: false, format: "json", messages: [ {role:"system", content:<system prompt>}, {role:"user", content: `Analyze this project documentation:\n\n${readme}`} ] }`
- The system prompt instructs the model to return JSON with fields: `overview` (string), `technologies` (string[]), `setupInstructions` (string[]), `contributions` (exactly 3 objects), `maintainerQuestions` (string[] up to 3).

**Response (200):**
```json
{
  "answer": "PROJECT OVERVIEW\n...\nTECHNOLOGIES\n- ...\n...",
  "overview": "string",
  "technologies": ["string", ...],
  "setupInstructions": ["string", ...],
  "contributions": [
    {
      "task": "string",
      "category": "Documentation | Testing | Bug Investigation | Accessibility | User Interface | Other",
      "difficulty": "Easy | Medium | Explore",
      "whyItHelps": "string",
      "firstSteps": ["string", ...],  // max 3
      "evidence": "string"
    }
  ],  // exactly 3
  "maintainerQuestions": ["string", ...]  // up to 3
}
```

**The `answer` field** is a plain-text, human-readable rendering built by joining the structured fields (overview, technologies list, setup instructions numbered, contributions, maintainer questions).

**Error responses:**
| Code | Condition | Body |
|------|-----------|------|
| 400 | `readme` missing/empty | `{ error: "Please provide project documentation to analyze." }` |
| 502 | Ollama HTTP not OK | `{ error: "Ollama could not process the request. Check that the model is available." }` |
| 502 | Empty AI content | `{ error: "The AI returned an empty answer. Please try again." }` |
| 502 | AI output not valid JSON | `{ error: "The AI returned an invalid response format. Please try again." }` |
| 502 | AI output fails schema validation | `{ error: "The AI response was incomplete. Please try again." }` or `{ error: "The AI returned an invalid contribution task. Please try again." }` |
| 503 | Timeout (`TimeoutError`) | `{ error: "The AI took too long to respond. Please try again." }` |
| 503 | Ollama unreachable / other | `{ error: "Could not reach Ollama. Make sure Ollama is running." }` |

**AI output schema validation (backend):**
- `overview` must be a string.
- `technologies`, `setupInstructions`, `maintainerQuestions` must be arrays.
- `contributions` must be an array of exactly 3.
- Each contribution: `task`, `whyItHelps`, `evidence` strings; `difficulty` ∈ [Easy, Medium, Explore]; `category` ∈ [Documentation, Testing, Bug Investigation, Accessibility, User Interface, Other]; `firstSteps` array of strings (trimmed to max 3).

**Relevant code:** `backend/server.js` — `/api/analyze` route (lines ~367–554), inline handler, no controller/service split.

---

## 3. POST /api/guide

**Purpose:** Generate a detailed, beginner-friendly contribution guide for a selected contribution task.

**Authentication:** None.

**Request body (JSON):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `readme` | string | Yes | Project documentation. Must be non-empty after `.trim()`. |
| `contribution` | object | Yes | The selected contribution. Must have a non-empty `task` string. |
| `contribution.task` | string | Yes | Name of the contribution task. |
| `contribution.category` | string | No | Defaults to "Not specified". |
| `contribution.difficulty` | string | No | Defaults to "Not specified". |
| `contribution.whyItHelps` | string | No | Defaults to "Not specified". |
| `contribution.firstSteps` | string[] | No | Defaults to "Not specified". |
| `contribution.evidence` | string | No | Defaults to "Not specified". |

**Example request:**
```http
POST http://localhost:5000/api/guide
Content-Type: application/json

{
  "readme": "# My Project\n...",
  "contribution": {
    "task": "Add contributing guide",
    "category": "Documentation",
    "difficulty": "Easy",
    ...
  }
}
```

**Validation:**
- Missing/empty `readme` → `400` `{ error: "Project documentation is required to generate a guide." }`.
- Missing `contribution`, non-object, or missing/empty `contribution.task` → `400` `{ error: "Please provide a valid contribution task." }`.

**Backend AI call (Ollama):** Same endpoint/model/settings as `/api/analyze` (`gemma4:e2b`, `stream:false`, `format:json`, 120s), with a different system prompt requesting a guide JSON schema: `task`, `taskExplanation`, `whyItMatters`, `prerequisites[]`, `steps[]`, `repositoryInspection`, `verificationSteps[]`, `pullRequestTitle`, `pullRequestDescription`, `limitations[]`.

**Response (200):**
```json
{
  "task": "string",
  "taskExplanation": "string",
  "whyItMatters": "string",
  "prerequisites": ["string", ...],
  "steps": ["string", ...],
  "repositoryInspection": "string",
  "verificationSteps": ["string", ...],
  "pullRequestTitle": "string",
  "pullRequestDescription": "string",
  "limitations": ["string", ...]
}
```

**Validation of AI output:** All six string fields (`task`, `taskExplanation`, `whyItMatters`, `repositoryInspection`, `pullRequestTitle`, `pullRequestDescription`) must be non-empty strings. The five array fields (`prerequisites`, `steps`, `verificationSteps`, `limitations`) must be arrays of strings; `steps.length > 0` and `verificationSteps.length > 0`.

**Error responses:**
| Code | Condition | Body |
|------|-----------|------|
| 400 | `readme` missing/empty | `{ error: "Project documentation is required to generate a guide." }` |
| 400 | `contribution.task` missing/invalid | `{ error: "Please provide a valid contribution task." }` |
| 502 | Ollama not OK / empty / invalid JSON / incomplete guide | `{ error: "Ollama could not generate the contribution guide." }` / `{ error: "The AI returned an empty guide. Please try again." }` / `{ error: "The AI returned an invalid guide format. Please try again." }` / `{ error: "The AI returned an incomplete contribution guide." }` |
| 503 | Timeout | `{ error: "Generating the guide took too long. Please try again." }` |
| 503 | Unreachable / other | `{ error: "Could not reach Ollama. Make sure Ollama is running." }` |

**Relevant code:** `backend/server.js` — `/api/guide` route (lines ~560–738), inline handler.

---

## 4. POST /api/repository/upload

**Purpose:** Upload a `.zip` archive of a repository, extract it safely into a temp directory, build a file/directory tree, and create a 30-minute session. **Implemented on the backend only; there is no frontend UI calling this endpoint in the current source.**

**Authentication:** None.

**Request:** `multipart/form-data`, single file field named `repository`.

**Validation (multer):** Memory storage; `fileSize ≤ 15 MB`; max 1 file.

**Backend validation:**
- `req.file` must exist → else `400` `{ error: "Please select a repository ZIP file." }`.
- Original filename must end in `.zip` (case-insensitive) and buffer must begin with ZIP magic bytes `0x50 0x4b` → else `400` `{ error: "Please upload a valid ZIP archive." }`.

**Extraction safety (`yauzl` into `os.tmpdir()/repoguide-*`):**
- Rejects encrypted ZIP entries (general purpose bit flag `0x1`).
- Rejects symbolic links (Unix mode `0xa000`).
- Rejects unsafe paths via `getSafeEntryPath` (blocks `\0`, backslashes, leading `/`, `..`, `.`, Windows drive letters; resolves and confirms the destination stays inside the temp root).
- Entry count ≤ 1500.
- Single file uncompressed size ≤ 5 MB.
- Total uncompressed size ≤ 40 MB.
- Writes extracted files with `flags: "wx"` (exclusive create).

**Response (201):**
```json
{
  "message": "Repository uploaded and inspected successfully.",
  "repositoryId": "<uuid>",        // crypto.randomUUID()
  "repositoryName": "<name without .zip>",
  "totalFiles": <number>,          // extracted.files.length
  "totalEntries": <number>,        // tree length
  "tree": [                        // sorted array from buildRepositoryTree
    { "name": "string", "path": "string", "type": "directory|file", "size": <number>, "viewable": <boolean> }
  ],
  "expiresInMinutes": 30
}
```

**`viewable`** is true when the file's extension is in `TEXT_EXTENSIONS` (≈40 text/source extensions) and `size ≤ 200 KB`.

**Error responses:**
| Code | Condition |
|------|-----------|
| 400 | Multer file-size limit (`LIMIT_FILE_SIZE`) → "The ZIP file is too large. Maximum upload size is 15 MB." |
| 400 | Other multer error, missing file, invalid ZIP, empty ZIP, extraction failure → `{ error: <message> }` |

**Session lifecycle:** Stored in `repositorySessions` Map; cleanup `setTimeout` (`.unref`) after 30 minutes removes the temp directory and Map entry.

**Relevant code:** `backend/server.js` — `/api/repository/upload` route (lines ~744–830), plus helpers `extractZipToDirectory`, `buildRepositoryTree`, `getSafeEntryPath`, `isSymbolicLink`, `removeRepositorySession`, `getRepositorySession`.

---

## 5. GET /api/repository/:repositoryId/tree

**Purpose:** Return the stored file/directory tree for an active repository session.

**Authentication:** None.

**Path parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `repositoryId` | string | Session UUID returned by `/api/repository/upload`. |

**Request:** No query params, no body.

**Response (200):**
```json
{
  "repositoryId": "<uuid>",
  "totalFiles": <number>,
  "tree": [ { "name", "path", "type", "size?", "viewable?" }, ... ]
}
```

**Error responses:**
| Code | Condition |
|------|-----------|
| 404 | Session not found or expired → `{ error: "Repository session not found or expired. Please upload again." }` |

**Relevant code:** `backend/server.js` — `/api/repository/:repositoryId/tree` route (lines ~836–850), `getRepositorySession` helper.

---

## 6. GET /api/repository/:repositoryId/file

**Purpose:** Return the text content of a single file extracted in a repository session.

**Authentication:** None.

**Path parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `repositoryId` | string | Session UUID. |

**Query parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Relative path of the file within the extracted repository. Must exactly match an entry in `session.files`. |

**Validation:**
- Missing/empty `path` → `400` `{ error: "Please provide the path of the file to inspect." }`.
- `path` not found in `session.files` → `404` `{ error: "That file does not exist in the uploaded repository." }`.
- Extension not in `TEXT_EXTENSIONS` → `415` `{ error: "This file type is not supported for text preview." }`.
- `size > MAX_VIEWABLE_FILE_SIZE` (200 KB) → `413` `{ error: "This file is too large to preview. Maximum: 200 KB." }`.
- Path is resolved safely within the session directory via `getSafeEntryPath` (ZIP-slip protection applies on read too).

**Response (200):**
```json
{
  "path": "<relative file path>",
  "size": <number>,
  "content": "<file text content, utf8>"
}
```

**Error responses:**
| Code | Condition |
|------|-----------|
| 404 | Session not found → "Repository session not found or expired..." |
| 400 | Missing path |
| 404 | File not in session |
| 415 | Unsupported file type |
| 413 | File too large (> 200 KB) |
| 500 | Read failure → `{ error: "Could not read this repository file." }` |

**Relevant code:** `backend/server.js` — `/api/repository/:repositoryId/file` route (lines ~856–915).

---

## Constants (backend/server.js)

| Constant | Value | Used by |
|----------|-------|---------|
| `PORT` | 5000 | `app.listen` |
| `MAX_ZIP_SIZE` | 15 MB (15 × 1024 × 1024) | multer upload limit |
| `MAX_ENTRIES` | 1500 | ZIP entry count cap |
| `MAX_UNCOMPRESSED_SIZE` | 40 MB | total extracted size cap |
| `MAX_SINGLE_FILE_SIZE` | 5 MB | per-file cap |
| `MAX_VIEWABLE_FILE_SIZE` | 200 KB (200 × 1024) | file preview cap |
| `SESSION_DURATION` | 30 min (30 × 60 × 1000 ms) | session TTL |
| `TEXT_EXTENSIONS` | ~40 text/source extensions | viewable + file-read allow-list |

**Body limit:** `express.json({ limit: "1mb" })` — caps `/api/analyze` and `/api/guide` request bodies at 1 MB.

---

## Endpoints NOT present (verified by source review)

- `/api/auth/*` (login, register, logout) — no authentication exists.
- `/api/users` — no user model.
- `/api/repositories` (list all) — sessions are in-memory and not listable.
- `/api/repository/:repositoryId` (delete/session management) — no explicit delete endpoint; cleanup is TTL-only.
- `/api/chat` or `/api/conversation` — no conversation history endpoint.
- `/api/models` — model (`gemma4:e2b`) is hardcoded, not configurable.
- Webhooks, GraphQL, gRPC, WebSocket — not used.

No OpenAPI/Swagger spec, Postman collection, or API reference document exists in the repository; this file is the only API documentation.

---

# END OF REPOGUIDE_API_DOCUMENTATION.md