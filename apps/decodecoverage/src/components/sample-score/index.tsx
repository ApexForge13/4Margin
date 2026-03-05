"use client";

export function SampleScore() {
  return (
    <div className="sample-score-card fade-up delay-4">
      <div className="sample-score-circle warning">
        <span className="sample-score-number">72</span>
        <span className="sample-score-grade">C</span>
      </div>
      <div className="sample-score-label">Coverage Health Score</div>

      <div className="sample-findings-teaser">
        <div className="blurred-finding">
          <span className="severity-badge severity-critical">High</span>
          <span className="blurred-finding-text">
            Wind/Hail Deductible: 2% ($4,800)
          </span>
        </div>
        <div className="blurred-finding">
          <span className="severity-badge severity-warning">Medium</span>
          <span className="blurred-finding-text">
            No Water Backup Coverage
          </span>
        </div>

        <div className="teaser-overlay">
          <p>Upload to see your full report</p>
          <a href="#start" className="teaser-overlay-cta">
            Get My Free Score
          </a>
        </div>
      </div>
    </div>
  );
}
