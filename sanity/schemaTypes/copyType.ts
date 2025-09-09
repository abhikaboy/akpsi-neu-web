import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'copy',
  title: 'Copy/Text Content',
  type: 'document',
  fields: [
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
      title: 'Content Title',
      type: 'string',
      validation: Rule => Rule.required().max(100).error('Title is required and must be under 100 characters'),
      description: 'A descriptive title for this text content (used for identification)'
    }),
    defineField({
      name: 'content',
      title: 'Text Content',
      type: 'text',
      rows: 8,
      validation: Rule => Rule.required().error('Content is required'),
      description: 'The main text content for this section'
    }),
    defineField({
      name: 'contentType',
      title: 'Content Type',
      type: 'string',
      options: {
        list: [
          { title: 'Heading', value: 'heading' },
          { title: 'Subheading', value: 'subheading' },
          { title: 'Body Text', value: 'body' },
          { title: 'Quote', value: 'quote' },
          { title: 'Caption', value: 'caption' },
          { title: 'Button Text', value: 'button' },
          { title: 'Meta Description', value: 'meta' },
          { title: 'Other', value: 'other' }
        ]
      },
      initialValue: 'body',
      validation: Rule => Rule.required().error('Content type is required'),
      description: 'What type of content this is (helps with styling and organization)'
    }),
    defineField({
      name: 'section',
      title: 'Page Section',
      type: 'string',
      description: 'Optional: specify which section of the page this content belongs to (e.g., "hero", "about-us", "footer")'
    }),
    defineField({
      name: 'isActive',
      title: 'Active Content',
      type: 'boolean',
      initialValue: true,
      description: 'Toggle to enable/disable this content'
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Lower numbers appear first (optional)',
      validation: Rule => Rule.min(0)
    }),
    defineField({
      name: 'notes',
      title: 'Internal Notes',
      type: 'text',
      rows: 2,
      description: 'Optional internal notes about this content (not displayed on website)'
    })
  ],
  preview: {
    select: {
      title: 'title',
      contentType: 'contentType',
      page: 'page',
      content: 'content'
    },
    prepare(selection) {
      const { title, contentType, page, content } = selection
      const typeLabel = contentType ? contentType.charAt(0).toUpperCase() + contentType.slice(1) : 'Text'
      const pageLabel = page ? page.charAt(0).toUpperCase() + page.slice(1) : 'No page'
      
      // Show first 60 characters of content as description
      const contentPreview = content ? content.substring(0, 60) + (content.length > 60 ? '...' : '') : ''
      
      return {
        title: title,
        subtitle: `${typeLabel} • ${pageLabel}`,
        description: contentPreview
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
      title: 'Content Type',
      name: 'contentType',
      by: [
        { field: 'contentType', direction: 'asc' },
        { field: 'title', direction: 'asc' }
      ]
    },
    {
      title: 'Title A-Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }]
    },
    {
      title: 'Recently Updated',
      name: 'updatedDesc',
      by: [{ field: '_updatedAt', direction: 'desc' }]
    }
  ]
})
