
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  RotateCcw,
  Trophy,
  XCircle,
  ListChecks,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { saveQuizResult } from "../../services/progressService";
import { apiPost } from "../../services/api";
import { getCurrentDocument } from "../../services/documentApi";
import "./quiz.css";

const DIFFICULTIES = [
  {
    value: "easy",
    label: "Easy",
    description: "Basic facts and definitions",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Understanding and connections",
  },
  {
    value: "hard",
    label: "Hard",
    description: "Deeper reasoning and application",
  },
  {
    value: "mixed",
    label: "Mixed",
    description: "A combination of difficulties",
  },
];

const QUESTION_TYPES = [
  {
    value: "multiple-choice",
    label: "Multiple Choice",
    description: "Choose the correct answer",
  },
  {
    value: "true-false",
    label: "True / False",
    description: "Decide whether the statement is true",
  },
  {
    value: "short-answer",
    label: "Short Answer",
    description: "Write a brief answer",
  },
  {
    value: "essay",
    label: "Essay",
    description: "Write a detailed response",
  },
  {
    value: "mixed",
    label: "Mixed",
    description: "A combination of question types",
  },
];

const QUESTION_COUNTS = [
  10,
  20,
  30,
  40,
  50,
  60,
  70,
  80,
  90,
  100,
];

function Quiz() {
  const navigate = useNavigate();


  const [difficulty, setDifficulty] = useState("mixed");
  const [questionType, setQuestionType] = useState("mixed");
  const [questionCount, setQuestionCount] = useState(10);

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});

  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [quizStarted, setQuizStarted] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [score, setScore] = useState(0);

  
  const getDocument = async () => {
    return getCurrentDocument();
  };

  
  const generateQuiz = async () => {
    try {
      setLoading(true);
      setError("");
      setQuestions([]);
      setAnswers({});
      setCurrentQuestion(0);
      setReviewing(false);
      setSubmitted(false);
      setScore(0);

      const documentData = await getDocument();

      const result = await apiPost("/api/quiz/generate", {
        documentId: documentData.id,
        difficulty,
        questionType,
        questionCount,
      });

      if (!result.data?.questions?.length) {
        throw new Error(
          "The AI did not generate any questions."
        );
      }

      const generatedQuestions = Array.isArray(result.data.questions)
        ? result.data.questions.slice(0, Number(questionCount))
        : [];

      if (generatedQuestions.length !== Number(questionCount)) {
        throw new Error(
          `The AI generated ${generatedQuestions.length} questions instead of the requested ${questionCount}. Please try again.`
        );
      }

      setQuestions(generatedQuestions);
      setQuizStarted(true);
    } catch (err) {
      console.error("Quiz error:", err);

      if (err.name === "TypeError") {
        setError(
          "Could not connect to the quiz server. Make sure your backend is running on http://localhost:5000."
        );
      } else {
        setError(
          err?.message ||
            "Something went wrong while generating the quiz."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  
  const handleAnswer = (answer) => {
    if (submitted) return;

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion]: answer,
    }));
  };

  
  const goToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestion(index);
      setReviewing(false);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((previous) => previous + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((previous) => previous - 1);
    }
  };

  
  const answeredCount = useMemo(() => {
    return Object.values(answers).filter(
      (answer) =>
        answer !== undefined &&
        answer !== null &&
        answer.toString().trim() !== ""
    ).length;
  }, [answers]);

  const unansweredQuestions = useMemo(() => {
    return questions
      .map((_, index) => index)
      .filter((index) => {
        const answer = answers[index];

        return (
          answer === undefined ||
          answer === null ||
          answer.toString().trim() === ""
        );
      });
  }, [questions, answers]);

  
  const handleReview = () => {
    setReviewing(true);
  };

  const handleBackToQuiz = () => {
    setReviewing(false);

    if (unansweredQuestions.length > 0) {
      setCurrentQuestion(unansweredQuestions[0]);
    }
  };

 
  const normalizeAnswer = (value) => {
    if (!value) return "";

    return value
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[.,!?;:]/g, "")
      .replace(/\s+/g, " ");
  };

  const gradeAnswer = (question, userAnswer) => {
    if (!userAnswer) return false;

    const user = normalizeAnswer(userAnswer);
    const correct = normalizeAnswer(question.answer);

    if (!user || !correct) {
      return false;
    }

    
    if (question.type === "true-false") {
      return user === correct;
    }

    
    if (question.type === "multiple-choice") {
      return user === correct;
    }

    
    const correctWords = correct
      .split(" ")
      .filter((word) => word.length > 3);

    if (correctWords.length === 0) {
      return user === correct;
    }

    const matchingWords = correctWords.filter((word) =>
      user.includes(word)
    );

    const matchPercentage =
      matchingWords.length / correctWords.length;

    return matchPercentage >= 0.5;
  };

 
  const handleSubmit = () => {
  if (submitted) {
    return;
  }

  let calculatedScore = 0;

  questions.forEach(
    (question, index) => {
      const userAnswer =
        answers[index];

      if (
        gradeAnswer(
          question,
          userAnswer
        )
      ) {
        calculatedScore++;
      }
    }
  );


  const documentName = "Current document";

  saveQuizResult({
    score: calculatedScore,

    totalQuestions:
      questions.length,

    difficulty,

    questionType,

    documentName,
  });

  
  setScore(
    calculatedScore
  );

  setSubmitted(true);

  setReviewing(false);
};
  
  const handleRetake = () => {
    setQuizStarted(false);
    setQuestions([]);
    setAnswers({});
    setCurrentQuestion(0);
    setReviewing(false);
    setSubmitted(false);
    setScore(0);
    setError("");
  };

  
  if (loading) {
    return (
      <div className="quiz-page">
        <header className="quiz-header">
          <div className="quiz-eyebrow">STUDY QUIZ</div>

          <h1>Creating Your Quiz</h1>

          <p>
            Marginal is generating {questionCount} questions
            from your document.
          </p>
        </header>

        <main className="quiz-content">
          <div className="quiz-loading">
            <div className="quiz-spinner" />

            <div>
              <strong>Preparing your quiz...</strong>

              <p>
                This may take a moment, especially for larger
                quizzes.
              </p>
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

          <h1>Quiz Error</h1>

          <p>
            Something went wrong while creating your quiz.
          </p>
        </header>

        <main className="quiz-content">
          <div className="quiz-error">
            <CircleAlert size={30} />

            <h2>Couldn't create the quiz</h2>

            <p>{error}</p>

            <div className="quiz-result-actions">
              <button
                type="button"
                className="quiz-primary-button"
                onClick={() => {
                  setError("");
                  setQuizStarted(false);
                }}
              >
                Try Again
              </button>

              <button
                type="button"
                onClick={() => navigate("/summary")}
                className="quiz-secondary-button"
              >
                <ArrowLeft size={16} />
                Back to Summary
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  
  if (!quizStarted) {
    return (
      <div className="quiz-page">
        <header className="quiz-header">
          <div className="quiz-eyebrow">STUDY QUIZ</div>

          <h1>Create Your Quiz</h1>

          <p>
            Choose how you want Marginal to test your
            understanding.
          </p>
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

          

          <section className="quiz-settings-card">
            <div className="quiz-section-label">DIFFICULTY</div>

            <h2>How difficult should the quiz be?</h2>

            <div className="quiz-settings-grid">
              {DIFFICULTIES.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={`quiz-setting-option ${
                    difficulty === item.value ? "selected" : ""
                  }`}
                  onClick={() => setDifficulty(item.value)}
                >
                  <strong>{item.label}</strong>

                  <span>{item.description}</span>
                </button>
              ))}
            </div>
          </section>

          

          <section className="quiz-settings-card">
            <div className="quiz-section-label">
              QUESTION TYPE
            </div>

            <h2>How should you answer?</h2>

            <div className="quiz-settings-grid">
              {QUESTION_TYPES.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={`quiz-setting-option ${
                    questionType === item.value ? "selected" : ""
                  }`}
                  onClick={() => setQuestionType(item.value)}
                >
                  <strong>{item.label}</strong>

                  <span>{item.description}</span>
                </button>
              ))}
            </div>
          </section>

         

          <section className="quiz-settings-card">
            <div className="quiz-section-label">
              NUMBER OF QUESTIONS
            </div>

            <h2>How many questions?</h2>

            <div className="quiz-count-grid">
              {QUESTION_COUNTS.map((count) => (
                <button
                  type="button"
                  key={count}
                  className={`quiz-count-option ${
                    questionCount === count ? "selected" : ""
                  }`}
                  onClick={() => setQuestionCount(count)}
                >
                  {count}
                </button>
              ))}
            </div>
          </section>

          <section className="quiz-start-card">
            <div>
              <strong>Ready to begin?</strong>

              <p>
                {questionCount} {difficulty} questions ·{" "}
                {questionType.replace("-", " ")}
              </p>
            </div>

            <button
              type="button"
              className="quiz-primary-button"
              onClick={generateQuiz}
            >
              Generate Quiz
            </button>
          </section>
        </main>
      </div>
    );
  }

  
  if (submitted) {
    const percentage = Math.round(
      (score / questions.length) * 100
    );

    return (
      <div className="quiz-page">
        <header className="quiz-header">
          <div className="quiz-eyebrow">QUIZ RESULTS</div>

          <h1>Your Results</h1>

          <p>
            Here's how you performed on this document.
          </p>
        </header>

        <main className="quiz-content">
          <div className="quiz-result-card">
            <div className="quiz-trophy">
              <Trophy size={30} />
            </div>

            <div className="quiz-score">
              {score}/{questions.length}
            </div>

            <h2>{percentage}%</h2>

            <p>
              {percentage >= 80
                ? "Excellent work. You understand this material well."
                : percentage >= 60
                ? "Good effort. Review the questions you missed."
                : "Keep studying. Reviewing the summary will help."}
            </p>

            <div className="quiz-result-actions">
              <button
                type="button"
                className="quiz-primary-button"
                onClick={handleRetake}
              >
                <RotateCcw size={16} />
                New Quiz
              </button>

              <button
                type="button"
                className="quiz-secondary-button"
                onClick={() => navigate("/summary")}
              >
                <ArrowLeft size={16} />
                Back to Summary
              </button>
            </div>
          </div>

          
          <section className="quiz-review">
            <div className="quiz-section-label">
              ANSWER REVIEW
            </div>

            <h2>Review your answers</h2>

            {questions.map((question, index) => {
              const userAnswer = answers[index];

              const correct = gradeAnswer(
                question,
                userAnswer
              );

              return (
                <div
                  className={`quiz-review-item ${
                    correct ? "correct" : "incorrect"
                  }`}
                  key={index}
                >
                  <div className="quiz-review-number">
                    {index + 1}
                  </div>

                  <div className="quiz-review-content">
                    <h3>{question.question}</h3>

                    <p>
                      <strong>Your answer:</strong>{" "}
                      {userAnswer || "Not answered"}
                    </p>

                    {!correct && (
                      <p>
                        <strong>Correct answer:</strong>{" "}
                        {question.answer}
                      </p>
                    )}
                  </div>

                  {correct ? (
                    <CheckCircle2 size={19} />
                  ) : (
                    <XCircle size={19} />
                  )}
                </div>
              );
            })}
          </section>
        </main>
      </div>
    );
  }

  
  if (reviewing) {
    return (
      <div className="quiz-page">
        <header className="quiz-header">
          <div className="quiz-eyebrow">REVIEW QUIZ</div>

          <h1>Review Your Answers</h1>

          <p>
            Check your answers before submitting the quiz.
          </p>
        </header>

        <main className="quiz-content">
          <div className="quiz-review-summary">
            <div>
              <strong>{answeredCount}</strong>
              <span>Answered</span>
            </div>

            <div>
              <strong>{unansweredQuestions.length}</strong>
              <span>Unanswered</span>
            </div>

            <div>
              <strong>{questions.length}</strong>
              <span>Total</span>
            </div>
          </div>

          {unansweredQuestions.length > 0 && (
            <div className="quiz-warning">
              <CircleAlert size={20} />

              <div>
                <strong>
                  You have unanswered questions.
                </strong>

                <p>
                  You can go back and answer them before
                  submitting.
                </p>
              </div>
            </div>
          )}

          <section className="quiz-review-list">
            {questions.map((question, index) => {
              const answered =
                answers[index] &&
                answers[index].toString().trim();

              return (
                <button
                  type="button"
                  key={index}
                  className={`quiz-review-navigation ${
                    answered ? "answered" : "unanswered"
                  }`}
                  onClick={() => goToQuestion(index)}
                >
                  <span className="quiz-review-nav-number">
                    {index + 1}
                  </span>

                  <span className="quiz-review-nav-text">
                    <strong>Question {index + 1}</strong>

                    <small>
                      {answered
                        ? "Answered"
                        : "Not answered"}
                    </small>
                  </span>

                  {answered ? (
                    <CheckCircle2 size={19} />
                  ) : (
                    <CircleAlert size={19} />
                  )}
                </button>
              );
            })}
          </section>

          <div className="quiz-navigation">
            <button
              type="button"
              className="quiz-secondary-button"
              onClick={handleBackToQuiz}
            >
              <ArrowLeft size={16} />
              Back to Quiz
            </button>

            <button
              type="button"
              className="quiz-primary-button"
              onClick={handleSubmit}
            >
              <CheckCircle2 size={16} />
              Submit Quiz
            </button>
          </div>
        </main>
      </div>
    );
  }

  
  const question = questions[currentQuestion];

  const selectedAnswer = answers[currentQuestion] || "";

  const isLastQuestion =
    currentQuestion === questions.length - 1;

  const progress =
    ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="quiz-page">
      <header className="quiz-header">
        <div className="quiz-eyebrow">STUDY QUIZ</div>

        <h1>Test Yourself</h1>

        <p>
          Answer the questions based on your document.
        </p>
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

        

        <div className="quiz-progress">
          <div className="quiz-progress-info">
            <span>
              Question {currentQuestion + 1} of{" "}
              {questions.length}
            </span>

            <span>{answeredCount} answered</span>
          </div>

          <div className="quiz-progress-track">
            <div
              className="quiz-progress-fill"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        

        <section className="quiz-question-navigator">
          <div className="quiz-question-nav-header">
            <div>
              <strong>Questions</strong>

              <span>Select a question</span>
            </div>

            <ListChecks size={20} />
          </div>

          <div className="quiz-question-numbers">
            {questions.map((_, index) => {
              const answered =
                answers[index] &&
                answers[index].toString().trim();

              return (
                <button
                  type="button"
                  key={index}
                  className={`
                    quiz-question-number
                    ${currentQuestion === index ? "current" : ""}
                    ${answered ? "answered" : "unanswered"}
                  `}
                  onClick={() => goToQuestion(index)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="quiz-question-legend">
            <span>
              <i className="current-dot" />
              Current
            </span>

            <span>
              <i className="answered-dot" />
              Answered
            </span>

            <span>
              <i className="unanswered-dot" />
              Unanswered
            </span>
          </div>
        </section>

        

        <section className="quiz-question-card">
          <div className="quiz-question-top">
            <div className="quiz-question-label">
              QUESTION {currentQuestion + 1}
            </div>

            <span className="quiz-type-badge">
              {question.type
                ?.replace("-", " ")
                .toUpperCase()}
            </span>
          </div>

          <h2>{question.question}</h2>

          

          {question.type === "multiple-choice" && (
            <div className="quiz-options">
              {question.options?.map((option, index) => (
                <button
                  type="button"
                  key={index}
                  className={`quiz-option ${
                    selectedAnswer === option
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => handleAnswer(option)}
                >
                  <span className="quiz-option-letter">
                    {String.fromCharCode(65 + index)}
                  </span>

                  <span>{option}</span>
                </button>
              ))}
            </div>
          )}

        

          {question.type === "true-false" && (
            <div className="quiz-options">
              {["True", "False"].map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`quiz-option ${
                    selectedAnswer === option
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => handleAnswer(option)}
                >
                  <span className="quiz-option-letter">
                    {option === "True" ? "T" : "F"}
                  </span>

                  <span>{option}</span>
                </button>
              ))}
            </div>
          )}

          

          {(question.type === "short-answer" ||
            question.type === "essay") && (
            <textarea
              className={`quiz-answer-input ${
                question.type === "essay"
                  ? "essay-input"
                  : ""
              }`}
              placeholder={
                question.type === "essay"
                  ? "Write your detailed answer here..."
                  : "Write your answer here..."
              }
              value={selectedAnswer}
              onChange={(event) =>
                handleAnswer(event.target.value)
              }
            />
          )}

          <p className="quiz-answer-hint">
            {question.type === "multiple-choice"
              ? "Select the answer you believe is correct."
              : question.type === "true-false"
              ? "Choose True or False."
              : question.type === "essay"
              ? "Use information from the document to explain your answer clearly."
              : "Answer using information from the document."}
          </p>
        </section>

        

        <div className="quiz-navigation">
          <button
            type="button"
            className="quiz-secondary-button"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          {!isLastQuestion ? (
            <button
              type="button"
              className="quiz-primary-button"
              onClick={handleNext}
            >
              Next Question
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="quiz-primary-button"
              onClick={handleReview}
            >
              <ListChecks size={16} />
              Review Answers
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default Quiz;
