import fs from "fs";

const BASE = "http://localhost:5000";

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}`);
    failed++;
  }
}

async function test() {
  console.log("\n1. Health check");
  {
    const res = await fetch(`${BASE}/api/health`);
    const data = await res.json();
    assert(res.status === 200 && data.status === "ok", "GET /api/health returns ok");
  }

  console.log("\n2. GitHub URL - invalid format (not github.com)");
  {
    const res = await fetch(`${BASE}/api/repository/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubUrl: "https://google.com" }),
    });
    const data = await res.json();
    assert(res.status === 400, "Returns 400 for non-GitHub URL");
    assert(data.error && data.error.includes("GitHub"), "Error mentions GitHub");
  }

  console.log("\n3. GitHub URL - invalid path format (has /tree/main)");
  {
    const res = await fetch(`${BASE}/api/repository/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubUrl: "https://github.com/owner/repo/tree/main" }),
    });
    const data = await res.json();
    assert(res.status === 400, "Returns 400 for URL with extra path");
  }

  console.log("\n4. GitHub URL - missing");
  {
    const res = await fetch(`${BASE}/api/repository/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    assert(res.status === 400, "Returns 400 for missing URL");
  }

  console.log("\n5. GitHub URL - empty string");
  {
    const res = await fetch(`${BASE}/api/repository/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubUrl: "" }),
    });
    const data = await res.json();
    assert(res.status === 400, "Returns 400 for empty URL");
  }

  console.log("\n6. Analyze with missing input");
  {
    const res = await fetch(`${BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    assert(res.status === 400, "Returns 400 for missing input");
  }

  console.log("\n7. Analyze with invalid repositoryId");
  {
    const res = await fetch(`${BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repositoryId: "00000000-0000-0000-0000-000000000000" }),
    });
    const data = await res.json();
    assert(res.status === 404, "Returns 404 for invalid repositoryId");
  }

  console.log("\n8. Guide with missing input");
  {
    const res = await fetch(`${BASE}/api/guide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    assert(res.status === 400, "Returns 400 for missing input");
  }

  console.log("\n9. Guide with invalid repositoryId");
  {
    const res = await fetch(`${BASE}/api/guide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repositoryId: "00000000-0000-0000-0000-000000000000",
        contribution: { task: "Test task" },
      }),
    });
    const data = await res.json();
    assert(res.status === 404, "Returns 404 for invalid repositoryId");
  }

  console.log("\n10. Backward compat: Analyze with readme");
  {
    const res = await fetch(`${BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readme: "# Test Project\n\nThis is a test." }),
    });
    const data = await res.json();
    // Ollama may not be running - accept 200, 502, or 503
    assert(res.status === 200 || res.status === 502 || res.status === 503,
      `Returns valid status (${res.status}) - 200=success, 502/503=Ollama not running`);
    if (res.status === 200) {
      assert(typeof data.overview === "string", "Has overview");
      assert(Array.isArray(data.contributions), "Has contributions");
      assert(data.contributions.length === 3, "Has exactly 3 contributions");
    }
  }

  console.log("\n11. Backward compat: Guide with readme");
  {
    const res = await fetch(`${BASE}/api/guide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        readme: "# Test Project",
        contribution: { task: "Add documentation", category: "Documentation", difficulty: "Easy" },
      }),
    });
    const data = await res.json();
    assert(res.status === 200 || res.status === 502 || res.status === 503,
      `Returns valid status (${res.status})`);
    if (res.status === 200) {
      assert(typeof data.task === "string", "Has task");
      assert(Array.isArray(data.steps), "Has steps");
    }
  }

  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

test().catch((e) => {
  console.error("Test error:", e.message);
  process.exit(1);
});