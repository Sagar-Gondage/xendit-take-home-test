module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  // Increase global timeout to 60s — MongoMemoryServer can be slow to start
  testTimeout: 60000,
  // Run test suites serially to avoid MongoMemoryServer port conflicts
  maxWorkers: 1,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/types/**/*.ts',
    '!src/server.ts',
    '!src/config/**/*.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 40,
      lines: 40,
      statements: 40
    }
  }
}
