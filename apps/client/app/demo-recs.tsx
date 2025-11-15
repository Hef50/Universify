import React from 'react'
import CalendarWithRecs from '@/components/calendar/CalendarWithRecs'
import currentWeekEvents from '@/data/currentWeekEvents.json'

const eventsJson = (currentWeekEvents as any[]).map(e => ({
  id: e.id,
  name: e.title,
  start_ts: e.startTime,
  end_ts: e.endTime,
  tags: e.tags || e.categories || [],
  attendees: (e.attendees || []).map((a: any) => a.userId || a) || [],
}))

export default function DemoRecsRoute() {
  return (
    <div style={{ height: '100vh', backgroundColor: '#ffffff', color: '#000' }}>
      <CalendarWithRecs eventsJson={eventsJson} />
    </div>
  )
}
