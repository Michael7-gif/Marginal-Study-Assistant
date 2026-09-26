
import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  listDocuments,
  setCurrentDocumentId,
  getCurrentDocumentId,
} from "../../services/documentApi";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const docs = await listDocuments();

      setDocuments(docs);

      const id = getCurrentDocumentId();

      setCurrentDocument(
        docs.find((d) => String(d.id) === String(id)) ||
          docs[0] ||
          null
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    window.addEventListener("documentsUpdated", load);
    window.addEventListener("currentDocumentUpdated", load);

    return () => {
      window.removeEventListener("documentsUpdated", load);
      window.removeEventListener("currentDocumentUpdated", load);
    };
  }, []);

  const recent = useMemo(
    () =>
      [...documents]
        .sort(
          (a, b) =>
            new Date(b.uploadedAt) - new Date(a.uploadedAt)
        )
        .slice(0, 4),
    [documents]
  );

  const open = (document) => {
    setCurrentDocumentId(document.id);
    setCurrentDocument(document);
    navigate("/reader");
  };

  const active = currentDocument || recent[0] || null;

  const tools = [
    [
      "My documents",
      "Manage your private study library.",
      "/documents",
    ],
    [
      "AI summary",
      "Turn your document into clear notes.",
      "/summary",
    ],
    [
      "Ask Marginal",
      "Ask questions using your document.",
      "/qa",
    ],
    [
      "Take a quiz",
      "Test your understanding.",
      "/quiz",
    ],
  ];

  return (
    <div className="dashboard-page">
      <main className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-eyebrow">
              YOUR STUDY DESK
            </span>

            <h1>Welcome</h1>

            <p>
              Your private documents and study tools, all in one
              place.
            </p>
          </div>

          <button
            className="dashboard-new-document"
            onClick={() => navigate("/reader")}
          >
            New document
          </button>
        </header>

        {loading ? null : active ? (
          <section className="dashboard-focus-card">
            <div className="dashboard-document-icon dashboard-focus-icon">
              <FileText size={21} strokeWidth={1.8} />
            </div>

            <div className="dashboard-focus-body">
              <span className="dashboard-label">
                CONTINUE STUDYING
              </span>

              <h2>{active.name}</h2>

              <p>
                {active.format || "Document"}
                {active.pageCount > 0
                  ? ` · ${active.pageCount} pages`
                  : ""}
              </p>
            </div>

            <button
              className="dashboard-focus-button"
              onClick={() => open(active)}
            >
              Open document
            </button>
          </section>
        ) : (
          <section className="dashboard-welcome-card">
            <div>
              <span className="dashboard-label">
                GET STARTED
              </span>

              <h2>What would you like to study?</h2>

              <p>
                Upload a document and it will be available only
                to your account.
              </p>

              <div className="dashboard-welcome-actions">
                <button
                  className="dashboard-primary-button"
                  onClick={() => navigate("/reader")}
                >
                  Upload document
                </button>

                <button
                  className="dashboard-link-button"
                  onClick={() => navigate("/documents")}
                >
                  View library
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="dashboard-tools">
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-label">
                STUDY TOOLS
              </span>

              <h2>Pick up where you left off</h2>
            </div>
          </div>

          <div className="dashboard-tool-grid">
            {tools.map(([title, description, path]) => (
              <button
                key={path}
                className="dashboard-tool-card"
                onClick={() => navigate(path)}
                disabled={!active && path !== "/documents"}
              >
                <div className="dashboard-tool-copy">
                  <h3>{title}</h3>

                  <p>{description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="dashboard-library-card">
          <div className="dashboard-section-heading compact">
            <div>
              <span className="dashboard-label">
                YOUR PRIVATE LIBRARY
              </span>

              <h2>Recent documents</h2>
            </div>

            <button
              className="dashboard-view-all"
              onClick={() => navigate("/documents")}
            >
              View all
            </button>
          </div>

          {recent.length ? (
            <div className="dashboard-document-list">
              {recent.map((document) => (
                <button
                  key={document.id}
                  className="dashboard-document-item"
                  onClick={() => open(document)}
                >
                  <div className="dashboard-document-icon">
                    <FileText size={18} strokeWidth={1.8} />
                  </div>

                  <div className="dashboard-document-copy">
                    <h3 title={document.name}>
                      {document.name}
                    </h3>

                    <span>
                      {document.format || "Document"}
                      {document.pageCount > 0
                        ? ` · ${document.pageCount} pages`
                        : ""}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-library">
              <p>
                Your uploaded documents will appear here.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;

