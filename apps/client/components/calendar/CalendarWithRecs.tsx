import { useState } from 'react'
import RecommendationRail from '../recommendations/RecommendationRail'
import type { DbEvent } from '../../hooks/useRecommendations'
import { useRecommendations } from '../../hooks/useRecommendations'

// Minimal calendar demo that lets you pick a start/end ISO and shows recommendations
export default function CalendarWithRecs({ eventsJson }: { eventsJson: DbEvent[] }) {
  const [selStartISO, setSelStartISO] = useState<string>()
  const [selEndISO, setSelEndISO] = useState<string>()

  const { suggestions } = useRecommendations({ aStartISO: selStartISO, aEndISO: selEndISO, events: eventsJson, k: 8 })

  const setNowPlus = (mins: number) => {
    const now = new Date()
    const start = now
    const end = new Date(now.getTime() + mins * 60 * 1000)
    setSelStartISO(start.toISOString())
    setSelEndISO(end.toISOString())
  }

  // Find a free slot in eventsJson of at least `minMinutes` starting from `from`.
  const findFreeSlot = (minMinutes = 60, from = new Date()) => {
    // Build an array of intervals from eventsJson
    const intervals = (eventsJson || [])
      .map(e => {
        const s = new Date(e.start_ts || e.startTime)
        const t = new Date(e.end_ts || e.endTime)
        return { start: s, end: t }
      })
      .filter(i => i.start instanceof Date && !isNaN(i.start.getTime()) && i.end instanceof Date && !isNaN(i.end.getTime()))
      .sort((a, b) => a.start.getTime() - b.start.getTime())

    // merge overlapping intervals
    const merged = [] as { start: Date; end: Date }[]
    for (const it of intervals) {
      if (!merged.length) { merged.push({ ...it }); continue }
      const last = merged[merged.length - 1]
      if (it.start <= last.end) {
        // overlap
        if (it.end > last.end) last.end = it.end
      } else {
        merged.push({ ...it })
      }
    }

    const minMs = minMinutes * 60 * 1000
    // consider gap before first event
    if (!merged.length) {
      const s = new Date(from)
      const e = new Date(s.getTime() + minMs)
      return { startISO: s.toISOString(), endISO: e.toISOString() }
    }

    // search between `from` and merged intervals
    let cursor = new Date(from)
    for (const it of merged) {
      // if event ends before cursor, skip
      if (it.end.getTime() <= cursor.getTime()) continue
      // if there's a gap between cursor and next event start
      if (it.start.getTime() - cursor.getTime() >= minMs) {
        const s = new Date(cursor)
        const e = new Date(s.getTime() + minMs)
        return { startISO: s.toISOString(), endISO: e.toISOString() }
      }
      // move cursor forward to the end of this event
      cursor = new Date(Math.max(cursor.getTime(), it.end.getTime()))
    }

    // no gap found between events; schedule after last event
    const last = merged[merged.length - 1]
    const s = new Date(Math.max(last.end.getTime(), from.getTime()))
    const e = new Date(s.getTime() + minMs)
    return { startISO: s.toISOString(), endISO: e.toISOString() }
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', height:'100vh' }}>
      <div style={{ padding:20 }}>
        <h3>Calendar demo</h3>
        <p>Use the controls to set a selected range for recommendations.</p>

        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <label style={{ fontSize:12, alignSelf:'center' }}>Start</label>
          <input
            type="datetime-local"
            value={selStartISO ? selStartISO.slice(0,16) : ''}
            onChange={(e) => {
              const v = e.target.value
              setSelStartISO(v ? new Date(v).toISOString() : undefined)
            }}
          />

          <label style={{ fontSize:12, alignSelf:'center' }}>End</label>
          <input
            type="datetime-local"
            value={selEndISO ? selEndISO.slice(0,16) : ''}
            onChange={(e) => {
              const v = e.target.value
              setSelEndISO(v ? new Date(v).toISOString() : undefined)
            }}
          />
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          <button onClick={() => setNowPlus(60)}>Next 1 hour</button>
          <button onClick={() => setNowPlus(120)}>Next 2 hours</button>
          <button onClick={() => setNowPlus(24*60)}>Next 24 hours</button>
          <button onClick={() => {
            const slot = findFreeSlot(60, new Date())
            if (slot) {
              setSelStartISO(slot.startISO)
              setSelEndISO(slot.endISO)
            }
          }}>Find Free Slot (60m)</button>
          <button onClick={() => {
            const slot = findFreeSlot(30, new Date())
            if (slot) {
              setSelStartISO(slot.startISO)
              setSelEndISO(slot.endISO)
            }
          }}>Find Free Slot (30m)</button>
        </div>

        <div>
          <h4>Suggestions ({suggestions.length})</h4>
          {(!selStartISO || !selEndISO) && <div style={{ opacity:0.7 }}>Select a range to see suggestions.</div>}
          {suggestions.map(s => (
            <div key={s.id} style={{ border:'1px solid #eee', borderRadius:8, padding:10, marginBottom:8 }}>
              <div style={{ fontWeight:600 }}>{s.name}</div>
              <div style={{ fontSize:12, opacity:0.8 }}>{new Date(s.start_ts).toLocaleString()} – {new Date(s.end_ts).toLocaleString()}</div>
              <div style={{ marginTop:6 }}>{(s.tags||[]).join(', ')}</div>
            </div>
          ))}
        </div>
      </div>

      <RecommendationRail
        events={eventsJson}
        aStartISO={selStartISO}
        aEndISO={selEndISO}
        initialChips={['Career','Food','Fun','Afternoon','Events']}
        defaultActiveChips={[]}
        defaultK={5}
        onPick={(ev) => console.log('Picked', ev)}
      />
    </div>
  )
}
