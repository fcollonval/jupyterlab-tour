const jestJupyterLab = require('@jupyterlab/testutils/lib/jest-config');

const jlabConfig = jestJupyterLab('jupyterlab-tour', __dirname);

/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
const {
  moduleFileExtensions,
  moduleNameMapper,
  preset,
  setupFilesAfterEnv,
  setupFiles,
  testPathIgnorePatterns,
  transform
} = jlabConfig;

/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  coverageDirectory: 'coverage',
  moduleFileExtensions,
  moduleNameMapper,
  preset,
  setupFilesAfterEnv,
  testPathIgnorePatterns: ['/jupyterlab_tour/', '/node_modules/'],
  setupFiles,
  transform,
  automock: false,
  collectCoverageFrom: ['lib/**.{js,jsx}', '!lib/*.d.ts'],
  coverageReporters: ['lcov', 'text'],
  // globals: {
  //   'ts-jest': {
  //     tsconfig: `./src/tsconfig.json`
  //   }
  // },
  reporters: ['default'],
  testRegex: 'lib/.*/.*.spec.js[x]?$',
  transformIgnorePatterns: ['/node_modules/(?!(@?jupyterlab.*)/)']
};

console.error(module.exports);
