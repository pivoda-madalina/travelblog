type Reply = Response | object | ((init: RequestInit) => Response | object);

/**
 * Replaces fetch with canned API answers, keyed by method and path under /api, for example
 * `{ 'GET /auth/me/': { is_author: false, username: null } }`. A plain object is sent as a 200
 * JSON response. Requests without an answer get a 404, so a missing mock fails loudly.
 * Returns the fetch mock, so tests can check which requests were sent.
 */
export function mockApi(replies: Record<string, Reply>) {
  const fetchMock = vi.fn<typeof fetch>((input, init = {}) => {
    const path = String(input).replace(/^\/api/, '');
    const reply = replies[`${init.method ?? 'GET'} ${path}`];
    const answer = typeof reply === 'function' ? reply(init) : reply;
    if (answer === undefined) {
      return Promise.resolve(Response.json({ detail: `No mock for ${path}` }, { status: 404 }));
    }
    return Promise.resolve(answer instanceof Response ? answer : Response.json(answer));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Whether a request with this method and path under /api was sent. */
export function wasRequested(fetchMock: ReturnType<typeof mockApi>, method: string, path: string) {
  return fetchMock.mock.calls.some(
    ([input, init]) => String(input) === `/api${path}` && (init?.method ?? 'GET') === method,
  );
}
