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
    }),
    defineField({
      name: 'applicationEnabled',
      title: 'Enable Application',
      type: 'boolean',
      description:
        'When off, the public Apply page is hidden from navigation and tells visitors applications are closed.',
      initialValue: false
    }),
    defineField({
      name: 'presidentName',
      title: 'President Name',
      type: 'string',
      description: 'Displayed on the site wherever the current chapter president is named (e.g. the Presidential Welcome section).',
      initialValue: 'Daniel Smith'
    })
  ],
  preview: {
    select: {
      activeCycle: 'activeCycle',
      presidentName: 'presidentName',
      applicationEnabled: 'applicationEnabled'
    },
    prepare({ activeCycle, presidentName, applicationEnabled }) {
      return {
        title: 'Chapter Settings',
        subtitle: `Active cycle: ${activeCycle || 'none'} • Application: ${applicationEnabled ? 'on' : 'off'} • President: ${presidentName || 'none'}`
      }
    }
  }
})
