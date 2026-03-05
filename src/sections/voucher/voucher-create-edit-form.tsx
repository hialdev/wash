'use client';

import type { IVoucher } from 'src/types/voucher';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import useVoucherStore from 'src/stores/voucher';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export type VoucherCreateSchemaType = z.infer<typeof VoucherCreateSchema>;

export const VoucherCreateSchema = z.object({
   code: z.string().min(1, { error: 'Code is required!' }),
   description: z.string().optional(),
   discount_type: z.enum(['percentage', 'nominal']),
   discount_value: z.number().min(0, { error: 'Discount value is required!' }),
   max_discount: z.number().min(0).optional(),
   min_purchase: z.number().min(0).optional(),
   quota: z.number().min(0).optional(),
   is_public: z.boolean(),
   is_active: z.boolean(),
   valid_from: z.string().optional().nullable(),
   valid_until: z.string().optional().nullable(),
});

// ----------------------------------------------------------------------

type Props = {
   currentVoucher?: IVoucher;
};

const DISCOUNT_TYPE_OPTIONS = [
   { value: 'nominal', label: 'Nominal (Rp)' },
   { value: 'percentage', label: 'Percentage (%)' },
];

export function VoucherCreateEditForm({ currentVoucher }: Props) {
   const router = useRouter();
   const { createVoucher, updateVoucher } = useVoucherStore();

   const defaultValues: VoucherCreateSchemaType = {
      code: currentVoucher?.code || '',
      description: currentVoucher?.description || '',
      discount_type: currentVoucher?.discount_type || 'nominal',
      discount_value: currentVoucher?.discount_value || 0,
      max_discount: currentVoucher?.max_discount || 0,
      min_purchase: currentVoucher?.min_purchase || 0,
      quota: currentVoucher?.quota || 0,
      is_public: currentVoucher?.is_public ?? true,
      is_active: currentVoucher?.is_active ?? true,
      valid_from: currentVoucher?.valid_from ? currentVoucher.valid_from.split('T')[0] : '',
      valid_until: currentVoucher?.valid_until ? currentVoucher.valid_until.split('T')[0] : '',
   };

   const methods = useForm<VoucherCreateSchemaType>({
      resolver: zodResolver(VoucherCreateSchema),
      defaultValues,
   });

   const {
      reset,
      watch,
      handleSubmit,
      formState: { isSubmitting },
   } = methods;

   const values = watch();

   useEffect(() => {
      if (currentVoucher) {
         reset(defaultValues);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [currentVoucher, reset]);

   const onSubmit = handleSubmit(async (data) => {
      try {
         const payload: any = {
            code: data.code,
            description: data.description,
            discount_type: data.discount_type,
            discount_value: data.discount_value,
            max_discount: data.max_discount || undefined,
            min_purchase: data.min_purchase || undefined,
            quota: data.quota || undefined,
            is_public: data.is_public,
            is_active: data.is_active,
         };

         if (data.valid_from) {
            payload.valid_from = new Date(data.valid_from).toISOString();
         }

         if (data.valid_until) {
            payload.valid_until = new Date(data.valid_until).toISOString();
         }

         if (currentVoucher) {
            await updateVoucher(currentVoucher.id, payload);
            toast.success('Update success!');
         } else {
            await createVoucher(payload);
            toast.success('Create success!');
         }
         router.push(paths.dashboard.voucher.list);
      } catch (error: any) {
         console.error(error);
         toast.error(error.response?.data?.message || error.message || 'Something went wrong');
      }
   });

   return (
      <Form methods={methods} onSubmit={onSubmit}>
         <Stack
            spacing={{ xs: 3, md: 5 }}
            sx={{ mx: 'auto', maxWidth: { xs: '100%', xl: '100%' } }}
         >
            <Card>
               <CardHeader
                  title="Basic Information"
                  subheader="Voucher code, description, type, and visibility"
                  sx={{ mb: 3 }}
               />
               <Divider />
               <Stack spacing={3} sx={{ p: 3 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                     <Field.Text name="code" label="Voucher Code" placeholder="e.g. SUMMER24" />
                     <Field.Select
                        name="discount_type"
                        label="Discount Type"
                        slotProps={{ select: { native: false } }}
                     >
                        {DISCOUNT_TYPE_OPTIONS.map((option) => (
                           <MenuItem key={option.value} value={option.value}>
                              {option.label}
                           </MenuItem>
                        ))}
                     </Field.Select>
                  </Stack>

                  <Field.Text name="description" label="Description" multiline rows={3} />

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                     <FormControlLabel
                        label="Active"
                        control={
                           <Switch
                              checked={values.is_active}
                              onChange={(e) => methods.setValue('is_active', e.target.checked)}
                           />
                        }
                     />
                     <FormControlLabel
                        label="Public (Visible to everyone)"
                        control={
                           <Switch
                              checked={values.is_public}
                              onChange={(e) => methods.setValue('is_public', e.target.checked)}
                           />
                        }
                     />
                  </Stack>
               </Stack>
            </Card>

            <Card>
               <CardHeader title="Discount Rules & Limits" sx={{ mb: 3 }} />
               <Divider />
               <Stack spacing={3} sx={{ p: 3 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                     <Field.Text
                        name="discount_value"
                        label="Discount Value"
                        type="number"
                        slotProps={{
                           inputLabel: { shrink: true },
                           input: {
                              startAdornment: (
                                 <InputAdornment position="start">
                                    {values.discount_type === 'nominal' ? 'Rp' : '%'}
                                 </InputAdornment>
                              ),
                           },
                        }}
                     />
                     <Field.Text
                        name="max_discount"
                        label="Maximum Discount"
                        placeholder="0"
                        type="number"
                        disabled={values.discount_type === 'nominal'}
                        slotProps={{
                           inputLabel: { shrink: true },
                           input: {
                              startAdornment: <InputAdornment position="start">Rp</InputAdornment>,
                           },
                        }}
                     />
                  </Stack>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                     <Field.Text
                        name="min_purchase"
                        label="Minimum Purchase"
                        placeholder="0"
                        type="number"
                        slotProps={{
                           inputLabel: { shrink: true },
                           input: {
                              startAdornment: <InputAdornment position="start">Rp</InputAdornment>,
                           },
                        }}
                     />
                     <Field.Text
                        name="quota"
                        label="Usage Quota"
                        placeholder="0 (Unlimited)"
                        type="number"
                        slotProps={{ inputLabel: { shrink: true } }}
                     />
                  </Stack>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                     <Field.Text
                        name="valid_from"
                        label="Valid From"
                        type="date"
                        slotProps={{ inputLabel: { shrink: true } }}
                     />
                     <Field.Text
                        name="valid_until"
                        label="Valid Until"
                        type="date"
                        slotProps={{ inputLabel: { shrink: true } }}
                     />
                  </Stack>
               </Stack>
            </Card>

            <Stack alignItems="flex-end" sx={{ mt: 3 }}>
               <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                  {!currentVoucher ? 'Create Voucher' : 'Save Changes'}
               </LoadingButton>
            </Stack>
         </Stack>
      </Form>
   );
}
