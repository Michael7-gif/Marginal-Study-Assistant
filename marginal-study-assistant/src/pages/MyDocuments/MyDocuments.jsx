import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  FileUp,
  Clock,
  Upload,
  Trash2,
} from "lucide-react";
import {
  deleteDocument,
  listDocuments,
  setCurrentDocumentId,
} from "../../services/documentApi";
import "./MyDocuments.css";

function MyDocuments() {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);

    try {
      const data = await listDocuments();

      setDocuments(Array.isArray(data) ? data : []);
      setError("");
    } catch (e) {
      setError(e?.message || "Could not load your documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const open = (doc) => {
    setCurrentDocumentId(doc.id);

    window.dispatchEvent(
      new Event("currentDocumentUpdated")
    );

    navigate("/reader");
  };

  const remove = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this document?"
    );

    if (!confirmed) return;

    try {
      await deleteDocument(id);

      if (
        String(
          localStorage.getItem(
            "studydesk_current_document_id"
          )
        ) === String(id)
      ) {
        setCurrentDocumentId(null);
      }

      await load();
    } catch (e) {
      alert(e?.message || "Could not delete the document.");
    }
  };

  const size = (bytes) => {
    if (!bytes) return "0 KB";

    const units = ["B", "KB", "MB", "GB"];

    const i = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );

    return `${(
      bytes / Math.pow(1024, i)
    ).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  };

  const date = (value) => {
    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
      return "Unknown date";
    }

    return d.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="my-documents-page">
      <header className="my-documents-header">
        <div>
          <div className="document-label">
            YOUR PRIVATE LIBRARY
          </div>

          <h1>My Documents</h1>

          <p>
            Only documents belonging to your account appear
            here.
          </p>
        </div>

        <div className="documents-header-actions">
          <div className="documents-count">
            <FileText size={17} />

            <span>
              {documents.length}{" "}
              {documents.length === 1
                ? "document"
                : "documents"}
            </span>
          </div>

          <button
            type="button"
            className="upload-document-button"
            onClick={() => navigate("/reader")}
          >
            <Upload size={16} />
            Upload document
          </button>
        </div>
      </header>

      <main className="my-documents-content">
        {loading ? (
          <div className="documents-loading">
            <div className="documents-spinner" />

            <p>
              Loading your private library...
            </p>
          </div>
        ) : error ? (
          <div className="empty-documents">
            <h2>Couldn't load your library</h2>

            <p>{error}</p>

            <button
              type="button"
              className="empty-upload-button"
              onClick={load}
            >
              Try again
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="empty-documents">
            <div className="empty-icon">
              <FileUp size={26} />
            </div>

            <h2>No documents yet</h2>

            <p>
              Upload your first document and it will be
              stored under your account.
            </p>

            <button
              type="button"
              className="empty-upload-button"
              onClick={() => navigate("/reader")}
            >
              Upload your first document
            </button>
          </div>
        ) : (
          <div className="documents-list">
            {documents.map((doc) => (
              <article
                className="document-card"
                key={doc.id}
              >
                <div className="document-icon">
                  <FileText size={23} />
                </div>

                <div className="document-info">
                  <h2 title={doc.name}>
                    {doc.name}
                  </h2>

                  <div className="document-meta">
                    <span>
                      {doc.pageCount || 0}{" "}
                      {doc.pageCount === 1
                        ? "page"
                        : "pages"}
                    </span>

                    <span className="meta-dot">
                      ·
                    </span>

                    <span>
                      {size(doc.size)}
                    </span>

                    <span className="meta-dot">
                      ·
                    </span>

                    <span className="document-date">
                      <Clock size={13} />
                      {date(doc.uploadedAt)}
                    </span>
                  </div>
                </div>

                <div className="document-actions">
                  <button
                    type="button"
                    className="document-delete-button"
                    onClick={() => remove(doc.id)}
                    title="Delete document"
                    aria-label={`Delete ${doc.name}`}
                  >
                    <Trash2 size={17} />
                  </button>

                  <button
                    type="button"
                    className="document-open-button"
                    onClick={() => open(doc)}
                  >
                    Open
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default MyDocuments;