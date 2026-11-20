import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from '@playwright/test'

// CI has the backend requirements on PATH; locally use the project's virtualenv.
const venvPython = ['../backend/venv/Scripts/python.exe', '../backend/venv/bin/python'].find(existsSync)
const python = venvPython ? `"${resolve(venvPython)}"` : 'python'
const backend = `node -e "require('fs').rmSync('../backend/e2e.sqlite3',{force:true})" && ${python} manage.py migrate --noinput --settings=config.settings.e2e && ${python} manage.py runserver 8000 --noreload --settings=config.settings.e2e`

export default defineConfig({
  testDir: './e2e',
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    channel: process.env.PW_CHANNEL, // e.g. "chrome" to reuse an installed browser instead of downloading one
    trace: 'retain-on-failure',
  },
  webServer: [
    // Fresh database every run; a stale dev server on :8000 would be a real database, so never reuse it.
    {
      command: backend,
      cwd: '../backend',
      url: 'http://localhost:8000/healthz/',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI },
  ],
})
