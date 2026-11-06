# three.js

- Version: 0.186.1 (npm `three`, MIT, see `LICENSE`)
- npm no longer ships a minified build, so `three.module.min.js` is `build/three.module.js` from that package, minified once with esbuild 0.25.0:
  `esbuild build/three.module.js --bundle --minify --format=esm --target=es2020 --legal-comments=none`
- Replace these files to upgrade. The site itself has no build step.
