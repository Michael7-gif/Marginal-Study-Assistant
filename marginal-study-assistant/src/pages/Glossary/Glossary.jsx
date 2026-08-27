import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Search,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { apiPost } from "../../services/api";
import { getCurrentDocument } from "../../services/documentApi";

import "./Glossary.css";

function Glossary() {
  const navigate = useNavigate();

  const [documentData, setDocumentData] = useState(null);
  const [terms, setTerms] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const generateGlossary = async () => {
    try {
      setLoading(true);
      setError("");

      // Get the document selected in My Documents
      const document = await getCurrentDocument();

      if (!document) {
        throw new Error("No document has been selected yet.");
      }

      if (!document.id) {
        throw new Error("The selected document has no valid ID.");
      }

      if (!document.text?.trim()) {
        throw new Error(
          "The selected document does not contain readable text."
        );
      }

      setDocumentData(document);

      // Backend expects documentId, not the document text
      const result = await apiPost("/api/glossary/generate", {
        documentId: Number(document.id),
      });

      const generatedTerms = result?.data?.terms;

      if (!Array.isArray(generatedTerms) || generatedTerms.length === 0) {
        throw new Error("No glossary terms were generated.");
      }

      setTerms(generatedTerms);

      localStorage.setItem(
        "studydesk_current_glossary",
        JSON.stringify(generatedTerms)
      );
    } catch (err) {
      console.error("Glossary error:", err);

      setError(
        err?.message ||
          "Something went wrong while generating the glossary."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateGlossary();
  }, []);

  const filteredTerms = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return terms;
    }

    return terms.filter((item) => {
      return (
        item.term?.toLowerCase().includes(query) ||
        item.definition?.toLowerCase().includes(query) ||
        item.importance?.toLowerCase().includes(query)
      );
    });
  }, [terms, search]);

  if (loading) {
    return (
      <div className="glossary-page">
        <header className="glossary-header">
          <div className="glossary-eyebrow">STUDY GLOSSARY</div>

          <h1>Glossary</h1>

          <p>
            Important terms and concepts from your study document.
          </p>
        </header>

        <main className="glossary-content">
          <div className="glossary-loading">
            <div className="glossary-spinner" />

            <div>
              <strong>Building your glossary...</strong>

              <p>
                Marginal is identifying the important terms in
                your document.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glossary-page">
        <header className="glossary-header">
          <div className="glossary-eyebrow">STUDY GLOSSARY</div>

          <h1>Glossary</h1>

          <p>
            Important terms and concepts from your study document.
          </p>
        </header>

        <main className="glossary-content">
          <div className="glossary-error">
            <AlertCircle size={24} />

            <div>
              <h2>Couldn't create the glossary</h2>

              <p>{error}</p>

              <div className="glossary-error-actions">
                <button
                  type="button"
                  className="glossary-primary-button"
                  onClick={generateGlossary}
                >
                  <RefreshCw size={15} />
                  Try Again
                </button>

                <button
                  type="button"
                  className="glossary-secondary-button"
                  onClick={() => navigate("/my-documents")}
                >
                  <ArrowLeft size={15} />
                  My Documents
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="glossary-page">
      <header className="glossary-header">
        <div className="glossary-eyebrow">STUDY GLOSSARY</div>

        <h1>Glossary</h1>

        <p>
          Important terms and concepts extracted from your document.
        </p>
      </header>

      <main className="glossary-content">
        <button
          type="button"
          className="glossary-back-button"
          onClick={() => navigate("/summary")}
        >
          <ArrowLeft size={15} />
          Back to Summary
        </button>

        <div className="glossary-document">
          <div className="glossary-document-icon">
            <BookOpen size={22} />
          </div>

          <div>
            <h2>
              {documentData?.name || "Current Document"}
            </h2>

            <p>
              {terms.length} important{" "}
              {terms.length === 1 ? "term" : "terms"}
            </p>
          </div>
        </div>

        <div className="glossary-intro">
          <div className="glossary-intro-icon">
            <Sparkles size={18} />
          </div>

          <div>
            <h2>Terms to remember</h2>

            <p>
              These are the concepts Marginal thinks are most
              useful for studying this document.
            </p>
          </div>
        </div>

        <div className="glossary-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search terms..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="glossary-results">
          {filteredTerms.length === 0 ? (
            <div className="glossary-empty">
              <Search size={22} />

              <h3>No terms found</h3>

              <p>
                Try searching for another word or clear the
                search field.
              </p>
            </div>
          ) : (
            filteredTerms.map((item, index) => (
              <article
                className="glossary-card"
                key={`${item.term}-${index}`}
              >
                <div className="glossary-card-number">
                  {index + 1}
                </div>

                <div className="glossary-card-content">
                  <h2>{item.term}</h2>

                  <p className="glossary-definition">
                    {item.definition}
                  </p>

                  {item.importance && (
                    <div className="glossary-importance">
                      <strong>Why it matters</strong>

                      <p>{item.importance}</p>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        <div className="glossary-footer">
          Glossary generated by Marginal AI using information
          from your document.
        </div>
      </main>
    </div>
  );
}

export default Glossary;