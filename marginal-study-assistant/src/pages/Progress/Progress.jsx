import { useEffect, useMemo, useState } from "react";
import { FileText, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearProgress, getProgressStats } from "../../services/progressService";
import "./Progress.css";

const EMPTY_STATS = {
  quizzes: [],
  documents: [],
  studySessions: [],
  totalQuizzes: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  averageScore: 0,
  totalStudySessions: 0,
  totalDocuments: 0,
  completedDocuments: 0,
};

function Progress() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(EMPTY_STATS);
  const [resetting, setResetting] = useState(false);

  const loadProgress = () => {
    setStats(getProgressStats());
  };

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });

    loadProgress();

    window.addEventListener("storage", loadProgress);
    window.addEventListener("progressUpdated", loadProgress);

    return () => {
      window.removeEventListener("storage", loadProgress);
      window.removeEventListener("progressUpdated", loadProgress);
    };
  }, []);

  const recentQuizzes = useMemo(
    () =>
      [...stats.quizzes]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 8),
    [stats.quizzes]
  );

  const formatDate = (date) => {
    if (!date) return "Unknown date";

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
      return "Unknown date";
    }

    return value.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getScoreMessage = (score) => {
    if (score >= 80) return "Excellent progress";
    if (score >= 60) return "Good progress";
    if (score > 0) return "Keep practicing";
    return "Start your first quiz";
  };

  const handleReset = () => {
    if (resetting) return;

    const confirmed = window.confirm(
      "Reset all study progress? This will permanently remove your quiz history, document progress, and study sessions from this browser."
    );

    if (!confirmed) return;

    setResetting(true);
    clearProgress();
    setStats(getProgressStats());
    setResetting(false);
  };

  return (
    <div className="progress-page">
      <header className="progress-header">
        <div className="progress-heading-copy">
          <div className="progress-eyebrow">STUDY PROGRESS</div>
          <h1>Your Progress</h1>
          <p>
            Track your study activity, quiz results, and document completion.
          </p>
        </div>

        <button
          type="button"
          className="progress-reset-button"
          onClick={handleReset}
          disabled={resetting}
        >
          <RotateCcw size={15} />
          {resetting ? "Resetting..." : "Reset progress"}
        </button>
      </header>

      <main className="progress-content">
        <section className="progress-overview" aria-label="Progress overview">
          <article className="progress-stat-card">
            <span className="progress-stat-label">TOTAL QUIZZES</span>
            <strong>{stats.totalQuizzes}</strong>
          </article>

          <article className="progress-stat-card">
            <span className="progress-stat-label">QUESTIONS ANSWERED</span>
            <strong>{stats.totalQuestions}</strong>
          </article>

          <article className="progress-stat-card">
            <span className="progress-stat-label">AVERAGE SCORE</span>
            <strong>{stats.averageScore}%</strong>
          </article>

          <article className="progress-stat-card">
            <span className="progress-stat-label">DOCUMENTS COMPLETED</span>
            <strong>{stats.completedDocuments}</strong>
          </article>
        </section>

        <section className="progress-performance-card">
          <div className="progress-card-heading">
            <div>
              <span className="progress-section-label">PERFORMANCE</span>
              <h2>Your learning performance</h2>
              <p>
                Your average score is calculated from all completed quiz
                questions.
              </p>
            </div>

            <div className="progress-performance-score">
              <strong>{stats.averageScore}%</strong>
            </div>
          </div>

          <div
            className="progress-performance-track"
            aria-label={`Average score ${stats.averageScore}%`}
          >
            <div
              className="progress-performance-fill"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(0, Number(stats.averageScore) || 0)
                )}%`,
              }}
            />
          </div>

          <div className="progress-performance-footer">
            <span>{getScoreMessage(stats.averageScore)}</span>

            <span>
              {stats.correctAnswers} correct out of {stats.totalQuestions}{" "}
              questions
            </span>
          </div>
        </section>

        <section className="progress-section">
          <div className="progress-section-heading">
            <div>
              <span className="progress-section-label">QUIZ HISTORY</span>
              <h2>Recent quizzes</h2>
              <p>Your latest completed quiz results.</p>
            </div>

            {stats.totalQuizzes > 0 && (
              <span className="progress-count">
                {stats.totalQuizzes}{" "}
                {stats.totalQuizzes === 1 ? "quiz" : "quizzes"}
              </span>
            )}
          </div>

          {recentQuizzes.length === 0 ? (
            <div className="progress-empty-state">
              <h3>No quizzes completed yet</h3>

              <p>
                Complete a quiz from one of your documents and your results
                will appear here.
              </p>

              <button
                type="button"
                onClick={() => navigate("/quiz")}
              >
                Take your first quiz
              </button>
            </div>
          ) : (
            <div className="progress-quiz-list">
              {recentQuizzes.map((quiz, index) => (
                <article
                  className="progress-quiz-item"
                  key={quiz.id || `${quiz.date}-${index}`}
                >
                  <div className="progress-quiz-info">
                    <strong>
                      {quiz.documentName || "Untitled Document"}
                    </strong>

                    <span>
                      {quiz.difficulty || "Mixed"} ·{" "}
                      {quiz.questionType || "Mixed"} ·{" "}
                      {formatDate(quiz.date)}
                    </span>
                  </div>

                  <div className="progress-quiz-score">
                    <strong>
                      {quiz.score}/{quiz.totalQuestions}
                    </strong>

                    <span>{quiz.percentage}%</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="progress-section">
          <div className="progress-section-heading">
            <div>
              <span className="progress-section-label">
                DOCUMENT PROGRESS
              </span>
              <h2>Study completion</h2>
              <p>
                Documents you have studied and marked as completed.
              </p>
            </div>
          </div>

          {stats.documents.length === 0 ? (
            <div className="progress-empty-state compact">
              <div className="progress-document-empty-icon">
                <FileText size={22} strokeWidth={1.8} />
              </div>

              <h3>No document progress yet</h3>

              <p>
                Your document completion progress will appear here when you
                study and mark documents as completed.
              </p>
            </div>
          ) : (
            <div className="progress-document-list">
              {stats.documents.map((document, index) => {
                const percentage = Math.min(
                  100,
                  Math.max(
                    0,
                    Number(document.progressPercentage) || 0
                  )
                );

                return (
                  <article
                    className="progress-document-item"
                    key={document.documentId || index}
                  >
                    <div className="progress-document-top">
                      <div className="progress-document-name">
                        <div className="progress-document-icon">
                          <FileText size={19} strokeWidth={1.8} />
                        </div>

                        <div>
                          <strong>
                            {document.documentName || "Untitled Document"}
                          </strong>

                          <span>
                            {document.completed
                              ? "Completed"
                              : "In progress"}
                          </span>
                        </div>
                      </div>

                      <strong>{percentage}%</strong>
                    </div>

                    <div className="progress-document-track">
                      <div
                        className="progress-document-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Progress;