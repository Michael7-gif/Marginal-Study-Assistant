
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import "./Auth.css";

export default function Signup() {
  const { signup } = useAuth();

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();

    setError("");

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (password !== confirm) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    setBusy(true);

    try {
      await signup(
        normalizedEmail,
        password
      );

      navigate("/", {
        replace: true,
      });
    } catch (err) {
      setError(
        err?.message ||
          "Could not create your account."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <strong>Marginal</strong>
        </div>

        <h1>Create your account</h1>

        <p>
          Build your private study library and keep your
          learning progress in one place.
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
                setEmail(event.target.value)
              }
              placeholder=""
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password

            <div className="auth-password-wrapper">
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder=""
                autoComplete="new-password"
                minLength={8}
                required
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() =>
                  setShowPassword(
                    (visible) => !visible
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </label>

          <label>
            Confirm password

            <div className="auth-password-wrapper">
              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={confirm}
                onChange={(event) =>
                  setConfirm(
                    event.target.value
                  )
                }
                placeholder=""
                autoComplete="new-password"
                minLength={8}
                required
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    (visible) => !visible
                  )
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </label>

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
              ? "Creating account…"
              : "Create account"}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account?{" "}
          <Link to="/login">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
