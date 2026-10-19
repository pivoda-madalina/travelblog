import type { Place } from './api';
import { routePositions, routeView } from './route';

function place(id: number, latitude: string, longitude: string, position: number): Place {
  return {
    id,
    trip: 7,
    visited_on: '2026-05-12',
    position,
    city: {
      id,
      name: `City ${id}`,
      country_code: 'IT',
      country_name: 'Italy',
      latitude,
      longitude,
    },
  };
}

const rome = place(1, '41.902800', '12.496400', 0);
const naples = place(2, '40.851800', '14.268100', 1);
const positano = place(3, '40.628100', '14.484900', 2);

test('the route joins the places in the order set by the author', () => {
  expect(routePositions([naples, rome, positano])).toEqual([
    [40.8518, 14.2681],
    [41.9028, 12.4964],
    [40.6281, 14.4849],
  ]);
});

test('a trip without places shows the world', () => {
  expect(routeView([])).toEqual({ kind: 'world' });
});

test('a single place is shown up close', () => {
  expect(routeView(routePositions([rome]))).toEqual({ kind: 'place', center: [41.9028, 12.4964] });
});

test('several stops in the same city frame like a single place', () => {
  const again = place(4, '41.902800', '12.496400', 1);

  expect(routeView(routePositions([rome, again]))).toEqual({
    kind: 'place',
    center: [41.9028, 12.4964],
  });
});

test('several places are framed by their bounds', () => {
  expect(routeView(routePositions([rome, naples, positano]))).toEqual({
    kind: 'bounds',
    bounds: [
      [41.9028, 12.4964],
      [40.8518, 14.2681],
      [40.6281, 14.4849],
    ],
  });
});
