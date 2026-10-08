import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.', // Busca tests en el directorio actual (Tests)
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'test-results/playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/frontend_results.xml' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    actionTimeout: 10_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      }
    },
    // Firefox deshabilitado para CI/CD - descomenta para pruebas locales
    // { 
    //   name: 'firefox', 
    //   use: { 
    //     ...devices['Desktop Firefox'],
    //     viewport: { width: 1920, height: 1080 }
    //   } 
    // },
    // Descomenta si tienes Edge instalado
    // { 
    //   name: 'edge', 
    //   use: { 
    //     ...devices['Desktop Chrome'], 
    //     channel: 'msedge',
    //     viewport: { width: 1920, height: 1080 }
    //   } 
    // },
    // Pruebas en móviles
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] }
    // },
    // {
    //   name: 'mobile-safari',
    //   use: { ...devices['iPhone 12'] }
    // }
  ],
  // globalSetup: './global-setup',  // Comentado temporalmente - archivo no existe
  // Carpeta de salida para screenshots y videos
  outputDir: 'test-results/artifacts',
});