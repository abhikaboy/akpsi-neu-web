import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

// Chapter Settings is a singleton: it is pinned to one document id and hidden
// from the generic document list so nobody creates a second "active cycle".
const SINGLETONS = ['chapterSettings']

export default defineConfig({
  name: 'default',
  title: 'Chi Sigma Web',

  projectId: 'nqx8unn9',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: S =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Chapter Settings')
              .id('chapterSettings')
              .child(
                S.document()
                  .schemaType('chapterSettings')
                  .documentId('chapterSettings')
                  .title('Chapter Settings')
              ),
            S.divider(),
            ...S.documentTypeListItems().filter(
              item => !SINGLETONS.includes(item.getId() ?? '')
            )
          ])
    }),
    visionTool()
  ],

  document: {
    actions: (input, context) =>
      SINGLETONS.includes(context.schemaType)
        ? input.filter(({action}) => action !== 'unpublish' && action !== 'delete' && action !== 'duplicate')
        : input
  },

  schema: {
    types: schemaTypes,
  },

  cors: {
    credentials: true,
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://your-domain.com' // Replace with your actual domain when deployed
    ]
  },

  api: {
    projectId: 'nqx8unn9',
    dataset: 'production'
  }
})
