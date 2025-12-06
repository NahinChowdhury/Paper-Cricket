import axios from "axios";

export const apiClient = axios.create({
	baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:3001",
	timeout: 5000,
	headers: {
		"Content-Type": "application/json",
	},
});
