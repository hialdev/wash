import type { AxiosRequestConfig } from 'axios';

import axios from 'axios';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

const axiosInstance = axios.create({
   baseURL: CONFIG.serverUrl,
   headers: {
      'Content-Type': 'application/json',
   },
});

/**
 * Optional: Add token (if using auth)
 *
 axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
*
*/

axiosInstance.interceptors.response.use(
   (response) => response,
   (error) => {
      const message = error?.response?.data?.message || error?.message || 'Something went wrong!';
      console.error('Axios error:', message);
      return Promise.reject(new Error(message));
   }
);

export default axiosInstance;

// ----------------------------------------------------------------------

export const fetcher = async <T = unknown>(
   args: string | [string, AxiosRequestConfig]
): Promise<T> => {
   try {
      const [url, config] = Array.isArray(args) ? args : [args, {}];

      const res = await axiosInstance.get<T>(url, config);

      return res.data;
   } catch (error) {
      console.error('Fetcher failed:', error);
      throw error;
   }
};

// ----------------------------------------------------------------------

export const endpoints = {
   chat: '/chat',
   kanban: '/kanban',
   calendar: '/calendar',
   auth: {
      me: '/auth/me',
      signIn: '/auth/sign-in',
      signUp: '/auth/sign-up',
   },
   mail: {
      list: '/mail/list',
      details: '/mail/details',
      labels: '/mail/labels',
   },
   post: {
      list: '/post/list',
      details: '/post/details',
      latest: '/post/latest',
      search: '/post/search',
   },
   product: {
      list: '/product/list',
      details: '/product/details',
      search: '/product/search',
   },
   service: {
      list: '/services',
      details: '/services', // for GET /api/services/:id
      catalog: '/catalog/services',
   },
   order: {
      create: '/order',
   },
   orders: {
      list: '/orders',
   },
} as const;
