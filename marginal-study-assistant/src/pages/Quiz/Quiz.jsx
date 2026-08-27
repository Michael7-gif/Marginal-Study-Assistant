
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  AlertCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { generateQuiz } from "../../services/quizApi";
import { getCurrentDocument } from "../../services/documentApi";

import "./quiz.css";

const QUESTION_COUNTS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export default function Quiz() {
  const navigate = useNavigate();

  const [documentData, setDocumentData] = useState(null);

  const [questionCount, setQuestionCount] = useState(10);
  const [questionType, setQuestionType] = useState("mixed");
  const [difficulty, setDifficulty] = useState("mixed");

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});

  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [loadingDocument, setLoadingDocument] = useState(true);
  const [loading, setLoading] = useState(false);

  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("");

  const [quizStarted, setQuizStarted] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    loadCurrentDocument();
  }, []);

  const loadCurrentDocument = async () => {
    try {
      setLoadingDocument(true);
      setError("");

      const document = await getCurrentDocument();

      if (!document?.id) {
        throw new Error(
          "No document has been selected. Please choose a document first."
        );
      }

      setDocumentData(document);
    } catch (err) {
      console.error("Quiz document error:", err);

      setError(
        err?.message || "Could not load the selected document."
      );
    } finally {
      setLoadingDocument(false);
    }
  };

  const startQuiz = async () => {
    if (!documentData?.id) {
      setError(
        "No document has been selected. Please select a document first."
      );
      return;
    }

    let progressTimer;

    try {
      setLoading(true);
      setError("");

      setGenerationProgress(5);
      setGenerationStatus("Preparing your quiz...");

      const progressSteps = [
        {
          progress: 15,
          status: "Reading your document...",
        },
        {
          progress: 30,
          status: "Identifying important topics...",
        },
        {
          progress: 45,
          status: "Creating questions...",
        },
        {
          progress: 60,
          status: "Checking question quality...",
        },
        {
          progress: 75,
          status: "Removing duplicate questions...",
        },
        {
          progress: 88,
          status: "Finalizing your quiz...",
        },
      ];

      let stepIndex = 0;

      progressTimer = setInterval(() => {
        if (stepIndex < progressSteps.length) {
          const step = progressSteps[stepIndex];

          setGenerationProgress(step.progress);
          setGenerationStatus(step.status);

          stepIndex += 1;
        }
      }, 1200);

      const response = await generateQuiz({
        documentId: documentData.id,
        questionCount,
        questionType,
        difficulty,
      });

      clearInterval(progressTimer);

      setGenerationProgress(100);
      setGenerationStatus("Quiz ready!");

      await new Promise((resolve) => setTimeout(resolve, 400));

      const generatedQuestions =
        response?.data?.questions ||
        response?.questions ||
        [];

      if (
        !Array.isArray(generatedQuestions) ||
        generatedQuestions.length === 0
      ) {
        throw new Error("No quiz questions were generated.");
      }

      setQuestions(generatedQuestions);
      setAnswers({});
      setCurrentQuestion(0);
      setQuizStarted(true);
      setReviewMode(false);
      setQuizSubmitted(false);

      setGenerationProgress(0);
      setGenerationStatus("");
    } catch (err) {
      if (progressTimer) {
        clearInterval(progressTimer);
      }

      console.error("Quiz generation error:", err);

      setGenerationProgress(0);
      setGenerationStatus("");

      setError(
        err?.message || "Could not create the quiz. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const getQuestionText = (question) => {
    return (
      question?.question ||
      question?.questionText ||
      question?.text ||
      "Question unavailable"
    );
  };

  const getOptions = (question) => {
    if (Array.isArray(question?.options)) {
      return question.options;
    }

    if (
      question?.options &&
      typeof question.options === "object"
    ) {
      return Object.values(question.options);
    }

    return [];
  };

  const getCorrectAnswer = (question) => {
    return (
      question?.correctAnswer ??
      question?.answer ??
      question?.correct_option ??
      question?.correct
    );
  };

  const getOptionText = (option) => {
    if (typeof option === "object") {
      return (
        option?.text ||
        option?.label ||
        option?.value ||
        ""
      );
    }

    return option;
  };

  const normalizeAnswer = (answer) => {
    if (answer === null || answer === undefined) {
      return "";
    }

    return String(answer).trim().toLowerCase();
  };

  const selectAnswer = (answer) => {
    if (quizSubmitted) {
      return;
    }

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion]: answer,
    }));
  };

  const goToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestion(index);
      setReviewMode(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((previous) => previous + 1);
    } else {
      setReviewMode(true);
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((previous) => previous - 1);
    }
  };

  const skipQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((previous) => previous + 1);
    } else {
      setReviewMode(true);
    }
  };

  const answeredCount = useMemo(() => {
    return Object.keys(answers).filter(
      (key) =>
        answers[key] !== undefined &&
        answers[key] !== null &&
        answers[key] !== ""
    ).length;
  }, [answers]);

  const unansweredCount =
    questions.length - answeredCount;

  const answeredQuestions = useMemo(() => {
    return questions.map((_, index) => ({
      index,
      answered:
        answers[index] !== undefined &&
        answers[index] !== null &&
        answers[index] !== "",
    }));
  }, [questions, answers]);

  const submitQuiz = () => {
    setQuizSubmitted(true);
    setReviewMode(false);
    setCurrentQuestion(0);
  };

  const result = useMemo(() => {
    if (!quizSubmitted) {
      return {
        score: 0,
        answered: answeredCount,
        unanswered: unansweredCount,
        percentage: 0,
      };
    }

    let correct = 0;

    questions.forEach((question, index) => {
      const userAnswer = answers[index];
      const correctAnswer = getCorrectAnswer(question);

      if (
        userAnswer !== undefined &&
        normalizeAnswer(userAnswer) ===
          normalizeAnswer(correctAnswer)
      ) {
        correct++;
      }
    });

    return {
      score: correct,
      answered: answeredCount,
      unanswered: unansweredCount,
      percentage:
        questions.length > 0
          ? Math.round((correct / questions.length) * 100)
          : 0,
    };
  }, [
    quizSubmitted,
    questions,
    answers,
    answeredCount,
    unansweredCount,
  ]);

  const restartQuiz = () => {
    setQuestions([]);
    setAnswers({});
    setCurrentQuestion(0);
    setQuizStarted(false);
    setReviewMode(false);
    setQuizSubmitted(false);
    setError("");
    setGenerationProgress(0);
    setGenerationStatus("");
  };

  if (loadingDocument) {
    return (
      <div className="quiz-page">
        <div className="quiz-main">
          <div className="quiz-loading-card">
            <div className="quiz-spinner" />

            <div>
              <h2>Loading your document...</h2>
              <p>Marginal is preparing your quiz.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !quizStarted) {
    return (
      <div className="quiz-page">
        <div className="quiz-main">
          <button
            className="quiz-back-button"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="quiz-error-page">
            <AlertCircle size={30} />

            <h1>Something went wrong</h1>

            <p>{error}</p>

            <button
              className="quiz-primary-button"
              onClick={() => {
                setError("");
                loadCurrentDocument();
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (quizSubmitted && questions.length > 0) {
    return (
      <div className="quiz-page">
        <div className="quiz-main">
          <div className="quiz-results-header">
            <span className="quiz-eyebrow">
              QUIZ RESULTS
            </span>

            <h1>Quiz completed</h1>

            <p>
              Here is how you performed on{" "}
              <strong>{documentData?.name}</strong>.
            </p>
          </div>

          <div className="quiz-result-summary">
            <div className="quiz-score-circle">
              <strong>{result.percentage}%</strong>

              <span>
                {result.score} / {questions.length}
              </span>
            </div>

            <div className="quiz-result-stats">
              <div className="quiz-stat correct-stat">
                <CheckCircle2 size={20} />
                <strong>{result.score}</strong>
                <span>Correct</span>
              </div>

              <div className="quiz-stat wrong-stat">
                <XCircle size={20} />
                <strong>
                  {result.answered - result.score}
                </strong>
                <span>Wrong</span>
              </div>

              <div className="quiz-stat unanswered-stat">
                <Circle size={20} />
                <strong>{result.unanswered}</strong>
                <span>Unanswered</span>
              </div>
            </div>
          </div>

          <div className="quiz-results-list">
            <div className="quiz-results-list-header">
              <div>
                <span className="quiz-section-label">
                  ANSWER REVIEW
                </span>

                <h2>Review your answers</h2>
              </div>
            </div>

            {questions.map((question, index) => {
              const userAnswer = answers[index];
              const correctAnswer =
                getCorrectAnswer(question);

              const answered =
                userAnswer !== undefined &&
                userAnswer !== null &&
                userAnswer !== "";

              const isCorrect =
                answered &&
                normalizeAnswer(userAnswer) ===
                  normalizeAnswer(correctAnswer);

              return (
                <div
                  key={index}
                  className={`quiz-result-question ${
                    isCorrect
                      ? "result-correct"
                      : answered
                      ? "result-wrong"
                      : "result-unanswered"
                  }`}
                >
                  <div className="quiz-result-question-number">
                    {index + 1}
                  </div>

                  <div className="quiz-result-question-content">
                    <div className="quiz-result-question-status">
                      {isCorrect ? (
                        <>
                          <CheckCircle2 size={16} />
                          Correct
                        </>
                      ) : answered ? (
                        <>
                          <XCircle size={16} />
                          Wrong
                        </>
                      ) : (
                        <>
                          <Circle size={16} />
                          Unanswered
                        </>
                      )}
                    </div>

                    <h3>{getQuestionText(question)}</h3>

                    <div className="quiz-answer-row">
                      <div>
                        <span>YOUR ANSWER</span>
                        <p>
                          {answered
                            ? getOptionText(userAnswer)
                            : "Not answered"}
                        </p>
                      </div>

                      <div>
                        <span>CORRECT ANSWER</span>
                        <p>
                          {correctAnswer !== undefined &&
                          correctAnswer !== null
                            ? getOptionText(correctAnswer)
                            : "Not available"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="quiz-result-actions">
            <button
              className="quiz-primary-button"
              onClick={restartQuiz}
            >
              <RotateCcw size={16} />
              New Quiz
            </button>

            <button
              className="quiz-secondary-button"
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (
    quizStarted &&
    reviewMode &&
    questions.length > 0
  ) {
    return (
      <div className="quiz-page">
        <div className="quiz-main">
          <div className="quiz-review-header">
            <button
              className="quiz-back-button"
              onClick={() => setReviewMode(false)}
            >
              <ArrowLeft size={16} />
              Back to Quiz
            </button>

            <span className="quiz-eyebrow">
              FINAL REVIEW
            </span>

            <h1>Review before submitting</h1>

            <p>
              Check your answers before you submit your
              quiz. You can go back and change any answer.
            </p>
          </div>

          <div className="quiz-review-summary">
            <div>
              <CheckCircle2 size={20} />
              <strong>{answeredCount}</strong>
              <span>Answered</span>
            </div>

            <div>
              <Circle size={20} />
              <strong>{unansweredCount}</strong>
              <span>Unanswered</span>
            </div>

            <div>
              <BookOpen size={20} />
              <strong>{questions.length}</strong>
              <span>Total</span>
            </div>
          </div>

          {unansweredCount > 0 && (
            <div className="quiz-review-warning">
              <AlertCircle size={20} />

              <div>
                <strong>
                  You have {unansweredCount} unanswered{" "}
                  {unansweredCount === 1
                    ? "question"
                    : "questions"}.
                </strong>

                <p>
                  You can submit now, or go back and answer
                  the unanswered questions.
                </p>
              </div>
            </div>
          )}

          <div className="quiz-review-card">
            <div className="quiz-review-card-header">
              <div>
                <span className="quiz-section-label">
                  QUESTION LIST
                </span>

                <h2>All {questions.length} questions</h2>
              </div>

              <span className="quiz-review-count">
                {answeredCount}/{questions.length} answered
              </span>
            </div>

            <div className="quiz-question-grid">
              {answeredQuestions.map(
                ({ index, answered }) => (
                  <button
                    key={index}
                    type="button"
                    className={`quiz-question-number ${
                      answered
                        ? "answered"
                        : "unanswered"
                    }`}
                    onClick={() => goToQuestion(index)}
                  >
                    <span>{index + 1}</span>

                    {answered ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <Circle size={14} />
                    )}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="quiz-submit-card">
            <div>
              <strong>Ready to submit?</strong>

              <p>
                Your answers will be graded only after you
                submit.
              </p>
            </div>

            <button
              className="quiz-primary-button quiz-submit-button"
              onClick={submitQuiz}
            >
              Submit Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (
    quizStarted &&
    questions.length > 0
  ) {
    const question = questions[currentQuestion];
    const options = getOptions(question);
    const selectedAnswer = answers[currentQuestion];

    const hasAnswered =
      selectedAnswer !== undefined &&
      selectedAnswer !== null &&
      selectedAnswer !== "";

    const progress =
      ((currentQuestion + 1) / questions.length) * 100;

    return (
      <div className="quiz-page">
        <div className="quiz-main">
          <div className="quiz-answer-topbar">
            <button
              className="quiz-back-button"
              onClick={() => setReviewMode(true)}
            >
              <ArrowLeft size={16} />
              Review
            </button>

            <div className="quiz-progress-info">
              <span>
                Question {currentQuestion + 1} of{" "}
                {questions.length}
              </span>

              <strong>{answeredCount} answered</strong>
            </div>
          </div>

          <div className="quiz-progress-track">
            <div
              className="quiz-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="quiz-question-card">
            <div className="quiz-question-meta">
              <span className="quiz-question-label">
                QUESTION {currentQuestion + 1}
              </span>

              <span className="quiz-type-badge">
                {question?.type || questionType}
              </span>
            </div>

            <h1>{getQuestionText(question)}</h1>

            {options.length > 0 ? (
              <div className="quiz-options">
                {options.map((option, index) => {
                  const optionText = getOptionText(option);

                  const isSelected =
                    normalizeAnswer(selectedAnswer) ===
                    normalizeAnswer(optionText);

                  return (
                    <button
                      key={index}
                      type="button"
                      className={`quiz-option ${
                        isSelected ? "selected" : ""
                      }`}
                      onClick={() =>
                        selectAnswer(optionText)
                      }
                    >
                      <span className="quiz-option-letter">
                        {String.fromCharCode(65 + index)}
                      </span>

                      <span className="quiz-option-text">
                        {optionText}
                      </span>

                      {isSelected && (
                        <CheckCircle2
                          size={19}
                          className="quiz-selected-icon"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="quiz-no-options">
                <p>
                  This question does not have answer
                  options.
                </p>
              </div>
            )}

            <div className="quiz-answer-status">
              {hasAnswered ? (
                <>
                  <CheckCircle2 size={16} />
                  Answer saved
                </>
              ) : (
                <>
                  <Circle size={16} />
                  Not answered yet
                </>
              )}
            </div>

            <div className="quiz-navigation">
              <button
                className="quiz-secondary-button"
                onClick={previousQuestion}
                disabled={currentQuestion === 0}
              >
                Previous
              </button>

              <button
                className="quiz-skip-button"
                onClick={skipQuestion}
              >
                {hasAnswered ? "Next" : "Skip Question"}
              </button>

              <button
                className="quiz-next-button"
                onClick={nextQuestion}
              >
                {currentQuestion === questions.length - 1
                  ? "Review Quiz"
                  : "Next Question"}
              </button>
            </div>
          </div>

          <div className="quiz-question-navigator">
            <div className="quiz-navigator-header">
              <div>
                <strong>Question Navigator</strong>
                <span>Jump to any question</span>
              </div>

              <span>
                {answeredCount}/{questions.length} answered
              </span>
            </div>

            <div className="quiz-question-grid">
              {answeredQuestions.map(
                ({ index, answered }) => (
                  <button
                    key={index}
                    type="button"
                    className={`quiz-question-number ${
                      answered
                        ? "answered"
                        : "unanswered"
                    } ${
                      index === currentQuestion
                        ? "current"
                        : ""
                    }`}
                    onClick={() => goToQuestion(index)}
                  >
                    {index + 1}
                  </button>
                )
              )}
            </div>

            <div className="quiz-legend">
              <span>
                <i className="legend-current" />
                Current
              </span>

              <span>
                <i className="legend-answered" />
                Answered
              </span>

              <span>
                <i className="legend-unanswered" />
                Unanswered
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-page">
      <div className="quiz-main">
        <button
          className="quiz-back-button"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="quiz-hero">
          <span className="quiz-eyebrow">
            MARGINAL STUDY TOOLS
          </span>

          <h1>Create a Quiz</h1>

          <p>
            Test your understanding using questions
            generated directly from your selected study
            document.
          </p>
        </div>

        {error && (
          <div className="quiz-error">
            <XCircle size={19} />

            <div>
              <strong>Something went wrong</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {documentData && (
          <div className="quiz-document-card">
            <div className="quiz-document-icon">
              <BookOpen size={22} />
            </div>

            <div>
              <span>SELECTED DOCUMENT</span>

              <h2>{documentData.name}</h2>

              <p>
                Your quiz will be generated from this
                document.
              </p>
            </div>
          </div>
        )}

        <div className="quiz-settings">
          <div className="quiz-settings-header">
            <span className="quiz-section-label">
              QUIZ SETTINGS
            </span>

            <h2>How many questions?</h2>

            <p>
              Choose between 10 and 100 questions.
            </p>
          </div>

          <div className="quiz-setting-group">
            <label>Number of questions</label>

            <div className="quiz-count-grid">
              {QUESTION_COUNTS.map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`quiz-count-button ${
                    questionCount === count
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setQuestionCount(count)
                  }
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="quiz-setting-group">
            <label>Question type</label>

            <div className="quiz-choice-grid">
              <button
                type="button"
                className={`quiz-choice-large ${
                  questionType === "mixed"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setQuestionType("mixed")
                }
              >
                <strong>Mixed</strong>
                <span>Different question styles</span>
              </button>

              <button
                type="button"
                className={`quiz-choice-large ${
                  questionType ===
                  "multiple-choice"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setQuestionType("multiple-choice")
                }
              >
                <strong>Multiple Choice</strong>
                <span>Select the correct answer</span>
              </button>

              <button
                type="button"
                className={`quiz-choice-large ${
                  questionType === "true-false"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setQuestionType("true-false")
                }
              >
                <strong>True / False</strong>
                <span>Choose true or false</span>
              </button>
            </div>
          </div>

          <div className="quiz-setting-group">
            <label>Difficulty</label>

            <div className="quiz-choice-grid">
              {[
                [
                  "mixed",
                  "Mixed",
                  "Balanced difficulty",
                ],
                [
                  "easy",
                  "Easy",
                  "Good for revision",
                ],
                [
                  "medium",
                  "Medium",
                  "Test your understanding",
                ],
                [
                  "hard",
                  "Hard",
                  "Challenge yourself",
                ],
              ].map(([value, title, description]) => (
                <button
                  key={value}
                  type="button"
                  className={`quiz-choice-large ${
                    difficulty === value
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setDifficulty(value)
                  }
                >
                  <strong>{title}</strong>
                  <span>{description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="quiz-start-card">
          <div>
            <strong>{questionCount} questions</strong>

            <p>
              {questionType === "mixed"
                ? "Mixed question types"
                : questionType}{" "}
              ·{" "}
              {difficulty === "mixed"
                ? "Mixed difficulty"
                : difficulty}
            </p>
          </div>

          {loading && (
            <div className="quiz-generation-progress">
              <div className="quiz-generation-progress-header">
                <div>
                  <strong>{generationStatus}</strong>

                  <span>
                    Creating {questionCount} questions
                  </span>
                </div>

                <strong className="quiz-generation-percentage">
                  {generationProgress}%
                </strong>
              </div>

              <div className="quiz-generation-progress-track">
                <div
                  className="quiz-generation-progress-fill"
                  style={{
                    width: `${generationProgress}%`,
                  }}
                />
              </div>

              <p>
                This may take a little while while
                Marginal creates and checks your
                questions.
              </p>
            </div>
          )}

          <button
            className="quiz-primary-button quiz-start-button"
            onClick={startQuiz}
            disabled={loading || !documentData}
          >
            {loading ? "Generating..." : "Start Quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}

