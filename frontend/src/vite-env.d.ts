/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_BACKEND_URL: string;
	// add other VITE_ variables here
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
