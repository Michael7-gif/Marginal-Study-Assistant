const DEFAULT_LOCAL_API_URL =
  "https://marginal-study-assistant-api.onrender.com";

export const API_URL = import.meta.env.PROD
  ? ""
  : (
      import.meta.env.VITE_API_URL ||
      DEFAULT_LOCAL_API_URL
    ).replace(/\/$/, "");

async function request(path, options = {}) {
  const requestUrl = `${API_URL}${path}`;

  let response;

  try {
    response = await fetch(requestUrl, {
      ...options,
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",

        ...(options.body !== undefined
          ? {
              "Content-Type": "application/json",
            }
          : {}),

        ...(options.headers || {}),
      },
    });
  } catch (error) {
    console.error(
      "Marginal API connection error:",
      error
    );

    throw new Error(
      "Could not connect to Marginal's backend."
    );
  }

  let result = null;

  try {
    result = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(
        `Request failed (${response.status}).`
      );
    }

    throw new Error(
      "The backend returned an invalid response."
    );
  }

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message ||
        `Request failed (${response.status}).`
    );
  }

  return result;
}

export function apiGet(path) {
  return request(path);
}

export function apiPost(path, body) {
  return request(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function apiDelete(path) {
  return request(path, {
    method: "DELETE",
  });
}