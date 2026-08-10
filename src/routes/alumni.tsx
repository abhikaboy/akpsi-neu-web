import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import Navigation from '../components/Navigation'
import ClassSection from '../components/ClassSection'
import LoadingScreen from '../components/LoadingScreen'
import { getMembers, type Member } from '../lib/sanity'
import { sortByClassOrder } from '../lib/pledgeClasses'

export const Route = createFileRoute('/alumni')({
  component: Alumni,
})

type MembersByClass = Record<string, Member[]>

function Alumni() {
  const [membersByClass, setMembersByClass] = useState<MembersByClass>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAlumni = async () => {
      try {
        setLoading(true)
        const allMembers = await getMembers()

        const groupedMembers = allMembers
          .filter((member) => member.isAlumni)
          .reduce<MembersByClass>((acc, member) => {
            const className = member.pledgeClass || 'Unknown'
            if (!acc[className]) {
              acc[className] = []
            }
            acc[className].push(member)
            return acc
          }, {})

        setMembersByClass(groupedMembers)
      } catch (err) {
        setError(`Failed to fetch data: ${err instanceof Error ? err.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchAlumni()
  }, [])

  if (loading) {
    return <LoadingScreen currentPage="Alumni" cards={8} />
  }

  if (error) {
    return (
      <div className="bg-white relative min-h-screen">
        <Navigation currentPage="Alumni" />
        <div className="pt-20 sm:pt-24 px-8 py-16 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="font-['Avenir:Roman'] text-red-600 text-[16px]">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white relative min-h-screen">
      <Navigation currentPage="Alumni" />

      {/* Hero Section */}
      <div className="pt-20 sm:pt-24 px-8 py-16 min-h-screen snap-start flex items-center justify-center">
        <div className="max-w-7xl mx-auto text-center flex flex-col items-center justify-center">
          <h1 className="font-['PP_Editorial_New'] leading-none text-black text-[64px] mb-4 tracking-[-1.92px]">
            <span className="font-['PP_Editorial_New']">Our alumni are</span>
            <br />
            <span className="font-['PP_Editorial_New:Ultralight_Italic'] underline">everywhere</span>
            <span className="font-['PP_Editorial_New']">.</span>
          </h1>
          <p className="font-['Avenir:Roman'] text-black text-[16px] tracking-[-0.48px]">
            Meet the brothers who came before us.
          </p>
        </div>
      </div>

      {/* Render all alumni class sections dynamically */}
      {Object.entries(membersByClass)
        .sort(sortByClassOrder)
        .map(([className, members]) => (
          <ClassSection key={className} className={className} members={members} />
        ))}
    </div>
  )
}

export default Alumni
