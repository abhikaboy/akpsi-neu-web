import React from 'react'
import { type RushEvent } from '../lib/sanity'

interface RushEventCardProps {
  event: RushEvent
}

const RushEventCard: React.FC<RushEventCardProps> = ({ event }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const truncateEventName = (name: string, maxLength: number = 50) => {
    if (name.length <= maxLength) return name
    return name.substring(0, maxLength).trim() + '...'
  }

  const formatDressCode = (dresscode: string) => {
    const dressCodeMap: Record<string, string> = {
      'casual': 'CASUAL ATTIRE',
      'business_casual': 'BUSINESS CASUAL',
      'business_professional': 'BUSINESS PROFESSIONAL',
      'formal': 'FORMAL ATTIRE',
      'semi_formal': 'SEMI-FORMAL',
      'theme': 'THEME/COSTUME',
      'athletic': 'ATHLETIC WEAR'
    }
    return dressCodeMap[dresscode] || dresscode.toUpperCase()
  }

  return (
    <div className="bg-white box-border flex flex-col gap-4 p-4 rounded shadow-[0px_1px_4px_0px_rgba(0,0,0,0.15)] w-full">
      <div className="flex items-center justify-between font-['Avenir:Roman'] text-base text-black tracking-[-0.32px] leading-none">
        <div className="flex-1 min-w-0 pr-4">
          <p className="leading-none truncate" style={{ maxWidth: '120%' }}>{truncateEventName(event.name)}</p>
        </div>
        <div className="shrink-0">
          <p className="leading-none whitespace-nowrap">{formatDate(event.date)}</p>
        </div>
      </div>
      <div className="flex items-start justify-between font-['Avenir:Roman'] text-[13px] text-[#8c8c8c] tracking-[-0.26px] leading-none">
        <div className="shrink-0">
          <p className="leading-none whitespace-nowrap">{formatDressCode(event.dresscode)}</p>
        </div>
        <div className="shrink-0">
          <p className="leading-none whitespace-nowrap">{event.room} • {formatTime(event.date)}</p>
        </div>
      </div>
    </div>
  )
}

export default RushEventCard
