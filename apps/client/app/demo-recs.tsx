import React from 'react'
import CalendarWithRecs from '@/components/calendar/CalendarWithRecs'
import currentWeekEvents from '@/data/currentWeekEvents.json'
import useUserInterests from '@/hooks/useRecommendations'

const eventsJson = (currentWeekEvents as any[]).map(e => ({
  id: e.id,
  title: e.title,
  startTime: e.startTime,
  endTime: e.endTime,
  categories: e.categories || [],
  tags: e.tags || e.categories || [],
  rsvpCounts: e.rsvpCounts || null,
}))

function InterestsPanel({ events }: { events: any[] }) {
  const [search, setSearch] = React.useState('')
  const {
    topInterests,
    interests,
    allEventsJson,
    recommendedEvents,
    isLoading,
  } = useUserInterests({ events, search })

  return (
    <aside
      style={{
        width: 360,
        borderLeft: '1px solid #eee',
        padding: 16,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 16 }}>Your Interests</div>
      {isLoading && <div style={{ opacity: 0.7 }}>Loading...</div>}

      {/* Top interests from titles */}
      <section>
        <div
          style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}
        >
          Top interests (from event titles)
        </div>
        {topInterests.length === 0 && (
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            No interests detected yet.
          </div>
        )}
        {topInterests.map(i => (
          <div
            key={i.key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '4px 0',
              fontSize: 13,
            }}
          >
            <span>{i.label}</span>
            <span style={{ color: '#6b7280' }}>×{i.count}</span>
          </div>
        ))}
      </section>

      {/* Search: recommended events based on interests */}
      <section>
        <div
          style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}
        >
          Search events you might like
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by keyword..."
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: 13,
            borderRadius: 4,
            border: '1px solid #d1d5db',
            marginBottom: 8,
          }}
        />
        {search && (
          <div
            style={{
              fontSize: 12,
              color: '#6b7280',
              marginBottom: 6,
            }}
          >
            Showing events related to <strong>{search}</strong>
          </div>
        )}
        <div
          style={{
            maxHeight: 180,
            overflowY: 'auto',
            border: '1px solid #f3f4f6',
            borderRadius: 4,
            padding: 8,
          }}
        >
          {search && recommendedEvents.length === 0 && (
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              No matching events.
            </div>
          )}
          {!search && (
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              Type to search events using your interests.
            </div>
          )}
          {recommendedEvents.map((e: any) => (
            <div
              key={e.id}
              style={{
                padding: '4px 0',
                borderBottom: '1px solid #f3f4f6',
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 500 }}>{e.title}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>
                {e.startTime} → {e.endTime}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* All events JSON (separate JSON of everything happening) */}
      <section>
        <div
          style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}
        >
          All events (JSON)
        </div>
        <div
          style={{
            maxHeight: 200,
            overflowY: 'auto',
            border: '1px solid #f3f4f6',
            borderRadius: 4,
            padding: 8,
            fontSize: 11,
            fontFamily: 'monospace',
            whiteSpace: 'pre',
          }}
        >
          {JSON.stringify(allEventsJson, null, 2)}
        </div>
      </section>
    </aside>
  )
}

export default function DemoRecsRoute() {
  return (
    <div
      style={{
        height: '100vh',
        backgroundColor: '#ffffff',
        color: '#000',
        display: 'grid',
        gridTemplateColumns: '1fr 360px',
      }}
    >
      <div>
        <CalendarWithRecs eventsJson={eventsJson} />
      </div>
      <InterestsPanel events={eventsJson} />
    </div>
  )
}
