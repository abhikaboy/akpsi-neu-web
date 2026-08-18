import { defineType, defineField } from 'sanity'
import { applicationCycleOptions } from './applicationCycles'

export default defineType({
  name: 'applicationQuestion',
  title: 'Application Question',
  type: 'document',
  fields: [
    defineField({
      name: 'cycle',
      title: 'Application Cycle',
      type: 'string',
      options: { list: applicationCycleOptions() },
      validation: Rule => Rule.required().error('Application cycle is required')
    }),
    defineField({
      name: 'label',
      title: 'Question / Field Label',
      type: 'string',
      validation: Rule => Rule.required().max(200).error('Label is required and must be under 200 characters')
    }),
    defineField({
      name: 'fieldType',
      title: 'Field Type',
      type: 'string',
      options: {
        list: [
          { title: 'Short Answer', value: 'text' },
          { title: 'Long Answer', value: 'textarea' },
          { title: 'Dropdown', value: 'select' },
          { title: 'File Upload', value: 'file' }
        ]
      },
      initialValue: 'text',
      validation: Rule => Rule.required().error('Field type is required')
    }),
    defineField({
      name: 'options',
      title: 'Dropdown Options',
      type: 'array',
      of: [{ type: 'string' }],
      hidden: ({ parent }) => parent?.fieldType !== 'select',
      validation: Rule =>
        Rule.custom((options, context: any) => {
          if (context.parent?.fieldType === 'select' && (!options || options.length === 0)) {
            return 'Add at least one option for a dropdown field'
          }
          return true
        })
    }),
    defineField({
      name: 'required',
      title: 'Required',
      type: 'boolean',
      initialValue: true
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Lower numbers appear first',
      validation: Rule => Rule.min(0)
    }),
    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
      description: 'Toggle to show/hide this question on the application form'
    })
  ],
  preview: {
    select: {
      title: 'label',
      cycle: 'cycle',
      fieldType: 'fieldType'
    },
    prepare({ title, cycle, fieldType }) {
      return {
        title,
        subtitle: `${cycle ?? 'No cycle'} • ${fieldType ?? 'text'}`
      }
    }
  },
  orderings: [
    {
      title: 'Cycle, then Order',
      name: 'cycleOrder',
      by: [
        { field: 'cycle', direction: 'asc' },
        { field: 'order', direction: 'asc' }
      ]
    }
  ]
})
