import { useMemo } from 'react'
import { useEvents } from '../contexts/EventsContext'
import type { Event } from '../types/event'

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
 * - counts tags and categories
 * - weights by popularity (rsvp going)
 * - computes time-of-day preferences
 */
export function analyzeEvents(events: Event[], startISO?: string, endISO?: string) {
  // optionally filter events to only those overlapping the provided window
  let source = events || []
  if (startISO && endISO) {
    const A0 = Date.parse(startISO), A1 = Date.parse(endISO)
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
    const pop = e.rsvpCounts ? Math.log1p((e.rsvpCounts.going || 0)) + 1 : 1

    // categories
    for (const c of e.categories || []) {
      const k = normalizeWord(c)
      if (!k) continue
      const cur = catCounts.get(k) || { count: 0, weight: 0 }
      cur.count += 1
      cur.weight += pop
      catCounts.set(k, cur)
    }

    // tags
      // extract tokens and multi-word phrases (1-3 grams) from the event title only
      const stopwords = new Set([
        'the','and','a','an','in','on','at','for','of','to','with','by','from','is','are','this','that','your','you','meet','session','night'
      ])
      const title = (e.title || '').toString()
      const rawTokens = normalizeWord(title).split(/\s+/).filter(Boolean)
      // prefer tokens that are not stopwords; fall back to rawTokens if filtered becomes empty
      const filtered = rawTokens.filter(t => !stopwords.has(t))
      const tokensForNgrams = filtered.length ? filtered : rawTokens

      // generate n-grams for n = 1..3
      const maxN = 3
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

  const categories: Interest[] = Array.from(catCounts.entries()).map(([k, v]) => ({
    key: `category:${k}`,
    label: k,
    type: 'category',
    count: v.count,
    score: v.weight,
  }))

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

  // produce combined top interests (merge top N from each type)
  const combined = [...tags.slice(0, 10), ...categories.slice(0, 10), ...times.slice(0, 4)]
  combined.sort((a, b) => b.score - a.score)

  return { tags, categories, times, top: combined.slice(0, 10) }
}

/**
 * React hook wrapper: use user's events from context (or a provided array)
 */
export function useUserInterests(opts?: { events?: Event[]; startISO?: string; endISO?: string }) {
  const { events: override, startISO, endISO } = opts || {}
  const ctx = useEvents()
  const sourceEvents = override ?? ctx.events

  const result = useMemo(() => analyzeEvents(sourceEvents || [], startISO, endISO), [sourceEvents, startISO, endISO])

  return {
    ...result,
    isLoading: ctx.isLoading,
    refresh: ctx.refreshEvents,
  }
}

export default useUserInterests
