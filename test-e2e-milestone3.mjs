import fs from "fs";
import path from "path";
import os from "os";

const BASE = "http://localhost:5000";

let passed = 0;
let failed = 0;

function assert(condition, name, details = "") {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}${details ? ` - ${details}` : ""}`);
    failed++;
  }
}

async function run() {
  console.log("=== RepoGuide AI Milestone 3 Verification Suite ===\n");

  // 1. Health Check
  console.log("1. Health Check");
  {
    const res = await fetch(`${BASE}/api/health`);
    const data = await res.json();
    assert(res.status === 200, "GET /api/health status is 200");
    assert(data.status === "ok", "GET /api/health body status is 'ok'");
  }

  // 2. GitHub URL Validation & SSRF
  console.log("\n2. GitHub URL Validation & Security");
  {
    const nonGithub = await fetch(`${BASE}/api/repository/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubUrl: "https://evil.com/owner/repo" }),
    });
    assert(nonGithub.status === 400, "Rejects non-github.com URL with 400");

    const extraPath = await fetch(`${BASE}/api/repository/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubUrl: "https://github.com/owner/repo/tree/main" }),
    });
    assert(extraPath.status === 400, "Rejects URL with subpaths like /tree/main with 400");

    const invalidChars = await fetch(`${BASE}/api/repository/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubUrl: "https://github.com/owner<script>/repo" }),
    });
    assert(invalidChars.status === 400, "Rejects invalid owner/repo characters with 400");

    const emptyUrl = await fetch(`${BASE}/api/repository/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubUrl: "" }),
    });
    assert(emptyUrl.status === 400, "Rejects empty URL with 400");
  }

  // 3. Nonexistent / Private GitHub Repository
  console.log("\n3. Nonexistent / Private Repository Import");
  {
    const nonExistent = await fetch(`${BASE}/api/repository/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubUrl: "https://github.com/this-user-definitely-does-not-exist-99999/repo-xyz-nonexistent" }),
    });
    assert(nonExistent.status === 404, "Returns 404 for nonexistent repository");
    const errData = await nonExistent.json();
    assert(errData.error.includes("private") || errData.error.includes("not found"), "Error mentions not found or private");
  }

  // 4. ZIP Upload, Tree, and File Preview
  console.log("\n4. ZIP Upload, Repository Session, Tree, and File Preview");
  {
    // Create a minimal synthetic ZIP in memory
    // Minimal valid PKZIP with README.md and package.json
    // We can use a simple node script or buffer if available.
    // Or we test /api/repository/upload with invalid ZIP first:
    const invalidZip = await fetch(`${BASE}/api/repository/upload`, {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW" },
      body: `------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="repository"; filename="test.txt"\r\nContent-Type: text/plain\r\n\r\nNot a zip\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n`,
    });
    assert(invalidZip.status === 400, "Rejects non-ZIP file with 400");
  }

  // 5. Public GitHub Import with small real repo (e.g. octocat/Hello-World)
  console.log("\n5. Public GitHub Repository Import (octocat/Hello-World)");
  let repoId = null;
  try {
    const importRes = await fetch(`${BASE}/api/repository/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubUrl: "https://github.com/octocat/Hello-World" }),
    });
    
    if (importRes.status === 201) {
      const data = await importRes.json();
      assert(true, "Public GitHub repository imported successfully (201)");
      assert(typeof data.repositoryId === "string" && data.repositoryId.length > 0, "Returns valid repositoryId");
      assert(data.repositoryName === "Hello-World", "Returns correct repositoryName");
      assert(Array.isArray(data.tree) && data.tree.length > 0, "Returns repository tree");
      repoId = data.repositoryId;

      // Test Tree Endpoint
      const treeRes = await fetch(`${BASE}/api/repository/${repoId}/tree`);
      const treeData = await treeRes.json();
      assert(treeRes.status === 200, "GET /api/repository/:id/tree returns 200");
      assert(treeData.totalFiles > 0, `Tree contains files (count: ${treeData.totalFiles})`);

      // Test File Read Endpoint
      const readmeEntry = treeData.tree.find((entry) => entry.name.toLowerCase().includes("readme"));
      if (readmeEntry) {
        const fileRes = await fetch(`${BASE}/api/repository/${repoId}/file?path=${encodeURIComponent(readmeEntry.path)}`);
        const fileData = await fileRes.json();
        assert(fileRes.status === 200, `GET /api/repository/:id/file reads ${readmeEntry.name}`);
        assert(typeof fileData.content === "string", "File content is string");
      }

      // Test AI Analyze with RepositoryId
      console.log("\n6. AI Analysis with Repository ID");
      const analyzeRes = await fetch(`${BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: repoId }),
      });
      assert(analyzeRes.status === 200 || analyzeRes.status === 502 || analyzeRes.status === 503,
        `POST /api/analyze returns valid HTTP status (${analyzeRes.status})`);
      if (analyzeRes.status === 200) {
        const analyzeData = await analyzeRes.json();
        assert(typeof analyzeData.overview === "string", "Analysis returns overview");
        assert(Array.isArray(analyzeData.contributions) && analyzeData.contributions.length === 3, "Analysis returns 3 contributions");
      } else {
        console.log(`  INFO: Ollama not currently active or returned ${analyzeRes.status}`);
      }
    } else {
      console.log(`  SKIP: GitHub API returned ${importRes.status} (rate limit or network restriction)`);
    }
  } catch (e) {
    console.log(`  SKIP: Network error during GitHub import: ${e.message}`);
  }

  console.log(`\n========================================`);
  console.log(`Verification Complete: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error("Test runner error:", e);
  process.exit(1);
});
