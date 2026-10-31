
import { useState, useRef } from "react";
import "./App.css";

function App() {
  const [githubUrl, setGithubUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Repository explorer state.
  const [repositoryId, setRepositoryId] = useState("");
  const [repositoryName, setRepositoryName] = useState("");
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [tree, setTree] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [selectedZipName, setSelectedZipName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [activeRequestId, setActiveRequestId] = useState(0);
  const repositoryFileInput = useRef(null);
  const githubUrlInput = useRef(null);
  const fileRequestController = useRef(null);

  // Guided Contribution Assistant state.
  const [guide, setGuide] = useState(null);
  const [guideError, setGuideError] = useState("");
  const [guideLoading, setGuideLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState("");

  async function analyzeRepository() {

    setResult(null);
    setGuide(null);
    setGuideError("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repositoryId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not analyze the repository.");
      }

      setResult(data);
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to RepoGuide AI. Check that the backend and Ollama are running."
      );
    } finally {
      setLoading(false);
    }
  }

  // Generate a practical guide for the selected contribution.
  async function startContribution(contribution) {
    setGuide(null);
    setGuideError("");
    setSelectedTask(contribution.task);
    setGuideLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/guide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repositoryId,
          contribution,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not generate the contribution guide.");
      }

      setGuide(data);
    } catch (err) {
      setGuideError(
        err.message ||
          "Could not generate the guide. Check that the backend and Ollama are running."
      );
    } finally {
      setGuideLoading(false);
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Could not copy text. Check your browser's clipboard permissions.");
    }
  }

  function closeGuide() {
    setGuide(null);
    setGuideError("");
    setSelectedTask("");
  }

  // --------------------------------------------------
  // REPOSITORY UPLOAD HANDLER
  // --------------------------------------------------

  async function handleRepositoryUpload() {
    const file = repositoryFileInput.current?.files?.[0];
    if (!file) {
      setUploadError("Please select a ZIP file.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setUploadError("Please upload a valid ZIP archive.");
      return;
    }

    setUploadLoading(true);
    setUploadError("");
    setUploadSuccess("");

    const formData = new FormData();
    formData.append("repository", file);

    try {
      const response = await fetch("http://localhost:5000/api/repository/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not upload the repository.");
      }

      setRepositoryId(data.repositoryId);
      setRepositoryName(data.repositoryName);
      setTotalFiles(data.totalFiles);
      setTotalEntries(data.totalEntries);
      setTree(data.tree || []);
      setSelectedFile(null);
      setFileContent("");
      setFileError("");
      setExpandedFolders(new Set());
      setUploadSuccess("Repository uploaded successfully.");
      setSelectedZipName("");
      setResult(null);
      setGuide(null);
      setGuideError("");
      setSelectedTask("");
      setError("");
      if (repositoryFileInput.current) {
        repositoryFileInput.current.value = "";
      }
    } catch (err) {
      setUploadError(err.message || "Could not upload the repository.");
    } finally {
      setUploadLoading(false);
    }
  }

  // --------------------------------------------------
  // GITHUB REPOSITORY IMPORT HANDLER
  // --------------------------------------------------

  async function handleGitHubImport() {
    const url = githubUrlInput.current?.value?.trim();

    if (!url) {
      setUploadError("Please enter a GitHub repository URL.");
      return;
    }

    setImportLoading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const response = await fetch("http://localhost:5000/api/repository/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ githubUrl: url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not import the GitHub repository.");
      }

      setRepositoryId(data.repositoryId);
      setRepositoryName(data.repositoryName);
      setTotalFiles(data.totalFiles);
      setTotalEntries(data.totalEntries);
      setTree(data.tree || []);
      setSelectedFile(null);
      setFileContent("");
      setFileError("");
      setExpandedFolders(new Set());
      setUploadSuccess("Repository imported successfully.");
      setGithubUrl("");
      setResult(null);
      setGuide(null);
      setGuideError("");
      setSelectedTask("");
      setError("");
      if (githubUrlInput.current) {
        githubUrlInput.current.value = "";
      }
    } catch (err) {
      setUploadError(err.message || "Could not import the GitHub repository.");
    } finally {
      setImportLoading(false);
    }
  }

  // --------------------------------------------------
  // FOLDER EXPAND / COLLAPSE
  // --------------------------------------------------

  function toggleFolder(folderPath) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  }

  // --------------------------------------------------
  // FILE SELECTION AND PREVIEW (with race protection)
  // --------------------------------------------------

  function selectFile(fileEntry) {
    // Cancel any in-flight request to prevent stale responses from
    // overwriting the currently selected file's content.
    if (fileRequestController.current) {
      fileRequestController.current.abort();
    }
    fileRequestController.current = new AbortController();

    const newRequestId = activeRequestId + 1;
    setActiveRequestId(newRequestId);
    setSelectedFile(fileEntry);
    setFileContent("");
    setFileError("");

    if (!fileEntry.viewable) {
      setFileError("This file cannot be previewed.");
      setFileLoading(false);
      return;
    }

    setFileLoading(true);

    const params = new URLSearchParams({ path: fileEntry.path });
    fetch(
      `http://localhost:5000/api/repository/${repositoryId}/file?${params.toString()}`,
      { signal: fileRequestController.current.signal }
    )
      .then((response) => {
        if (newRequestId !== activeRequestId) return;
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(
              "File not found or repository session expired. Please upload again."
            );
          }
          if (response.status === 413) {
            throw new Error("File is too large to preview.");
          }
          if (response.status === 415) {
            throw new Error("This file type is not supported for preview.");
          }
          throw new Error("Could not read this file.");
        }
        return response.json();
      })
      .then((data) => {
        if (newRequestId !== activeRequestId) return;
        setFileContent(data.content);
        setFileError("");
      })
      .catch((err) => {
        if (newRequestId !== activeRequestId) return;
        if (err.name === "AbortError") return;
        setFileError(err.message || "Could not read this file.");
      })
      .finally(() => {
        if (newRequestId !== activeRequestId) return;
        setFileLoading(false);
      });
  }

  // --------------------------------------------------
  // CLEAR REPOSITORY SESSION
  // --------------------------------------------------

  function clearRepository() {
    setRepositoryId("");
    setRepositoryName("");
    setTotalFiles(0);
    setTotalEntries(0);
    setTree([]);
    setSelectedFile(null);
    setFileContent("");
    setFileError("");
    setUploadError("");
    setUploadSuccess("");
    setSelectedZipName("");
    setExpandedFolders(new Set());
    setResult(null);
    setGuide(null);
    setGuideError("");
    setSelectedTask("");
    setError("");
    setGithubUrl("");
    if (repositoryFileInput.current) {
      repositoryFileInput.current.value = "";
    }
    if (githubUrlInput.current) {
      githubUrlInput.current.value = "";
    }
  }

  // --------------------------------------------------
  // REPOSITORY TREE HELPERS
  // --------------------------------------------------

  function getParentPath(filePath) {
    const lastSlash = filePath.lastIndexOf("/");
    if (lastSlash === -1) return "";
    return filePath.slice(0, lastSlash);
  }

  function buildNestedTree(flatTree) {
    const nodeMap = new Map();
    const rootChildren = [];

    for (const entry of flatTree) {
      nodeMap.set(entry.path, { ...entry, children: [] });
    }

    for (const entry of flatTree) {
      const parentPath = getParentPath(entry.path);
      const parent = nodeMap.get(parentPath);
      if (parent) {
        parent.children.push(nodeMap.get(entry.path));
      } else {
        rootChildren.push(nodeMap.get(entry.path));
      }
    }

    return rootChildren;
  }

  function renderTreeNodes(nodes, depth) {
    const sorted = nodes.slice().sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return sorted.map((node) => {
      const isDirectory = node.type === "directory";
      const isExpanded = expandedFolders.has(node.path);
      const children = isDirectory ? node.children : [];
      const hasChildren = children.length > 0;
      const isSelected = selectedFile?.path === node.path;

      if (isDirectory) {
        return (
          <div key={node.path} className="tree-node directory">
            <button
              className="folder-button"
              onClick={() => toggleFolder(node.path)}
              aria-expanded={isExpanded}
            >
              {isExpanded ? "▾" : "▸"} {node.name}/
            </button>
            {isExpanded && hasChildren && (
              <div className="tree-children">
                {renderTreeNodes(children, depth + 1)}
              </div>
            )}
          </div>
        );
      }

      return (
        <div
          key={node.path}
          className={`tree-node file ${isSelected ? "selected" : ""} ${
            !node.viewable ? "not-viewable" : ""
          }`}
          onClick={node.viewable ? () => selectFile(node) : undefined}
          role="button"
          tabIndex={node.viewable ? 0 : -1}
        >
          {node.name}
          {!node.viewable && <span className="preview-disabled">(not previewable)</span>}
        </div>
      );
    });
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  return (
    <main className="app">
      <header className="header">
        <a className="logo" href="/">
          <span className="logo-icon">R</span>
          RepoGuide AI
        </a>
        <span className="local-badge">● Local AI</span>
      </header>

      <section className="hero">
        <p className="eyebrow">YOUR OPEN-SOURCE COMPANION</p>
        <h1>
          Understand any repository
        </h1>
        <p className="subtitle">
          Upload a ZIP or enter a public GitHub URL to explore a project,
          discover technologies, and find your first contribution.
        </p>
      </section>

      {/* Repository Input Section */}
      <section className="repository-upload">
        <div className="upload-card">
          <div className="card-heading">
            <div>
              <h2>Repository Input</h2>
              <p>Choose a repository to explore and analyze.</p>
            </div>
          </div>

          {/* ZIP Upload */}
          <div className="upload-method">
            <h3>Upload Repository ZIP</h3>
            <div className="upload-input-group">
              <input
                type="file"
                accept=".zip"
                ref={repositoryFileInput}
                onChange={(event) => {
                  if (event.target.files?.[0]) {
                    setSelectedZipName(event.target.files[0].name);
                    setUploadError("");
                    setUploadSuccess("");
                  }
                }}
                style={{ display: "none" }}
              />
              <button
                type="button"
                className="secondary-button"
                onClick={() => repositoryFileInput.current?.click()}
                disabled={uploadLoading}
              >
                {selectedZipName
                  ? `Change file (${selectedZipName})`
                  : "Choose ZIP file"}
              </button>
              <button
                type="button"
                className="start-guide-button"
                onClick={handleRepositoryUpload}
                disabled={uploadLoading || !selectedZipName}
              >
                {uploadLoading ? "Uploading..." : "Upload repository"}
              </button>
            </div>
          </div>

          {/* GitHub URL Import */}
          <div className="upload-method">
            <h3>Import from GitHub</h3>
            <div className="github-input-group">
              <input
                type="text"
                ref={githubUrlInput}
                placeholder="https://github.com/owner/repo"
                value={githubUrl}
                onChange={(event) => {
                  setGithubUrl(event.target.value);
                  setUploadError("");
                  setUploadSuccess("");
                }}
              />
              <button
                type="button"
                className="start-guide-button"
                onClick={handleGitHubImport}
                disabled={importLoading || !githubUrl.trim()}
              >
                {importLoading ? "Importing..." : "Import repository"}
              </button>
            </div>
            <p className="github-hint">
              Public repositories only. No credentials required.
            </p>
          </div>

          {uploadError && <p className="error-message">{uploadError}</p>}
          {uploadSuccess && (
            <p className="loading-message">{uploadSuccess}</p>
          )}
        </div>
      </section>

      {/* Analyze Repository Button (shown after repository is loaded) */}
      {repositoryId && !result && !loading && (
        <section className="repository-upload">
          <div className="upload-card">
            <div className="card-heading">
              <div>
                <h2>Analyze Repository</h2>
                <p>Analyze "{repositoryName}" with RepoGuide AI.</p>
              </div>
            </div>
            <button
              type="button"
              className="start-guide-button"
              onClick={analyzeRepository}
              disabled={loading}
            >
              {loading ? "Analyzing..." : "Analyze repository →"}
            </button>
          </div>
        </section>
      )}

      {/* Repository Explorer Section */}
      {repositoryId && (
        <section className="repository-explorer">
          <div className="explorer-header">
            <div>
              <h2>Repository Explorer</h2>
              <p>{repositoryName}</p>
            </div>
            <div className="explorer-stats">
              <span>{totalFiles} files</span>
              <span>{totalEntries} entries</span>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={clearRepository}
            >
              Change repository
            </button>
          </div>
          <div className="explorer-panels">
            <div className="tree-panel">
              <div className="tree-header">{repositoryName}</div>
              <div className="tree-container">
                {tree.length === 0 ? (
                  <div className="empty-state">No files in repository.</div>
                ) : (
                  <div className="tree-list">
                    {renderTreeNodes(buildNestedTree(tree), 0)}
                  </div>
                )}
              </div>
            </div>
            <div className="preview-panel">
              {selectedFile ? (
                <div className="file-preview">
                  <div className="file-info">
                    <span className="file-path">{selectedFile.path}</span>
                    <span className="file-size">{formatFileSize(selectedFile.size)}</span>
                  </div>
                  {fileLoading && (
                    <div className="loading-message">Loading file...</div>
                  )}
                  {fileError && (
                    <div className="error-message">{fileError}</div>
                  )}
                  {!fileLoading && !fileError && (
                    fileContent !== "" ? (
                      <pre className="file-content">
                        <code>{fileContent}</code>
                      </pre>
                    ) : (
                      <div className="empty-state">
                        Select a file to preview its contents.
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📄</div>
                  <h3>Select a file</h3>
                  <p>
                    Choose a file from the repository tree to preview its
                    contents.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Analysis Loading State */}
      {loading && (
        <section className="repository-upload">
          <div className="upload-card">
            <div className="card-heading">
              <div>
                <h2>Analyzing Repository...</h2>
                <p>
                  Your local AI is analyzing &ldquo;{repositoryName}&rdquo;.
                  This may take a minute on your computer.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Analysis Error */}
      {error && !loading && (
        <section className="repository-upload">
          <div className="upload-card">
            <p className="error-message">{error}</p>
            {repositoryId && (
              <button
                type="button"
                className="start-guide-button"
                onClick={analyzeRepository}
              >
                Try again →
              </button>
            )}
          </div>
        </section>
      )}

      {/* Project Overview (shown after successful analysis) */}
      {result && (
        <section className="repository-upload">
          <div className="upload-card">
            <div className="card-heading">
              <div>
                <h2>Project Overview</h2>
                <p>Your beginner-friendly project guide.</p>
              </div>
            </div>
            <div className="overview-content">
              <p>{result.overview}</p>

              <h3>Technologies</h3>
              <div className="technology-list">
                {result.technologies.map((technology, index) => (
                  <span
                    className="technology-tag"
                    key={`${technology}-${index}`}
                  >
                    {technology}
                  </span>
                ))}
              </div>

              <h3>Setup instructions</h3>
              <ol className="setup-list">
                {result.setupInstructions.map((step, index) => (
                  <li key={`${step}-${index}`}>{step}</li>
                ))}
              </ol>

              <button
                type="button"
                className="secondary-button"
                onClick={() => copyText(result.answer)}
              >
                Copy full project guide
              </button>
            </div>
          </div>
        </section>
      )}

      {result && (
        <section className="contributions-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR NEXT MOVE</p>
              <h2>Beginner contribution finder</h2>
              <p className="subtitle">
                Three possible tasks to investigate. Verify each suggestion
                against the actual repository before opening a pull request.
              </p>
            </div>
            <span className="step-number">03</span>
          </div>

          <div className="contribution-grid">
            {result.contributions.map((contribution, index) => (
              <article
                className="contribution-card"
                key={`${contribution.task}-${index}`}
              >
                <div className="contribution-topline">
                  <span className="task-number">
                    TASK {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`difficulty difficulty-${contribution.difficulty.toLowerCase()}`}
                  >
                    {contribution.difficulty}
                  </span>
                </div>

                <h3>{contribution.task}</h3>
                <span className="category-tag">{contribution.category}</span>

                <div className="task-detail">
                  <h4>Why it may help</h4>
                  <p>{contribution.whyItHelps}</p>
                </div>

                <div className="task-detail">
                  <h4>First steps</h4>
                  <ol>
                    {contribution.firstSteps.map((step, stepIndex) => (
                      <li key={`${step}-${stepIndex}`}>{step}</li>
                    ))}
                  </ol>
                </div>

                <div className="evidence">
                  <h4>Evidence</h4>
                  <p>{contribution.evidence}</p>
                </div>

                <button
                  type="button"
                  className="secondary-button copy-task-button"
                  onClick={() =>
                    copyText(
                      `${contribution.task}\n\nCategory: ${contribution.category}\nDifficulty: ${contribution.difficulty}\n\nWhy it may help:\n${contribution.whyItHelps}\n\nFirst steps:\n${contribution.firstSteps
                        .map((step, i) => `${i + 1}. ${step}`)
                        .join("\n")}\n\nEvidence:\n${contribution.evidence}`
                    )
                  }
                >
                  Copy task
                </button>

                <button
                  type="button"
                  className="start-guide-button"
                  onClick={() => startContribution(contribution)}
                  disabled={guideLoading}
                >
                  {guideLoading && selectedTask === contribution.task
                    ? "Generating guide..."
                    : "Start this contribution →"}
                </button>
              </article>
            ))}
          </div>

          {guideLoading && (
            <section className="guide-loading" role="status">
              <h2>Preparing your contribution guide...</h2>
              <p>
                RepoGuide AI is breaking this task into beginner-friendly
                steps. This may take a little while on your computer.
              </p>
            </section>
          )}

          {guideError && (
            <p className="error-message" role="alert">
              {guideError}
            </p>
          )}

          {guide && (
            <section className="contribution-guide">
              <div className="guide-heading">
                <div>
                  <p className="eyebrow">YOUR CONTRIBUTION ROADMAP</p>
                  <h2>{guide.task}</h2>
                  <p>Follow this guide at your own pace.</p>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeGuide}
                >
                  Close guide ✕
                </button>
              </div>

              <div className="guide-intro">
                <h3>Understand the task</h3>
                <p>{guide.taskExplanation}</p>

                <h4>Why this matters</h4>
                <p>{guide.whyItMatters}</p>
              </div>

              <div className="guide-section">
                <h3>01. What you need before starting</h3>
                <ul>
                  {guide.prerequisites.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="guide-section">
                <h3>02. Your step-by-step plan</h3>
                <ol className="guide-steps">
                  {guide.steps.map((step, index) => (
                    <li key={`${step}-${index}`}>
                      <span className="guide-step-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="guide-section">
                <h3>03. Inspect the actual repository</h3>
                <p>{guide.repositoryInspection}</p>
                <p className="guide-note">
                  Important: This guide is based on the README you supplied.
                  It has not inspected the repository's actual source files.
                </p>
              </div>

              <div className="guide-section">
                <h3>04. Verify your work</h3>
                <ol>
                  {guide.verificationSteps.map((step, index) => (
                    <li key={`${step}-${index}`}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="guide-section pr-section">
                <h3>05. Prepare your pull request</h3>

                <h4>Suggested PR title</h4>
                <p>{guide.pullRequestTitle}</p>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => copyText(guide.pullRequestTitle)}
                >
                  Copy PR title
                </button>

                <h4>Suggested PR description</h4>
                <p className="pr-description">
                  {guide.pullRequestDescription}
                </p>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => copyText(guide.pullRequestDescription)}
                >
                  Copy PR description
                </button>
              </div>

              <div className="guide-section limitations-section">
                <h3>Things to verify</h3>
                <ul>
                  {guide.limitations.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {result.maintainerQuestions.length > 0 && (
            <section className="questions-card">
              <h2>Questions for maintainers</h2>
              <ul>
                {result.maintainerQuestions.map((question, index) => (
                  <li key={`${question}-${index}`}>{question}</li>
                ))}
              </ul>
            </section>
          )}
        </section>
      )}

      <footer>
        <span>RepoGuide AI</span>
        <span>Built to make open source more welcoming.</span>
      </footer>
    </main>
  );
}

export default App;
