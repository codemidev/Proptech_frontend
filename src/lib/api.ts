const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "";

export async function apiFetch(
  path: string,
  token: string | null,
  options: RequestInit = {},
) {
  if (!token) {
    throw new Error("Authentication token unavailable");
  }

  // Clerk/JWT tokens must contain only valid HTTP header characters.
  // Remove invisible Unicode direction/control characters that can cause:
  // "Cannot convert argument to a ByteString..."
  const cleanToken = token
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g, "")
    .trim();

  if (!cleanToken) {
    throw new Error("Authentication token unavailable");
  }

  const isFormData = options.body instanceof FormData;

  const sanitizeHeaderValue = (value: string): string =>
    value
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g, "")
      .trim();

  const rawHeaders: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers instanceof Headers
      ? Object.fromEntries(options.headers.entries())
      : Array.isArray(options.headers)
        ? Object.fromEntries(options.headers)
        : Object.fromEntries(
            Object.entries(options.headers || {}).map(
              ([name, value]) => [name, String(value)],
            ),
          )),
    Authorization: `Bearer ${cleanToken}`,
  };

  const sanitizedHeaders: Record<string, string> = {};

  for (const [name, value] of Object.entries(rawHeaders)) {
    const cleanName = sanitizeHeaderValue(name);

    if (!cleanName) {
      continue;
    }

    sanitizedHeaders[cleanName] = sanitizeHeaderValue(value);
  }

  const requestHeaders = new Headers(sanitizedHeaders);

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: requestHeaders,
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.error ||
      data?.message ||
      `API request failed: ${res.status}`,
    );
  }

  return data;
}
