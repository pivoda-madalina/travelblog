import { api, ApiError } from './client';

function mockFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function sentRequest(fetchMock: ReturnType<typeof mockFetch>) {
  const call = fetchMock.mock.lastCall;
  if (!call) {
    throw new Error('fetch was not called');
  }
  const [url, init = {}] = call;
  return { url, headers: new Headers(init.headers), body: init.body };
}

beforeEach(() => {
  document.cookie = 'csrftoken=abc123';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('requests go under /api and return the parsed JSON', async () => {
  const fetchMock = mockFetch(Response.json({ status: 'ok' }));

  await expect(api.get('/health/')).resolves.toEqual({ status: 'ok' });
  expect(sentRequest(fetchMock).url).toBe('/api/health/');
});

test('reads do not send the CSRF token', async () => {
  const fetchMock = mockFetch(Response.json([]));

  await api.get('/trips/');

  expect(sentRequest(fetchMock).headers.has('X-CSRFToken')).toBe(false);
});

test('writes send the CSRF token from the cookie and a JSON body', async () => {
  const fetchMock = mockFetch(Response.json({ id: 1 }, { status: 201 }));

  await api.post('/trips/', { title: 'Rome' });

  const { headers, body } = sentRequest(fetchMock);
  expect(headers.get('X-CSRFToken')).toBe('abc123');
  expect(headers.get('Content-Type')).toBe('application/json');
  expect(body).toBe('{"title":"Rome"}');
});

test('form data is sent as is, so the browser can set the multipart boundary', async () => {
  const fetchMock = mockFetch(Response.json({ id: 1 }, { status: 201 }));
  const form = new FormData();

  await api.post('/photos/', form);

  const { headers, body } = sentRequest(fetchMock);
  expect(headers.has('Content-Type')).toBe(false);
  expect(body).toBe(form);
});

test('a 204 response resolves without a body', async () => {
  mockFetch(new Response(null, { status: 204 }));

  await expect(api.delete('/trips/1/')).resolves.toBeUndefined();
});

test('validation errors become an ApiError with one message per field', async () => {
  mockFetch(
    Response.json(
      { end_date: ['The end date cannot be before the start date.'], detail: 'Invalid' },
      { status: 400 },
    ),
  );

  const error = await api.post('/trips/', {}).catch((caught: unknown) => caught);

  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(400);
  expect((error as ApiError).fieldErrors).toEqual({
    end_date: 'The end date cannot be before the start date.',
    detail: 'Invalid',
  });
});
