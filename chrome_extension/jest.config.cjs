/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
    moduleNameMapper: {
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
        "^@/(.*)$": "<rootDir>/src/$1",
    },
    transform: {
        "^.+\\.(js|jsx)$": "babel-jest",
    },
    transformIgnorePatterns: ["/node_modules/(?!(@testing-library)/)"],
    collectCoverageFrom: [
        "src/**/*.{js,jsx}",
        "!src/main.jsx",
        "!src/**/*.test.{js,jsx}",
        "!src/setupTests.js",
    ],
    testMatch: [
        "<rootDir>/src/**/__tests__/**/*.{js,jsx}",
        "<rootDir>/src/**/*.{test,spec}.{js,jsx}",
    ],
};
