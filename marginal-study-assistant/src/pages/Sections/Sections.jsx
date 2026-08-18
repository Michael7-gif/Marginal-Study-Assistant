
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../../services/api";
import { getCurrentDocument } from "../../services/documentApi";

import "./Sections.css";

function Sections() {
  const navigate = useNavigate();

  const [documentData, setDocumentData] = useState(null);
  const [sections, setSections] = useState([]);
  const [expandedSection, setExpandedSection] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    generateSections();
  }, []);

  const generateSections = async () => {
    try {
      setLoading(true);
      setError("");

      const parsedDocument = await getCurrentDocument();
      setDocumentData(parsedDocument);

      const result = await apiPost("/api/sections/generate", { documentId: parsedDocument.id });

      if (!result.data?.sections?.length) {
        throw new Error(
          "No document sections were generated."
        );
      }

      setSections(result.data.sections);

      localStorage.setItem(
        "studydesk_current_sections",
        JSON.stringify(result.data.sections)
      );
    } catch (err) {
      console.error("Sections error:", err);

      setError(
        err?.message ||
          "Something went wrong while generating the sections."
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (index) => {
    setExpandedSection((previous) =>
      previous === index ? null : index
    );
  };

  
  if (loading) {
    return (
      <div className="sections-page">
        <header className="sections-header">
          <div className="sections-eyebrow">
            DOCUMENT SECTIONS
          </div>

          <h1>Sections</h1>

          <p>
            Organizing your document into useful study topics.
          </p>
        </header>

        <main className="sections-content">
          <div className="sections-loading">
            <div className="sections-spinner" />

            <div>
              <strong>
                Organizing your document...
              </strong>

              <p>
                Marginal is identifying the major topics
                and concepts.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  
  if (error) {
    return (
      <div className="sections-page">
        <header className="sections-header">
          <div className="sections-eyebrow">
            DOCUMENT SECTIONS
          </div>

          <h1>Sections</h1>

          <p>
            Organize your document into useful study topics.
          </p>
        </header>

        <main className="sections-content">
          <div className="sections-error">
            <AlertCircle size={22} />

            <div>
              <h2>
                Couldn't create the sections
              </h2>

              <p>{error}</p>

              <div className="sections-error-actions">
                <button
                  type="button"
                  className="sections-primary-button"
                  onClick={generateSections}
                >
                  Try Again
                </button>

                <button
                  type="button"
                  className="sections-secondary-button"
                  onClick={() => navigate("/summary")}
                >
                  <ArrowLeft size={15} />
                  Back to Summary
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  

  return (
    <div className="sections-page">

      

      <header className="sections-header">
        <div className="sections-eyebrow">
          DOCUMENT SECTIONS
        </div>

        <h1>Sections</h1>

        <p>
          Explore your document by topic and focus on
          one section at a time.
        </p>
      </header>

      <main className="sections-content">

        

        <button
          type="button"
          className="sections-back-button"
          onClick={() => navigate("/summary")}
        >
          <ArrowLeft size={15} />
          Back to Summary
        </button>

        

        <div className="sections-document">
          <div className="sections-document-icon">
            <BookOpen size={22} />
          </div>

          <div>
            <h2>
              {documentData?.name ||
                "Current Document"}
            </h2>

            <p>
              {sections.length} study sections identified
            </p>
          </div>
        </div>

        

        <div className="sections-intro">
          <div className="sections-intro-icon">
            <Sparkles size={18} />
          </div>

          <div>
            <h2>
              Study by section
            </h2>

            <p>
              Marginal has organized your document into
              major topics so you can focus on one concept
              at a time.
            </p>
          </div>
        </div>

        

        <div className="sections-list">

          {sections.map((section, index) => {
            const isExpanded =
              expandedSection === index;

            return (
              <article
                className={`section-card ${
                  isExpanded ? "expanded" : ""
                }`}
                key={`${section.title}-${index}`}
              >

                

                <button
                  type="button"
                  className="section-card-header"
                  onClick={() =>
                    toggleSection(index)
                  }
                >

                  <div className="section-number">
                    {index + 1}
                  </div>

                  <div className="section-card-title">
                    <h2>
                      {section.title}
                    </h2>

                    <p>
                      {section.description}
                    </p>
                  </div>

                  <div className="section-toggle">
                    {isExpanded ? (
                      <ChevronUp size={19} />
                    ) : (
                      <ChevronDown size={19} />
                    )}
                  </div>

                </button>

                

                {isExpanded && (
                  <div className="section-card-body">

                    <div className="section-points-label">
                      KEY POINTS
                    </div>

                    {section.keyPoints?.length > 0 ? (
                      <div className="section-points">

                        {section.keyPoints.map(
                          (point, pointIndex) => (
                            <div
                              className="section-point"
                              key={pointIndex}
                            >
                              <div className="section-point-number">
                                {pointIndex + 1}
                              </div>

                              <p>
                                {point}
                              </p>
                            </div>
                          )
                        )}

                      </div>
                    ) : (
                      <p className="section-no-points">
                        No key points were generated
                        for this section.
                      </p>
                    )}

                  </div>
                )}

              </article>
            );
          })}

        </div>

        

        <div className="sections-footer">
          Sections generated by Marginal AI using
          information from your document.
        </div>

      </main>
    </div>
  );
}

export default Sections;
