async function testNumPredict() {
  const repositoryContext = `
Repository: test-sample-repo
REPOSITORY STRUCTURE
- Total files: 3
- Top-level directories: src
- Source directories: src
TOP-LEVEL FILES
- package.json (65 bytes)
- README.md (57 bytes)
README FILE
Path: README.md
# Test Sample Project
A simple repository for testing.
`;

  console.log("Testing with num_predict: 500...");
  const t0 = Date.now();
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemma4:e2b",
      stream: false,
      format: "json",
      options: {
        num_predict: 500,
        temperature: 0.1,
      },
      messages: [
        {
          role: "system",
          content: `You are RepoGuide AI, a mentor helping beginners complete their first contributions.
Return one valid JSON object with exactly these fields:
- task: string
- taskExplanation: string (1 sentence)
- whyItMatters: string (1 sentence)
- prerequisites: array of 2 strings
- steps: array of 3 brief strings
- repositoryInspection: string (1 sentence)
- verificationSteps: array of 2 brief strings
- pullRequestTitle: string
- pullRequestDescription: string (brief)
- limitations: array of 2 brief strings
Keep answers brief and concise. Return JSON only.`,
        },
        {
          role: "user",
          content: `${repositoryContext}

SELECTED CONTRIBUTION:
Task: Add unit test for index.js
Category: Testing
Difficulty: Easy
Why it may help: Improves code reliability.
Suggested first steps: Create test file.
Evidence: package.json has no test script.

Create a concise beginner contribution guide for this task.`,
        },
      ],
    }),
  });

  const data = await response.json();
  const elapsed = (Date.now() - t0) / 1000;
  console.log(`Finished in ${elapsed.toFixed(1)} seconds!`);
  console.log(`Tokens generated: ${data.eval_count}`);
  const parsed = JSON.parse(data.message.content);
  console.log("Guide task:", parsed.task);
  console.log("Steps:", parsed.steps);
  console.log("PR Title:", parsed.pullRequestTitle);
  console.log("JSON schema valid:", !!parsed.task && !!parsed.steps && !!parsed.verificationSteps);
}

testNumPredict().catch(console.error);
