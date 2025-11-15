// apps/client/hooks/useRecommendations.ts
export type DbEvent = {
  id: string
  name: string
  start_ts: string  // ISO
  end_ts: string    // ISO
  tags: string[]
  attendees?: string[] | null
}
export type Suggestion = DbEvent

const SYNONYMS: Record<string, string[]> = {
  movie: ['film', 'cinema', 'movies', 'movie night'],
  movies: ['movie', 'film', 'cinema', 'movie night'],
  volleyball: ['volley'],
  'board game': ['boardgame', 'tabletop'],
  boardgame: ['board game', 'tabletop'],
  poker: ['cards', 'poker night'],
}

function normalizeWord(w: string) {
  let s = w.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim()
  if (s.endsWith('s') && s.length > 3) s = s.slice(0, -1)
  return s
}
function expandTerms(terms: string[]) {
  const out = new Set<string>()
  for (const t of terms) {
    const n = normalizeWord(t)
    if (!n) continue
    out.add(n)
    if (SYNONYMS[n]) for (const syn of SYNONYMS[n]) out.add(normalizeWord(syn))
  }
  return [...out]
}
function tokenizeText(text: string) {
  return normalizeWord(text).split(/\s+/).filter(Boolean)
}
function tokenJaccard(aTokens: string[], bTokens: string[]) {
  const a = new Set(aTokens), b = new Set(bTokens)
  let inter = 0; for (const x of a) if (b.has(x)) inter++
  const uni = new Set([...a, ...b]).size
  return uni ? inter / uni : 0
}
function substringHit(aTokens: string[], bTokens: string[]) {
  for (const q of aTokens) for (const e of bTokens) {
    if (q.length >= 3 && (e.includes(q) || q.includes(e))) return 1
  }
  return 0
}
function timeOverlapFrac(aStart: number, aEnd: number, eStart: number, eEnd: number) {
  const overlap = Math.max(0, Math.min(aEnd, eEnd) - Math.max(aStart, eStart))
  const eventSpan = Math.max(1, eEnd - eStart)
  return Math.max(0, Math.min(1, overlap / eventSpan))
}

export type RecommendArgs = {
  events: DbEvent[]
  aStartISO: string
  aEndISO: string
  queryTerms?: string[]
  k?: number
  minEventOverlap?: number
}

export function recommend({
  events,
  aStartISO,
  aEndISO,
  queryTerms = [],
  k = 5,
  minEventOverlap = 0.2,
}: RecommendArgs): Suggestion[] {
  const A0 = Date.parse(aStartISO), A1 = Date.parse(aEndISO)
  if (!(A1 > A0) || !Number.isFinite(A0) || !Number.isFinite(A1)) return []

  const qExpanded = expandTerms(queryTerms)
  const qTokens = qExpanded.flatMap(tokenizeText)

  const candidates = events.map(r => {
    const s = Date.parse(r.start_ts), e = Date.parse(r.end_ts)
    return { row: r, overlapFrac: timeOverlapFrac(A0, A1, s, e) }
  }).filter(x => x.overlapFrac > minEventOverlap)

  if (candidates.length === 0) return []

  const scored = candidates.map(({ row, overlapFrac }) => {
    const text = `${row.name} ${(row.tags || []).join(' ')}`
    const eTokens = tokenizeText(text)
    const j = tokenJaccard(qTokens, eTokens)
    const sub = substringHit(qTokens, eTokens) ? 0.15 : 0
    const pop = Math.log1p((row.attendees || []).length)
    const textScore = Math.min(1, j + sub)
    const score = 0.55 * textScore + 0.30 * overlapFrac + 0.15 * pop
    return { row, score }
  }).sort((a, b) => b.score - a.score)

  const pool = scored.slice(0, 30)
  const out: Suggestion[] = []
  const λ = 0.7
  while (pool.length && out.length < k) {
    let bi = 0, bv = -1e9
    for (let i = 0; i < pool.length; i++) {
      const e = pool[i]
      const sim = out.length ? Math.max(...out.map(x => {
        const A = new Set((e.row.tags || []).map(t => normalizeWord(t)))
        const B = new Set((x.tags || []).map(t => normalizeWord(t)))
        let inter = 0; for (const t of A) if (B.has(t)) inter++
        const uni = new Set([...A, ...B]).size
        return uni ? inter / uni : 0
      })) : 0
      const val = λ * e.score - (1 - λ) * sim
      if (val > bv) { bv = val; bi = i }
    }
    out.push(pool.splice(bi, 1)[0].row)
  }
  return out
}

// React hook wrapper that integrates with the app's EventsContext
import { useMemo } from 'react'
import { useEvents } from '../contexts/EventsContext'
import type { Event as AppEvent } from '../types/event'

export function useRecommendations(opts: {
  aStartISO?: string
  aEndISO?: string
  queryTerms?: string[]
  k?: number
  minEventOverlap?: number
  events?: AppEvent[]
} = {}) {
  const { aStartISO, aEndISO, queryTerms = [], k = 5, minEventOverlap = 0.2, events: overrideEvents } = opts
  const ctx = useEvents()
  const { events: ctxEvents, isLoading, refreshEvents } = ctx

  const sourceEvents = overrideEvents ?? ctxEvents

  const mapped = useMemo<DbEvent[]>(() => {
    // sourceEvents may already be in DbEvent shape (e.g., when components pass eventsJson)
    return sourceEvents.map((e: any) => {
      if (e && (e.start_ts || e.name)) {
        // assume already DbEvent-like
        return {
          id: e.id,
          name: e.name || e.title || '',
          start_ts: e.start_ts || e.startTime || '',
          end_ts: e.end_ts || e.endTime || '',
          tags: e.tags || e.categories || [],
          attendees: e.attendees || [],
        } as DbEvent
      }
      // map from app Event shape
      return {
        id: e.id,
        name: e.title,
        start_ts: e.startTime,
        end_ts: e.endTime,
        tags: e.tags || e.categories || [],
        attendees: (e.attendees || []).map((a: any) => a.userId),
      } as DbEvent
    })
  }, [sourceEvents])

  const suggestions = useMemo(() => {
    if (!aStartISO || !aEndISO) return []
    try {
      return recommend({ events: mapped, aStartISO, aEndISO, queryTerms, k, minEventOverlap })
    } catch (err) {
      console.error('recommend failed', err)
      return []
    }
  }, [mapped, aStartISO, aEndISO, JSON.stringify(queryTerms), k, minEventOverlap])

  return { suggestions, isLoading, refresh: refreshEvents }
}
