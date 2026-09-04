import { defineType, defineField } from 'sanity'
import { applicationCycleOptions } from './applicationCycles'

// One schema drives all three admin evaluation forms (rush, invitational,
// interview). Exec edits criteria per cycle in the Studio; the site reads them
// at runtime, so changing a rubric never needs a deploy.
export const evalFormOptions = [
  { title: 'Rush Eval', value: 'rushEval' },
  { title: 'Invitational Eval', value: 'invitationalEval' },
  { title: 'Interview', value: 'interview' }
]

export default defineType({
  name: 'evalCriterion',
  title: 'Evaluation Criterion',
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
      name: 'formType',
      title: 'Form',
      type: 'string',
      options: { list: evalFormOptions },
      validation: Rule => Rule.required().error('Form is required')
    }),
    defineField({
      name: 'label',
      title: 'Criterion / Field Label',
      type: 'string',
      validation: Rule => Rule.required().max(200).error('Label is required and must be under 200 characters')
    }),
    defineField({
      name: 'description',
      title: 'Guidance',
      type: 'text',
      rows: 2,
      description: 'Optional helper text shown to the evaluator under the label'
    }),
    defineField({
      name: 'fieldType',
      title: 'Field Type',
      type: 'string',
      options: {
        list: [
          { title: 'Score (numeric scale)', value: 'score' },
          { title: 'Short Answer', value: 'text' },
          { title: 'Long Answer', value: 'textarea' },
          { title: 'Dropdown', value: 'select' },
          { title: 'Yes / No', value: 'boolean' }
        ]
      },
      initialValue: 'score',
      validation: Rule => Rule.required().error('Field type is required')
    }),
    defineField({
      name: 'scoreMin',
      title: 'Minimum Score',
      type: 'number',
      initialValue: 1,
      hidden: ({ parent }) => parent?.fieldType !== 'score'
    }),
    defineField({
      name: 'scoreMax',
      title: 'Maximum Score',
      type: 'number',
      initialValue: 5,
      hidden: ({ parent }) => parent?.fieldType !== 'score',
      validation: Rule =>
        Rule.custom((max, context: any) => {
          if (context.parent?.fieldType !== 'score') return true
          if (typeof max !== 'number') return 'Maximum score is required for a score field'
          const min = context.parent?.scoreMin ?? 1
          return max > min ? true : 'Maximum score must be greater than the minimum'
        })
    }),
    defineField({
      name: 'weight',
      title: 'Weight',
      type: 'number',
      initialValue: 1,
      description: 'Relative weight when averaging this score into the overall rating',
      hidden: ({ parent }) => parent?.fieldType !== 'score',
      validation: Rule => Rule.min(0)
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
      description: 'Toggle to show/hide this criterion on the form'
    })
  ],
  preview: {
    select: {
      title: 'label',
      cycle: 'cycle',
      formType: 'formType',
      fieldType: 'fieldType'
    },
    prepare({ title, cycle, formType, fieldType }) {
      const form = evalFormOptions.find(o => o.value === formType)?.title ?? 'No form'
      return {
        title,
        subtitle: `${form} • ${cycle ?? 'No cycle'} • ${fieldType ?? 'score'}`
      }
    }
  },
  orderings: [
    {
      title: 'Form, Cycle, then Order',
      name: 'formCycleOrder',
      by: [
        { field: 'formType', direction: 'asc' },
        { field: 'cycle', direction: 'asc' },
        { field: 'order', direction: 'asc' }
      ]
    }
  ]
})
