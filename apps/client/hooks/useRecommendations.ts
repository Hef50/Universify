import { useMemo } from 'react'
import { useEvents } from '../contexts/EventsContext'
import type { Event } from '../types/event'
import allEventsData from '../data/allEvents.json'

type TimeBucket = 'morning' | 'afternoon' | 'evening' | 'night'

export type Interest = {
  key: string
  label: string
  type: 'tag' | 'category' | 'time'
  count: number
  score: number
}

function normalizeWord(w: string) {
  if (!w) return ''
  let s = w.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim()
  if (s.endsWith('s') && s.length > 3) s = s.slice(0, -1)
  return s
}

function hourToBucket(h: number): TimeBucket {
  if (h >= 6 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  if (h >= 17 && h < 22) return 'evening'
  return 'night'
}

/**
 * Analyze events and return ranked interests.
 * - extracts interests from the *title* into tags
 * - counts categories
 * - weights by popularity (rsvp going)
 * - computes time-of-day preferences
 */
export function analyzeEvents(
  events: Event[],
  startISO?: string,
  endISO?: string
) {
  // optionally filter events to only those overlapping the provided window
  let source = events || []
  if (startISO && endISO) {
    const A0 = Date.parse(startISO)
    const A1 = Date.parse(endISO)
    if (Number.isFinite(A0) && Number.isFinite(A1) && A1 > A0) {
      source = source.filter(e => {
        const s = Date.parse((e as any).startTime || (e as any).start_ts || '')
        const t = Date.parse((e as any).endTime || (e as any).end_ts || '')
        if (!Number.isFinite(s) || !Number.isFinite(t)) return false
        const overlap = Math.max(0, Math.min(A1, t) - Math.max(A0, s))
        return overlap > 0
      })
    }
  }

  const tagCounts = new Map<string, { count: number; weight: number }>()
  const catCounts = new Map<string, { count: number; weight: number }>()
  const timeCounts = new Map<TimeBucket, { count: number; weight: number }>([
    ['morning', { count: 0, weight: 0 }],
    ['afternoon', { count: 0, weight: 0 }],
    ['evening', { count: 0, weight: 0 }],
    ['night', { count: 0, weight: 0 }],
  ])

  for (const e of source || []) {
    // determine popularity weight
    const pop = (e as any).rsvpCounts
      ? Math.log1p(((e as any).rsvpCounts.going || 0)) + 1
      : 1

    // categories
    for (const c of (e as any).categories || []) {
      const k = normalizeWord(c)
      if (!k) continue
      const cur = catCounts.get(k) || { count: 0, weight: 0 }
      cur.count += 1
      cur.weight += pop
      catCounts.set(k, cur)
    }

    // interests (tags) extracted from the *title*
    const stopwords = new Set([
      'the',
      'and',
      'a',
      'an',
      'in',
      'on',
      'at',
      'for',
      'of',
      'to',
      'with',
      'by',
      'from',
      'is',
      'are',
      'this',
      'that',
      'your',
      'you',
      'meet',
      'session',
      'night',
      'event',
      'club',
      'cmu',
      'university',
      'online',
    ])
    const title = ((e as any).title || (e as any).name || '').toString()
    const rawTokens = normalizeWord(title).split(/\s+/).filter(Boolean)
    const filtered = rawTokens.filter(t => !stopwords.has(t))
    const tokensForNgrams = filtered.length ? filtered : rawTokens

    // generate n-grams for n = 1..3
    const maxN = 3
    if (!Array.isArray(tokensForNgrams) || tokensForNgrams.length === 0) {
      // nothing useful in this title
    } else {
      for (let n = 1; n <= maxN; n++) {
        if (tokensForNgrams.length < n) continue
        for (let i = 0; i <= tokensForNgrams.length - n; i++) {
          const slice = tokensForNgrams.slice(i, i + n)
          // skip grams that include very short tokens
          if (slice.some(s => s.length < 2)) continue
          const gram = slice.join(' ')
          // skip overly short grams
          if (gram.length < 3) continue
          const k = gram
          const cur = tagCounts.get(k) || { count: 0, weight: 0 }
          cur.count += 1
          cur.weight += pop
          tagCounts.set(k, cur)
        }
      }
    }

    // time bucket
    const s = Date.parse((e as any).startTime || (e as any).start_ts || '')
    if (!Number.isFinite(s)) continue
    const dt = new Date(s)
    const bucket = hourToBucket(dt.getUTCHours())
    const curT = timeCounts.get(bucket)!
    curT.count += 1
    curT.weight += pop
    timeCounts.set(bucket, curT)
  }

  // build interest objects
  const tags: Interest[] = Array.from(tagCounts.entries()).map(([k, v]) => ({
    key: `tag:${k}`,
    label: k,
    type: 'tag',
    count: v.count,
    score: v.weight,
  }))

  const categories: Interest[] = Array.from(catCounts.entries()).map(
    ([k, v]) => ({
      key: `category:${k}`,
      label: k,
      type: 'category',
      count: v.count,
      score: v.weight,
    })
  )

  const times: Interest[] = Array.from(timeCounts.entries()).map(([k, v]) => ({
    key: `time:${k}`,
    label: k,
    type: 'time',
    count: v.count,
    score: v.weight,
  }))

  // sort each list by score descending
  tags.sort((a, b) => b.score - a.score)
  categories.sort((a, b) => b.score - a.score)
  times.sort((a, b) => b.score - a.score)

  // combined top interests (merge top N from each type)
  const combined = [
    ...tags.slice(0, 10),
    ...categories.slice(0, 10),
    ...times.slice(0, 4),
  ]
  combined.sort((a, b) => b.score - a.score)

  return { tags, categories, times, top: combined.slice(0, 10) }
}

/**
 * Build a separate JSON representation of all events happening.
 */
export function buildEventsJson(events: Event[]) {
  return (events || []).map(e => {
    const anyE = e as any
    return {
      id: anyE.id,
      title: anyE.title || anyE.name || '',
      startTime: anyE.startTime || anyE.start_ts || null,
      endTime: anyE.endTime || anyE.end_ts || null,
      categories: anyE.categories || [],
      tags: anyE.tags || [],
      rsvpCounts: anyE.rsvpCounts || null,
    }
  })
}

/**
 * Given a search string and user interests, return events the user
 * might be interested in.
 * - Matches search text against title
 * - Boosts matches that contain top interest phrases
 */
export function getRecommendedEvents(
  events: Event[],
  topInterests: Interest[],
  search: string
) {
  const normSearch = normalizeWord(search || '')
  if (!normSearch) return []

  const searchTokens = normSearch.split(/\s+/).filter(Boolean)
  if (!searchTokens.length) return []

  const topInterestLabels = topInterests.map(i => i.label.toLowerCase())

  const scored: { event: Event; score: number }[] = []

  for (const e of events || []) {
    const anyE = e as any
    const titleRaw = (anyE.title || anyE.name || '').toString()
    const titleNorm = normalizeWord(titleRaw)
    if (!titleNorm) continue

    let score = 0

    // Direct match with search terms in title
    for (const token of searchTokens) {
      if (titleNorm.includes(token)) {
        score += 2
      }
    }

    // Match user interests (from titles)
    for (const label of topInterestLabels) {
      if (label && titleNorm.includes(label)) {
        score += 3
      }
    }

    if (score > 0) {
      scored.push({ event: e, score })
    }
  }

  scored.sort((a, b) => b.score - a.score)

  return scored.map(s => s.event)
}

/**
 * Get suggestions for a specific time range based on user interests.
 * Returns events that overlap with the time range, scored by user interests.
 */
export function getSuggestionsForTimeRange(
  events: Event[],
  topInterests: Interest[],
  startISO: string,
  endISO: string,
  limit: number = 5
): Event[] {
  if (!startISO || !endISO) return []
  
  const rangeStart = Date.parse(startISO)
  const rangeEnd = Date.parse(endISO)
  
  if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd) || rangeEnd <= rangeStart) {
    return []
  }

  const topInterestLabels = topInterests.map(i => i.label.toLowerCase())
  const scored: { event: Event; score: number }[] = []

  for (const e of events || []) {
    const anyE = e as any
    const eventStart = Date.parse(anyE.startTime || anyE.start_ts || '')
    const eventEnd = Date.parse(anyE.endTime || anyE.end_ts || '')
    
    // Check if event overlaps with the time range
    if (!Number.isFinite(eventStart) || !Number.isFinite(eventEnd)) continue
    const overlap = Math.max(0, Math.min(rangeEnd, eventEnd) - Math.max(rangeStart, eventStart))
    if (overlap <= 0) continue

    // Score based on user interests
    const titleRaw = (anyE.title || anyE.name || '').toString()
    const titleNorm = normalizeWord(titleRaw)
    if (!titleNorm) continue

    let score = 0

    // Match user interests (from titles)
    for (const label of topInterestLabels) {
      if (label && titleNorm.includes(label)) {
        score += 3
      }
    }

    // Boost score based on popularity
    const pop = anyE.rsvpCounts
      ? Math.log1p((anyE.rsvpCounts.going || 0)) + 1
      : 1
    score += pop

    // Prefer events that fit better in the time range
    const eventDuration = eventEnd - eventStart
    const rangeDuration = rangeEnd - rangeStart
    if (eventDuration <= rangeDuration) {
      score += 2
    }

    scored.push({ event: e, score })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(s => s.event)
}

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
 * Hook to get suggestions for a specific time range
 * Uses allEvents.json for recommendations instead of context events
 */
export function useSuggestions(opts?: UseSuggestionsOptions) {
  const { events: override, startISO, endISO, limit = 5 } = opts || {}
  const ctx = useEvents()
  // Use allEvents.json for recommendations (same as events in "find" tab)
  const sourceEvents = (override ?? (allEventsData as Event[])) as Event[]
  
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
