import { useMemo } from 'react'
import { useEvents } from '../contexts/EventsContext'
import type { Event } from '../types/event'
import {
  analyzeEvents,
  buildEventsJson,
  getRecommendedEvents,
  getSuggestionsForTimeRange,
} from '@/utils/recommendationEngine'

// Re-export the pure engine so existing imports keep working
export {
  analyzeEvents,
  buildEventsJson,
  getRecommendedEvents,
  getSuggestionsForTimeRange,
  rankEventsForUser,
} from '@/utils/recommendationEngine'
export type { Interest } from '@/utils/recommendationEngine'

export type UseRecommendationsOptions = {
  events?: Event[]
  startISO?: string
  endISO?: string
  search?: string
}

export type UseSuggestionsOptions = {
  events?: Event[]
  startISO?: string
  endISO?: string
  limit?: number
}

/**
 * Main hook implementation (user interests from events)
 */
export function useUserInterests(opts?: UseRecommendationsOptions) {
  const { events: override, startISO, endISO, search } = opts || {}
  const ctx = useEvents()
  const sourceEvents = (override ?? ctx.events ?? []) as Event[]

  const result = useMemo(
    () => analyzeEvents(sourceEvents || [], startISO, endISO),
    [sourceEvents, startISO, endISO]
  )

  const allEventsJson = useMemo(
    () => buildEventsJson(sourceEvents || []),
    [sourceEvents]
  )

  const recommendedEvents = useMemo(
    () => getRecommendedEvents(sourceEvents || [], result.top, search || ''),
    [sourceEvents, result.top, search]
  )

  return {
    ...result,               // tags, categories, times, top
    interests: result.tags,  // alias: all interests from titles
    topInterests: result.top,
    allEventsJson,           // separate JSON of all events
    eventsJson: allEventsJson, // ⬅️ backward-compatible alias (likely what CalendarWithRecs expects)
    recommendedEvents,       // events user might like for given search
    isLoading: ctx.isLoading,
    refresh: ctx.refreshEvents,
  }
}

/**
 * Hook to get suggestions for a specific time range.
 * Defaults to live context events (which already fall back to bundled data
 * when Supabase is unavailable).
 */
export function useSuggestions(opts?: UseSuggestionsOptions) {
  const { events: override, startISO, endISO, limit = 5 } = opts || {}
  const ctx = useEvents()
  const sourceEvents = (override ?? ctx.events ?? []) as Event[]
  
  const interests = useUserInterests({ events: sourceEvents })
  
  const suggestions = useMemo(() => {
    if (!startISO || !endISO) return []
    return getSuggestionsForTimeRange(
      sourceEvents || [],
      interests.topInterests,
      startISO,
      endISO,
      limit
    )
  }, [sourceEvents, interests.topInterests, startISO, endISO, limit])

  return {
    suggestions,
    isLoading: false, // JSON data is always available, no loading state
    refresh: ctx.refreshEvents,
  }
}

/**
 * Backwards-compatible alias: many components expect useRecommendations.
 * This just forwards to useUserInterests.
 */
export function useRecommendations(opts?: UseRecommendationsOptions) {
  return useUserInterests(opts)
}

// Default export = useRecommendations so both default + named imports work.
export default useRecommendations
