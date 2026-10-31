async function test() {
  const prompt = "Explain in two sentences what a pull request is.";
  let t0 = Date.now();
  let res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen2.5-coder:3b-instruct",
      stream: false,
      messages: [{ role: "user", content: prompt }]
    })
  });
  let data = await res.json();
  let elapsed = (Date.now() - t0) / 1000;
  console.log("qwen2.5-coder took:", elapsed.toFixed(1), "s | tokens/s:", (data.eval_count / (data.eval_duration / 1e9)).toFixed(2));
}

test().catch(console.error);
