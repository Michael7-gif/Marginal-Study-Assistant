import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

const links = [
  ["Dashboard", "/"],
  ["My Documents", "/documents"],
  ["Reader", "/reader"],
  ["Summary", "/summary"],
  ["Sections", "/sections"],
  ["Glossary", "/glossary"],
  ["Q&A", "/qa"],
  ["Quiz", "/quiz"],
  ["Progress", "/progress"],
];

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        window.innerWidth <= 760 &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        setMobileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 760) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleLinkClick = () => {
    if (window.innerWidth <= 760) {
      setMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <button
        type="button"
        className="mobile-menu-button"
        aria-label={
          mobileOpen ? "Close navigation menu" : "Open navigation menu"
        }
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? "×" : "☰"}
      </button>

      {mobileOpen && (
        <div
          className="sidebar-overlay"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        ref={sidebarRef}
        className={`app-sidebar ${mobileOpen ? "mobile-open" : ""}`}
      >
        <div className="sidebar-brand">
          <div className="sidebar-brand-text">
            <strong>Marginal</strong>
            <span>Study Assistant</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {links.map(([name, path]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
              onClick={handleLinkClick}
            >
              <span>{name}</span>
            </NavLink>
          ))}
        </nav>

        <footer className="sidebar-footer">
          <div className="sidebar-user" title={user?.email}>
            {user?.email}
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
          >
            Sign out
          </button>

          <div>© 2026 Michael</div>
        </footer>
      </aside>
    </>
  );
}

export default Sidebar;