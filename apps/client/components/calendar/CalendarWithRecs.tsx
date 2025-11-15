import { useState } from 'react'
import RecommendationRail from '../recommendations/RecommendationRail'
import type { DbEvent } from '../../hooks/useRecommendations'

// import YourCalendar from './YourCalendar' // your existing calendar component

export default function CalendarWithRecs({ eventsJson }: { eventsJson: DbEvent[] }) {
  const [selStartISO, setSelStartISO] = useState<string>()
  const [selEndISO, setSelEndISO] = useState<string>()

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', height:'100vh' }}>
      <div>
        {/* Replace with your real calendar component */}
        {/* <YourCalendar
             onSelectRange={({ start, end }) => {
               setSelStartISO(start.toISOString())
               setSelEndISO(end.toISOString())
             }}
           /> */}
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
