async function testGuideSpeed() {
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
ENTRY POINT FILES
- src/index.js
`;

  console.log("Testing gemma4:e2b concise guide generation...");
  const t0 = Date.now();
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemma4:e2b",
      stream: false,
      format: "json",
      options: {
        num_ctx: 3072,
        temperature: 0.1,
      },
      messages: [
        {
          role: "system",
          content: `You are RepoGuide AI, a mentor helping beginners complete their first contributions.

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
1. Be concise, direct, and beginner-friendly. Keep each explanation to 1-2 sentences.
2. Provide 3 to 4 practical, ordered steps.
3. Suggest 2-3 verification steps.
4. Keep the PR description under 4 lines.
5. Base recommendations strictly on the supplied repository context.
6. Return JSON only, matching the requested fields and types.`,
        },
        {
          role: "user",
          content: `${repositoryContext}

SELECTED CONTRIBUTION:
Task: Verify functionality of src/index.js
Category: Testing
Difficulty: Easy
Why it may help: Confirms the entry point works as expected.
Suggested first steps: Review src/index.js content; run node src/index.js.
Evidence: src/index.js is present.

Create a concise beginner contribution guide for this task. Keep all explanations under 2 sentences and steps to 3-4 bullet points.`,
        },
      ],
    }),
  });

  const data = await response.json();
  const elapsed = (Date.now() - t0) / 1000;
  console.log(`Completed in: ${elapsed.toFixed(1)} seconds!`);
  console.log(`Tokens generated: ${data.eval_count}`);
  const guide = JSON.parse(data.message.content);
  console.log("Guide task:", guide.task);
  console.log("Steps count:", guide.steps.length);
  console.log("Verification steps:", guide.verificationSteps.length);
  console.log("PR Title:", guide.pullRequestTitle);
  console.log("PR Desc:", guide.pullRequestDescription);
}

testGuideSpeed().catch(console.error);
