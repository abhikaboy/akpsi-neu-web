import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Chi Sigma Web',

  projectId: 'nqx8unn9',
  dataset: 'production',

  plugins: [structureTool(), visionTool()],

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
