# RepoGuide AI — Developer Handover

**Audience:** Another AI development assistant taking over this repo.  
**Source of truth:** `C:\Users\assga\repoguide-ai` (branch `master`, single commit, working-tree modifications present).  
**Rule:** This is handover documentation only. Do not modify existing source code based on this file without verifying against the source.

---

## PROJECT IDENTITY

| Field | Value |
|-------|-------|
| **Name** | RepoGuide AI |
| **Purpose** | Help beginners understand an open-source repository and find their first contribution, using a locally-run AI model. |
| **Target users** | First-time open-source contributors; developers exploring unfamiliar repos. |
| **Core value proposition** | Paste a README → get a plain-language project overview, technologies, setup steps, 3 contribution ideas, and a step-by-step contribution guide — all from a local LLM (no API keys, no cloud AI). |
| **Hackathon context** | Single-commit prototype; one contributor's working tree has uncommitted changes. |

---

## CURRENT IMPLEMENTATION

### What a user can currently do (verified end-to-end)
1. Open `http://localhost:5173`, paste a README into the textarea, click "Analyze project".
2. Receive an AI-generated project overview, technology tags, setup instructions, three contribution cards, and maintainer questions.
3. Click "Start this contribution →" on a card to receive a detailed guide (prerequisites, steps, verification, PR title/description).
4. (Backend only — no frontend UI) Upload a `.zip` of a repository to `POST /api/repository/upload`, then browse its file tree via `GET /api/repository/:id/tree` and read individual text files via `GET /api/repository/:id/file?path=...`.

### What does NOT work / does not exist
- No AI reading of uploaded source code (ZIP is extracted but never sent to the model).
- No authentication, no users, no database, no persistence (refresh loses all state).
- No streaming AI responses (`stream: false`).
- No embeddings, vector search, or RAG.
- No frontend UI for repository ZIP upload.
- No tests of any kind.
- No production deployment config, no `start` script, no Dockerfile.

---

## TECHNOLOGY STACK

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Frontend | React | 19.3.1 | Single `App.jsx` component; no router |
| Frontend build | Vite | ^8.3.5 | `npm run dev` / `npm run build` |
| Frontend language | JavaScript (JSX) | — | No TypeScript |
| Frontend styling | Custom CSS | `App.css` | Dark theme, responsive |
| Frontend state | React `useState` | — | All in `App.jsx`; no persistence |
| Frontend API | `fetch` | — | Hardcoded `http://localhost:5000` |
| Backend | Express | 5.3.0 | `server.js`, port 5000, CommonJS |
| Backend language | Node.js | — | `"type": "commonjs"` |
| CORS | cors | 2.8.6 | Locked to `http://localhost:5173` |
| Upload | multer | ^2.5.0 | `memoryStorage`, 15 MB cap |
| ZIP parsing | yauzl | ^3.4.0 | Lazy-entry extraction |
| Dev | nodemon | ^3.1.14 | Backend auto-restart |
| Lint | ESLint (flat) | ^10.13.0 | Frontend only; React hooks + refresh |
| AI provider | Ollama (local) | — | `http://localhost:11434/api/chat` |
| AI model | gemma4:e2b | — | Hardcoded in both AI endpoints |
| Database | None | — | In-memory `Map`, 30-min TTL |
| Authentication | None | — | — |
| Testing | None | — | `test` script returns error |

---

## ARCHITECTURE

```
Browser (React SPA, :5173)
   → fetch POST http://localhost:5000/api/analyze   (or /api/guide)
Backend Express (Node, :5000) — monolithic server.js
   → fetch POST http://localhost:11434/api/chat      (Ollama, gemma4:e2b, stream:false, format:json)
   → validate + reshape JSON → return to frontend
```

- **Backend:** `backend/server.js` (923 lines) — routes, ZIP extraction, session management, AI proxying all in one file. No controllers/services split.
- **Sessions:** In-memory `Map`, UUID keys, 30-minute TTL, temp dirs under `os.tmpdir()`. Lost on restart.
- **AI:** Backend proxies to local Ollama. Two prompts: project analysis and contribution guide. Both request JSON-only output and warn the model not to follow instructions in supplied docs.
- **Repository exploration:** `yauzl` extracts ZIP to temp dir with ZIP-slip/symlink/encryption/size safeguards; tree + per-file read endpoints serve the UI (but no frontend UI exists for upload).

---

## IMPORTANT FILES

| File | Responsibility |
|------|----------------|
| `backend/server.js` | **Backend entry and ALL logic.** Express app, all 6 routes, ZIP extraction, session Map, Ollama proxying, response validation. The single most important file. |
| `backend/package.json` | Backend manifest: express, cors, multer, yauzl (+ nodemon dev). No `"start"` script. |
| `frontend/src/App.jsx` | **Frontend entry and ALL UI.** Single React component with all state, API calls (`fetch` to `:5000`), and rendering. |
| `frontend/src/main.jsx` | React boot: `createRoot`, `StrictMode`, renders `App`. |
| `frontend/src/App.css` | App styles: dark theme, layout, responsive grids, contribution/guide styling. |
| `frontend/index.html` | HTML entry; loads `/src/main.jsx`. |
| `frontend/vite.config.js` | Vite config with `@vitejs/plugin-react`. |
| `frontend/eslint.config.js` | ESLint flat config (React hooks + refresh). |
| `frontend/package.json` | Frontend manifest: react, react-dom, vite, eslint. |

**Files NOT present:** database models, controllers, services, tests, `.env`, `.env.example`, Dockerfile, CI config, OpenAPI spec, frontend router.

---

## AI IMPLEMENTATION

| Item | Detail |
|------|--------|
| **Provider** | Ollama (local, self-hosted), `http://localhost:11434/api/chat`. No cloud provider, no API keys. |
| **Model** | `gemma4:e2b` — hardcoded in both `/api/analyze` and `/api/guide`. No model selection. |
| **Mode** | `stream: false` (no streaming), `format: "json"` (JSON mode), 120s timeout. |
| **Context sent to model** | Only the pasted README text (`/api/analyze`), or README + contribution metadata (`/api/guide`). No source code, no repo structure. |
| **Repository processing** | ZIP uploaded → extracted to temp dir → tree served to UI. **AI never sees repository contents.** |
| **Embeddings / vector / RAG** | None. No such library or code. |
| **Conversation history** | None server-side; React state only; lost on refresh. |
| **AI request lifecycle** | 1) frontend `fetch POST /api/analyze` or `/api/guide` → 2) backend validates input → 3) backend `fetch POST` to Ollama (`gemma4:e2b`, system+user messages) → 4) Ollama returns `{message: {content: "<JSON>"}}` → 5) backend `JSON.parse` + strict schema validation → 6) backend reshapes and returns → 7) frontend renders. |
| **Error handling** | 502 for Ollama errors / empty / invalid JSON / schema mismatch; 503 for timeout (120s) or unreachable Ollama; 400 for missing input. No retry, no fallback model. |
| **Prompt-injection control** | System prompts instruct the model to treat docs as untrusted and not follow embedded instructions. Prompt-level only. |
| **Token/context limits** | None explicitly managed; express body cap 1 MB; whole README sent in one message. |

---

## DATABASE

**None.** No database technology, ORM, models, or migrations.

In-memory session schema (`repositorySessions: Map<uuid, Session>`):
```
Session = {
  directory: string,      // os.tmpdir()/repoguide-<random>
  files: [{path, size, extension}],
  tree: [{name, path, type, size?, viewable?}],
  uploadedAt: ISO string,
  cleanupTimer: setTimeout (30 min, .unref)
}
```
- Primary key: `sessionId` UUID (`crypto.randomUUID()`).
- No foreign keys, indexes, constraints, or persistence.
- Data lost on process restart. TTL = 30 minutes.

---

## DEVELOPMENT ENVIRONMENT

### Requirements
- Node.js installed.
- Ollama installed and running locally with model `gemma4:e2b` pulled (`ollama pull gemma4:e2b`). Ollama must be reachable at `http://localhost:11434`.
- **Note:** This Ollama dependency is **not documented** anywhere in the repo.

### Environment variables
None read by the codebase. All URLs hardcoded:
- Backend port: `5000`.
- Ollama URL: `http://localhost:11434`.
- Frontend API target: `http://localhost:5000`.
- CORS origin: `http://localhost:5173`.

### Startup commands

Terminal 1 (backend):
```
cd backend
npm install      # if node_modules missing
node server.js   # or npx nodemon server.js
# listens on http://localhost:5000
```
*(backend/package.json has no "start" script; only "test")*

Terminal 2 (frontend):
```
cd frontend
npm install      # if node_modules missing
npm run dev      # vite → http://localhost:5173
```

Then open `http://localhost:5173`, paste a README, and analyze.

### Build commands
- Frontend: `npm run build` (vite build → `dist/`).
- Backend: no build step (plain Node).

### Production
None configured. No `start` script, no Dockerfile, no process manager, no env docs. CORS is locked to localhost, so it will not work cross-origin without code changes.

---

## CURRENT STATUS

| Category | Items |
|----------|-------|
| **Completed** | Health check; README analysis via Ollama; contribution guide via Ollama; backend ZIP upload + tree + file read endpoints; frontend UI for analyze + guide; CORS, ZIP-slip protection, size limits, AI error handling. |
| **In progress / partial** | ZIP repository exploration: backend fully implemented but **no frontend UI** to reach it. |
| **Missing** | Authentication; database; persistence; tests; streaming; embeddings/RAG; AI source-code understanding; frontend upload UI; deployment config; `start` script; Ollama documentation; code separation (controllers/services); multiple components/pages. |

---

## KNOWN ISSUES

### Bugs / risks
1. **Ollama dependency undocumented.** If Ollama isn't running with `gemma4:e2b`, `/api/analyze` and `/api/guide` return `503` with no indication to the operator of what's missing.
2. **No `"start"` script in backend.** `npm start` fails; must run `node server.js` or `nodemon`.
3. **AI validation is strict.** If Ollama's JSON drifts from the expected schema, the entire request fails with `502`. No retry, no fallback.
4. **No streaming.** Users wait for the full response (up to 120s) before seeing anything.
5. **No frontend UI for ZIP upload.** The backend exploration feature is unreachable from the application.
6. **No persistence.** Refreshing the page loses the readme, result, and guide.
7. **No tests.** Zero test coverage; quality is unverified.
8. **Monolithic files.** `server.js` (923 lines) and `App.jsx` (445 lines) combine routing/UI/logic; hard to test and extend.
9. **Hardcoded localhost URLs.** Not deployable beyond local dev without editing source.
10. **No lint on backend; no type-checking anywhere.**

### Technical debt
- Single-file backend and frontend; poor separation of concerns.
- In-memory session store (no database).
- No conversation history or session listing.
- `index.css` (Vite defaults) largely unused/overridden by `App.css`.

---

## NEXT DEVELOPMENT TASKS

### P0 – Must Have (working MVP)
1. Document Ollama + `gemma4:e2b` requirement (add `README` / `.env.example`); add backend `"start"` script.
   - Files: `backend/package.json`, new `README.md` / `.env.example` at root.
   - Complexity: Low.
2. Wire a frontend file input to `POST /api/repository/upload` so the ZIP exploration feature is reachable (or remove the backend endpoints if out of MVP scope).
   - Files: `frontend/src/App.jsx`, `backend/server.js` (likely no change needed).
   - Complexity: Medium.

### P1 – Should Have
3. Add tests for backend routes and ZIP extraction safety (path traversal, size limits).
   - Files: new `backend/tests/`, test framework to add.
   - Complexity: Medium.
4. Split `server.js` into routes/services for separation of concerns.
   - Files: `backend/server.js` → new `backend/routes/`, `backend/services/`.
   - Complexity: Medium.
5. Add loading/streaming UX or at least a more informative wait state for AI responses.
   - Files: `frontend/src/App.jsx`, `backend/server.js`.
   - Complexity: Medium.

### P2 – Nice to Have (post-hackathon)
6. Add database + authentication for persistence and user ownership.
   - Files: new DB schema, ORM, auth routes; `backend/server.js`, frontend.
   - Complexity: High.
7. Enable AI to read/understand uploaded repository source files (RAG or code-aware search).
   - Files: `backend/server.js`, new indexing/search modules.
   - Complexity: High.
8. Add streaming AI responses.
   - Files: `backend/server.js`, `frontend/src/App.jsx`.
   - Complexity: Medium.

---

## IMPORTANT DEVELOPMENT CONSTRAINTS

- Do **not** rewrite the architecture unless it genuinely blocks the MVP. The current monolith is small and works; prefer incremental refactoring (tests first, then split files).
- Keep AI provider as **local Ollama** unless the hackathon requires cloud — switching providers is a large change and removes the "no API keys" benefit.
- Do **not** expose secrets: no API keys, passwords, or tokens should ever be added to source or committed. `.env` is gitignored.
- Preserve ZIP-slip / path-traversal protections (`getSafeEntryPath`, symlink rejection, size caps) if touching the upload code.
- Keep CORS restricted to the frontend origin unless the deployment target changes.
- Do not assume AI output is well-formed; keep the strict JSON validation (it's the main guard against model drift).
- The AI only ever receives README text. If you add source-code understanding, that is a **new** capability, not an extension of an existing one — design it deliberately.

---

# END OF REPOGUIDE_HANDOVER.md