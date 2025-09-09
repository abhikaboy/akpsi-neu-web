import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

export const client = createClient({
  projectId: 'nqx8unn9',
  dataset: 'production',
  useCdn: true, // Use CDN for better performance and CORS support
  apiVersion: '2025-08-30',
  // Ensure we're using published content only
  perspective: 'published',
  // Disable stega for production
  stega: false,
})

// Get a pre-configured url-builder from your sanity client
const builder = imageUrlBuilder(client)

// Then we like to make a simple function like this that gives the
// builder an image and returns the builder for you to specify additional
// parameters:
export function urlFor(source: any) {
  return builder.image(source)
}

// Types for our data
export interface Member {
  _id: string
  name: string
  picture?: {
    _type: 'image'
    asset: {
      _ref: string
      _type: 'reference'
    }
  }
  major: string
  pledgeClass: string
  graduationYear: number
  email: string
  linkedin: string
}

export interface RushEvent {
  _id: string
  name: string
  date: string
  room: string
  dresscode: 'casual' | 'business_casual' | 'business_professional' | 'formal' | 'semi_formal' | 'theme' | 'athletic'
  description?: string
  isActive: boolean
}

export interface Asset {
  _id: string
  picture?: {
    _type: 'file'
    asset: {
      _ref: string
      _type: 'reference'
    }
  }
  asset_type: 'image' | 'video' | 'audio' | 'pdf' | 'presentation' | 'spreadsheet' | 'link' | 'social' | 'other'
  page: 'home' | 'about' | 'members' | 'alumni' | 'rush' | 'consulting' | 'events' | 'global'
  title: string
  description?: string
  isActive: boolean
  order?: number
}

export interface Copy {
  _id: string
  page: 'home' | 'about' | 'members' | 'alumni' | 'rush' | 'consulting' | 'events' | 'global'
  title: string
  content: string
  contentType: 'heading' | 'subheading' | 'body' | 'quote' | 'caption' | 'button' | 'meta' | 'other'
  section?: string
  isActive: boolean
  order?: number
  notes?: string
}

// Test Sanity connection
export async function testSanityConnection() {
  try {
    console.log('Testing Sanity connection...')
    const result = await client.fetch('*[0..2]') // Get first 3 documents of any type
    console.log('Sanity connection test result:', result)
    return result
  } catch (error) {
    console.error('Sanity connection test failed:', error)
    throw error
  }
}

// Query functions
export async function getMembers(): Promise<Member[]> {
  try {
    console.log('Fetching all members...')
    const result = await client.fetch('*[_type == "member"] | order(name asc)')
    console.log('Fetched members:', result)
    return result
  } catch (error) {
    console.error('Error fetching members:', error)
    throw error
  }
}

export async function getMembersByPledgeClass(pledgeClass: string): Promise<Member[]> {
  try {
    console.log(`Fetching members for pledge class: ${pledgeClass}`)
    const query = '*[_type == "member" && pledgeClass == $pledgeClass] | order(name asc)'
    const params = { pledgeClass }
    console.log('Query:', query, 'Params:', params)
    
    const result = await client.fetch(query, params)
    console.log(`Fetched ${result.length} members for pledge class ${pledgeClass}:`, result)
    return result
  } catch (error) {
    console.error(`Error fetching members for pledge class ${pledgeClass}:`, error)
    throw error
  }
}

export async function getMembersByGraduationYear(year: number): Promise<Member[]> {
  try {
    console.log(`Fetching members for graduation year: ${year}`)
    const query = '*[_type == "member" && graduationYear == $year] | order(name asc)'
    const params = { year }
    console.log('Query:', query, 'Params:', params)
    
    const result = await client.fetch(query, params)
    console.log(`Fetched ${result.length} members for graduation year ${year}:`, result)
    return result
  } catch (error) {
    console.error(`Error fetching members for graduation year ${year}:`, error)
    throw error
  }
}

// Rush Event query functions
export async function getRushEvents(): Promise<RushEvent[]> {
  try {
    console.log('Fetching all rush events...')
    const result = await client.fetch('*[_type == "rushEvent" && isActive == true] | order(date asc)')
    console.log('Fetched rush events:', result)
    return result
  } catch (error) {
    console.error('Error fetching rush events:', error)
    throw error
  }
}

export async function getUpcomingRushEvents(): Promise<RushEvent[]> {
  try {
    console.log('Fetching upcoming rush events...')
    const now = new Date().toISOString()
    console.log('Current time for filtering:', now)
    const result = await client.fetch(
      '*[_type == "rushEvent" && isActive == true && date >= $now] | order(date asc)',
      { now }
    )
    console.log('Fetched upcoming rush events (raw):', result)
    console.log('Event dates:', result.map((e: any) => ({ name: e.name, date: e.date, parsed: new Date(e.date) })))
    return result
  } catch (error) {
    console.error('Error fetching upcoming rush events:', error)
    throw error
  }
}

// Asset query functions
export async function getAssets(): Promise<Asset[]> {
  try {
    console.log('Fetching all assets...')
    const result = await client.fetch('*[_type == "asset" && isActive == true] | order(page asc, order asc, title asc)')
    console.log('Fetched assets:', result)
    return result
  } catch (error) {
    console.error('Error fetching assets:', error)
    throw error
  }
}

export async function getAssetsByPage(page: string): Promise<Asset[]> {
  try {
    console.log(`Fetching assets for page: ${page}`)
    
    // First, let's check if there are any assets at all
    const allAssets = await client.fetch('*[_type == "asset"]')
    console.log(`Total assets in Sanity (all):`, allAssets.length, allAssets)
    
    // Check assets without isActive filter
    const assetsForPage = await client.fetch(
      '*[_type == "asset" && page == $page]',
      { page }
    )
    console.log(`Assets for page ${page} (no isActive filter):`, assetsForPage.length, assetsForPage)
    
    // Now try with isActive filter
    const result = await client.fetch(
      '*[_type == "asset" && isActive == true && page == $page] | order(order asc, title asc)',
      { page }
    )
    console.log(`Fetched ${result.length} assets for page ${page} (with isActive filter):`, result)
    
    // If no results with isActive filter, return results without it as fallback
    if (result.length === 0 && assetsForPage.length > 0) {
      console.log(`No assets found with isActive filter, returning ${assetsForPage.length} assets without filter`)
      return assetsForPage
    }
    
    return result
  } catch (error) {
    console.error(`Error fetching assets for page ${page}:`, error)
    throw error
  }
}

export async function getAssetsByType(assetType: string): Promise<Asset[]> {
  try {
    console.log(`Fetching assets of type: ${assetType}`)
    const result = await client.fetch(
      '*[_type == "asset" && isActive == true && asset_type == $assetType] | order(page asc, order asc, title asc)',
      { assetType }
    )
    console.log(`Fetched ${result.length} assets of type ${assetType}:`, result)
    return result
  } catch (error) {
    console.error(`Error fetching assets of type ${assetType}:`, error)
    throw error
  }
}

export async function getAssetByTitle(title: string): Promise<Asset | null> {
  try {
    console.log(`Fetching asset with title: ${title}`)
    
    // First try exact match
    let result = await client.fetch(
      '*[_type == "asset" && isActive == true && title == $title][0]{..., picture{asset->{...}}}',
      { title }
    )
    
    // If not found, try case-insensitive search
    if (!result) {
      console.log(`Exact match not found, trying case-insensitive search for: ${title}`)
      result = await client.fetch(
        '*[_type == "asset" && isActive == true && lower(title) == lower($title)][0]{..., picture{asset->{...}}}',
        { title }
      )
    }
    
    // If still not found, try partial match
    if (!result) {
      console.log(`Case-insensitive match not found, trying partial match for: ${title}`)
      result = await client.fetch(
        '*[_type == "asset" && isActive == true && title match "*" + $title + "*"][0]{..., picture{asset->{...}}}',
        { title }
      )
    }
    
    console.log(`Fetched asset with title ${title}:`, result)
    return result || null
  } catch (error) {
    console.error(`Error fetching asset with title ${title}:`, error)
    throw error
  }
}

// Debug function to list all assets
export async function listAllAssets(): Promise<Asset[]> {
  try {
    console.log('Fetching all assets for debugging...')
    const result = await client.fetch(
      '*[_type == "asset"]{..., picture{asset->{...}}} | order(title asc)'
    )
    console.log('All assets in Sanity:', result)
    return result
  } catch (error) {
    console.error('Error fetching all assets:', error)
    throw error
  }
}

// Helper function to get file URL from Sanity asset
export function getFileUrl(asset: any): string | null {
  if (!asset?.picture?.asset) return null
  
  // Use Sanity's built-in file URL generation if possible
  if (asset.picture.asset.url) {
    return asset.picture.asset.url
  }
  
  // Fallback to manual URL construction
  const ref = asset.picture.asset._ref
  if (!ref) return null
  
  const [, id, extension] = ref.match(/^file-([a-f0-9]+)-(\w+)$/) || []
  
  if (!id || !extension) return null
  
  return `https://cdn.sanity.io/files/${client.config().projectId}/${client.config().dataset}/${id}.${extension}`
}

// Helper function to get image URL from file asset (for display purposes)
export function getImageUrlFromFileAsset(asset: any, width?: number, height?: number): string | null {
  console.log('🔍 getImageUrlFromFileAsset called with:', {
    hasAsset: !!asset,
    hasPicture: !!asset?.picture,
    hasAssetRef: !!asset?.picture?.asset,
    hasUrl: !!asset?.picture?.asset?.url,
    url: asset?.picture?.asset?.url
  })
  
  if (!asset?.picture?.asset) {
    console.error('❌ No asset found')
    return null
  }
  
  const fileAsset = asset.picture.asset
  
  // If we have a direct URL (which we do in this case), use it
  if (fileAsset.url) {
    console.log('✅ Using direct URL from file asset:', fileAsset.url)
    return fileAsset.url
  }
  
  // If no direct URL, try the reference approach as fallback
  const ref = fileAsset._ref || fileAsset._id
  if (ref && ref.startsWith('file-')) {
    console.log('🖼️ Processing file asset reference:', ref)
    
    const [, id, extension] = ref.match(/^file-([a-f0-9]+)-(\w+)$/) || []
    
    if (!id || !extension) {
      console.error('🚨 Invalid file reference format:', ref)
      return null
    }
    
    const url = `https://cdn.sanity.io/files/${client.config().projectId}/${client.config().dataset}/${id}.${extension}`
    console.log('📁 Generated file URL from reference:', url)
    return url
  }
  
  console.error('🚨 No usable URL or reference found')
  return null
}

// Copy query functions
export async function getCopyContent(): Promise<Copy[]> {
  try {
    console.log('Fetching all copy content...')
    const result = await client.fetch('*[_type == "copy" && isActive == true] | order(page asc, order asc, title asc)')
    console.log('Fetched copy content:', result)
    return result
  } catch (error) {
    console.error('Error fetching copy content:', error)
    throw error
  }
}

export async function getCopyByPage(page: string): Promise<Copy[]> {
  try {
    console.log(`Fetching copy content for page: ${page}`)
    const result = await client.fetch(
      '*[_type == "copy" && isActive == true && page == $page] | order(order asc, title asc)',
      { page }
    )
    console.log(`Fetched ${result.length} copy items for page ${page}:`, result)
    return result
  } catch (error) {
    console.error(`Error fetching copy content for page ${page}:`, error)
    throw error
  }
}

export async function getCopyByPageAndSection(page: string, section: string): Promise<Copy[]> {
  try {
    console.log(`Fetching copy content for page: ${page}, section: ${section}`)
    const result = await client.fetch(
      '*[_type == "copy" && isActive == true && page == $page && section == $section] | order(order asc, title asc)',
      { page, section }
    )
    console.log(`Fetched ${result.length} copy items for page ${page}, section ${section}:`, result)
    return result
  } catch (error) {
    console.error(`Error fetching copy content for page ${page}, section ${section}:`, error)
    throw error
  }
}

export async function getCopyByTitle(title: string): Promise<Copy | null> {
  try {
    console.log(`Fetching copy content with title: ${title}`)
    
    // First try exact match
    let result = await client.fetch(
      '*[_type == "copy" && isActive == true && title == $title][0]',
      { title }
    )
    
    // If not found, try case-insensitive search
    if (!result) {
      console.log(`Exact match not found, trying case-insensitive search for: ${title}`)
      result = await client.fetch(
        '*[_type == "copy" && isActive == true && lower(title) == lower($title)][0]',
        { title }
      )
    }
    
    console.log(`Fetched copy content with title ${title}:`, result)
    return result || null
  } catch (error) {
    console.error(`Error fetching copy content with title ${title}:`, error)
    throw error
  }
}

export async function getCopyByContentType(contentType: string): Promise<Copy[]> {
  try {
    console.log(`Fetching copy content of type: ${contentType}`)
    const result = await client.fetch(
      '*[_type == "copy" && isActive == true && contentType == $contentType] | order(page asc, order asc, title asc)',
      { contentType }
    )
    console.log(`Fetched ${result.length} copy items of type ${contentType}:`, result)
    return result
  } catch (error) {
    console.error(`Error fetching copy content of type ${contentType}:`, error)
    throw error
  }
}

// Helper function to get video MIME type from file extension
export function getVideoMimeType(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'mp4':
      return 'video/mp4'
    case 'webm':
      return 'video/webm'
    case 'ogg':
      return 'video/ogg'
    case 'mov':
      return 'video/quicktime'
    case 'avi':
      return 'video/x-msvideo'
    default:
      return 'video/mp4' // Default fallback
  }
}
