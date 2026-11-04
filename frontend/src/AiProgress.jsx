import { useEffect, useState } from "react";

const SLOW_HINT_AFTER_SECONDS = 60;

function formatElapsed(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

// Progress card for slow requests. The steps are estimated stages driven by a
// timer, not real progress: the last step stays active until the request
// finishes and the component unmounts.
export function AiProgress({
  title,
  description,
  steps,
  stepIntervalMs = 4000,
  slowHint = "Local AI models can take a few minutes on a computer without a GPU. You can keep waiting or cancel.",
  onCancel,
  className = "",
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const activeStep = Math.min(
    Math.floor((elapsedSeconds * 1000) / stepIntervalMs),
    steps.length - 1
  );

  return (
    <div className={`ai-progress ${className}`.trim()}>
      <div className="ai-progress-header">
        <span className="ai-spinner" aria-hidden="true" />
        <div className="ai-progress-text" role="status" aria-live="polite">
          <p className="ai-progress-title">{title}</p>
          {description && (
            <p className="ai-progress-description">{description}</p>
          )}
        </div>
        <span className="ai-elapsed" aria-label="Elapsed time">
          {formatElapsed(elapsedSeconds)}
        </span>
      </div>

      <ol className="ai-steps">
        {steps.map((step, index) => {
          const state =
            index < activeStep ? "done" : index === activeStep ? "active" : "pending";

          return (
            <li
              key={step}
              className={`ai-step ai-step-${state}`}
              aria-current={state === "active" ? "step" : undefined}
            >
              <span className="ai-step-marker" aria-hidden="true">
                {state === "done" ? "✓" : ""}
              </span>
              <span>{step}</span>
            </li>
          );
        })}
      </ol>

      {elapsedSeconds >= SLOW_HINT_AFTER_SECONDS && slowHint && (
        <p className="ai-slow-hint">{slowHint}</p>
      )}

      {onCancel && (
        <button
          type="button"
          className="secondary-button ai-cancel-button"
          onClick={onCancel}
        >
          Cancel
        </button>
      )}
    </div>
  );
}

// Shimmering placeholder shaped like the Project Overview card.
export function OverviewSkeleton() {
  return (
    <section className="repository-upload" aria-hidden="true">
      <div className="upload-card skeleton-card">
        <div className="skeleton skeleton-heading" />
        <div className="skeleton skeleton-subheading" />

        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line skeleton-line-short" />

        <div className="skeleton skeleton-label" />
        <div className="skeleton-pills">
          <div className="skeleton skeleton-pill" />
          <div className="skeleton skeleton-pill" />
          <div className="skeleton skeleton-pill" />
          <div className="skeleton skeleton-pill" />
        </div>

        <div className="skeleton skeleton-label" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line skeleton-line-short" />
      </div>
    </section>
  );
}
