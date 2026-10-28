import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import FullReload from 'vite-plugin-full-reload';
import { qrcode } from "vite-plugin-qrcode";
import { terser } from 'rollup-plugin-terser';
import { resolve } from 'path';
import { readdirSync, statSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import javascriptObfuscator from 'vite-plugin-javascript-obfuscator';
import legacy from '@vitejs/plugin-legacy';
import { visualizer } from 'rollup-plugin-visualizer';

const projectRoot = __dirname;
const rootDir = process.env.PREBUILD_ROOT
	? resolve(projectRoot, process.env.PREBUILD_ROOT)
	: projectRoot;

export default defineConfig(({ command, mode }) => ({
	root: rootDir,
	base: './', // Set the base URL for your project
	assetsInclude: ['**/*.xml', '**/*.glsl', '**/*.frag', '**/*.vert'], // This tells Vite to include XML files as assets

	server: {
		watch: {
			paths: ['src/tube/*'], // Specify the directory and file types to watch
			usePolling: true,
			interval: 300,
		},
		//hmr: false,
		proxy: {
			'/snakepit-onlinefiles': {
				target: 'https://sporkle.net',
				changeOrigin: true,
				secure: true,
				// Do not rewrite so that paths remain /snakepit-onlinefiles/*
				// If the site expects the prefix, keep as-is; otherwise, add rewrite
				// rewrite: (p) => p,
			},
		},
	},

	build: {
		sourcemap: mode === 'development', // Enable source maps in development only
		// Ensure no minification/obfuscation in development builds
		minify: mode !== 'development',
		assetsInlineLimit: 0, // Prevent inlining any assets
		// Always emit final build into project-root /dist, even when using a
		// different rootDir (e.g. prebuild/) for sources.
		outDir: resolve(projectRoot, 'dist'),
		rollupOptions: {
			plugins: mode === 'production' ? [
				terser({
					mangle: {
						toplevel: true, // Keep top-level names readable
						properties: false, // Don't mangle property names (game does not work with this true)
					},
					compress: {
						passes: 2, // Single pass for lighter compression
						drop_console: false, // Keep console statements
						ecma: 2020,
						dead_code: true, // Remove dead code
						unused: true, // Remove unused variables
					},
					format: {
						comments: true, // Remove comments
					},
				}),
				// rollup-plugin-visualizer disabled to prevent stats.html auto-opening on build
				// visualizer({
				// 	sourcemap: true,
				// 	gzipSize: true,
				// 	brotliSize: true,
				// 	filename: 'stats.html',
				// 	open: false,
				// 	includeAssets: true, 
				// }),
			] : [], // No minification in development
			input: {
				main: resolve(rootDir, 'index.html'),
			},
		},
	},

	optimizeDeps: {
		entries: ['src/main.js'], // Ensure Vite processes the entry correctly
	},

	plugins: [
		qrcode(),
		// Legacy plugin for older browser support (transpiles optional chaining, etc.)
		// Target browsers that don't support ES modules to ensure Cordova compatibility
		legacy({
			// Target browsers without ES module support (iOS 12 WKWebView doesn't support modules)
			targets: {
				ios: '12',
				safari: '12',
				// Exclude browsers that support ES modules to force legacy builds
				chrome: '60', // Chrome 60 doesn't support modules
				firefox: '60', // Firefox 60 doesn't support modules
			},
			modernPolyfills: true,
			// Always render legacy chunks for Cordova compatibility
			renderLegacyChunks: true,
		}),
		viteStaticCopy({
			targets: [

				{
					src: 'src/tube/*',
					dest: 'tube',
				},
				{
					src: 'src/levels/*',
					dest: 'levels',
				},
				{
					src: 'src/web/*',
					dest: 'web',
				},
			],
		}),
		FullReload(['src/tube/*'], { delay: 200 }),
		// Conditional build sections for different distribution targets (web/ios/google/frvr)
		// Active during both dev (serve) and build, but NO-OP unless at least one BUILD_* flag is set
		(command === 'build' || command === 'serve') && conditionalBuildSections(command),
		// Strip //<debug> blocks ONLY in production builds
		command === 'build' && mode === 'production' && stripDebugCode(), // Strip debug only during production builds
		// Remove source maps from production builds
		command === 'build' && mode === 'production' && removeSourceMaps(), // Remove source maps from production builds
		mode === 'production' && false && javascriptObfuscator({
			compact: false, // Minify output
			controlFlowFlattening: false, // Disabled - too aggressive
			controlFlowFlatteningThreshold: 0,
			deadCodeInjection: false, // Disabled - can cause issues
			deadCodeInjectionThreshold: 0,
			identifierNamesGenerator: 'hexadecimal', // Simple mangling (a, b, c...)
			renameGlobals: false, // Keep global names readable
			rotateStringArray: false, // Disabled for easier debugging
			selfDefending: false, // Disabled - makes debugging impossible
			shuffleStringArray: false, // Disabled for easier debugging
			splitStrings: false, // Disabled for easier debugging
			splitStringsChunkLength: 0,
			stringArray: false, // Disabled - keep strings readable
			stringArrayEncoding: [], // No encoding
			stringArrayThreshold: 0,
			transformObjectKeys: false, // Disabled - can cause issues
			unicodeEscapeSequence: false,
			simplify: false, // Disable code simplification that might transform property access
		}),
	],
}));

// Custom Vite Plugin: strip //<debug> ... //</debug> blocks from JS/TS in production builds
function stripDebugCode() {
	return {
		name: 'strip-debug-code', // Name of the plugin
		transform(code, id) {
			if (id.endsWith('.js') || id.endsWith('.ts')) { // Modify only JS or TS files
				return code.replace(/\/\/<debug>([\s\S]*?)\/\/<\/debug>/g, '');
			}
			return code;
		},
		// Also support debug sections in HTML:
		// <!--<debug>--> ... <!--</debug>-->
		transformIndexHtml(html) {
			return html.replace(/<!--<debug>-->[\s\S]*?<!--<\/debug>-->/g, '');
		},
	};
}

// Custom Vite Plugin: include/exclude sections based on build target flags
// External tags (in code/HTML): //<web>, //<ios>, //<google>, //<frvr>
// HTML variant: <!--<web>--> ... <!--</web>--> (same names)
// Internal env flags (set from npm scripts/build tooling): BUILD_WEB, BUILD_IOS, BUILD_GOOGLE, BUILD_FRVR
function conditionalBuildSections(command) {
	// Map external tag names to internal env flag names
	const flags = {
		web: !!process.env.BUILD_WEB,
		ios: !!process.env.BUILD_IOS,
		google: !!process.env.BUILD_GOOGLE,
		frvr: !!process.env.BUILD_FRVR,
		premium: !!process.env.BUILD_PREMIUM,
	};

	const anyEnabled = Object.values(flags).some(Boolean);
	// Detect if we're in dev mode (serve) vs build mode
	const isDevMode = command === 'serve';

	return {
		name: 'conditional-build-sections',

		// JS / TS files: strip or keep sections wrapped in:
		// //<web> ... //</web>
		// //<ios> ... //</ios>
		// etc.
		transform(code, id) {
			// If no BUILD_* flag is set, act as a NO-OP (keep all tagged sections)
			if (!anyEnabled) return null;
			if (!id.endsWith('.js') && !id.endsWith('.ts')) return code;

			// Support single or multiple targets in one tag:
			// //<ios> ... //</ios>
			// //<ios,google> ... //</ios,google>
			const pattern = /\/\/<([^>]+)>([\s\S]*?)\/\/<\/\1>/g;

			return code.replace(pattern, (match, rawNames, inner) => {
				const names = rawNames.split(',').map(n => n.trim()).filter(Boolean);

				// Never touch //<debug> blocks here; they are handled ONLY by stripDebugCode()
				// - Pure debug: //<debug>...</debug> -> leave as-is in all modes
				// - Mixed tags like //<ios,debug> are not a supported pattern; use nesting instead.
				if (names.length === 1 && names[0] === 'debug') {
					return match;
				}

				// Keep the block if ANY of its names is enabled.
				// Support negated flags like <!premium> meaning "when BUILD_PREMIUM is *not* set".
				const keep = names.some(name => {
					// Negated flag, e.g. <!premium>
					if (name.startsWith('!')) {
						const base = name.slice(1);
						// If we know this flag, keep when it is false. If unknown, default to keep.
						if (Object.prototype.hasOwnProperty.call(flags, base)) {
							return !flags[base];
						}
						return true;
					}
					// Normal flag
					return !!flags[name];
				});
				if (keep) {
					return inner;
				}

				// In dev mode: replace with blank lines to preserve line numbers for breakpoints
				// In build mode: remove completely
				if (isDevMode) {
					const lineCount = (match.match(/\n/g) || []).length;
					return '\n'.repeat(lineCount);
				}
				return '';
			});
		},

		// HTML: strip or keep sections wrapped in:
		// <!--<web>--> ... <!--</web>-->
		// <!--<ios>--> ... <!--</ios>-->  etc.
		transformIndexHtml(html) {
			// If no BUILD_* flag is set, keep HTML unchanged
			if (!anyEnabled) return html;

			// Support single or multiple targets in one tag:
			// <!--<ios>--> ... <!--</ios>-->
			// <!--<ios,google>--> ... <!--</ios,google>-->
			const blockPattern = /<!--<([^>]+)>-->([\s\S]*?)<!--<\/\1>-->/g;

			return html.replace(blockPattern, (match, rawNames, inner) => {
				const names = rawNames.split(',').map(n => n.trim()).filter(Boolean);
				// Never touch <!--<debug>--> blocks here; they are handled ONLY by stripDebugCode()
				if (names.length === 1 && names[0] === 'debug') {
					return match;
				}
				const keep = names.some(name => {
					// Negated flag, e.g. <!--< !premium >-->
					if (name.startsWith('!')) {
						const base = name.slice(1);
						if (Object.prototype.hasOwnProperty.call(flags, base)) {
							return !flags[base];
						}
						return true;
					}
					return !!flags[name];
				});
				if (keep) {
					return inner;
				}

				// In dev mode: replace with blank lines to preserve line numbers
				// In build mode: remove completely
				if (isDevMode) {
					const lineCount = (match.match(/\n/g) || []).length;
					return '\n'.repeat(lineCount);
				}
				return '';
			});
		},
	};
}

// Custom Vite Plugin to remove source map files from production builds
function removeSourceMaps() {
	return {
		name: 'remove-source-maps',
		closeBundle() {
			const distDir = resolve(process.cwd(), 'dist');
			
			function removeMapFiles(dir) {
				if (!existsSync(dir)) return;
				
				const files = readdirSync(dir);
				for (const file of files) {
					const filePath = join(dir, file);
					const stat = statSync(filePath);
					
					if (stat.isDirectory()) {
						removeMapFiles(filePath);
					} else if (file.endsWith('.map')) {
						unlinkSync(filePath);
						console.log(`Removed source map: ${filePath}`);
					}
				}
			}
			
			removeMapFiles(distDir);
		},
	};
}
