import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'rushEvent',
  title: 'Rush Event',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Event Name',
      type: 'string',
      validation: Rule => Rule.required().max(100).error('Event name is required and must be under 100 characters')
    }),
    defineField({
      name: 'date',
      title: 'Event Date & Time',
      type: 'datetime',
      validation: Rule => Rule.required().error('Event date and time is required')
    }),
    defineField({
      name: 'room',
      title: 'Room/Location',
      type: 'string',
      validation: Rule => Rule.required().max(200).error('Room/location is required and must be under 200 characters')
    }),
    defineField({
      name: 'dresscode',
      title: 'Dress Code',
      type: 'string',
      options: {
        list: [
          { title: 'Casual', value: 'casual' },
          { title: 'Business Casual', value: 'business_casual' },
          { title: 'Business Professional', value: 'business_professional' },
          { title: 'Formal', value: 'formal' },
          { title: 'Semi-Formal', value: 'semi_formal' },
          { title: 'Theme/Costume', value: 'theme' },
          { title: 'Athletic/Comfortable', value: 'athletic' }
        ]
      },
      validation: Rule => Rule.required().error('Dress code is required')
    }),
    defineField({
      name: 'description',
      title: 'Event Description',
      type: 'text',
      rows: 3,
      description: 'Optional description of the event'
    }),
    defineField({
      name: 'isActive',
      title: 'Active Event',
      type: 'boolean',
      initialValue: true,
      description: 'Toggle to show/hide this event on the website'
    })
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'room',
      date: 'date'
    },
    prepare(selection) {
      const { title, subtitle, date } = selection
      const formattedDate = date ? new Date(date).toLocaleDateString() : 'No date'
      return {
        title: title,
        subtitle: `${subtitle} • ${formattedDate}`
      }
    }
  },
  orderings: [
    {
      title: 'Date (Newest First)',
      name: 'dateDesc',
      by: [{ field: 'date', direction: 'desc' }]
    },
    {
      title: 'Date (Oldest First)', 
      name: 'dateAsc',
      by: [{ field: 'date', direction: 'asc' }]
    },
    {
      title: 'Event Name A-Z',
      name: 'nameAsc',
      by: [{ field: 'name', direction: 'asc' }]
    }
  ]
})
