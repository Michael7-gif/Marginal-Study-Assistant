import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import "./Auth.css";

export default function Login() {
  const {
    login,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const pageMessage = location.state?.message || "";

  async function submit(event) {
    event.preventDefault();

    setError("");

    setBusy(true);

    try {
      await login(
        email.trim().toLowerCase(),
        password
      );

      navigate("/", {
        replace: true,
      });
    } catch (err) {
      setError(
        err?.message ||
          "Could not sign you in."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-brand">
          <div className="auth-mark">
            M
          </div>

          <strong>
            Marginal
          </strong>
        </div>

        <h1>
          Welcome back
        </h1>

        <p>
          Sign in to access your
          private study library.
        </p>

        <form
          className="auth-form"
          onSubmit={submit}
        >
          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          {pageMessage && (
            <div className="auth-success">
              {pageMessage}
            </div>
          )}

          <label>
            Password

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Your password"
              autoComplete="current-password"
              required
            />
          </label>

          <div className="auth-forgot">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-button"
            disabled={busy}
          >
            {busy
              ? "Signing in…"
              : "Sign in"}
          </button>
        </form>

        <div className="auth-switch">
          New to Marginal?{" "}
          <Link to="/signup">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}