import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'member',
  title: 'Member',
  type: 'document',
  fields: [
    defineField({ 
      name: 'name', 
      title: 'Name', 
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({ 
      name: 'picture', 
      title: 'Picture', 
      type: 'image',
      options: {
        hotspot: true
      }
    }),
    defineField({ 
      name: 'major', 
      title: 'Major', 
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({ 
      name: 'class', 
      title: 'Pledge Class', 
      type: 'string',
      options: {
        list: [
          { title: 'Phi', value: 'Phi' },
          { title: 'Sigma', value: 'Sigma' },
          { title: 'Tau', value: 'Tau' },
          { title: 'Upsilon', value: 'Upsilon' },
          { title: 'Chi', value: 'Chi' },
          { title: 'Psi', value: 'Psi' },
          { title: 'Omega', value: 'Omega' }
        ]
      },
      validation: Rule => Rule.required()
    }),
    defineField({ 
      name: 'email', 
      title: 'Email', 
      type: 'string',
      validation: Rule => Rule.required().email()
    }),
    defineField({ 
      name: 'linkedin', 
      title: 'LinkedIn URL', 
      type: 'url'
    }),
  ],
  preview: {
    select: {
      title: 'name',
    },
    prepare(selection) {
      return { title: selection.title }
    },
  },
})