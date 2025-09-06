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
          { title: 'Alpha', value: 'Alpha' },
          { title: 'Beta', value: 'Beta' },
          { title: 'Gamma', value: 'Gamma' },
          { title: 'Delta', value: 'Delta' },
          { title: 'Epsilon', value: 'Epsilon' },
          { title: 'Zeta', value: 'Zeta' },
          { title: 'Eta', value: 'Eta' },
          { title: 'Theta', value: 'Theta' },
          { title: 'Iota', value: 'Iota' },
          { title: 'Kappa', value: 'Kappa' },
          { title: 'Lambda', value: 'Lambda' },
          { title: 'Mu', value: 'Mu' },
          { title: 'Nu', value: 'Nu' },
          { title: 'Xi', value: 'Xi' },
          { title: 'Omicron', value: 'Omicron' },
          { title: 'Pi', value: 'Pi' },
          { title: 'Rho', value: 'Rho' },
          { title: 'Sigma', value: 'Sigma' },
          { title: 'Tau', value: 'Tau' },
          { title: 'Upsilon', value: 'Upsilon' },
          { title: 'Phi', value: 'Phi' },
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