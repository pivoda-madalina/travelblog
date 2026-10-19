import { useQuery } from '@tanstack/react-query';

import { api } from '../../api/client';
import type { City } from '../places/api';

/** A published trip that visited the city, with its first visit date there. */
export interface Visit {
  trip: number;
  title: string;
  visited_on: string;
}

export interface MapCity extends City {
  visits: Visit[];
}

/** `GET /api/map/`: one entry per visited city (BR-12), only from published trips and visits
 * of today or earlier (BR-13). */
export interface WorldMapData {
  countries: string[];
  cities: MapCity[];
}

export function useWorldMap() {
  return useQuery({
    queryKey: ['map'],
    queryFn: () => api.get<WorldMapData>('/map/'),
  });
}
