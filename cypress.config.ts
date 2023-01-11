import {defineConfig} from 'cypress';

export default defineConfig({
  fileServerFolder: 'cypress/public',
  e2e: {
    supportFile: false,
    watchForFileChanges: false
  }
});
