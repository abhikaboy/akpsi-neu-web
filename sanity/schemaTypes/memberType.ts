import { defineType, defineField } from 'sanity'

const GREEK = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
  'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho',
  'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega',
]
// Classes run through the Greek alphabet, then double up after Omega
// (Alpha Alpha, Alpha Beta, ...). Add ...GREEK.map(l => `Beta ${l}`) etc. later.
const PLEDGE_CLASSES = [...GREEK, ...GREEK.map((l) => `Alpha ${l}`)]

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
      name: 'pledgeClass', 
      title: 'Pledge Class', 
      type: 'string',
      options: {
        list: PLEDGE_CLASSES.map((c) => ({ title: c, value: c })),
      },
      validation: Rule => Rule.required()
    }),
    defineField({ 
      name: 'graduationYear', 
      title: 'Graduation Year', 
      type: 'number',
      validation: Rule => Rule.required().min(2020).max(2040)
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