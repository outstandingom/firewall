import esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const commonOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  target: ['es2020'],
  treeShaking: true,
  sourcemap: true,
};

async function build() {
  try {
    // IIFE Build
    const iifeContext = await esbuild.context({
      ...commonOptions,
      outfile: 'dist/awo-sdk.js',
      format: 'iife',
      globalName: 'AWO',
    });

    // ESM Build
    const esmContext = await esbuild.context({
      ...commonOptions,
      outfile: 'dist/awo-sdk.esm.js',
      format: 'esm',
    });

    if (watch) {
      await Promise.all([iifeContext.watch(), esmContext.watch()]);
      console.log('Watching for changes...');
    } else {
      await Promise.all([iifeContext.rebuild(), esmContext.rebuild()]);
      await Promise.all([iifeContext.dispose(), esmContext.dispose()]);
      console.log('Build complete.');
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

build();
