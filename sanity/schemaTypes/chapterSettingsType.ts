import { defineType, defineField } from 'sanity'
import { applicationCycleOptions } from './applicationCycles'

// Singleton. The active cycle lives here so the public application, every
// admin eval form, and the deliberation view all read one value — nobody has
// to remember to switch a dropdown, and data can't land on the wrong cycle.
export default defineType({
  name: 'chapterSettings',
  title: 'Chapter Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'activeCycle',
      title: 'Active Application Cycle',
      type: 'string',
      description:
        'The cycle currently in progress. Applications, evaluations, and deliberations all use this.',
      options: { list: applicationCycleOptions() },
      validation: Rule => Rule.required().error('An active cycle is required')
    })
  ],
  preview: {
    select: { activeCycle: 'activeCycle' },
    prepare({ activeCycle }) {
      return {
        title: 'Chapter Settings',
        subtitle: activeCycle ? `Active cycle: ${activeCycle}` : 'No active cycle set'
      }
    }
  }
})
