'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Step from '@mui/material/Step';
import Paper from '@mui/material/Paper';
import Stepper from '@mui/material/Stepper';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/al/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import type { UserData } from 'src/stores/user';
import type { IVoucher } from 'src/types/voucher';

import { Step1CustomerSelect } from './steps/Step1CustomerSelect';
import { Step2ServiceSelect, type BoardingCartItem } from './steps/Step2ServiceSelect';
import { Step3Weighing } from './steps/Step3Weighing';
import { Step4Payment } from './steps/Step4Payment';
import type { IDeliveryAddressResult } from './components/AddAddressModal';

// ----------------------------------------------------------------------

const STEPS = ['Pilih Customer & Alamat', 'Pilih Layanan', 'Penimbangan & Checkout', 'Pembayaran'];

interface CreatedOrder {
   id: string;
   order_number: string;
   total_bill: number;
   xendit_invoice_url?: string;
}

export function OrderBoardingView() {
   const [activeStep, setActiveStep] = useState(0);

   // Step 1 data
   const [selectedCustomer, setSelectedCustomer] = useState<UserData | null>(null);
   const [selectedAddress, setSelectedAddress] = useState<IDeliveryAddressResult | null>(null);

   // Step 2 data
   const [cartItems, setCartItems] = useState<BoardingCartItem[]>([]);
   const [appliedVoucher, setAppliedVoucher] = useState<IVoucher | null>(null);
   const [discountAmount, setDiscountAmount] = useState(0);

   // Step 3 → 4 data (created order)
   const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

   const handleStep1Next = (customer: UserData, address: IDeliveryAddressResult) => {
      setSelectedCustomer(customer);
      setSelectedAddress(address);
      setActiveStep(1);
   };

   const handleStep2Next = (items: BoardingCartItem[], voucher: IVoucher | null, discount: number) => {
      setCartItems(items);
      setAppliedVoucher(voucher);
      setDiscountAmount(discount);
      setActiveStep(2);
   };

   const handleStep3Next = (order: CreatedOrder) => {
      setCreatedOrder(order);
      setActiveStep(3);
   };

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Buat Pesanan"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Pesanan', href: paths.dashboard.orders.root },
               { name: 'Buat Pesanan' },
            ]}
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         {/* Stepper */}
         <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
               {STEPS.map((label) => (
                  <Step key={label}>
                     <StepLabel>{label}</StepLabel>
                  </Step>
               ))}
            </Stepper>
         </Paper>

         {/* Step Content */}
         <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 2 }}>
            <Box sx={{ minHeight: 400 }}>
               {activeStep === 0 && (
                  <Step1CustomerSelect
                     onNext={handleStep1Next}
                  />
               )}
               {activeStep === 1 && (
                  <Step2ServiceSelect
                     onBack={() => setActiveStep(0)}
                     onNext={handleStep2Next}
                  />
               )}
               {activeStep === 2 && selectedCustomer && selectedAddress && (
                  <Step3Weighing
                     customer={selectedCustomer}
                     address={selectedAddress}
                     cartItems={cartItems}
                     voucher={appliedVoucher}
                     discountAmount={discountAmount}
                     onBack={() => setActiveStep(1)}
                     onNext={handleStep3Next}
                  />
               )}
               {activeStep === 2 && (!selectedCustomer || !selectedAddress) && (
                  <Typography color="error">Data tidak lengkap. Kembali ke langkah 1.</Typography>
               )}
               {activeStep === 3 && createdOrder && (
                  <Step4Payment
                     orderId={createdOrder.id}
                     orderNumber={createdOrder.order_number}
                     totalBill={createdOrder.total_bill}
                     xenditInvoiceUrl={createdOrder.xendit_invoice_url}
                     onBack={() => setActiveStep(2)}
                  />
               )}
            </Box>
         </Paper>
      </DashboardContent>
   );
}
