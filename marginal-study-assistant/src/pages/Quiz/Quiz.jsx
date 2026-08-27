import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Trophy,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../../services/api";
import "./quiz.css";

const QUESTION_COUNTS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

const QUESTION_TYPES = [
  {
    value: "mixed",
    label: "Mixed",
    description: "A balanced mixture of question types",
  },
  {
    value: "multiple-choice",
    label: "Multiple Choice",
    description: "Four options for each question",
  },
  {
    value: "true-false",
    label: "True / False",
    description: "Choose True or False",
  },
  {
    value: "short-answer",
    label: "Short Answer",
    description: "Answer briefly in your own words",
  },
  {
    value: "essay",
    label: "Essay",
    description: "Write a detailed answer",
  },
];

const DIFFICULTIES = [
  { value: "easy", label: "Easy", description: "Straightforward recall" },
  { value: "medium", label: "Medium", description: "Requires understanding" },
  { value: "hard", label: "Hard", description: "Requires deeper reasoning" },
  { value: "mixed", label: "Mixed", description: "A mixture of difficulty levels" },
];

function normalizeAnswer(value) {
  return String(value ?? "").trim().toLowerCase();
}

function Quiz() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    questionCount: 10,
    questionType: "mixed",
    difficulty: "mixed",
  });
  const [documentData, setDocumentData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);

  const currentQuestion = questions[currentIndex];

  const answeredCount = useMemo(
    () =>
      questions.filter(
        (_, index) =>
          String(answers[index] ?? "").trim().length > 0
      ).length,
    [questions, answers]
  );

  const percentage = questions.length
    ? Math.round((score / questions.length) * 100)
    : 0;

  const loadDocument = () => {
    const saved = localStorage.getItem("studydesk_current_document");

    if (!saved) {
      throw new Error("No document has been selected yet.");
    }

    let parsed;

    try {
      parsed = JSON.parse(saved);
    } catch {
      throw new Error("The saved document data is invalid.");
    }

    const documentId =
      parsed?.id ??
      parsed?.documentId ??
      parsed?._id;

    if (!documentId) {
      throw new Error(
        "The selected document does not have a valid document ID."
      );
    }

    setDocumentData(parsed);
    return { ...parsed, id: documentId };
  };

  const startQuiz = async () => {
    try {
      setLoading(true);
      setError("");
      setFinished(false);
      setScore(0);
      setAnswers({});
      setCurrentIndex(0);

      const document = loadDocument();

      const result = await apiPost("/api/quiz/generate", {
        documentId: document.id,
        questionCount: settings.questionCount,
        questionType: settings.questionType,
        difficulty: settings.difficulty,
      });

      const generatedQuestions = result?.data?.questions;

      if (
        !Array.isArray(generatedQuestions) ||
        generatedQuestions.length === 0
      ) {
        throw new Error("No quiz questions were generated.");
      }

      setQuestions(generatedQuestions);
      setStarted(true);
    } catch (err) {
      console.error("Quiz error:", err);
      setError(
        err?.message ||
          "Something went wrong while generating the quiz."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateAnswer = (value) => {
    setAnswers((previous) => ({
      ...previous,
      [currentIndex]: value,
    }));
  };

  const calculateScore = () =>
    questions.reduce((total, question, index) => {
      const answer = answers[index];

      if (!answer || question.type === "essay") {
        return total;
      }

      return normalizeAnswer(answer) === normalizeAnswer(question.answer)
        ? total + 1
        : total;
    }, 0);

  const finishQuiz = async () => {
    const finalScore = calculateScore();
    setScore(finalScore);
    setFinished(true);

    try {
      const document =
        documentData || loadDocument();

      await apiPost("/api/progress/quiz", {
        document: {
          id:
            document?.id ??
            document?.documentId ??
            document?._id,
          name:
            document?.name ||
            document?.documentName ||
            "Untitled Document",
        },
        score: finalScore,
        totalQuestions: questions.length,
        questionType: settings.questionType,
        difficulty: settings.difficulty,
      });
    } catch (err) {
      console.error("Could not save quiz progress:", err);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    finishQuiz();
  };

  const previousQuestion = () => {
    setCurrentIndex((index) => Math.max(0, index - 1));
  };

  const restartQuiz = () => {
    setQuestions([]);
    setAnswers({});
    setCurrentIndex(0);
    setScore(0);
    setFinished(false);
    setStarted(false);
    setError("");
  };

  if (loading) {
    return (
      <div className="quiz-page">
        <header className="quiz-header">
          <div className="quiz-eyebrow">STUDY QUIZ</div>
          <h1>Quiz</h1>
          <p>Marginal is creating questions from your document.</p>
        </header>

        <main className="quiz-content">
          <div className="quiz-loading">
            <div className="quiz-spinner" />
            <div>
              <strong>Building your quiz...</strong>
              <p>This may take a moment.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-page">
        <header className="quiz-header">
          <div className="quiz-eyebrow">STUDY QUIZ</div>
          <h1>Quiz</h1>
          <p>Test your understanding of your document.</p>
        </header>

        <main className="quiz-content">
          <div className="quiz-error">
            <AlertCircle size={26} />
            <h2>Couldn't create the quiz</h2>
            <p>{error}</p>
            <p className="quiz-error-hint">
              Make sure you have opened a document before starting a quiz.
            </p>

            <div className="quiz-result-actions">
              <button
                type="button"
                className="quiz-primary-button"
                onClick={() => {
                  setError("");
                  startQuiz();
                }}
              >
                Try Again
              </button>

              <button
                type="button"
                className="quiz-secondary-button"
                onClick={() => navigate("/summary")}
              >
                <ArrowLeft size={15} />
                Back to Summary
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="quiz-page">
        <header className="quiz-header">
          <div className="quiz-eyebrow">QUIZ COMPLETE</div>
          <h1>Quiz Results</h1>
          <p>Review your performance and the questions you answered.</p>
        </header>

        <main className="quiz-content">
          <div className="quiz-result-card">
            <div className="quiz-trophy">
              {percentage >= 60 ? (
                <Trophy size={28} />
              ) : (
                <ClipboardCheck size={28} />
              )}
            </div>

            <div className="quiz-score">
              {score}/{questions.length}
            </div>

            <h2>{percentage}%</h2>

            <p>
              {percentage >= 80
                ? "Excellent work."
                : percentage >= 60
                  ? "Good work. Keep reviewing."
                  : "Keep studying and try the quiz again."}
            </p>

            <div className="quiz-result-actions">
              <button
                type="button"
                className="quiz-primary-button"
                onClick={restartQuiz}
              >
                Take Another Quiz
              </button>

              <button
                type="button"
                className="quiz-secondary-button"
                onClick={() => navigate("/summary")}
              >
                <ArrowLeft size={15} />
                Back to Summary
              </button>
            </div>
          </div>

          <div className="quiz-review">
            <h2>Review</h2>

            {questions.map((question, index) => {
              const userAnswer = answers[index];
              const isEssay = question.type === "essay";
              const isCorrect =
                !isEssay &&
                normalizeAnswer(userAnswer) ===
                  normalizeAnswer(question.answer);

              return (
                <article
                  className={`quiz-review-item ${
                    isCorrect ? "correct" : "incorrect"
                  }`}
                  key={`${question.question}-${index}`}
                >
                  <div className="quiz-review-number">{index + 1}</div>

                  <div>
                    <strong>{question.question}</strong>
                    <p>
                      Your answer:{" "}
                      {userAnswer || "No answer"}
                    </p>
                    <p>
                      Correct answer:{" "}
                      {question.answer || "See model answer"}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  if (started && currentQuestion) {
    const progress =
      ((currentIndex + 1) / questions.length) * 100;
    const selectedAnswer = answers[currentIndex] ?? "";
    const isLastQuestion =
      currentIndex === questions.length - 1;

    return (
      <div className="quiz-page">
        <header className="quiz-header">
          <div className="quiz-eyebrow">STUDY QUIZ</div>
          <h1>{documentData?.name || "Quiz"}</h1>
          <p>Answer the questions based on your document.</p>
        </header>

        <main className="quiz-content">
          <button
            type="button"
            className="quiz-back-button"
            onClick={restartQuiz}
          >
            <ArrowLeft size={15} />
            Exit Quiz
          </button>

          <div className="quiz-progress">
            <div className="quiz-progress-info">
              <span>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span>{answeredCount} answered</span>
            </div>

            <div className="quiz-progress-track">
              <div
                className="quiz-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="quiz-question-navigator">
            <div className="quiz-question-nav-header">
              <strong>Questions</strong>
              <span>
                {currentIndex + 1}/{questions.length}
              </span>
            </div>

            <div className="quiz-question-numbers">
              {questions.map((_, index) => (
                <button
                  type="button"
                  key={index}
                  className={`quiz-question-number ${
                    index === currentIndex ? "current" : ""
                  } ${
                    String(answers[index] ?? "").trim()
                      ? "answered"
                      : ""
                  }`}
                  onClick={() => setCurrentIndex(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          <article className="quiz-question-card">
            <div className="quiz-question-top">
              <span className="quiz-question-label">
                QUESTION {currentIndex + 1}
              </span>

              <span className="quiz-type-badge">
                {(currentQuestion.type || "mixed").replace(
                  "-",
                  " "
                )}
              </span>
            </div>

            <h2>{currentQuestion.question}</h2>

            {Array.isArray(currentQuestion.options) &&
            currentQuestion.options.length > 0 ? (
              <div className="quiz-options">
                {currentQuestion.options.map((option, index) => (
                  <button
                    type="button"
                    key={`${option}-${index}`}
                    className={`quiz-option ${
                      selectedAnswer === option ? "selected" : ""
                    }`}
                    onClick={() => updateAnswer(option)}
                  >
                    <span className="quiz-option-letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option}</span>
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                className={`quiz-answer-input ${
                  currentQuestion.type === "essay"
                    ? "essay-input"
                    : ""
                }`}
                placeholder={
                  currentQuestion.type === "essay"
                    ? "Write your answer..."
                    : "Type your answer..."
                }
                value={selectedAnswer}
                onChange={(event) =>
                  updateAnswer(event.target.value)
                }
              />
            )}

            {currentQuestion.type === "essay" && (
              <p className="quiz-answer-hint">
                Essay answers are reviewed against the model answer.
              </p>
            )}
          </article>

          <div className="quiz-navigation">
            <button
              type="button"
              className="quiz-secondary-button"
              onClick={previousQuestion}
              disabled={currentIndex === 0}
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <button
              type="button"
              className="quiz-primary-button"
              onClick={nextQuestion}
            >
              {isLastQuestion ? (
                <>
                  <CheckCircle2 size={16} />
                  Finish Quiz
                </>
              ) : (
                <>
                  Next
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="quiz-page">
      <header className="quiz-header">
        <div className="quiz-eyebrow">STUDY QUIZ</div>
        <h1>Create a Quiz</h1>
        <p>Choose how you want Marginal to test your understanding.</p>
      </header>

      <main className="quiz-content">
        <button
          type="button"
          className="quiz-back-button"
          onClick={() => navigate("/summary")}
        >
          <ArrowLeft size={15} />
          Back to Summary
        </button>

        <div className="quiz-settings-card">
          <div className="quiz-section-label">QUESTION TYPE</div>
          <h2>How do you want to be tested?</h2>

          <div className="quiz-settings-grid">
            {QUESTION_TYPES.map((type) => (
              <button
                type="button"
                key={type.value}
                className={`quiz-setting-option ${
                  settings.questionType === type.value
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setSettings((previous) => ({
                    ...previous,
                    questionType: type.value,
                  }))
                }
              >
                <strong>{type.label}</strong>
                <span>{type.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="quiz-settings-card">
          <div className="quiz-section-label">DIFFICULTY</div>
          <h2>Choose a difficulty</h2>

          <div className="quiz-settings-grid">
            {DIFFICULTIES.map((difficulty) => (
              <button
                type="button"
                key={difficulty.value}
                className={`quiz-setting-option ${
                  settings.difficulty === difficulty.value
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setSettings((previous) => ({
                    ...previous,
                    difficulty: difficulty.value,
                  }))
                }
              >
                <strong>{difficulty.label}</strong>
                <span>{difficulty.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="quiz-settings-card">
          <div className="quiz-section-label">QUESTION COUNT</div>
          <h2>How many questions?</h2>

          <div className="quiz-count-grid">
            {QUESTION_COUNTS.map((count) => (
              <button
                type="button"
                key={count}
                className={`quiz-count-option ${
                  settings.questionCount === count
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setSettings((previous) => ({
                    ...previous,
                    questionCount: count,
                  }))
                }
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div className="quiz-start-card">
          <div>
            <strong>Ready to start?</strong>
            <p>
              {settings.questionCount} questions ·{" "}
              {settings.questionType.replace("-", " ")} ·{" "}
              {settings.difficulty} difficulty
            </p>
          </div>

          <button
            type="button"
            className="quiz-primary-button"
            onClick={startQuiz}
          >
            Start Quiz
          </button>
        </div>
      </main>
    </div>
  );
}

export default Quiz;