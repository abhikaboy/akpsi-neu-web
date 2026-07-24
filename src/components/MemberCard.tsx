import React from 'react'
import { urlFor, type Member } from '../lib/sanity'

interface MemberCardProps {
  member: Member
}

// Portrait-forward card: large image is the focus, details sit beneath.
const MemberCard: React.FC<MemberCardProps> = ({ member }) => {
  const { name, picture, major, graduationYear, email, linkedin } = member
  const pictureUrl = picture ? urlFor(picture).width(600).height(800).url() : ''

  return (
    <div className="group flex flex-col">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-gray-200">
        {pictureUrl ? (
          <img
            src={pictureUrl}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : null}
      </div>

      <div className="mt-4 flex flex-col">
        <h3 className="font-['PP_Editorial_New'] text-xl tracking-tight text-black">
          {name}
        </h3>
        <p className="font-['Avenir:Roman'] text-sm text-gray-600 mt-1">
          Class of {graduationYear}
        </p>
        <p className="font-['Avenir:Roman'] text-sm text-gray-600">
          {major}
        </p>

        <div className="flex gap-2 mt-3">
          <a
            href={`mailto:${email}`}
            className="flex items-center justify-center w-9 h-9 border border-gray-200 rounded-full text-gray-700 hover:bg-black hover:text-white hover:border-black transition-colors"
            title="Send email"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zM3 18.5V7c1.1-.35 2.3-.5 3.5-.5 1.34 0 3.13.41 4.5.99v11.5C9.63 18.41 7.84 18 6.5 18c-1.2 0-2.4.15-3.5.5z"/>
            </svg>
          </a>
          <a
            href={linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-9 h-9 border border-gray-200 rounded-full text-gray-700 hover:bg-black hover:text-white hover:border-black transition-colors"
            title="View LinkedIn"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}

export default MemberCard
