// jest.config.js
export default {
    transform: {},
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.js'],
    globals: {
      'ts-jest': {
        useESM: true,
      },
    },
  };