import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    collectCoverage: true,
    collectCoverageFrom: [
        'wrappers/**/*.ts',
        'utils/**/*.ts',
        '!**/node_modules/**',
        '!**/dist/**',
    ],
    coverageReporters: ['text', 'html'],
};

export default config;
