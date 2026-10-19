import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/client';
import { tripKeys } from '../trips/api';

/** A real location, shared by every trip that visits it (ADR 0004, BR-12). */
export interface City {
  id: number;
  name: string;
  country_code: string;
  country_name: string;
  latitude: string;
  longitude: string;
}

/** `GET /api/places/?trip={id}`, in route order. */
export interface Place {
  id: number;
  trip: number;
  city: City;
  visited_on: string;
  position: number;
}

export interface PlaceInput {
  name: string;
  country_code: string;
  country_name: string;
  latitude: string;
  longitude: string;
  visited_on: string;
}

/** `GET /api/geocode/reverse/`: the city and country at a clicked point. */
export interface Location {
  name: string;
  country_code: string;
  country_name: string;
}

export interface Point {
  lat: number;
  lng: number;
}

/** The API stores coordinates with 6 decimal places, about 10 cm. */
export function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

export const placeKeys = {
  list: (tripId: number) => ['places', tripId] as const,
};

export function usePlaces(tripId: number) {
  return useQuery({
    queryKey: placeKeys.list(tripId),
    queryFn: () => api.get<Place[]>(`/places/?trip=${tripId}`),
  });
}

/** The lookup is not retried: if it fails, the author types the city instead (US-04). */
export function useReverseGeocode(point: Point | null) {
  return useQuery({
    queryKey: ['geocode', point?.lat, point?.lng],
    queryFn: () => {
      const lat = formatCoordinate(point?.lat ?? 0);
      const lng = formatCoordinate(point?.lng ?? 0);
      return api.get<Location>(`/geocode/reverse/?lat=${lat}&lng=${lng}`);
    },
    enabled: point !== null,
    retry: false,
    staleTime: Infinity,
  });
}

/** After the route changes, the trip's countries change too (US-03). */
function useRouteChanged(tripId: number) {
  const queryClient = useQueryClient();
  return (places?: Place[]) => {
    if (places) {
      queryClient.setQueryData(placeKeys.list(tripId), places);
    } else {
      void queryClient.invalidateQueries({ queryKey: placeKeys.list(tripId) });
    }
    void queryClient.invalidateQueries({ queryKey: tripKeys.all });
  };
}

export function useAddPlace(tripId: number) {
  const routeChanged = useRouteChanged(tripId);
  return useMutation({
    mutationFn: (place: PlaceInput) => api.post<Place>('/places/', { ...place, trip: tripId }),
    onSuccess: () => routeChanged(),
  });
}

export function useDeletePlace(tripId: number) {
  const routeChanged = useRouteChanged(tripId);
  return useMutation({
    mutationFn: (placeId: number) => api.delete(`/places/${placeId}/`),
    onSuccess: () => routeChanged(),
  });
}

/** Sends the whole route order in one request (US-04). */
export function useReorderPlaces(tripId: number) {
  const routeChanged = useRouteChanged(tripId);
  return useMutation({
    mutationFn: (placeIds: number[]) =>
      api.post<Place[]>('/places/reorder/', { trip: tripId, places: placeIds }),
    onSuccess: (places) => routeChanged(places),
  });
}
