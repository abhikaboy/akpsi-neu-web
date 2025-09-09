import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'nqx8unn9',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2025-08-30',
  token: process.env.SANITY_TOKEN
})

async function deepInvestigation() {
  try {
    console.log('🔍 DEEP INVESTIGATION: Asset Reference Issues')
    console.log('=' * 60)
    
    // 1. Check ALL assets with title "president" (case insensitive)
    console.log('\n1️⃣ SEARCHING FOR ALL "PRESIDENT" ASSETS:')
    const presidentAssets = await client.fetch(`
      *[_type == "asset" && lower(title) match "*president*"]
    `)
    console.log(`Found ${presidentAssets.length} assets with "president" in title:`)
    presidentAssets.forEach((asset, i) => {
      console.log(`  ${i + 1}. ID: ${asset._id}`)
      console.log(`     Title: "${asset.title}"`)
      console.log(`     Active: ${asset.isActive}`)
      console.log(`     Page: ${asset.page}`)
      console.log(`     Picture:`, JSON.stringify(asset.picture, null, 2))
      console.log(`     Created: ${asset._createdAt}`)
      console.log(`     Updated: ${asset._updatedAt}`)
      console.log('     ---')
    })
    
    // 2. Check the exact query our code uses
    console.log('\n2️⃣ TESTING OUR EXACT QUERY LOGIC:')
    
    // First, exact match
    let result = await client.fetch(
      '*[_type == "asset" && isActive == true && title == $title][0]',
      { title: 'president' }
    )
    console.log('Exact match "president":', result ? 'FOUND' : 'NOT FOUND')
    if (result) {
      console.log('  Result:', {
        id: result._id,
        title: result.title,
        picture: result.picture
      })
    }
    
    // Case-insensitive search
    if (!result) {
      result = await client.fetch(
        '*[_type == "asset" && isActive == true && lower(title) == lower($title)][0]',
        { title: 'president' }
      )
      console.log('Case-insensitive match "president":', result ? 'FOUND' : 'NOT FOUND')
      if (result) {
        console.log('  Result:', {
          id: result._id,
          title: result.title,
          picture: result.picture
        })
      }
    }
    
    // Partial match
    if (!result) {
      result = await client.fetch(
        '*[_type == "asset" && isActive == true && title match "*" + $title + "*"][0]',
        { title: 'president' }
      )
      console.log('Partial match "president":', result ? 'FOUND' : 'NOT FOUND')
      if (result) {
        console.log('  Result:', {
          id: result._id,
          title: result.title,
          picture: result.picture
        })
      }
    }
    
    // 3. Check all image assets for malformed references
    console.log('\n3️⃣ CHECKING ALL IMAGE ASSETS:')
    const allImageAssets = await client.fetch(`*[_type == "sanity.imageAsset"]`)
    console.log(`Total image assets: ${allImageAssets.length}`)
    
    const malformedAssets = []
    allImageAssets.forEach((asset) => {
      const id = asset._id
      const malformedPattern = /^image-[a-f0-9]+-[a-z]+$/
      const expectedPattern = /^image-[a-f0-9]+-\d+x\d+-[a-z]+$/
      
      if (malformedPattern.test(id) && !expectedPattern.test(id)) {
        malformedAssets.push(asset)
        console.log(`🚨 MALFORMED: ${id}`)
        console.log(`   Original: ${asset.originalFilename}`)
        console.log(`   Created: ${asset._createdAt}`)
      }
    })
    
    if (malformedAssets.length === 0) {
      console.log('✅ No malformed image asset IDs found')
    } else {
      console.log(`🚨 Found ${malformedAssets.length} malformed image assets`)
    }
    
    // 4. Check what documents reference any malformed assets
    console.log('\n4️⃣ CHECKING REFERENCES TO MALFORMED ASSETS:')
    for (const malformedAsset of malformedAssets) {
      const refs = await client.fetch(`*[references("${malformedAsset._id}")]`)
      console.log(`References to ${malformedAsset._id}: ${refs.length}`)
      refs.forEach(ref => {
        console.log(`  - ${ref._type}: ${ref.title || ref.name || ref._id}`)
      })
    }
    
    // 5. Check our asset documents structure
    console.log('\n5️⃣ DETAILED ASSET STRUCTURE ANALYSIS:')
    const allAssets = await client.fetch(`*[_type == "asset" && isActive == true]`)
    console.log(`Total active assets: ${allAssets.length}`)
    
    const assetsWithImages = allAssets.filter(asset => asset.picture)
    console.log(`Assets with pictures: ${assetsWithImages.length}`)
    
    assetsWithImages.forEach(asset => {
      if (asset.picture?.asset?._ref) {
        const ref = asset.picture.asset._ref
        const malformedPattern = /^image-[a-f0-9]+-[a-z]+$/
        const expectedPattern = /^image-[a-f0-9]+-\d+x\d+-[a-z]+$/
        
        if (malformedPattern.test(ref) && !expectedPattern.test(ref)) {
          console.log(`🚨 ASSET WITH MALFORMED REFERENCE:`)
          console.log(`   Asset ID: ${asset._id}`)
          console.log(`   Asset Title: ${asset.title}`)
          console.log(`   Malformed Ref: ${ref}`)
          console.log(`   Full Asset:`, JSON.stringify(asset, null, 2))
        }
      }
    })
    
    // 6. Check if there are any draft versions
    console.log('\n6️⃣ CHECKING FOR DRAFT VERSIONS:')
    const draftAssets = await client.fetch(`*[_type == "asset" && lower(title) match "*president*" && _id match "drafts.*"]`)
    console.log(`Draft president assets: ${draftAssets.length}`)
    draftAssets.forEach(draft => {
      console.log(`  Draft: ${draft._id} - "${draft.title}"`)
    })
    
    // 7. Test direct image asset fetching
    console.log('\n7️⃣ DIRECT IMAGE ASSET INVESTIGATION:')
    const specificMalformedRef = 'image-ba43b19abfd95f8f6fd4c69d51d86465bf19df5c-jpg'
    const imageAsset = await client.fetch(`*[_type == "sanity.imageAsset" && _id == "${specificMalformedRef}"][0]`)
    
    if (imageAsset) {
      console.log(`🚨 FOUND THE MALFORMED IMAGE ASSET:`)
      console.log(JSON.stringify(imageAsset, null, 2))
    } else {
      console.log(`✅ Malformed image asset ${specificMalformedRef} NOT found in sanity.imageAsset`)
    }
    
    console.log('\n' + '=' * 60)
    console.log('🔍 INVESTIGATION COMPLETE')
    
  } catch (error) {
    console.error('❌ Investigation failed:', error)
    throw error
  }
}

deepInvestigation()
