import fs from "fs";

async function test() {
  const zipBuffer = fs.readFileSync("test-sample-repo.zip");
  const blob = new Blob([zipBuffer], { type: "application/zip" });
  const formData = new FormData();
  formData.append("repository", blob, "test-sample-repo.zip");

  const uploadRes = await fetch("http://localhost:5000/api/repository/upload", { method: "POST", body: formData });
  const uploadData = await uploadRes.json();
  console.log("Uploaded repo ID:", uploadData.repositoryId);

  console.log("Calling POST /api/analyze with repositoryId...");
  const analyzeRes = await fetch("http://localhost:5000/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repositoryId: uploadData.repositoryId })
  });

  console.log("Analyze status:", analyzeRes.status);
  const analyzeData = await analyzeRes.json();
  if (analyzeRes.status === 200) {
    console.log("Overview:", analyzeData.overview);
    console.log("Technologies:", analyzeData.technologies);
    console.log("Contributions count:", analyzeData.contributions.length);
    console.log("First contribution task:", analyzeData.contributions[0].task);
    console.log("First contribution category:", analyzeData.contributions[0].category);

    console.log("Calling POST /api/guide with repositoryId and contribution...");
    const guideRes = await fetch("http://localhost:5000/api/guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repositoryId: uploadData.repositoryId,
        contribution: analyzeData.contributions[0]
      })
    });
    console.log("Guide status:", guideRes.status);
    const guideData = await guideRes.json();
    if (guideRes.status === 200) {
      console.log("Guide task:", guideData.task);
      console.log("Guide steps count:", guideData.steps.length);
      console.log("PR title:", guideData.pullRequestTitle);
      console.log("SUCCESS: End-to-end repository context -> analyze -> guide completed!");
    } else {
      console.log("Guide returned status:", guideRes.status, guideData.error);
    }
  } else {
    console.log("Analyze returned status:", analyzeRes.status, analyzeData.error);
  }
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
