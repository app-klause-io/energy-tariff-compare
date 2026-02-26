import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// adapter-auto detects the deployment platform automatically.
		// On Vercel, it uses adapter-vercel under the hood.
		// For explicit Vercel deployment, swap to: import adapter from '@sveltejs/adapter-vercel'
		adapter: adapter()
	}
};

export default config;
