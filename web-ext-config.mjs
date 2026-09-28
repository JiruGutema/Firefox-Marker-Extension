// Configuration for `web-ext` (npm run start / lint / build).
export default {
  ignoreFiles: [
    "tests",
    "node_modules",
    "package.json",
    "package-lock.json",
    "web-ext-config.mjs",
    "web-ext-artifacts",
    "README.md",
    "CHANGELOG.md",
  ],
  build: {
    overwriteDest: true,
  },
};
