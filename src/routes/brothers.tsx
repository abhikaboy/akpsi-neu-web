import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import Navigation from '../components/Navigation'
import ClassSection from '../components/ClassSection'
import { getMembers, getAssetsByPage, type Member, type Asset } from '../lib/sanity'

export const Route = createFileRoute('/brothers')({
  component: Brothers,
})

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
    return (
      <div className="bg-white relative min-h-screen">
        <Navigation currentPage="Members" />
        <div className="pt-20 sm:pt-24 px-8 py-16 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d2f56] mx-auto mb-4"></div>
            <p className="font-['Avenir:Roman'] text-black text-[16px]">Loading members...</p>
          </div>
        </div>
      </div>
    )
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
          // Greek alphabet order (Alpha = 1, Beta = 2, ..., Omega = 24)
          const greekOrder: Record<string, number> = {
            'Alpha': 1, 'Beta': 2, 'Gamma': 3, 'Delta': 4, 'Epsilon': 5, 'Zeta': 6,
            'Eta': 7, 'Theta': 8, 'Iota': 9, 'Kappa': 10, 'Lambda': 11, 'Mu': 12,
            'Nu': 13, 'Xi': 14, 'Omicron': 15, 'Pi': 16, 'Rho': 17, 'Sigma': 18,
            'Tau': 19, 'Upsilon': 20, 'Phi': 21, 'Chi': 22, 'Psi': 23, 'Omega': 24
          }
          
          const orderA = greekOrder[a] || 0  // Unknown classes go to the end
          const orderB = greekOrder[b] || 0
          
          // Sort in descending order (latest class first)
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
