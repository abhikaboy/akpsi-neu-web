import React from 'react'
import MemberCard from './MemberCard'
import { type Member, type Asset } from '../lib/sanity'

interface ClassSectionProps {
  className: string
  members: Member[]
  assets?: Asset[]
  globalAssets?: Asset[]
}

const ClassSection: React.FC<ClassSectionProps> = ({ className, members, assets, globalAssets }) => {
  if (members.length === 0) {
    return (
      <div className="px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-['PP_Editorial_New'] text-[48px] text-black tracking-[-1.44px]">
              {className.toUpperCase()}
            </h2>
            <div className="flex-1 h-px bg-black ml-8"></div>
          </div>
          <p className="font-['Avenir:Roman'] text-gray-500 text-center py-8">
            No {className} class members found.
          </p>
        </div>
      </div>
    )
  }

  // Split members into rows of 3 for alternating layout
  const memberRows: Member[][] = []
  for (let i = 0; i < members.length; i += 3) {
    memberRows.push(members.slice(i, i + 3))
  }

  return (
    <div className="px-8 pb-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-['PP_Editorial_New'] text-[48px] text-black tracking-[-1.44px]">
            {className.toUpperCase()}
          </h2>
          <div className="flex-1 h-px bg-black ml-8"></div>
        </div>
        
        {memberRows.map((row, rowIndex) => (
          <div 
            key={rowIndex} 
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${rowIndex > 0 ? 'mt-6' : ''}`}
          >
            {row.map((member, memberIndex) => {
              // Alternate image position for visual variety
              // Even rows: all left
              // Odd rows: all right
              const isEvenRow = rowIndex % 2 === 0
              const imagePosition = isEvenRow ? 'left' : 'right'

              return (
                <MemberCard
                  key={member._id}
                  member={member}
                  imagePosition={imagePosition as 'left' | 'right'}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ClassSection
