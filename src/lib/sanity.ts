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
  class: string
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
    _type: 'image'
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

export async function getMembersByClass(className: string): Promise<Member[]> {
  try {
    console.log(`Fetching members for class: ${className}`)
    const query = '*[_type == "member" && class == $class] | order(name asc)'
    const params = { class: className }
    console.log('Query:', query, 'Params:', params)
    
    const result = await client.fetch(query, params)
    console.log(`Fetched ${result.length} members for class ${className}:`, result)
    return result
  } catch (error) {
    console.error(`Error fetching members for class ${className}:`, error)
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
    const result = await client.fetch(
      '*[_type == "rushEvent" && isActive == true && date >= $now] | order(date asc)',
      { now }
    )
    console.log('Fetched upcoming rush events:', result)
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
