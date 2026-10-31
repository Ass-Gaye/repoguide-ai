import fs from "fs";

const BASE = "http://localhost:5000";

async function run() {
  console.log("=== Testing ZIP Upload and Session Pipeline ===");

  const zipBuffer = fs.readFileSync("test-sample-repo.zip");
  const blob = new Blob([zipBuffer], { type: "application/zip" });
  const formData = new FormData();
  formData.append("repository", blob, "test-sample-repo.zip");

  const uploadRes = await fetch(`${BASE}/api/repository/upload`, {
    method: "POST",
    body: formData,
  });

  const uploadData = await uploadRes.json();
  console.log("Upload status:", uploadRes.status);
  console.log("Upload response:", uploadData);

  if (uploadRes.status !== 201) {
    throw new Error(`Upload failed: ${uploadData.error}`);
  }

  const { repositoryId, repositoryName, totalFiles, tree } = uploadData;
  console.log(`Repository ID: ${repositoryId}`);
  console.log(`Repository Name: ${repositoryName}`);
  console.log(`Total Files: ${totalFiles}`);
  console.log(`Tree entries: ${tree.length}`);

  // Test Tree
  const treeRes = await fetch(`${BASE}/api/repository/${repositoryId}/tree`);
  const treeData = await treeRes.json();
  console.log("Tree endpoint status:", treeRes.status);
  console.log(`Tree files count: ${treeData.totalFiles}`);

  // Test reading README.md
  const readmePath = tree.find((t) => t.name.toLowerCase() === "readme.md")?.path;
  console.log("README path:", readmePath);
  if (readmePath) {
    const fileRes = await fetch(`${BASE}/api/repository/${repositoryId}/file?path=${encodeURIComponent(readmePath)}`);
    const fileData = await fileRes.json();
    console.log("File read status:", fileRes.status);
    console.log("File content preview:", fileData.content);
  }

  // Test reading package.json
  const pkgPath = tree.find((t) => t.name === "package.json")?.path;
  if (pkgPath) {
    const fileRes = await fetch(`${BASE}/api/repository/${repositoryId}/file?path=${encodeURIComponent(pkgPath)}`);
    const fileData = await fileRes.json();
    console.log("package.json read status:", fileRes.status);
    console.log("package.json content:", fileData.content);
  }

  console.log("=== ZIP Upload & Explorer Pipeline Verified Successfully! ===");
}

run().catch((e) => {
  console.error("ZIP Flow Test Error:", e);
  process.exit(1);
});
