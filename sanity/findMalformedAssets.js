import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'nqx8unn9',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2025-08-30',
  token: process.env.SANITY_TOKEN // You may need to set this
})

async function findMalformedAssets() {
  try {
    console.log('🔍 Checking for malformed asset references...')
    
    // First, let's check the specific malformed reference
    const specificRef = 'image-ba43b19abfd95f8f6fd4c69d51d86465bf19df5c-jpg'
    console.log(`\n🎯 Looking for specific malformed reference: ${specificRef}`)
    
    // Check if this asset exists in Sanity
    const specificAsset = await client.fetch(`*[_id == "${specificRef}"][0]`)
    if (specificAsset) {
      console.log('🚨 Found the malformed asset:', specificAsset)
    } else {
      console.log('❌ Specific asset not found in _sanity.imageAsset documents')
    }
    
    // Check all image assets for malformed IDs
    console.log('\n🔍 Checking all image assets...')
    const allImageAssets = await client.fetch(`*[_type == "sanity.imageAsset"]`)
    console.log(`Found ${allImageAssets.length} image assets`)
    
    const malformedAssets = []
    allImageAssets.forEach((asset) => {
      const id = asset._id
      
      // Check if ID follows expected pattern: image-{hash}-{width}x{height}-{ext}
      const expectedPattern = /^image-[a-f0-9]+-\d+x\d+-[a-z]+$/
      const malformedPattern = /^image-[a-f0-9]+-[a-z]+$/
      
      if (malformedPattern.test(id) && !expectedPattern.test(id)) {
        malformedAssets.push(asset)
        console.log('🚨 MALFORMED ASSET ID:', id)
        console.log('  Original filename:', asset.originalFilename)
        console.log('  Upload date:', asset._createdAt)
        console.log('  ---')
      }
    })
    
    // Check all document types that might reference the malformed asset
    console.log('\n🔍 Looking for documents that reference malformed assets...')
    const referencingDocs = await client.fetch(`
      *[references("${specificRef}")]
    `)
    
    console.log(`Found ${referencingDocs.length} documents referencing the malformed asset`)
    referencingDocs.forEach((doc) => {
      console.log('📄 Referencing document:', {
        id: doc._id,
        type: doc._type,
        title: doc.title || doc.name || 'No title'
      })
    })
    
    if (malformedAssets.length === 0) {
      console.log('✅ No malformed image assets found!')
    } else {
      console.log(`\n📊 Summary: Found ${malformedAssets.length} malformed image assets`)
      console.log('\n🔧 To fix these:')
      console.log('1. Delete the malformed assets from Sanity')
      console.log('2. Re-upload the images')
      console.log('3. Update any documents that reference them')
    }
    
    return { malformedAssets, referencingDocs }
    
  } catch (error) {
    console.error('❌ Error checking assets:', error)
    throw error
  }
}

findMalformedAssets()
