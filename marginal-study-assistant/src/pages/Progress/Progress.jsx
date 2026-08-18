import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  RotateCcw,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
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

  const loadProgress = () => setStats(getProgressStats());

  useEffect(() => {
    loadProgress();
    window.addEventListener("storage", loadProgress);
    window.addEventListener("progressUpdated", loadProgress);
    return () => {
      window.removeEventListener("storage", loadProgress);
      window.removeEventListener("progressUpdated", loadProgress);
    };
  }, []);

  const recentQuizzes = useMemo(
    () => [...stats.quizzes].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8),
    [stats.quizzes]
  );

  const formatDate = (date) => {
    if (!date) return "Unknown date";
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return "Unknown date";
    return value.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
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

  const statCards = [
    [ClipboardCheck, "Total Quizzes", stats.totalQuizzes],
    [Target, "Questions Answered", stats.totalQuestions],
    [TrendingUp, "Average Score", `${stats.averageScore}%`],
    [BookOpen, "Completed Documents", stats.completedDocuments],
  ];

  return (
    <div className="progress-page">
      <header className="progress-header">
        <div>
          <div className="progress-eyebrow">STUDY PROGRESS</div>
          <h1>Your Progress</h1>
          <p>See what you have completed and how your quiz performance is changing over time.</p>
        </div>
        <button type="button" className="progress-reset-button" onClick={handleReset} disabled={resetting}>
          <RotateCcw size={15} />
          {resetting ? "Resetting..." : "Reset progress"}
        </button>
      </header>

      <main className="progress-content">
        <section className="progress-overview" aria-label="Progress overview">
          {statCards.map(([Icon, label, value]) => (
            <article className="progress-stat-card" key={label}>
              <div className="progress-stat-icon"><Icon size={19} /></div>
              <div className="progress-stat-copy">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            </article>
          ))}
        </section>

        <section className="progress-performance-card">
          <div className="progress-card-heading">
            <div>
              <span className="progress-section-label">PERFORMANCE</span>
              <h2>Your learning performance</h2>
              <p>Your score is calculated from all completed quiz questions.</p>
            </div>
            <div className="progress-performance-score">
              <Trophy size={21} />
              <strong>{stats.averageScore}%</strong>
            </div>
          </div>

          <div className="progress-performance-track" aria-label={`Average score ${stats.averageScore}%`}>
            <div className="progress-performance-fill" style={{ width: `${Math.min(100, Math.max(0, stats.averageScore))}%` }} />
          </div>

          <div className="progress-performance-footer">
            <span>{getScoreMessage(stats.averageScore)}</span>
            <span>{stats.correctAnswers} correct out of {stats.totalQuestions} questions</span>
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
              <span className="progress-count-pill">{stats.totalQuizzes} total</span>
            )}
          </div>

          {recentQuizzes.length === 0 ? (
            <div className="progress-empty-state">
              <div className="progress-empty-icon"><ClipboardCheck size={22} /></div>
              <h3>No quizzes completed yet</h3>
              <p>Complete a quiz from one of your documents and your results will appear here.</p>
              <button type="button" onClick={() => navigate("/quiz")}>Take your first quiz</button>
            </div>
          ) : (
            <div className="progress-quiz-list">
              {recentQuizzes.map((quiz, index) => (
                <article className="progress-quiz-item" key={quiz.id || `${quiz.date}-${index}`}>
                  <div className={`progress-quiz-icon ${Number(quiz.percentage) >= 60 ? "good" : ""}`}>
                    {Number(quiz.percentage) >= 60 ? <CheckCircle2 size={18} /> : <ClipboardCheck size={18} />}
                  </div>
                  <div className="progress-quiz-info">
                    <strong>{quiz.documentName || "Untitled Document"}</strong>
                    <span>{quiz.difficulty || "Mixed"} · {quiz.questionType || "Mixed"} · {formatDate(quiz.date)}</span>
                  </div>
                  <div className="progress-quiz-score">
                    <strong>{quiz.score}/{quiz.totalQuestions}</strong>
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
              <span className="progress-section-label">DOCUMENT PROGRESS</span>
              <h2>Study completion</h2>
              <p>Documents you have marked as completed.</p>
            </div>
          </div>

          {stats.documents.length === 0 ? (
            <div className="progress-empty-state compact">
              <div className="progress-empty-icon"><FileText size={22} /></div>
              <h3>No document progress yet</h3>
              <p>Your document completion progress will appear here when you study and mark documents as completed.</p>
            </div>
          ) : (
            <div className="progress-document-list">
              {stats.documents.map((document, index) => {
                const percentage = Math.min(100, Math.max(0, Number(document.progressPercentage) || 0));
                return (
                  <article className="progress-document-item" key={document.documentId || index}>
                    <div className="progress-document-top">
                      <div>
                        <strong>{document.documentName || "Untitled Document"}</strong>
                        <span>{document.completed ? "Completed" : "In progress"}</span>
                      </div>
                      <strong>{percentage}%</strong>
                    </div>
                    <div className="progress-document-track">
                      <div className="progress-document-fill" style={{ width: `${percentage}%` }} />
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
