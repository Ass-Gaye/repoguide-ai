
import { useState } from "react";
import "./App.css";

function App() {
  const [readme, setReadme] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyzeProject(event) {
    event.preventDefault();

    setAnswer("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ readme }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not analyze the project.");
      }

      setAnswer(data.answer);
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to RepoGuide AI. Check that the backend and Ollama are running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <header className="header">
        <a className="logo" href="/">
          <span className="logo-icon">R</span>
          RepoGuide AI
        </a>
        <span className="local-badge">● Local AI</span>
      </header>

      <section className="hero">
        <p className="eyebrow">YOUR OPEN-SOURCE COMPANION</p>
        <h1>
          Every repository has a
          <br />
          <span>place for you.</span>
        </h1>
        <p className="subtitle">
          Understand any project, find your starting point, and make your
          first open-source contribution with confidence.
        </p>
      </section>

      <section className="workspace">
        <form className="input-card" onSubmit={analyzeProject}>
          <div className="card-heading">
            <div>
              <h2>Explore a repository</h2>
              <p>Start by pasting its README or project documentation.</p>
            </div>
            <span className="step-number">01</span>
          </div>

          <label htmlFor="readme">Project documentation</label>
          <textarea
            id="readme"
            value={readme}
            onChange={(event) => setReadme(event.target.value)}
            placeholder={`# My Open Source Project

Paste the project's README here...

Include its description, technologies, installation steps, and contribution guidelines if available.`}
            rows={12}
            required
          />

          <div className="input-footer">
            <span>{readme.length.toLocaleString()} characters</span>
            <button type="submit" disabled={loading || !readme.trim()}>
              {loading ? "Analyzing project..." : "Analyze project →"}
            </button>
          </div>

          {loading && (
            <p className="loading-message" role="status">
              Your local AI is reading the documentation. This may take a
              minute on your computer.
            </p>
          )}

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </form>

        <section className="results-card" aria-live="polite">
          <div className="card-heading">
            <div>
              <h2>Your project guide</h2>
              <p>A beginner-friendly breakdown of the repository.</p>
            </div>
            <span className="step-number">02</span>
          </div>

          {answer ? (
            <pre className="answer">{answer}</pre>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">⌘</div>
              <h3>Your next contribution starts here.</h3>
              <p>
                Your project overview, technology breakdown, setup steps,
                and beginner-friendly tasks will appear here.
              </p>
            </div>
          )}
        </section>
      </section>

      <footer>
        <span>RepoGuide AI</span>
        <span>Built to make open source more welcoming.</span>
      </footer>
    </main>
  );
}

export default App;
