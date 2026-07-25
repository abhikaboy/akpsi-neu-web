import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import Navigation from '../components/Navigation'
import ClassSection from '../components/ClassSection'
import LoadingScreen from '../components/LoadingScreen'
import { getMembers, getAssetsByPage, type Member, type Asset } from '../lib/sanity'

export const Route = createFileRoute('/brothers')({
  component: Brothers,
})

// Class order mirrors the Sanity schema: Greek alphabet, then doubles after
// Omega (Alpha Alpha, ...). Keep in sync with sanity/schemaTypes/memberType.ts.
const GREEK = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
  'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho',
  'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega',
]
const PLEDGE_CLASS_ORDER: Record<string, number> = Object.fromEntries(
  [...GREEK, ...GREEK.map((l) => `Alpha ${l}`)].map((c, i) => [c, i + 1]),
)

// Type for our members dictionary
type MembersByClass = Record<string, Member[]>

function Brothers() {
  const [membersByClass, setMembersByClass] = useState<MembersByClass>({})
  const [membersAssets, setMembersAssets] = useState<Asset[]>([])
  const [globalAssets, setGlobalAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMembersData = async () => {
      try {
        setLoading(true)
        console.log('Starting to fetch members and assets...')
        
        // Fetch members, members assets, and global assets in parallel
        const [allMembers, membersData, globalData] = await Promise.all([
          getMembers(),
          getAssetsByPage('members'),
          getAssetsByPage('global')
        ])
        
        console.log('All members fetched:', allMembers)
        console.log('Members assets fetched:', membersData)
        console.log('Global assets fetched:', globalData)
        
        // Group members by class using reduce
        const groupedMembers = allMembers.reduce<MembersByClass>((acc, member) => {
          const className = member.pledgeClass || 'Unknown'
          if (!acc[className]) {
            acc[className] = []
          }
          acc[className].push(member)
          return acc
        }, {})
        
        console.log('Members grouped by class:', groupedMembers)
        setMembersByClass(groupedMembers)
        setMembersAssets(membersData)
        setGlobalAssets(globalData)
      } catch (err) {
        setError(`Failed to fetch data: ${err instanceof Error ? err.message : 'Unknown error'}`)
        console.error('Error fetching members data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchMembersData()
  }, [])

  if (loading) {
    return <LoadingScreen currentPage="Members" cards={8} />
  }

  if (error) {
    return (
      <div className="bg-white relative min-h-screen">
        <Navigation currentPage="Members" />
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
      <Navigation currentPage="Members" />

      {/* Hero Section */}
      <div className="pt-20 sm:pt-24 px-8 py-16 min-h-screen snap-start flex items-center justify-center">
        <div className="max-w-7xl mx-auto text-center flex flex-col items-center justify-center">
          <h1 className="font-['PP_Editorial_New'] leading-none text-black text-[64px] mb-4 tracking-[-1.92px]">
            <span className="font-['PP_Editorial_New']">Our brothers are</span>
            <br />
            <span className="font-['PP_Editorial_New:Ultralight_Italic'] underline">leaders</span>
            <span className="font-['PP_Editorial_New']"> in their fields.</span>
          </h1>
          <p className="font-['Avenir:Roman'] text-black text-[16px] tracking-[-0.48px]">
            Let's meet the current roster.
          </p>
        </div>
      </div>

      {/* Render all class sections dynamically */}
      {Object.entries(membersByClass)
        .sort(([a], [b]) => {
          // Unknown classes (order 0) go to the end; latest class first.
          const orderA = PLEDGE_CLASS_ORDER[a] || 0
          const orderB = PLEDGE_CLASS_ORDER[b] || 0
          return orderB - orderA
        })
        .map(([className, members]) => (
          <ClassSection
            key={className}
            className={className}
            members={members}
            assets={membersAssets}
            globalAssets={globalAssets}
          />
        ))}
    </div>
  )
}
