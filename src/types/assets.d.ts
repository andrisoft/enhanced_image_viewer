/** esbuild bundles .css files with the text loader, so they import as a string. */
declare module "*.css" {
  const content: string;
  export default content;
}

/** Build id injected by esbuild, used to detect that a new build is on disk. */
declare const __BUILD_ID__: string;
