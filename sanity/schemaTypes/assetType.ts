import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'asset',
  title: 'Asset',
  type: 'document',
  fields: [
    defineField({ 
      name: 'picture', 
      title: 'Picture', 
      type: 'file',
    }),
    defineField({
      name: 'asset_type',
      title: 'Asset Type',
      type: 'string',
      options: {
        list: [
          { title: 'Image', value: 'image' },
          { title: 'Video', value: 'video' },
          { title: 'Audio', value: 'audio' },
          { title: 'Document (PDF)', value: 'pdf' },
          { title: 'Presentation', value: 'presentation' },
          { title: 'Spreadsheet', value: 'spreadsheet' },
          { title: 'External Link', value: 'link' },
          { title: 'Social Media', value: 'social' },
          { title: 'Other', value: 'other' }
        ]
      },
      validation: Rule => Rule.required().error('Asset type is required')
    }),
    defineField({
      name: 'page',
      title: 'Associated Page',
      type: 'string',
      options: {
        list: [
          { title: 'Home', value: 'home' },
          { title: 'About', value: 'about' },
          { title: 'Members/Brothers', value: 'members' },
          { title: 'Alumni', value: 'alumni' },
          { title: 'Rush', value: 'rush' },
          { title: 'Chi Sigma Consulting', value: 'consulting' },
          { title: 'Events', value: 'events' },
          { title: 'Global/Shared', value: 'global' }
        ]
      },
      validation: Rule => Rule.required().error('Associated page is required')
    }),
    defineField({
      name: 'title',
      title: 'Asset Title',
      type: 'string',
      validation: Rule => Rule.required().max(100).error('Title is required and must be under 100 characters')
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: 'Optional description of what this asset is for'
    }),
    defineField({
      name: 'isActive',
      title: 'Active Asset',
      type: 'boolean',
      initialValue: true,
      description: 'Toggle to enable/disable this asset'
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Lower numbers appear first (optional)',
      validation: Rule => Rule.min(0)
    })
  ],
  preview: {
    select: {
      title: 'title',
      assetType: 'asset_type',
      page: 'page',
      url: 'url'
    },
    prepare(selection) {
      const { title, assetType, page, url } = selection
      const typeLabel = assetType ? assetType.charAt(0).toUpperCase() + assetType.slice(1) : 'Unknown'
      const pageLabel = page ? page.charAt(0).toUpperCase() + page.slice(1) : 'No page'
      
      return {
        title: title,
        subtitle: `${typeLabel} • ${pageLabel}`,
        description: url
      }
    }
  },
  orderings: [
    {
      title: 'Page, then Order',
      name: 'pageOrder',
      by: [
        { field: 'page', direction: 'asc' },
        { field: 'order', direction: 'asc' },
        { field: 'title', direction: 'asc' }
      ]
    },
    {
      title: 'Asset Type',
      name: 'assetType',
      by: [
        { field: 'asset_type', direction: 'asc' },
        { field: 'title', direction: 'asc' }
      ]
    },
    {
      title: 'Title A-Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }]
    }
  ]
})
