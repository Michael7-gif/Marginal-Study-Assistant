
import { useEffect, useState } from "react";
import {
  FileText,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  BookOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../../services/api";
import { getCurrentDocument } from "../../services/documentApi";

import "./summary.css";

function Summary() {
  const navigate = useNavigate();

  const [documentData, setDocumentData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const parsedDocument = await getCurrentDocument();
        setDocumentData(parsedDocument);

        const result = await apiPost("/api/ai/summarize", { documentId: parsedDocument.id });

        if (!result.data) {
          throw new Error(
            "The AI returned an empty summary."
          );
        }

        setSummary(result.data);

        localStorage.setItem(
          "studydesk_current_summary",
          JSON.stringify(result.data)
        );
      } catch (err) {
        console.error("Summary error:", err);

        setError(
          err?.message ||
            "Could not generate a summary for this document."
        );
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, []);

  
  if (error) {
    return (
      <div className="summary-page">
        <header className="summary-header">
          <div className="sd-mono">
            DOCUMENT SUMMARY
          </div>

          <h1 className="summary-title">
            Summary
          </h1>

          <p>
            A study-friendly overview of your document.
          </p>
        </header>

        <main className="summary-content">
          <div className="summary-error">
            <AlertCircle size={22} />

            <div>
              <h3>Nothing to summarize</h3>

              <p>{error}</p>

              <button
                type="button"
                className="summary-back-button"
                onClick={() => navigate("/reader")}
              >
                <ArrowLeft size={15} />
                Back to Reader
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  
  if (loading || !documentData) {
    return (
      <div className="summary-page">
        <header className="summary-header">
          <div className="sd-mono">
            DOCUMENT SUMMARY
          </div>

          <h1 className="summary-title">
            Summary
          </h1>

          <p>
            A study-friendly overview of your document.
          </p>
        </header>

        <main className="summary-content">
          <div className="summary-loading">
            <div className="summary-spinner" />

            <div>
              <strong>
                Preparing your AI summary...
              </strong>

              <p>
                Marginal is analyzing your document.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  
  return (
    <div className="summary-page">

      
      <header className="summary-header">
        <div className="sd-mono">
          DOCUMENT SUMMARY
        </div>

        <h1 className="summary-title">
          Summary
        </h1>

        <p>
          A study-friendly overview of your document.
        </p>
      </header>

      
      <main className="summary-content">

        

        <button
          type="button"
          className="summary-back-button"
          onClick={() => navigate("/reader")}
        >
          <ArrowLeft size={15} />
          Back to Reader
        </button>

        

        <div className="summary-document">

          <div className="summary-document-icon">
            <FileText size={22} />
          </div>

          <div className="summary-document-info">

            <h2>
              {documentData.name}
            </h2>

            <p>
              {documentData.format || "Document"}
              {documentData.pageCount > 0 ? ` · ${documentData.pageCount} pages` : ""}
              {" · "}
              {documentData.text
                ? documentData.text.length.toLocaleString()
                : 0}{" "}
              characters
            </p>

          </div>

        </div>

        

        <div className="summary-intro">

          <div className="summary-intro-icon">
            <Sparkles size={18} />
          </div>

          <div>

            <h2>
              Your AI study summary
            </h2>

            <p>
              Marginal analyzed your document and
              extracted the important information.
            </p>

          </div>

        </div>

        

        <section className="summary-card">

          <div className="summary-card-label">
            SHORT SUMMARY
          </div>

          <h2>
            Quick Revision
          </h2>

          <p className="summary-text">
            {summary?.shortSummary ||
              "No short summary was generated."}
          </p>

        </section>

        

        <section className="summary-card">

          <div className="summary-card-label">
            DETAILED SUMMARY
          </div>

          <h2>
            Detailed Explanation
          </h2>

          <p className="summary-text">
            {summary?.detailedSummary ||
              "No detailed summary was generated."}
          </p>

        </section>

       

        <section className="summary-card">

          <div className="summary-card-label">
            KEY POINTS
          </div>

          <h2>
            Important Points
          </h2>

          {summary?.keyPoints?.length > 0 ? (
            <div className="key-points">

              {summary.keyPoints.map(
                (point, index) => (

                  <div
                    className="key-point"
                    key={index}
                  >

                    <div className="key-point-number">
                      {index + 1}
                    </div>

                    <div className="key-point-text">
                      {point}
                    </div>

                  </div>

                )
              )}

            </div>
          ) : (
            <p className="summary-text">
              No key points were generated.
            </p>
          )}

        </section>

        

        {summary?.importantTerms?.length > 0 && (
          <section className="summary-card">

            <div className="summary-card-label">
              IMPORTANT TERMS
            </div>

            <h2>
              Terms to Remember
            </h2>

            <div className="key-points">

              {summary.importantTerms.map(
                (item, index) => (

                  <div
                    className="key-point"
                    key={index}
                  >

                    <div className="key-point-number">
                      {index + 1}
                    </div>

                    <div className="key-point-text">

                      <strong>
                        {item.term}
                      </strong>

                      <br />

                      {item.meaning}

                    </div>

                  </div>

                )
              )}

            </div>

          </section>
        )}

        

        <section className="summary-study-card">

          <div className="summary-study-icon">
            <BookOpen size={20} />
          </div>

          <div className="summary-study-content">

            <h2>
              Ready to test yourself?
            </h2>

            <p>
              Use this document to generate questions
              and check how well you understand it.
            </p>

          </div>

          <button
            type="button"
            className="summary-quiz-button"
            onClick={() => navigate("/quiz")}
          >
            Take a Quiz
          </button>

        </section>

        
        <section className="summary-card">

          <div className="summary-card-label">
            SOURCE TEXT
          </div>

          <h2>
            Document Text
          </h2>

          <p className="summary-description">
            This is the original text extracted from
            your document.
          </p>

          <div className="source-text">
            {documentData.text}
          </div>

        </section>

        

        <div className="summary-footer">
          This summary was generated by Marginal AI
          using the content of your document.
        </div>

      </main>
    </div>
  );
}

export default Summary;
