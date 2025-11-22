// apps/client/components/recommendations/RecommendationRail.tsx
import { useMemo, useState } from 'react'
import type { DbEvent, Suggestion } from '../../hooks/useRecommendations'
import { useRecommendations } from '../../hooks/useRecommendations'
import useUserInterests from '../../hooks/useUserInterests'

export type RecommendationRailProps = {
  events: DbEvent[]              // your JSON input
  aStartISO?: string             // selected start (ISO)
  aEndISO?: string               // selected end (ISO)
  initialChips?: string[]
  defaultActiveChips?: string[]
  defaultK?: number
  onPick?: (event: Suggestion) => void
  style?: React.CSSProperties
}

export default function RecommendationRail({
  events,
  aStartISO,
  aEndISO,
  initialChips = ['Career','Food','Fun','Afternoon','Events'],
  defaultActiveChips = [],
  defaultK = 5,
  onPick,
  style
}: RecommendationRailProps) {
  const [activeChips, setActiveChips] = useState<string[]>(defaultActiveChips)
  const [search, setSearch] = useState('')
  const [k, setK] = useState(defaultK)
  const interests = useUserInterests({ events, startISO: aStartISO, endISO: aEndISO })
  const queryTerms = useMemo(() => {
    const sTerms = search.split(/\s+/).map(s => s.trim()).filter(Boolean)
    // if user hasn't entered chips or search terms, auto-populate with top tags from interests for the selected window
    if (!sTerms.length && activeChips.length === 0 && aStartISO && aEndISO) {
      const auto = (interests?.tags || []).slice(0, 5).map(t => t.label)
      return [...activeChips, ...sTerms, ...auto]
    }
    return [...activeChips, ...sTerms]
  }, [activeChips, search, interests, aStartISO, aEndISO])

  const { suggestions } = useRecommendations({ aStartISO, aEndISO, queryTerms, k, events })

  // suggestions are provided by useRecommendations

  const toggleChip = (label: string) => {
    setActiveChips(prev =>
      prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]
    )
  }

  return (
    <aside style={{ borderLeft:'1px solid #eee', width: 360, padding: 16, overflowY:'auto', ...style }}>
      <div style={{ fontWeight:600, marginBottom:10 }}>Suggestions</div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
        {initialChips.map(label => (
          <button
            key={label}
            onClick={() => toggleChip(label)}
            style={{
              padding:'6px 12px', borderRadius:999,
              border: `1px solid ${activeChips.includes(label) ? '#333' : '#ddd'}`,
              background: activeChips.includes(label) ? '#f4f4f4' : '#fff',
              fontWeight:500, cursor:'pointer'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
        <input
          placeholder="Search (e.g., movie, volleyball)"
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
          style={{ flex:1, padding:'8px 12px', border:'1px solid #ddd', borderRadius:999 }}
        />
        <label style={{ fontSize:12, opacity:0.7 }}>k</label>
        <input
          type="number" min={1} max={20}
          value={k}
          onChange={(e)=>setK(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
          style={{ width:70, padding:'6px 8px', border:'1px solid #ddd', borderRadius:8 }}
        />
      </div>

      {(!aStartISO || !aEndISO) && <div style={{ opacity:0.7 }}>Drag-select a time range on your calendar.</div>}
      {aStartISO && aEndISO && suggestions.length === 0 && <div style={{ opacity:0.7 }}>No matches. Try different tags or a wider window.</div>}

      {suggestions.map(s => (
        <div
          key={s.id}
          onClick={() => onPick?.(s)}
          style={{ border:'1px solid #eee', borderRadius:12, padding:12, marginBottom:10, cursor: onPick ? 'pointer' : 'default' }}
        >
          <div style={{ fontWeight:600 }}>{s.name}</div>
          <div style={{ fontSize:13, opacity:0.8 }}>
            {new Date(s.start_ts).toLocaleString()} – {new Date(s.end_ts).toLocaleString()}
          </div>
          <div style={{ marginTop:6, display:'flex', gap:6, flexWrap:'wrap' }}>
            {(s.tags||[]).map(t => (
              <span key={t} style={{ fontSize:12, padding:'4px 8px', border:'1px solid #eee', borderRadius:999 }}>{t}</span>
            ))}
          </div>
          <div style={{ fontSize:12, opacity:0.7, marginTop:6 }}>
            Attendees: {(s.attendees||[]).length}
          </div>
        </div>
      ))}
    </aside>
  )
}
