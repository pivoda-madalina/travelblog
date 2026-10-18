// Every server call goes through this client (docs/architecture.md, Frontend conventions).

/** DRF error body: field names mapped to messages, plus `detail` or `non_field_errors`. */
export type ApiErrorBody = Record<string, string | string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(`API request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  /** The first message for each field, in the shape Mantine's `form.setErrors()` expects. */
  get fieldErrors(): Record<string, string> {
    return Object.fromEntries(
      Object.entries(this.body).map(([field, messages]) => [
        field,
        Array.isArray(messages) ? (messages[0] ?? '') : messages,
      ]),
    );
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function readCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' });

  // Django's session authentication requires the CSRF token on every write (ADR 0002).
  if (method !== 'GET') {
    const csrfToken = readCookie('csrftoken');
    if (csrfToken) {
      headers.set('X-CSRFToken', decodeURIComponent(csrfToken));
    }
  }

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body; // The browser sets the multipart boundary itself.
  } else if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    payload = JSON.stringify(body);
  }

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: payload,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new ApiError(response.status, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: (path: string) => request<undefined>('DELETE', path),
};
