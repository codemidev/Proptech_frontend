export type GetToken = () => Promise<string | null>;

const CONFIGURED_API_URL =
  process.env.NEXT_PUBLIC_API_URL?.trim() || "";

function resolveApiBaseUrl(): string {
  if (CONFIGURED_API_URL) {
    return CONFIGURED_API_URL.replace(/\/+$/, "");
  }

  if (typeof window === "undefined") {
    return "http://127.0.0.1:5000";
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port;

  // Next.js development server.
  // Keep API requests same-origin. Next proxies /api/* to Express :5000.
  if (port === "3000") {
    return "";
  }

  // Nginx/public front door.
  // Keep API requests same-origin so Nginx routes /api/* to Express.
  return "";
}

function getApiBaseUrl(): string {
  return resolveApiBaseUrl().replace(/\/+$/, "");
}


/**
 * Converts a media path returned by the backend into a URL the browser
 * can load. Absolute URLs are preserved. Relative backend paths are
 * resolved against the configured API URL.
 */
export function resolveMediaUrl(
  value: string | null | undefined,
): string {
  const mediaUrl = String(value ?? "").trim();

  if (!mediaUrl) {
    return "";
  }

  if (
    /^https?:\/\//i.test(mediaUrl) ||
    mediaUrl.startsWith("data:") ||
    mediaUrl.startsWith("blob:")
  ) {
    return mediaUrl;
  }

  const baseUrl = getApiBaseUrl();
  const path = mediaUrl.startsWith("/")
    ? mediaUrl
    : `/${mediaUrl}`;

  return `${baseUrl}${path}`;
}

/**
 * Removes invisible/control Unicode characters that cannot legally
 * appear inside HTTP header values.
 */
function cleanHttpValue(value: unknown): string {
  return String(value ?? "")
    // ASCII control characters.
    .replace(/[\u0000-\u001F\u007F]/g, "")
    // Directional marks, zero-width characters and BOM.
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g, "")
    .trim();
}

/**
 * Header values must be ByteString-compatible.
 *
 * JWTs returned by Clerk should contain only printable ASCII characters.
 * We deliberately reject anything outside that range after removing
 * invisible characters instead of allowing fetch/Headers to fail later.
 */
function cleanToken(value: unknown): string {
  const token = cleanHttpValue(value);

  if (!token) {
    return "";
  }

  if (/[^\x20-\x7E]/.test(token)) {
    throw new Error(
      "Authentication token contains unsupported characters",
    );
  }

  return token;
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const base = getApiBaseUrl();
  const endpoint = path.startsWith("/")
    ? path
    : `/${path}`;

  return `${base}${endpoint}`;
}

export async function apiFetch<T = unknown>(
  path: string,
  getToken: GetToken,
  options: RequestInit = {},
): Promise<T> {
  const rawToken = await getToken();

  const token = cleanToken(rawToken);

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  /**
   * Build headers manually.
   *
   * IMPORTANT:
   * Do NOT call new Headers(options.headers).
   *
   * A malformed Unicode character such as U+200E can exist inside
   * a caller-provided Authorization value. Passing that object directly
   * to the browser Headers constructor can throw a ByteString error
   * before we get a chance to sanitize it.
   */
  const headers = new Headers();

  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        if (key.toLowerCase() !== "authorization") {
          const safeKey = cleanHttpValue(key);
          const safeValue = cleanHttpValue(value);

          if (safeKey && safeValue) {
            headers.set(safeKey, safeValue);
          }
        }
      });
    } else if (Array.isArray(options.headers)) {
      for (const [key, value] of options.headers) {
        if (key.toLowerCase() !== "authorization") {
          const safeKey = cleanHttpValue(key);
          const safeValue = cleanHttpValue(value);

          if (safeKey && safeValue) {
            headers.set(safeKey, safeValue);
          }
        }
      }
    } else {
      for (const [key, value] of Object.entries(options.headers)) {
        if (key.toLowerCase() !== "authorization") {
          const safeKey = cleanHttpValue(key);
          const safeValue = cleanHttpValue(value);

          if (safeKey && safeValue) {
            headers.set(safeKey, safeValue);
          }
        }
      }
    }
  }

  /**
   * Authorization is controlled exclusively here.
   * cleanToken() removes U+200E and other invalid/invisible characters.
   */
  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  /**
   * Never manually set multipart Content-Type.
   * The browser adds the required boundary for FormData.
   */
  if (
    !isFormData &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  headers.set(
    "Accept",
    "application/json",
  );

  const response = await fetch(
    buildUrl(path),
    {
      ...options,
      headers,
    },
  );

  const contentType =
    response.headers.get("content-type") || "";

  let data: any = null;

  if (contentType.includes("application/json")) {
    data = await response.json().catch(
      () => null,
    );
  } else {
    const text = await response.text();

    data = text
      ? { message: text }
      : null;
  }

  if (!response.ok) {
    /**
     * Preserve backend validation details instead of collapsing every
     * 400 response into just "Validation failed".
     */
    const validationDetails =
      data?.details ||
      data?.errors ||
      data?.issues;

    if (validationDetails) {
      console.error(
        "[apiFetch] API validation details:",
        JSON.stringify(validationDetails, null, 2),
      );
    }

    throw new Error(
      data?.error ||
      data?.message ||
      data?.details?.message ||
      `API request failed: ${response.status}`,
    );
  }

  return data as T;
}
