const BACKEND_ORIGIN =
  "https://marginal-study-assistant-api.onrender.com";

function getBackendUrl(req) {
  const incoming = new URL(
    req.url || "/api",
    `https://${req.headers.host || "localhost"}`
  );

  const apiPath = incoming.pathname.startsWith("/api")
    ? incoming.pathname.slice(4)
    : incoming.pathname;

  return `${BACKEND_ORIGIN}/api${apiPath}${incoming.search}`;
}

function copyRequestHeaders(req) {
  const headers = {};

  for (const name of [
    "accept",
    "content-type",
    "cookie",
    "authorization",
    "user-agent",
  ]) {
    const value = req.headers?.[name];

    if (value) {
      headers[name] = Array.isArray(value)
        ? value.join(", ")
        : value;
    }
  }

  return headers;
}

async function getRequestBody(req) {
  if (
    req.method === "GET" ||
    req.method === "HEAD"
  ) {
    return undefined;
  }

  if (
    req.body === undefined ||
    req.body === null
  ) {
    return undefined;
  }

  if (
    typeof req.body === "string" ||
    Buffer.isBuffer(req.body)
  ) {
    return req.body;
  }

  return JSON.stringify(req.body);
}

export default async function handler(req, res) {
  try {
    const upstreamUrl = getBackendUrl(req);
    const body = await getRequestBody(req);

    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers: copyRequestHeaders(req),
      body,
      redirect: "manual",
    });

    /*
     * IMPORTANT:
     *
     * Render creates the marginal_session cookie.
     * This proxy passes that Set-Cookie header back to
     * the browser so the cookie belongs to the Vercel
     * website that the user is actually visiting.
     */

    const setCookies =
      typeof upstream.headers.getSetCookie ===
      "function"
        ? upstream.headers.getSetCookie()
        : upstream.headers.get("set-cookie");

    if (
      setCookies &&
      setCookies.length
    ) {
      res.setHeader(
        "Set-Cookie",
        setCookies
      );
    }

    const contentType =
      upstream.headers.get(
        "content-type"
      );

    if (contentType) {
      res.setHeader(
        "Content-Type",
        contentType
      );
    }

    res.status(upstream.status);

    const responseBody = Buffer.from(
      await upstream.arrayBuffer()
    );

    res.end(responseBody);
  } catch (error) {
    console.error(
      "Vercel API proxy error:",
      error
    );

    res.status(502).json({
      success: false,
      message:
        "Could not connect to Marginal's backend.",
    });
  }
}