
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Send,
  Sparkles,
  User,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCurrentDocument } from "../../services/documentApi";
import { apiPost } from "../../services/api";
import "./QA.css";

function QA() {
  const navigate = useNavigate();

  const [documentData, setDocumentData] = useState(null);
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState(null);

  
  useEffect(() => {
    const loadQA = async () => {
      try {
        const parsedDocument = await getCurrentDocument();
        setDocumentData(parsedDocument);

        const savedConversation = localStorage.getItem(
          "studydesk_qa_history"
        );

        if (savedConversation) {
          try {
            setConversation(JSON.parse(savedConversation));
          } catch {
            setConversation([]);
          }
        }
      } catch (err) {
        console.error("Q&A loading error:", err);
        setError(err?.message || "Could not load the selected document.");
      } finally {
        setPageLoading(false);
      }
    };

    loadQA();
  }, []);

  
  useEffect(() => {
    if (conversation.length > 0) {
      localStorage.setItem(
        "studydesk_qa_history",
        JSON.stringify(conversation)
      );
    }
  }, [conversation]);


  const handleAsk = async (event) => {
    event.preventDefault();

    if (!question.trim() || loading) {
      return;
    }

    if (!documentData?.text) {
      setError("No document is available.");
      return;
    }

    const currentQuestion = question.trim();

    setQuestion("");
    setError("");
    setLoading(true);

    try {
      const result = await apiPost("/api/qa/ask", { documentId: documentData.id, question: currentQuestion });

      const newConversation = [
        ...conversation,
        {
          question: currentQuestion,
          answer:
            result.data?.answer ||
            "No answer was returned.",
          source:
            result.data?.source ||
            "",
        },
      ];

      setConversation(newConversation);
    } catch (err) {
      console.error("Q&A request error:", err);

      setError(
        err?.message ||
          "Something went wrong while getting the answer."
      );

      setQuestion(currentQuestion);
    } finally {
      setLoading(false);
    }
  };

  
  const suggestedQuestions = [
    "What is the main idea of this document?",
    "What are the most important concepts?",
    "Explain the main topic in simple terms.",
  ];

  const useSuggestedQuestion = (value) => {
    setQuestion(value);
  };

  
  const handleCopy = async (answer, index) => {
    try {
      await navigator.clipboard.writeText(answer);

      setCopiedIndex(index);

      setTimeout(() => {
        setCopiedIndex(null);
      }, 1500);
    } catch (err) {
      console.error("Copy error:", err);
    }
  };

 
  const handleClear = () => {
    setConversation([]);

    localStorage.removeItem(
      "studydesk_qa_history"
    );
  };

  
  if (pageLoading) {
    return (
      <div className="qa-page">
        <header className="qa-header">
          <div className="qa-eyebrow">
            DOCUMENT Q&A
          </div>

          <h1>Ask Marginal</h1>

          <p>
            Ask questions about your document.
          </p>
        </header>

        <main className="qa-content">
          <div className="qa-loading">
            <div className="qa-spinner" />

            <div>
              <strong>
                Loading document...
              </strong>

              <p>
                Preparing Marginal Q&A.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

 
  if (error && !documentData) {
    return (
      <div className="qa-page">
        <header className="qa-header">
          <div className="qa-eyebrow">
            DOCUMENT Q&A
          </div>

          <h1>Ask Marginal</h1>

          <p>
            Ask questions about your document.
          </p>
        </header>

        <main className="qa-content">
          <div className="qa-error">
            <h2>Unable to open Q&A</h2>

            <p>{error}</p>

            <button
              type="button"
              className="qa-secondary-button"
              onClick={() => navigate("/reader")}
            >
              <ArrowLeft size={16} />
              Back to Reader
            </button>
          </div>
        </main>
      </div>
    );
  }

  
  return (
    <div className="qa-page">

      <header className="qa-header">
        <div className="qa-eyebrow">
          DOCUMENT Q&A
        </div>

        <h1>Ask Marginal</h1>

        <p>
          Ask questions and get answers based only
          on your document.
        </p>
      </header>

      <main className="qa-content">

        

        <button
          type="button"
          className="qa-back-button"
          onClick={() => navigate("/summary")}
        >
          <ArrowLeft size={15} />
          Back to Summary
        </button>

        

        <div className="qa-document-card">

          <div className="qa-document-icon">
            <Sparkles size={20} />
          </div>

          <div>
            <h2>
              {documentData?.name ||
                "Current Document"}
            </h2>

            <p>
              Marginal will answer using the content
              of this document.
            </p>
          </div>

        </div>

        

        {conversation.length === 0 && (
          <section className="qa-welcome">

            <div className="qa-welcome-icon">
              <Sparkles size={24} />
            </div>

            <h2>
              What would you like to know?
            </h2>

            <p>
              Ask Marginal anything about the
              material in your document.
            </p>

            <div className="qa-suggestions">

              {suggestedQuestions.map(
                (suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    onClick={() =>
                      useSuggestedQuestion(
                        suggestion
                      )
                    }
                  >
                    {suggestion}
                  </button>
                )
              )}

            </div>

          </section>
        )}

       

        {error && documentData && (
          <div className="qa-inline-error">
            {error}
          </div>
        )}

        

        {conversation.length > 0 && (
          <section className="qa-conversation">

            <div className="qa-conversation-header">

              <div>
                <div className="qa-section-label">
                  CONVERSATION
                </div>

                <h2>
                  Your Questions
                </h2>
              </div>

              <button
                type="button"
                className="qa-clear-button"
                onClick={handleClear}
              >
                <Trash2 size={15} />
                Clear
              </button>

            </div>

            {conversation.map(
              (item, index) => (
                <div
                  className="qa-message-group"
                  key={index}
                >

                  

                  <div className="qa-question">

                    <div className="qa-avatar qa-user-avatar">
                      <User size={16} />
                    </div>

                    <div className="qa-message-content">

                      <div className="qa-message-label">
                        YOU
                      </div>

                      <p>
                        {item.question}
                      </p>

                    </div>

                  </div>

                  

                  <div className="qa-answer">

                    <div className="qa-avatar qa-ai-avatar">
                      <Sparkles size={16} />
                    </div>

                    <div className="qa-message-content">

                      <div className="qa-answer-top">

                        <div className="qa-message-label">
                          MARGINAL
                        </div>

                        <button
                          type="button"
                          className="qa-copy-button"
                          onClick={() =>
                            handleCopy(
                              item.answer,
                              index
                            )
                          }
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check size={14} />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              Copy
                            </>
                          )}
                        </button>

                      </div>

                      <p>
                        {item.answer}
                      </p>

                      {item.source && (
                        <div className="qa-source">
                          <strong>
                            Based on:
                          </strong>{" "}
                          {item.source}
                        </div>
                      )}

                    </div>

                  </div>

                </div>
              )
            )}

          </section>
        )}

        
      

        <section className="qa-ask-card">

          <div className="qa-section-label">
            ASK A QUESTION
          </div>

          <form onSubmit={handleAsk}>

            <textarea
              value={question}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              placeholder="Ask something about your document..."
              rows={4}
              disabled={loading}
            />

            <div className="qa-form-bottom">

              <p>
                Marginal answers using your document.
              </p>

              <button
                type="submit"
                className="qa-ask-button"
                disabled={
                  loading || !question.trim()
                }
              >
                {loading ? (
                  <>
                    <span className="qa-button-spinner" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Ask Marginal
                  </>
                )}
              </button>

            </div>

          </form>

        </section>

      </main>
    </div>
  );
}

export default QA;
