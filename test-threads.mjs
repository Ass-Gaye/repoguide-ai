async function testThreads() {
  const prompt = "Explain in one sentence what Git is.";
  for (const threads of [4, 6, 8, 10]) {
    const t0 = Date.now();
    const res = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma4:e2b",
        stream: false,
        options: { num_thread: threads },
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await res.json();
    const elapsed = (Date.now() - t0) / 1000;
    const tps = (data.eval_count / (data.eval_duration / 1e9)).toFixed(2);
    console.log(`Threads: ${threads} -> ${elapsed.toFixed(1)}s | ${tps} tokens/sec`);
  }
}

testThreads().catch(console.error);
