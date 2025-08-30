import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { SnapSections } from '../components/SnapSections'
import { ScrollSections } from '../components/ScrollSections'
import { getAssetsByPage, type Asset } from '../lib/sanity'

export const Route = createFileRoute('/')({
  component: Landing,
})

function Landing() {
  const [homeAssets, setHomeAssets] = useState<Asset[]>([])
  const [globalAssets, setGlobalAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true)
        console.log('Fetching assets for home page...')
        
        // Fetch both home-specific and global assets
        const [homeData, globalData] = await Promise.all([
          getAssetsByPage('home'),
          getAssetsByPage('global')
        ])
        
        console.log('Home assets:', homeData)
        console.log('Global assets:', globalData)
        
        setHomeAssets(homeData)
        setGlobalAssets(globalData)
      } catch (err) {
        console.error('Error fetching home assets:', err)
        setError(`Failed to fetch assets: ${err instanceof Error ? err.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchAssets()
  }, [])

  return (
    <div className="bg-white relative min-h-screen">
      <div className="snap-y snap-mandatory h-screen overflow-y-auto">
        <SnapSections assets={homeAssets} globalAssets={globalAssets} loading={loading} error={error} />
      </div>
      <ScrollSections assets={homeAssets} globalAssets={globalAssets} loading={loading} error={error} />
    </div>
  )
}
