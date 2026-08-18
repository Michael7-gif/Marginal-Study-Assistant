import { apiGet, apiPost } from "./api";

export const getCurrentUser = () => apiGet("/api/auth/me");
export const login = (email, password) => apiPost("/api/auth/login", { email, password });
export const signup = (email, password) => apiPost("/api/auth/signup", { email, password });
export const requestPasswordReset = (email) => apiPost("/api/auth/forgot-password", { email });
export const verifyPasswordResetCode = (email, code) => apiPost("/api/auth/verify-reset-code", { email, code });
export const resetPassword = (email, code, password) => apiPost("/api/auth/reset-password", { email, code, password });
export const logout = () => apiPost("/api/auth/logout", {});
