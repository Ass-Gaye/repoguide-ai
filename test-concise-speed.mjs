async function testConcise() {
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
MANIFEST / DEPENDENCY FILES
- package.json
ENTRY POINT FILES
- src/index.js
`;

  console.log("Testing Concise Guide Generation...");
  const t0 = Date.now();
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemma4:e2b",
      stream: false,
      format: "json",
      messages: [
        {
          role: "system",
          content: `You are RepoGuide AI, a patient and practical open-source mentor helping beginners complete their first contributions.

Your job is to create a safe, beginner-friendly contribution guide using only the supplied repository context and selected contribution.

Return one valid JSON object with exactly these fields:
- task: string
- taskExplanation: string
- whyItMatters: string
- prerequisites: array of strings
- steps: array of strings
- repositoryInspection: string
- verificationSteps: array of strings
- pullRequestTitle: string
- pullRequestDescription: string
- limitations: array of strings

Guidelines:
1. Be concise, direct, and beginner-friendly. Keep each explanation to 1-2 clear sentences.
2. Provide 3 to 4 practical, ordered steps.
3. Suggest 2-3 ways to verify the work.
4. Keep the PR description concise (under 4 lines).
5. Do not invent source files or dependencies not present.
6. Return JSON only, matching the requested fields and types.`,
        },
        {
          role: "user",
          content: `${repositoryContext}

SELECTED CONTRIBUTION:
Task: Add unit test for index.js
Category: Testing
Difficulty: Easy
Why it may help: Improves code reliability.
Suggested first steps: Check test runner; create test file.
Evidence: package.json has no test script.

Create a practical beginner contribution guide for this task.`,
        },
      ],
    }),
  });

  const data = await response.json();
  const elapsed = (Date.now() - t0) / 1000;
  console.log(`Finished in ${elapsed.toFixed(1)} seconds!`);
  console.log(`Tokens generated: ${data.eval_count}`);
  console.log(`Tokens/sec: ${(data.eval_count / (data.eval_duration / 1e9)).toFixed(2)}`);
  const parsed = JSON.parse(data.message.content);
  console.log("Guide task:", parsed.task);
  console.log("Steps count:", parsed.steps.length);
  console.log("First step:", parsed.steps[0]);
}

testConcise().catch(console.error);
