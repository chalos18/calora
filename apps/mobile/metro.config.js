// Metro has to be told about the monorepo: this app lives in apps/mobile but
// imports @calora/core from packages/core, which is outside its directory and
// therefore outside Metro's default watch scope.
//
// The alias points at core's *source*, not its dist. Three things resolve
// @calora/core - tsc (via paths in tsconfig.json), vitest (via an alias in
// vitest.config.ts) and Metro - and they all point at src, so none of them can
// disagree and no build step stands between editing a domain rule and seeing it
// in the app. Only the production server consumes dist.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const workspaceRoot = path.resolve(__dirname, "../..");
const coreSrc = path.resolve(workspaceRoot, "packages/core/src");

const config = getDefaultConfig(__dirname);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@calora/core": coreSrc,
};

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // core is compiled with NodeNext, so its own imports carry the extension the
  // *output* will have: `./density-table.js` next to `density-table.ts`. Node
  // and tsc both understand that; Metro does not, and would resolve a file that
  // is never emitted in this configuration. Rewrite it back to extensionless
  // and let Metro's normal extension search find the TypeScript.
  const fromCore = context.originModulePath?.startsWith(coreSrc);
  if (fromCore && moduleName.startsWith(".") && moduleName.endsWith(".js")) {
    return context.resolveRequest(
      context,
      moduleName.slice(0, -".js".length),
      platform,
    );
  }

  return (defaultResolveRequest ?? context.resolveRequest)(
    context,
    moduleName,
    platform,
  );
};

module.exports = config;
