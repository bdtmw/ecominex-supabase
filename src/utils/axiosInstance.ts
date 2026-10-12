import axios from 'axios';

// The API is served by this same Next.js app (src/app/api/v1/*)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for sending cookies
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default axiosInstance;