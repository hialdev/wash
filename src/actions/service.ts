import type { SWRConfiguration } from 'swr';
import type { IService } from 'src/types/service';

import useSWR from 'swr';
import { useMemo } from 'react';

import { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

const swrOptions: SWRConfiguration = {
   revalidateIfStale: false,
   revalidateOnFocus: false,
   revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

type ServiceResponse = {
   status: string;
   message: string;
   data: {
      services: IService[];
      pagination: {
         total: number;
         page: number;
         limit: number;
         totalPages: number;
      };
   };
};

export function useGetServices(params?: any) {
   const url = params ? [endpoints.service.list, { params }] : endpoints.service.list;

   const { data, isLoading, error, isValidating } = useSWR<ServiceResponse>(url, fetcher, {
      ...swrOptions,
      keepPreviousData: true,
   });

   const memoizedValue = useMemo(
      () => ({
         services: data?.data?.services || [],
         pagination: data?.data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 },
         servicesLoading: isLoading,
         servicesError: error,
         servicesValidating: isValidating,
         servicesEmpty: !isLoading && !isValidating && !data?.data?.services?.length,
      }),
      [data?.data?.services, data?.data?.pagination, error, isLoading, isValidating]
   );

   return memoizedValue;
}

type SingleServiceResponse = {
   status: string;
   message: string;
   data: IService;
};

export function useGetService(serviceId: string) {
   const url = serviceId ? `${endpoints.service.details}/${serviceId}` : '';

   const { data, isLoading, error, isValidating } = useSWR<SingleServiceResponse>(url, fetcher, {
      ...swrOptions,
   });

   const memoizedValue = useMemo(
      () => ({
         service: data?.data,
         serviceLoading: isLoading,
         serviceError: error,
         serviceValidating: isValidating,
      }),
      [data?.data, error, isLoading, isValidating]
   );

   return memoizedValue;
}

export function useGetCatalogServices(params?: any) {
   const url = params ? [endpoints.service.catalog, { params }] : endpoints.service.catalog;

   const { data, isLoading, error, isValidating } = useSWR<ServiceResponse>(url, fetcher, {
      ...swrOptions,
      keepPreviousData: true,
   });

   const memoizedValue = useMemo(
      () => ({
         services: data?.data?.services || [],
         pagination: data?.data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 },
         servicesLoading: isLoading,
         servicesError: error,
         servicesValidating: isValidating,
         servicesEmpty: !isLoading && !isValidating && !data?.data?.services?.length,
      }),
      [data?.data?.services, data?.data?.pagination, error, isLoading, isValidating]
   );

   return memoizedValue;
}
