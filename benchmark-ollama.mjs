async function bench() {
  const prompt = "Explain in two sentences what a pull request is.";
  
  console.log("--- Test 1: Default settings ---");
  let t0 = Date.now();
  let res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemma4:e2b",
      stream: false,
      messages: [{ role: "user", content: prompt }]
    })
  });
  let data = await res.json();
  let elapsed1 = (Date.now() - t0) / 1000;
  console.log("Default took:", elapsed1.toFixed(1), "s | tokens/s:", (data.eval_count / (data.eval_duration / 1e9)).toFixed(2));

  console.log("--- Test 2: num_ctx: 2048 ---");
  t0 = Date.now();
  res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemma4:e2b",
      stream: false,
      options: { num_ctx: 2048 },
      messages: [{ role: "user", content: prompt }]
    })
  });
  data = await res.json();
  let elapsed2 = (Date.now() - t0) / 1000;
  console.log("num_ctx 2048 took:", elapsed2.toFixed(1), "s | tokens/s:", (data.eval_count / (data.eval_duration / 1e9)).toFixed(2));
}

bench().catch(console.error);
