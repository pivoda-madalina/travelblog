import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mockApi, wasRequested } from '../../test/mockApi';
import { renderRoute } from '../../test/render';

const author = { is_author: true, username: 'madalina' };
const visitor = { is_author: false, username: null };

const trip = {
  id: 7,
  title: 'Rome and the Amalfi Coast',
  start_date: '2026-05-12',
  end_date: '2026-05-20',
  summary: '',
  cover_photo: null,
  status: 'published',
  planned_budget: '5000.00',
  created_at: '2026-10-18T10:00:00Z',
  countries: ['Italy'],
};

const colosseum = {
  id: 1,
  trip: 7,
  journal_entry: null,
  image: '/media/photos/IMG_0412.jpg',
  thumbnail: '/media/photos/thumbnails/IMG_0412.jpg',
  caption: 'Colosseum at dusk',
  created_at: '2026-10-20T10:00:00Z',
};

const arrival = {
  id: 3,
  trip: 7,
  date: '2026-05-12',
  place: null,
  place_name: null,
  title: 'Arrival in Rome',
  body: '',
};

const PHOTOS = 'GET /photos/?trip=7';

function jpeg(name: string): File {
  return new File(['jpeg bytes'], name, { type: 'image/jpeg' });
}

function fileInput(): HTMLInputElement {
  // The dropzone keeps its file input hidden, so the test reaches it directly.
  const input = document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('No file input');
  }
  return input;
}

test('the gallery shows thumbnails with their captions', async () => {
  mockApi({ 'GET /auth/me/': visitor, 'GET /trips/7/': trip, [PHOTOS]: [colosseum] });

  renderRoute('/trips/7/photos');

  const image = await screen.findByRole('img', { name: 'Colosseum at dusk' });
  // Galleries load the smaller copy (US-08).
  expect(image).toHaveAttribute('src', '/media/photos/thumbnails/IMG_0412.jpg');
  expect(screen.getByText('Colosseum at dusk', { selector: 'figcaption' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '+ Upload photos' })).not.toBeInTheDocument();
});

test('a trip without photos says so', async () => {
  mockApi({ 'GET /auth/me/': author, 'GET /trips/7/': trip, [PHOTOS]: [] });

  renderRoute('/trips/7/photos');

  expect(await screen.findByText('No photos yet.')).toBeInTheDocument();
});

test('the author uploads several photos with captions, attached to an entry', async () => {
  const sent: FormData[] = [];
  let gallery = [] as (typeof colosseum)[];
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    [PHOTOS]: () => gallery,
    'GET /journal-entries/?trip=7': [arrival],
    'POST /photos/': (init) => {
      sent.push(init.body as FormData);
      gallery = [colosseum];
      return Response.json(colosseum, { status: 201 });
    },
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/photos');

  await user.click(await screen.findByRole('button', { name: '+ Upload photos' }));
  const modal = await screen.findByRole('dialog', { name: 'Upload photos' });
  await user.upload(fileInput(), [jpeg('IMG_0412.jpg'), jpeg('IMG_0413.jpg')]);
  await user.type(
    await within(modal).findByLabelText('Caption for IMG_0412.jpg'),
    'Colosseum at dusk',
  );
  await user.click(within(modal).getByRole('combobox', { name: 'Attach to entry' }));
  await user.click(screen.getByRole('option', { name: 'Arrival in Rome, 12 May 2026' }));
  await user.click(within(modal).getByRole('button', { name: 'Upload 2' }));

  expect(await screen.findByText('2 photos uploaded.')).toBeInTheDocument();
  expect(sent.map((form) => [form.get('caption'), form.get('journal_entry')])).toEqual([
    ['Colosseum at dusk', '3'],
    ['', '3'],
  ]);
  expect(sent.map((form) => (form.get('image') as File).name)).toEqual([
    'IMG_0412.jpg',
    'IMG_0413.jpg',
  ]);
  expect(sent[0]?.get('trip')).toBe('7');
  expect(await screen.findByRole('img', { name: 'Colosseum at dusk' })).toBeInTheDocument();
});

test('a file can be removed before uploading', async () => {
  const fetchMock = mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    [PHOTOS]: [],
    'GET /journal-entries/?trip=7': [],
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/photos');

  await user.click(await screen.findByRole('button', { name: '+ Upload photos' }));
  const modal = await screen.findByRole('dialog', { name: 'Upload photos' });
  await user.upload(fileInput(), [jpeg('IMG_0412.jpg')]);
  await user.click(await within(modal).findByRole('button', { name: 'Remove IMG_0412.jpg' }));

  expect(within(modal).queryByText('IMG_0412.jpg')).not.toBeInTheDocument();
  expect(within(modal).getByRole('button', { name: 'Upload 0' })).toBeDisabled();
  expect(wasRequested(fetchMock, 'POST', '/photos/')).toBe(false);
});

test('the dropzone refuses files that are not JPEGs, with the reason', async () => {
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    [PHOTOS]: [],
    'GET /journal-entries/?trip=7': [],
  });
  const user = userEvent.setup({ applyAccept: false });
  renderRoute('/trips/7/photos');

  await user.click(await screen.findByRole('button', { name: '+ Upload photos' }));
  const modal = await screen.findByRole('dialog', { name: 'Upload photos' });
  await user.upload(fileInput(), new File(['png'], 'map.png', { type: 'image/png' }));

  expect(await within(modal).findByText('map.png: not a JPEG.')).toBeInTheDocument();
});

test('a photo the API refuses stays in the list with the reason', async () => {
  let posts = 0;
  mockApi({
    'GET /auth/me/': author,
    'GET /trips/7/': trip,
    [PHOTOS]: [],
    'GET /journal-entries/?trip=7': [],
    'POST /photos/': () => {
      posts += 1;
      return posts === 1
        ? Response.json(colosseum, { status: 201 })
        : Response.json({ image: ['The photo must be a JPEG.'] }, { status: 400 });
    },
  });
  const user = userEvent.setup();
  renderRoute('/trips/7/photos');

  await user.click(await screen.findByRole('button', { name: '+ Upload photos' }));
  const modal = await screen.findByRole('dialog', { name: 'Upload photos' });
  await user.upload(fileInput(), [jpeg('IMG_0412.jpg'), jpeg('renamed.jpg')]);
  await user.click(await within(modal).findByRole('button', { name: 'Upload 2' }));

  expect(await screen.findByText('1 photo uploaded.')).toBeInTheDocument();
  expect(await within(modal).findByText('The photo must be a JPEG.')).toBeInTheDocument();
  await waitFor(() => expect(within(modal).queryByText('IMG_0412.jpg')).not.toBeInTheDocument());
  expect(within(modal).getByText('renamed.jpg')).toBeInTheDocument();
});
