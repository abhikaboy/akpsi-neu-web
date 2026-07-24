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

  return (
    <div className="px-8 pb-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-['PP_Editorial_New'] text-[48px] text-black tracking-[-1.44px]">
            {className.toUpperCase()}
          </h2>
          <div className="flex-1 h-px bg-black ml-8"></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
          {members.map((member) => (
            <MemberCard key={member._id} member={member} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default ClassSection
