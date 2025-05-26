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
    // テスト実行時間短縮のための設定
    maxWorkers: '50%', // CPUコアの50%を使用
    bail: true,       // 最初の失敗で停止
    verbose: false,   // 詳細出力を無効化
    // タイムアウト設定
    testTimeout: 30000, // 30秒でテストタイムアウト
};

export default config;
