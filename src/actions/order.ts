import axiosInstance, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export const createOrder = async (data: any) => {
   const res = await axiosInstance.post(endpoints.order.create, data);
   return res.data;
};
