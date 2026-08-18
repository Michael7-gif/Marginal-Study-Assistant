import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  BarChart3,
  BookOpen,
  FileText,
  HelpCircle,
  Layers3,
  ListChecks,
  MessageCircleQuestion,
  Sparkles,
} from "lucide-react";
import "./Sidebar.css";

const links = [
  ["Dashboard", "/", BarChart3],
  ["My Documents", "/documents", FileText],
  ["Reader", "/reader", BookOpen],
  ["Summary", "/summary", Sparkles],
  ["Sections", "/sections", Layers3],
  ["Glossary", "/glossary", ListChecks],
  ["Q&A", "/qa", MessageCircleQuestion],
  ["Quiz", "/quiz", HelpCircle],
  ["Progress", "/progress", BarChart3],
];

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        window.innerWidth <= 760
      ) {
        setMobileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleSidebarClick = () => {
    if (window.innerWidth <= 760 && !mobileOpen) {
      setMobileOpen(true);
    }
  };

  const handleLinkClick = (event) => {
    if (window.innerWidth <= 760) {
      if (!mobileOpen) {


        event.preventDefault(); 
        event.stopPropagation();
        setMobileOpen(true);
      } else {


        setMobileOpen(false);
      }
    }
  };

  return (
    <aside
      ref={sidebarRef}
      className={`app-sidebar ${mobileOpen ? "mobile-open" : ""}`}
      onClick={handleSidebarClick}
    >
      <div className="sidebar-brand">
        <div className="sidebar-mark">M</div>
        <div className="sidebar-brand-text">
          <strong>Marginal</strong>
          <span>Study Assistant</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {links.map(([name, path, Icon]) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}

            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={handleLinkClick}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{name}</span>
          </NavLink>
        ))}
      </nav>

      <footer className="sidebar-footer"><div className="sidebar-user" title={user?.email}>{user?.email}</div><button type="button" className="sidebar-logout" onClick={async () => { await logout(); navigate("/login", { replace: true }); }}>Sign out</button><div>© 2026 Michael</div></footer>
    </aside>
  );
}

export default Sidebar;