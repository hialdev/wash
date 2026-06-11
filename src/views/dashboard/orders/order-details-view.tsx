'use client';

import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/al/paths';
import { RouterLink } from 'src/routes/components';
import { useParams } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify';
import { fCurrency } from 'src/utils/format-number';
import { CONFIG } from 'src/global-config';
import { LoadingScreen } from 'src/components/loading-screen';

import useOrderStore from 'src/stores/order';
import useOrderLogStatusStore from 'src/stores/order-log-status';
import useAuthStore from 'src/stores/auth';
import useServiceStore from 'src/stores/service';
import useSettingStore from 'src/stores/setting';
import type { IService } from 'src/types/service';
import { Grid, TextField } from '@mui/material';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import LoadingButton from '@mui/lab/LoadingButton';
import { toast } from 'src/components/snackbar';

import ServiceItem from './components/service-item';
import ServiceSelectModal from './components/service-select-modal';
import UsedRawMaterialList from './components/used-raw-material-list';
import { QuantityController } from './components/quantity-controller';
import OrderProcessPanel from './components/order-process-panel';
import { compressVideo } from 'src/utils/video-compress';

// ----------------------------------------------------------------------

export default function OrderDetailsView() {
   const params = useParams();
   const { id } = params;

   const { detail: getOrder, order } = useOrderStore();
   const { logs, getByOrderId } = useOrderLogStatusStore();
   const { all: getSettings, tabs } = useSettingStore();

   const [loading, setLoading] = useState(true);
   const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
   const [receiptFontSize, setReceiptFontSize] = useState('11px');

   // General states
   const [weightKg, setWeightKg] = useState<string>('');
   const [totalPcs, setTotalPcs] = useState<string>('');
   const [orderNotes, setOrderNotes] = useState<string>('');
   const [fastProcessLoading, setFastProcessLoading] = useState(false);

   // Action loading states
   const [pickupLoading, setPickupLoading] = useState(false);
   const [weighingLoading, setWeighingLoading] = useState(false);
   const [fulfillmentLoading, setFulfillmentLoading] = useState(false);
   const [deliveryLoading, setDeliveryLoading] = useState(false);
   const [completeLoading, setCompleteLoading] = useState(false);

   // Weighing/Detailing state
   const [servicesList, setServicesList] = useState<IService[]>([]);
   const [selectedServices, setSelectedServices] = useState<{ service: IService; variant: IService | null; qty: number }[]>([]);
   const [weighingImages, setWeighingImages] = useState<File[]>([]);
   const [weighingVideo, setWeighingVideo] = useState<File | null>(null);
   const [serviceSelectModalOpen, setServiceSelectModalOpen] = useState(false);
   const [voucherCodeInput, setVoucherCodeInput] = useState('');
   const [compressing, setCompressing] = useState(false);
   const [compressionProgress, setCompressionProgress] = useState(0);
   const paymentFileInputRef = useRef<HTMLInputElement>(null);
   const [paymentUploadLoading, setPaymentUploadLoading] = useState(false);

   // Detailing pieces breakdown
   const [selimutPcs, setSelimutPcs] = useState('0');
   const [celanaPcs, setCelanaPcs] = useState('0');
   const [bajuPcs, setBajuPcs] = useState('0');
   const [sempakPcs, setSempakPcs] = useState('0');
   const [braPcs, setBraPcs] = useState('0');
   const [spreiPcs, setSpreiPcs] = useState('0');
   const [lainnyaPcs, setLainnyaPcs] = useState('0');

   // Below minimum warning dialog
   const [openBelowMinDialog, setOpenBelowMinDialog] = useState(false);
   const [belowMinDetails, setBelowMinDetails] = useState<string[]>([]);
   const [pendingWeighingData, setPendingWeighingData] = useState<FormData | null>(null);

   // Service selection temp states
   const [tempService, setTempService] = useState<IService | null>(null);
   const [tempVariant, setTempVariant] = useState<IService | null>(null);
   const [tempQty, setTempQty] = useState<number>(1);
   const [serviceSearchQuery, setServiceSearchQuery] = useState('');

   // Fulfillment/Delivery state
   const [fulMode, setFulMode] = useState<'pickup' | 'delivery'>('pickup');
   const [packingImages, setPackingImages] = useState<File[]>([]);
   const [delProofImages, setDelProofImages] = useState<File[]>([]);
   const [courierName, setCourierName] = useState('');
   const [courierPhone, setCourierPhone] = useState('');
   const [deliveryAddressInput, setDeliveryAddressInput] = useState('');

   // File input refs
   const weighingFileInputRef = useRef<HTMLInputElement>(null);
   const weighingVideoInputRef = useRef<HTMLInputElement>(null);
   const packingFileInputRef = useRef<HTMLInputElement>(null);
   const proofFileInputRef = useRef<HTMLInputElement>(null);

   useEffect(() => {
      if (order) {
         setWeightKg(order.weight_kg ? order.weight_kg.toString() : '');
         setTotalPcs(order.total_pcs ? order.total_pcs.toString() : '');
         setOrderNotes(order.notes || '');

         setSelimutPcs(order.selimut_pcs ? order.selimut_pcs.toString() : '0');
         setCelanaPcs(order.celana_pcs ? order.celana_pcs.toString() : '0');
         setBajuPcs(order.baju_pcs ? order.baju_pcs.toString() : '0');
         setSempakPcs(order.sempak_pcs ? order.sempak_pcs.toString() : '0');
         setBraPcs(order.bra_pcs ? order.bra_pcs.toString() : '0');
         setSpreiPcs(order.sprei_pcs ? order.sprei_pcs.toString() : '0');
         setLainnyaPcs(order.lainnya_pcs ? order.lainnya_pcs.toString() : '0');
         setDeliveryAddressInput(order.delivery_address || order.address_receiver || '');
         setCourierName(order.delivery_name || '');
         setCourierPhone(order.delivery_phone || '');
         
         // Reset file uploads and temporary form states to avoid leaking data from previous orders
         setWeighingImages([]);
         setWeighingVideo(null);
         setPackingImages([]);
         setDelProofImages([]);
         setVoucherCodeInput('');
         setTempService(null);
         setTempVariant(null);
         setTempQty(1);
         setServiceSearchQuery('');

         if (order.fulfillment_mode) {
            setFulMode(order.fulfillment_mode as any);
         } else {
            setFulMode('pickup');
         }

         if (order.order_services && order.order_services.length > 0) {
            const mapped = order.order_services.map((item: any) => ({
               service: item.service,
               variant: item.service_variant || null,
               qty: item.qty || 1,
            }));
            setSelectedServices(mapped);
         } else {
            setSelectedServices([]);
         }
      }
   }, [order]);

   // Load catalog services when calculating
   useEffect(() => {
      if (order && order.status === 'calculating') {
         const loadServices = async () => {
            try {
               const res = await useServiceStore.getState().fetchCatalogServices({ limit: 100, parent_id: 'none' });
               if (res.success) {
                  setServicesList(res.data?.services || []);
               }
            } catch (error) {
               console.error('Failed to load services:', error);
            }
         };
         loadServices();
      }
   }, [order]);

   const computedTotalPcs =
      (parseInt(selimutPcs, 10) || 0) +
      (parseInt(celanaPcs, 10) || 0) +
      (parseInt(bajuPcs, 10) || 0) +
      (parseInt(sempakPcs, 10) || 0) +
      (parseInt(braPcs, 10) || 0) +
      (parseInt(spreiPcs, 10) || 0) +
      (parseInt(lainnyaPcs, 10) || 0);

   // ---- Handlers for Laundry Flow ----

   const handlePickupDone = async () => {
      setPickupLoading(true);
      try {
         const { pickupDone } = useOrderStore.getState();
         const res = await pickupDone({ id: id as string });
         if (res.success) {
            toast.success('Pakaian berhasil dijemput dan masuk tahap penimbangan!');
            await Promise.all([
               getOrder({ id: id as string }),
               getByOrderId({ orderId: id as string }),
            ]);
         } else {
            toast.error(res.message || 'Gagal memproses penjemputan');
         }
      } catch (error: any) {
         toast.error(error.response?.data?.message || error.message || 'Terjadi kesalahan');
      } finally {
         setPickupLoading(false);
      }
   };

   const handleWeighingSubmit = async (forceConfirm = false) => {
      if (!weightKg || parseFloat(weightKg) <= 0) {
         toast.error('Total Berat harus diisi dan lebih besar dari 0');
         return;
      }
      if (computedTotalPcs <= 0) {
         toast.error('Detail pieces pakaian belum diisi atau total 0');
         return;
      }
      if (selectedServices.length === 0) {
         toast.error('Pilih minimal 1 layanan');
         return;
      }
      if (!forceConfirm && weighingImages.length === 0 && (!order?.weighing_images || order.weighing_images === '[]')) {
         toast.error('Wajib mengunggah foto timbangan sebagai bukti fisik');
         return;
      }
      if (computedTotalPcs > 1 && !weighingVideo && !order?.video) {
         toast.error('Wajib mengunggah video penimbangan untuk cucian lebih dari 1 pakaian!');
         return;
      }

      setWeighingLoading(true);
      try {
         const fd = new FormData();
         fd.append('weight_kg', weightKg);
         fd.append('total_pcs', computedTotalPcs.toString());
         fd.append('selimut_pcs', selimutPcs);
         fd.append('celana_pcs', celanaPcs);
         fd.append('baju_pcs', bajuPcs);
         fd.append('sempak_pcs', sempakPcs);
         fd.append('bra_pcs', braPcs);
         fd.append('sprei_pcs', spreiPcs);
         fd.append('lainnya_pcs', lainnyaPcs);
         fd.append('voucher_code', voucherCodeInput.trim());

         // Map selectedServices to JSON and clamp to minQty as safety
         const servicesPayload = selectedServices.map((item) => {
            const minQty = item.variant?.minimum_qty_order ?? item.service.minimum_qty_order ?? 1;
            const finalQty = isNaN(item.qty) || item.qty < minQty ? minQty : item.qty;
            return {
               service_id: item.service.id,
               service_variant_id: item.variant?.id || undefined,
               qty: parseFloat(finalQty.toFixed(2)),
            };
         });
         fd.append('services', JSON.stringify(servicesPayload));
         fd.append('products', JSON.stringify([]));

         weighingImages.forEach((file) => {
            fd.append('weighing_images', file);
         });

         if (weighingVideo) {
            let videoToUpload = weighingVideo;
            if (weighingVideo.size > 10 * 1024 * 1024) {
               setCompressing(true);
               setCompressionProgress(0);
               try {
                  videoToUpload = await compressVideo(weighingVideo, (p) => {
                     setCompressionProgress(p);
                  });
                  toast.success('Kompresi video berhasil!');
               } catch (compressErr) {
                  console.error('Video compression failed:', compressErr);
                  toast.warning('Kompresi video gagal, mengunggah video asli...');
               } finally {
                  setCompressing(false);
               }
            }
            fd.append('video', videoToUpload);
         }

         const { submitWeighing, confirmMinQty } = useOrderStore.getState();
         
         let res;
         if (forceConfirm) {
            res = await confirmMinQty({ id: id as string, data: fd });
         } else {
            res = await submitWeighing({ id: id as string, data: fd });
         }

         if (res.success) {
            if (res.data?.below_minimum) {
               setBelowMinDetails(res.data.details || []);
               setOpenBelowMinDialog(true);
               setPendingWeighingData(fd);
            } else {
               toast.success('Hasil penimbangan berhasil disimpan!');
               setOpenBelowMinDialog(false);
               setWeighingImages([]);
               setWeighingVideo(null);
               await Promise.all([
                  getOrder({ id: id as string }),
                  getByOrderId({ orderId: id as string }),
               ]);
            }
         } else {
            toast.error(res.message || 'Gagal menyimpan hasil penimbangan');
         }
      } catch (error: any) {
         toast.error(error.response?.data?.message || error.message || 'Terjadi kesalahan');
      } finally {
         setWeighingLoading(false);
      }
   };

   const handleConfirmBelowMin = async () => {
      if (!pendingWeighingData) return;
      setWeighingLoading(true);
      try {
         const { confirmMinQty } = useOrderStore.getState();
         const res = await confirmMinQty({ id: id as string, data: pendingWeighingData });
         if (res.success) {
            toast.success('Hasil penimbangan dengan batas minimum berhasil disimpan!');
            setOpenBelowMinDialog(false);
            setWeighingImages([]);
            setWeighingVideo(null);
            setPendingWeighingData(null);
            await Promise.all([
               getOrder({ id: id as string }),
               getByOrderId({ orderId: id as string }),
            ]);
         } else {
            toast.error(res.message || 'Gagal mengonfirmasi batas minimum');
         }
      } catch (error: any) {
         toast.error(error.response?.data?.message || error.message || 'Terjadi kesalahan');
      } finally {
         setWeighingLoading(false);
      }
   };

   const handleFulfillmentSubmit = async () => {
      if (packingImages.length === 0 && (!order?.packing_images || order.packing_images === '[]')) {
         toast.error('Wajib mengunggah foto packing laundry sebagai bukti selesai dikemas');
         return;
      }
      if (fulMode === 'delivery' && !courierName) {
         toast.error('Nama pengantar / kurir harus diisi');
         return;
      }

      setFulfillmentLoading(true);
      try {
         const fd = new FormData();
         fd.append('fulfillment_mode', fulMode);
         if (fulMode === 'delivery') {
            fd.append('delivery_name', courierName);
            fd.append('delivery_phone', courierPhone);
            fd.append('delivery_address', deliveryAddressInput);
         }
         packingImages.forEach((file) => {
            fd.append('packing_images', file);
         });

         const { setFulfillmentMode } = useOrderStore.getState();
         const res = await setFulfillmentMode({ id: id as string, data: fd });

         if (res.success) {
            toast.success('Kemasan pakaian & mode pemenuhan berhasil disimpan!');
            setPackingImages([]);
            await Promise.all([
               getOrder({ id: id as string }),
               getByOrderId({ orderId: id as string }),
            ]);
         } else {
            toast.error(res.message || 'Gagal menyimpan fulfillment');
         }
      } catch (error: any) {
         toast.error(error.response?.data?.message || error.message || 'Terjadi kesalahan');
      } finally {
         setFulfillmentLoading(false);
      }
   };

   const handleStartDelivery = async () => {
      if (!courierName) {
         toast.error('Nama kurir harus diisi untuk memulai pengiriman');
         return;
      }
      setDeliveryLoading(true);
      try {
         const fd = new FormData();
         fd.append('delivery_name', courierName);
         fd.append('delivery_phone', courierPhone);
         fd.append('delivery_address', deliveryAddressInput);

         const { startDelivery } = useOrderStore.getState();
         const res = await startDelivery({ id: id as string, data: fd });

         if (res.success) {
            toast.success('Pengiriman dimulai!');
            await Promise.all([
               getOrder({ id: id as string }),
               getByOrderId({ orderId: id as string }),
            ]);
         } else {
            toast.error(res.message || 'Gagal memulai pengantaran');
         }
      } catch (error: any) {
         toast.error(error.response?.data?.message || error.message || 'Terjadi kesalahan');
      } finally {
         setDeliveryLoading(false);
      }
   };

   const handleCompleteOrder = async () => {
      if (delProofImages.length === 0) {
         toast.error('Wajib mengunggah foto bukti serah terima');
         return;
      }

      setCompleteLoading(true);
      try {
         const fd = new FormData();
         delProofImages.forEach((file) => {
            fd.append('delivery_proof_images', file);
         });

         const { completeOrder } = useOrderStore.getState();
         const res = await completeOrder({ id: id as string, data: fd });

         if (res.success) {
            toast.success('Cucian selesai dan diterima customer!');
            setDelProofImages([]);
            await Promise.all([
               getOrder({ id: id as string }),
               getByOrderId({ orderId: id as string }),
            ]);
         } else {
            toast.error(res.message || 'Gagal menyelesaikan order');
         }
      } catch (error: any) {
         toast.error(error.response?.data?.message || error.message || 'Terjadi kesalahan');
      } finally {
         setCompleteLoading(false);
      }
   };

   // ---- Service List Helpers ----

   const handleAddServiceItem = () => {
      if (!tempService) return;
      // Check if already in list
      const exists = selectedServices.some(
         (item) => item.service.id === tempService.id && (tempVariant ? item.variant?.id === tempVariant.id : !item.variant)
      );
      if (exists) {
         toast.error('Layanan sudah ada di daftar penimbangan');
         return;
      }

      setSelectedServices((prev) => [...prev, { service: tempService, variant: tempVariant, qty: tempQty }]);
      setTempService(null);
      setTempVariant(null);
      setTempQty(1);
   };

   const handleRemoveServiceItem = (idx: number) => {
      setSelectedServices((prev) => prev.filter((_, i) => i !== idx));
   };

   const handleUpdateServiceItemQty = (idx: number, newQty: number) => {
      setSelectedServices((prev) => {
         const next = [...prev];
         const item = next[idx];
         next[idx] = { ...item, qty: newQty };
         return next;
      });
   };

   const handlePaymentProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setPaymentUploadLoading(true);
      try {
         const fd = new FormData();
         fd.append('payment_proof', file);

         const { uploadPaymentProof } = useOrderStore.getState();
         const res = await uploadPaymentProof({ id: id as string, data: fd });

         if (res.success) {
            toast.success('Bukti pembayaran berhasil diunggah!');
            await Promise.all([
               getOrder({ id: id as string }),
               getByOrderId({ orderId: id as string }),
            ]);
         } else {
            toast.error(res.message || 'Gagal mengunggah bukti pembayaran');
         }
      } catch (error: any) {
         toast.error(error.response?.data?.message || error.message || 'Terjadi kesalahan');
      } finally {
         setPaymentUploadLoading(false);
         if (paymentFileInputRef.current) {
            paymentFileInputRef.current.value = '';
         }
      }
   };

   // ---- End of Handlers ----

   const handleFastProcessSubmit = async () => {
      setFastProcessLoading(true);
      try {
         const { kasirValidateAndProcess } = useOrderStore.getState();
         const res = await kasirValidateAndProcess({
            id: id as string,
            data: {
               weight_kg: weightKg ? parseFloat(weightKg) : undefined,
               total_pcs: totalPcs ? parseInt(totalPcs, 10) : undefined,
               notes: orderNotes || undefined,
            }
         });
         
         if (res.success) {
            toast.success('Pesanan berhasil divalidasi dan diproses!');
            await Promise.all([
               getOrder({ id: id as string }),
               getByOrderId({ orderId: id as string }),
            ]);
         } else {
            toast.error(res.message || 'Gagal memproses pesanan');
         }
      } catch (error: any) {
         toast.error(error.response?.data?.message || error.message || 'Terjadi kesalahan saat memproses');
      } finally {
         setFastProcessLoading(false);
      }
   };

   const { user } = useAuthStore();
   const canReadRawMaterial = (user?.permissions ?? []).includes('Read RawMaterial');

   useEffect(() => {
      const init = async () => {
         if (id) {
            setLoading(true);
            try {
               await Promise.all([
                  getOrder({ id: id as string }),
                  getByOrderId({ orderId: id as string }),
               ]);
            } catch (error) {
               console.error('Failed to init order details:', error);
            } finally {
               setLoading(false);
            }
         }
      };
      init();
   }, [id, getOrder, getByOrderId]);

   useEffect(() => {
      getSettings();
   }, [getSettings]);

   if (loading) {
      return <LoadingScreen />;
   }

   if (!order) {
      return (
         <DashboardContent>
            <Box sx={{ textAlign: 'center', py: 10 }}>
               <Typography variant="h6">Order not found</Typography>
            </Box>
         </DashboardContent>
      );
   }

   const statusColor: Record<string, any> = {
      pickup: 'info',
      calculating: 'warning',
      waiting_payment: 'warning',
      waiting_process: 'info',
      payment_verification: 'info',
      on_progress: 'primary',
      waiting_finish: 'success',
      delivering: 'primary',
      finish: 'success',
      stock_issue: 'error',
      waiting_restock: 'info',
      refund_pending: 'warning',
      refunded: 'error',
      canceled: 'error',
   };

   const statusLabel: Record<string, string> = {
      pickup: 'Penjemputan',
      calculating: 'Penimbangan',
      waiting_payment: 'Menunggu Pembayaran',
      waiting_process: 'Menunggu Diproses',
      payment_verification: 'Verifikasi Pembayaran',
      on_progress: 'Dalam Proses',
      waiting_finish: 'Siap Diambil/Diantar',
      delivering: 'Sedang Diantar',
      finish: 'Selesai',
      stock_issue: 'Masalah Stok',
      waiting_restock: 'Menunggu Restock',
      refund_pending: 'Refund Pending',
      refunded: 'Refunded',
      canceled: 'Dibatalkan',
   };

   const parseImages = (imagesStr?: string): string[] => {
      if (!imagesStr) return [];
      try {
         return JSON.parse(imagesStr);
      } catch {
         return [];
      }
   };

   const handleSendWhatsapp = () => {
      if (!order) return;

      const formatMoney = (num: number) => "Rp " + Math.round(num).toLocaleString('id-ID');

      let text = `*📄 NOTA TRANSAKSI LAUNDRY*\n`;
      text += `------------------------------------------\n`;
      text += `*No. Pesanan:* ${order.order_number}\n`;
      text += `*Status:* ${statusLabel[order.status || 'waiting_payment']}\n`;
      text += `*Tanggal:* ${dayjs(order.created_at).format('DD MMM YYYY HH:mm')}\n\n`;

      text += `*Pelanggan:*\n`;
      text += `👤 ${order.phone_receiver}\n`;
      text += `📍 ${order.address_receiver}\n\n`;

      text += `*Rincian Layanan / Produk:*\n`;
      text += `\`\`\`\n`; // Monospace block

      if (order.order_services && order.order_services.length > 0) {
         order.order_services.forEach((item: any) => {
            const sName = `${item.service?.name || 'Layanan'}${
               item.service_variant?.name ? ` - ${item.service_variant.name}` : ''
            }`;
            const sSub = (item.price_at_order || 0) * (item.qty || 0);
            text += `${sName.substring(0, 22).padEnd(22)} x${item.qty}\n`;
            text += `  -> ${formatMoney(sSub)}\n`;
         });
      }

      if (order.order_products && order.order_products.length > 0) {
         order.order_products.forEach((item: any) => {
            const pName = item.product?.title || 'Produk';
            const isIndividual = item.product?.tracking_mode === 'individual';
            const pSub = isIndividual
               ? (item.price_at_order || 0) * (item.requested_length || 0) * (item.qty || 0)
               : (item.price_at_order || 0) * (item.qty || 0);
            text += `${pName.substring(0, 22).padEnd(22)} x${item.qty}\n`;
            text += `  -> ${formatMoney(pSub)}\n`;
         });
      }

      text += `\`\`\`\n`; // End Monospace block
      text += `------------------------------------------\n`;
      text += `*Total Berat:* ${order.weight_kg ? `${order.weight_kg} kg` : '-'}\n`;
      text += `*Total Pcs:* ${order.total_pcs ? `${order.total_pcs} Pcs` : '-'}\n`;

      const detailingBreakdown: string[] = [];
      if (order.selimut_pcs) detailingBreakdown.push(`- Selimut: ${order.selimut_pcs} Pcs`);
      if (order.celana_pcs) detailingBreakdown.push(`- Celana: ${order.celana_pcs} Pcs`);
      if (order.baju_pcs) detailingBreakdown.push(`- Baju: ${order.baju_pcs} Pcs`);
      if (order.sempak_pcs) detailingBreakdown.push(`- Sempak: ${order.sempak_pcs} Pcs`);
      if (order.bra_pcs) detailingBreakdown.push(`- Bra: ${order.bra_pcs} Pcs`);
      if (order.sprei_pcs) detailingBreakdown.push(`- Sprei: ${order.sprei_pcs} Pcs`);
      if (order.lainnya_pcs) detailingBreakdown.push(`- Lainnya: ${order.lainnya_pcs} Pcs`);

      if (detailingBreakdown.length > 0) {
         text += `*Rincian Pcs:*\n${detailingBreakdown.join('\n')}\n`;
      }

      text += `*Catatan:* ${order.notes || '-'}\n\n`;

      if ((order.discount_amount || 0) > 0) {
         text += `*Potongan:* -${formatMoney(order.discount_amount || 0)}\n`;
      }
      text += `*💳 TOTAL TAGIHAN: ${formatMoney(order.total_bill || 0)}*\n\n`;

      text += `Terima kasih telah mempercayai layanan laundry kami! 🙏😊`;

      let phone = order.phone_receiver || '';
      phone = phone.replace(/\D/g, '');
      if (phone.startsWith('0')) {
         phone = '62' + phone.substring(1);
      }

      const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
   };

   const handlePrintReceipt = () => {
      setPrintPreviewOpen(true);
   };

   const executePrintReceipt = () => {
      if (!order) return;

      const allSettings = tabs.flatMap((tab) => tab.settings || []);
      const appNameSetting = allSettings.find((s) => s.set_key === 'dash.app_name');
      const appDescSetting = allSettings.find((s) => s.set_key === 'dash.app_description');
      const logoSetting = allSettings.find((s) => s.set_key === 'dash.logo');

      const appName = appNameSetting?.set_value || 'POS EMA WASH';
      const appDesc = appDescSetting?.set_value || 'POS EMA WASH - Laundry & Dry Cleaning. Bismillah Berkah Dunia Akhirat.';

      const cashierName = user?.name || user?.username || 'Kasir';
      const orderDate = order.created_at ? dayjs(order.created_at).format('DD/MM/YYYY HH:mm') : dayjs().format('DD/MM/YYYY HH:mm');
      const customerName = order.user?.name || 'Pelanggan';
      const customerPhone = order.phone_receiver || '-';
      const customerAddress = order.address_receiver || '-';
      const orderNum = order.order_number || '-';

      const itemsRows = (order.order_services || [])
         .map((item: any) => {
            const name = item.service_variant
               ? `${item.service?.name} (${item.service_variant?.name})`
               : item.service?.name || 'Layanan';
            return `
               <tr>
                  <td style="width: 48%; padding: 4px 0; word-break: break-word; vertical-align: top;">${name}</td>
                  <td class="text-right" style="width: 15%; padding: 4px 0; vertical-align: top;">${item.qty || 1}</td>
                  <td class="text-right" style="width: 37%; padding: 4px 0; vertical-align: top;">${fCurrency(item.subtotal || 0)}</td>
               </tr>
            `;
         })
         .join('');

      const subtotalPrice = (order.order_services || []).reduce(
         (acc: number, item: any) => acc + (item.subtotal || 0),
         0
      );

      const discountAmount = order.discount_amount || 0;
      const voucherRow = discountAmount > 0
         ? `<tr><td style="padding: 2px 0;">Potongan (Voucher)</td><td class="text-right" style="padding: 2px 0; color: red;">-${fCurrency(discountAmount)}</td></tr>`
         : '';

      const printHtml = `
         <html>
         <head>
            <title>Struk POS - ${orderNum}</title>
            <style>
               @page {
                  size: 58mm auto;
                  margin: 0;
               }
               body {
                  width: 52mm;
                  margin: 0 auto;
                  padding: 8px 1px;
                  font-family: 'Courier New', Courier, monospace;
                  font-size: ${receiptFontSize};
                  line-height: 1.3;
                  color: #000;
                  background-color: #fff;
               }
               .text-center { text-align: center; }
               .text-right { text-align: right; }
               .bold { font-weight: bold; }
               .header { margin-bottom: 12px; }
               .header h2 { margin: 0 0 3px 0; font-size: 1.2em; text-transform: uppercase; }
               .logo-container { text-align: center; margin-bottom: 8px; }
               .bw-logo { max-width: 10mm; max-height: 10mm; filter: grayscale(100%) brightness(0.9) contrast(1.5); display: inline-block; }
               .divider { border-top: 1px dashed #000; margin: 8px 0; }
               .info-table, .items-table { width: 100%; border-collapse: collapse; font-size: inherit; }
               .info-table td { padding: 1px 0; vertical-align: top; }
               .info-table td:first-child { width: 32%; color: #333; }
               .items-table th { border-bottom: 1px dashed #000; text-align: left; padding: 3px 0; }
               .items-table td { vertical-align: top; }
               .totals { width: 100%; margin-top: 6px; border-collapse: collapse; font-size: inherit; }
               .totals td { padding: 1px 0; }
               .totals td:first-child { width: 55%; }
               .footer { margin-top: 15px; text-align: center; font-size: 0.8em; line-height: 1.4; }
            </style>
         </head>
         <body>
            <div class="header text-center">
               ${logoSetting?.set_value ? `
                  <div class="logo-container">
                     <img src="${process.env.NEXT_PUBLIC_API_HOST}/${logoSetting.set_value}" class="bw-logo" />
                  </div>
               ` : ''}
               <h2>${appName}</h2>
               <div style="white-space: pre-wrap; font-size: 0.8em; margin-top: 2px;">${appDesc}</div>
            </div>
            <div class="divider"></div>
            <table class="info-table">
               <tr><td>No Order</td><td class="bold">: ${orderNum}</td></tr>
               <tr><td>Tanggal</td><td>: ${orderDate}</td></tr>
               <tr><td>Pelanggan</td><td>: ${customerName}</td></tr>
               <tr><td>No HP</td><td>: ${customerPhone}</td></tr>
               <tr><td>Alamat</td><td>: ${customerAddress}</td></tr>
               <tr><td>Kasir</td><td>: ${cashierName}</td></tr>
            </table>
            <div class="divider"></div>
            <table class="items-table">
               <thead>
                  <tr>
                     <th style="width: 48%;">Layanan</th>
                     <th class="text-right" style="width: 15%;">Qty</th>
                     <th class="text-right" style="width: 37%;">Subtotal</th>
                  </tr>
               </thead>
               <tbody>
                  ${itemsRows}
               </tbody>
            </table>
            <div class="divider"></div>
            <table class="totals">
               <tr>
                  <td>Total Pcs: ${order.total_pcs || 0}</td>
                  <td class="text-right">Berat: ${order.weight_kg ? order.weight_kg.toFixed(2) : '0.00'} kg</td>
               </tr>
            </table>
            <div class="divider"></div>
            <table class="totals">
               <tr><td>Subtotal</td><td class="text-right">: ${fCurrency(subtotalPrice)}</td></tr>
               ${voucherRow}
               <tr class="bold"><td>Grand Total</td><td class="text-right">: ${fCurrency(order.total_bill || 0)}</td></tr>
            </table>
            <div class="divider"></div>
            <div class="footer">
               <div class="bold">Terima kasih atas kunjungan Anda!</div>
               <div style="margin-top: 3px;">Pakaian bersih & rapi adalah prioritas kami. 🙏😊</div>
            </div>
            <script>
               window.onload = function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 500);
               };
            </script>
         </body>
         </html>
      `;

      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (printWindow) {
         printWindow.document.write(printHtml);
         printWindow.document.close();
         setPrintPreviewOpen(false);
      } else {
         toast.error('Gagal membuka jendela cetak. Pastikan pop-up blocker Anda dinonaktifkan.');
      }
   };

   const renderPrintPreviewDialog = () => {
      if (!order) return null;

      const allSettings = tabs.flatMap((tab) => tab.settings || []);
      const appNameSetting = allSettings.find((s) => s.set_key === 'dash.app_name');
      const appDescSetting = allSettings.find((s) => s.set_key === 'dash.app_description');
      const logoSetting = allSettings.find((s) => s.set_key === 'dash.logo');

      const appName = appNameSetting?.set_value || 'POS EMA WASH';
      const appDesc = appDescSetting?.set_value || 'POS EMA WASH - Laundry & Dry Cleaning. Bismillah Berkah Dunia Akhirat.';

      const cashierName = user?.name || user?.username || 'Kasir';
      const orderDate = order.created_at ? dayjs(order.created_at).format('DD/MM/YYYY HH:mm') : dayjs().format('DD/MM/YYYY HH:mm');
      const customerName = order.user?.name || 'Pelanggan';
      const customerPhone = order.phone_receiver || '-';
      const customerAddress = order.address_receiver || '-';
      const orderNum = order.order_number || '-';

      const subtotalPrice = (order.order_services || []).reduce(
         (acc: number, item: any) => acc + (item.subtotal || 0),
         0
      );

      const discountAmount = order.discount_amount || 0;

      return (
         <Dialog open={printPreviewOpen} onClose={() => setPrintPreviewOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5 }}>
               <span>Pratinjau Struk</span>
               <FormControl size="small" sx={{ width: 140 }}>
                  <InputLabel id="font-size-label">Ukuran Font</InputLabel>
                  <Select
                     labelId="font-size-label"
                     value={receiptFontSize}
                     label="Ukuran Font"
                     onChange={(e) => setReceiptFontSize(e.target.value)}
                  >
                     <MenuItem value="9px">Kecil (9px)</MenuItem>
                     <MenuItem value="10px">Sedang (10px)</MenuItem>
                     <MenuItem value="11px">Normal (11px)</MenuItem>
                     <MenuItem value="12px">Besar (12px)</MenuItem>
                     <MenuItem value="13px">Sangat Besar (13px)</MenuItem>
                     <MenuItem value="14px">Ekstra Besar (14px)</MenuItem>
                  </Select>
               </FormControl>
            </DialogTitle>
            <DialogContent dividers sx={{ bgcolor: 'background.neutral', display: 'flex', justifyContent: 'center', py: 3 }}>
               {/* Kertas Struk 58mm */}
               <div
                  style={{
                     width: '52mm',
                     minHeight: '100px',
                     backgroundColor: '#fff',
                     boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                     padding: '8px 4px',
                     boxSizing: 'border-box',
                     fontFamily: "'Courier New', Courier, monospace",
                     fontSize: receiptFontSize,
                     lineHeight: 1.3,
                     color: '#000',
                  }}
               >
                  {/* Header */}
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                     {logoSetting?.set_value && (
                        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                           <img
                              src={`${process.env.NEXT_PUBLIC_API_HOST}/${logoSetting.set_value}`}
                              style={{
                                 maxWidth: '10mm',
                                 maxHeight: '10mm',
                                 filter: 'grayscale(100%) brightness(0.9) contrast(1.5)',
                                 display: 'inline-block',
                              }}
                              alt="Logo"
                           />
                        </div>
                     )}
                     <h2 style={{ margin: '0 0 3px 0', fontSize: '1.2em', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        {appName}
                     </h2>
                     <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.8em', marginTop: '2px' }}>
                        {appDesc}
                     </div>
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

                  {/* Info */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'inherit', fontFamily: 'inherit' }}>
                     <tbody>
                        <tr><td style={{ width: '32%', verticalAlign: 'top' }}>No Order</td><td style={{ fontWeight: 'bold', verticalAlign: 'top' }}>: {orderNum}</td></tr>
                        <tr><td style={{ verticalAlign: 'top' }}>Tanggal</td><td style={{ verticalAlign: 'top' }}>: {orderDate}</td></tr>
                        <tr><td style={{ verticalAlign: 'top' }}>Pelanggan</td><td style={{ verticalAlign: 'top' }}>: {customerName}</td></tr>
                        <tr><td style={{ verticalAlign: 'top' }}>No HP</td><td style={{ verticalAlign: 'top' }}>: {customerPhone}</td></tr>
                        <tr><td style={{ verticalAlign: 'top' }}>Alamat</td><td style={{ verticalAlign: 'top' }}>: {customerAddress}</td></tr>
                        <tr><td style={{ verticalAlign: 'top' }}>Kasir</td><td style={{ verticalAlign: 'top' }}>: {cashierName}</td></tr>
                     </tbody>
                  </table>

                  {/* Divider */}
                  <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

                  {/* Items */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'inherit', fontFamily: 'inherit' }}>
                     <thead>
                        <tr>
                           <th style={{ textAlign: 'left', borderBottom: '1px dashed #000', padding: '3px 0', width: '48%', fontFamily: 'inherit', fontSize: 'inherit' }}>Layanan</th>
                           <th style={{ textAlign: 'right', borderBottom: '1px dashed #000', padding: '3px 0', width: '15%', fontFamily: 'inherit', fontSize: 'inherit' }}>Qty</th>
                           <th style={{ textAlign: 'right', borderBottom: '1px dashed #000', padding: '3px 0', width: '37%', fontFamily: 'inherit', fontSize: 'inherit' }}>Subtotal</th>
                        </tr>
                     </thead>
                     <tbody>
                        {(order.order_services || []).map((item: any, idx: number) => {
                           const name = item.service_variant
                              ? `${item.service?.name} (${item.service_variant?.name})`
                              : item.service?.name || 'Layanan';
                           return (
                              <tr key={idx}>
                                 <td style={{ padding: '4px 0', wordBreak: 'break-word', width: '48%', verticalAlign: 'top' }}>{name}</td>
                                 <td style={{ textAlign: 'right', padding: '4px 0', width: '15%', verticalAlign: 'top' }}>{item.qty || 1}</td>
                                 <td style={{ textAlign: 'right', padding: '4px 0', width: '37%', verticalAlign: 'top' }}>{fCurrency(item.subtotal || 0)}</td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>

                  {/* Divider */}
                  <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

                  {/* Totals */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'inherit', fontFamily: 'inherit' }}>
                     <tbody>
                        <tr>
                           <td style={{ width: '55%', verticalAlign: 'top' }}>Total Pcs: {order.total_pcs || 0}</td>
                           <td style={{ textAlign: 'right', verticalAlign: 'top' }}>Berat: {order.weight_kg ? order.weight_kg.toFixed(2) : '0.00'} kg</td>
                        </tr>
                     </tbody>
                  </table>

                  {/* Divider */}
                  <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

                  {/* Totals Grand */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'inherit', fontFamily: 'inherit' }}>
                     <tbody>
                        <tr>
                           <td style={{ width: '55%', padding: '1px 0', verticalAlign: 'top' }}>Subtotal</td>
                           <td style={{ textAlign: 'right', padding: '1px 0', verticalAlign: 'top' }}>: {fCurrency(subtotalPrice)}</td>
                        </tr>
                        {discountAmount > 0 && (
                           <tr>
                              <td style={{ padding: '2px 0', verticalAlign: 'top' }}>Potongan (Voucher)</td>
                              <td style={{ textAlign: 'right', padding: '2px 0', color: 'red', verticalAlign: 'top' }}>:-{fCurrency(discountAmount)}</td>
                           </tr>
                        )}
                        <tr style={{ fontWeight: 'bold' }}>
                           <td style={{ padding: '1px 0', verticalAlign: 'top' }}>Grand Total</td>
                           <td style={{ textAlign: 'right', padding: '1px 0', verticalAlign: 'top' }}>: {fCurrency(order.total_bill || 0)}</td>
                        </tr>
                     </tbody>
                  </table>

                  {/* Divider */}
                  <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

                  {/* Footer */}
                  <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '0.8em' }}>
                     <div style={{ fontWeight: 'bold' }}>Terima kasih atas kunjungan Anda!</div>
                     <div style={{ marginTop: '3px' }}>Pakaian bersih & rapi adalah prioritas kami. 🙏😊</div>
                  </div>
               </div>
            </DialogContent>
            <DialogActions>
               <Button onClick={() => setPrintPreviewOpen(false)}>Batal</Button>
               <Button variant="contained" onClick={executePrintReceipt}>
                  Cetak Sekarang
               </Button>
            </DialogActions>
         </Dialog>
      );
   };

   return (
      <DashboardContent>
         <CustomBreadcrumbs
            heading="Order Details"
            links={[
               { name: 'Dashboard', href: paths.dashboard.root },
               { name: 'Orders', href: paths.dashboard.orders.root },
               { name: order.order_number },
            ]}
            action={
               <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}
                  onClick={handlePrintReceipt}
               >
                  Cetak Struk
               </Button>
            }
            sx={{ mb: { xs: 3, md: 5 } }}
         />

         {/* STATUS PANEL 1: pickup */}
         {order.status === 'pickup' && (
            <Card sx={{ mb: 3, border: 1, borderColor: 'info.lighter', bgcolor: 'background.neutral' }}>
               <CardHeader
                  title={
                     <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon="solar:delivery-bold-duotone" width={24} sx={{ color: 'info.main' }} />
                        <Typography variant="h6">Penjemputan Pakaian</Typography>
                     </Stack>
                  }
                  subheader="Barang sedang dijemput oleh kurir dari alamat customer"
                  sx={{ pb: 2 }}
               />
               <Divider />
               <CardContent>
                  <Grid container spacing={3}>
                     <Grid size={{ xs: 12, md: 8 }}>
                        <Stack spacing={1.5}>
                           <Box>
                              <Typography variant="caption" color="text.secondary" display="block">Alamat Penjemputan:</Typography>
                              <Typography variant="subtitle1" fontWeight={700}>{order.address_receiver}</Typography>
                           </Box>
                           <Box>
                              <Typography variant="caption" color="text.secondary" display="block">No. Telepon Customer:</Typography>
                              <Typography variant="subtitle1" fontWeight={700}>{order.phone_receiver}</Typography>
                           </Box>
                        </Stack>
                     </Grid>
                     <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <LoadingButton
                           size="large"
                           variant="contained"
                           color="info"
                           loading={pickupLoading}
                           onClick={handlePickupDone}
                           startIcon={<Iconify icon="solar:check-circle-bold" />}
                           fullWidth
                        >
                           Pakaian Sudah Dijemput
                        </LoadingButton>
                     </Grid>
                  </Grid>
               </CardContent>
            </Card>
         )}

         {/* STATUS PANEL 2: calculating */}
         {order.status === 'calculating' && (
            <Card sx={{ mb: 3, border: 1, borderColor: 'warning.light', bgcolor: 'background.neutral' }}>
               <CardHeader
                  title={
                     <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon="solar:scale-bold-duotone" width={24} sx={{ color: 'warning.main' }} />
                        <Typography variant="h6">Tahap Penimbangan & Detailing</Typography>
                     </Stack>
                  }
                  subheader="Timbang pakaian, rinci jenis item, dan pilih layanan yang sesuai"
                  sx={{ pb: 2 }}
               />
               <Divider />
               <CardContent>
                  <Grid container spacing={3}>
                     {/* Detailing Breakdown & Weight */}
                     <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>Detailing Jumlah Pakaian (Pcs):</Typography>
                        <Grid container spacing={2}>
                           <Grid size={{ xs: 6, sm: 4 }}>
                              <TextField
                                 fullWidth
                                 label="Baju"
                                 type="number"
                                 value={bajuPcs}
                                 onChange={(e) => setBajuPcs(e.target.value)}
                              />
                           </Grid>
                           <Grid size={{ xs: 6, sm: 4 }}>
                              <TextField
                                 fullWidth
                                 label="Celana"
                                 type="number"
                                 value={celanaPcs}
                                 onChange={(e) => setCelanaPcs(e.target.value)}
                              />
                           </Grid>
                           <Grid size={{ xs: 6, sm: 4 }}>
                              <TextField
                                 fullWidth
                                 label="Selimut"
                                 type="number"
                                 value={selimutPcs}
                                 onChange={(e) => setSelimutPcs(e.target.value)}
                              />
                           </Grid>
                           <Grid size={{ xs: 6, sm: 4 }}>
                              <TextField
                                 fullWidth
                                 label="Sprei"
                                 type="number"
                                 value={spreiPcs}
                                 onChange={(e) => setSpreiPcs(e.target.value)}
                              />
                           </Grid>
                           <Grid size={{ xs: 6, sm: 4 }}>
                              <TextField
                                 fullWidth
                                 label="Sempak"
                                 type="number"
                                 value={sempakPcs}
                                 onChange={(e) => setSempakPcs(e.target.value)}
                              />
                           </Grid>
                           <Grid size={{ xs: 6, sm: 4 }}>
                              <TextField
                                 fullWidth
                                 label="Bra"
                                 type="number"
                                 value={braPcs}
                                 onChange={(e) => setBraPcs(e.target.value)}
                              />
                           </Grid>
                           <Grid size={{ xs: 12 }}>
                              <TextField
                                 fullWidth
                                 label="Lainnya"
                                 type="number"
                                 value={lainnyaPcs}
                                 onChange={(e) => setLainnyaPcs(e.target.value)}
                              />
                           </Grid>
                        </Grid>

                        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                           <TextField
                              fullWidth
                              label="Total Berat"
                              placeholder="0.00"
                              type="number"
                              value={weightKg}
                              onChange={(e) => setWeightKg(e.target.value)}
                              slotProps={{
                                 input: {
                                    endAdornment: <Typography variant="body2" color="text.secondary">kg</Typography>
                                 }
                              }}
                           />
                           <TextField
                              fullWidth
                              label="Total Pieces"
                              disabled
                              value={computedTotalPcs}
                              slotProps={{
                                 input: {
                                    endAdornment: <Typography variant="body2" color="text.secondary">Pcs</Typography>
                                 }
                              }}
                           />
                        </Stack>
                     </Grid>

                     {/* Service Selector & Photo Proof */}
                     <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Bukti Timbangan Fisik:</Typography>
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                           <Grid size={{ xs: 12, sm: 6 }}>
                              <Button
                                 variant="outlined"
                                 color="warning"
                                 startIcon={<Iconify icon="solar:camera-bold" />}
                                 onClick={() => weighingFileInputRef.current?.click()}
                                 fullWidth
                                 sx={{ py: 1.5 }}
                              >
                                 {weighingImages.length > 0 ? `${weighingImages.length} Foto` : 'Upload Foto (Wajib)'}
                              </Button>
                              <input
                                 ref={weighingFileInputRef}
                                 type="file"
                                 accept="image/*"
                                 multiple
                                 hidden
                                 onChange={(e) => {
                                    if (e.target.files) setWeighingImages(Array.from(e.target.files));
                                 }}
                              />
                           </Grid>
                           <Grid size={{ xs: 12, sm: 6 }}>
                              <Button
                                 variant="outlined"
                                 color="warning"
                                 startIcon={<Iconify icon="solar:videocamera-record-bold" />}
                                 onClick={() => weighingVideoInputRef.current?.click()}
                                 fullWidth
                                 sx={{ py: 1.5 }}
                              >
                                 {weighingVideo ? 'Video Terpilih' : computedTotalPcs > 1 ? 'Upload Video (Wajib)' : 'Upload Video (Opsional)'}
                              </Button>
                              <input
                                 ref={weighingVideoInputRef}
                                 type="file"
                                 accept="video/*"
                                 hidden
                                 onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                       setWeighingVideo(e.target.files[0]);
                                    }
                                 }}
                              />
                           </Grid>
                        </Grid>

                        {/* Preview files */}
                        {(weighingImages.length > 0 || weighingVideo) && (
                           <Stack direction="row" spacing={1} sx={{ mt: -2, mb: 3 }} flexWrap="wrap" alignItems="center">
                              {weighingImages.map((f, i) => (
                                 <Box
                                    key={i}
                                    component="img"
                                    src={URL.createObjectURL(f)}
                                    sx={{ width: 60, height: 60, borderRadius: 1, objectFit: 'cover', border: 1, borderColor: 'divider' }}
                                 />
                              ))}
                              {weighingVideo && (
                                 <Box
                                    sx={{
                                       width: 60,
                                       height: 60,
                                       borderRadius: 1,
                                       bgcolor: 'background.neutral',
                                       border: 1,
                                       borderColor: 'divider',
                                       display: 'flex',
                                       flexDirection: 'column',
                                       alignItems: 'center',
                                       justifyContent: 'center',
                                       position: 'relative'
                                    }}
                                 >
                                    <Iconify icon="solar:videocamera-record-bold" sx={{ color: 'error.main' }} width={20} />
                                    <Typography variant="caption" sx={{ fontSize: '0.65rem', mt: 0.5, color: 'text.secondary', fontWeight: 600 }}>Video</Typography>
                                 </Box>
                              )}
                           </Stack>
                        )}

                        <Button
                            variant="contained"
                            color="warning"
                            onClick={() => setServiceSelectModalOpen(true)}
                            startIcon={<Iconify icon="solar:widget-add-bold" />}
                            fullWidth
                            sx={{ py: 1.5, mb: 3 }}
                         >
                            Pilih Layanan & Varian
                         </Button>

                         <ServiceSelectModal
                            open={serviceSelectModalOpen}
                            onClose={() => setServiceSelectModalOpen(false)}
                            servicesList={servicesList}
                            selectedServices={selectedServices}
                            onSave={(selected) => setSelectedServices(selected)}
                         />

                        <Dialog
                           open={compressing}
                           slotProps={{ backdrop: { sx: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.5)' } } }}
                           PaperProps={{
                              sx: {
                                 borderRadius: 2,
                                 p: 3,
                                 width: 320,
                                 textAlign: 'center',
                                 boxShadow: (theme) => theme.customShadows?.z24,
                              }
                           }}
                        >
                           <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5 }}>
                              <Box
                                 sx={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    bgcolor: 'warning.lighter',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    '@keyframes pulse': {
                                       '0%': { transform: 'scale(1)', opacity: 0.8 },
                                       '50%': { transform: 'scale(1.15)', opacity: 1 },
                                       '100%': { transform: 'scale(1)', opacity: 0.8 },
                                    },
                                    animation: 'pulse 2s infinite ease-in-out',
                                 }}
                              >
                                 <Iconify icon="solar:videocamera-record-bold" sx={{ color: 'warning.main' }} width={40} />
                              </Box>

                              <Stack spacing={1} sx={{ width: '100%' }}>
                                 <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    Mengompresi Video...
                                 </Typography>
                                 <Typography variant="body2" color="text.secondary">
                                    Ukuran video melebihi 10MB. Sedang mengoptimalkan untuk unggahan lebih cepat.
                                 </Typography>
                              </Stack>

                              <Box sx={{ width: '100%', mt: 1 }}>
                                 <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'warning.main' }}>
                                       Proses Transkoding
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                       {compressionProgress}%
                                    </Typography>
                                 </Stack>
                                 <LinearProgress
                                    variant="determinate"
                                    value={compressionProgress}
                                    color="warning"
                                    sx={{
                                       height: 8,
                                       borderRadius: 4,
                                       bgcolor: 'warning.lighter',
                                    }}
                                 />
                              </Box>
                           </DialogContent>
                        </Dialog>

                        {/* List of selected services */}
                        {selectedServices.length > 0 ? (
                           <Stack spacing={1} sx={{ mt: 1, maxH: 200, overflowY: 'auto' }}>
                              {selectedServices.map((item, idx) => (
                                 <Box key={idx} sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 1, borderColor: 'divider' }}>
                                    <Box>
                                       <Typography variant="subtitle2">
                                          {item.service.name} {item.variant ? `(${item.variant.name})` : ''}
                                       </Typography>
                                       <Typography variant="caption" color="text.secondary">
                                          {item.qty} x {fCurrency(item.variant ? item.variant.price : item.service.price)}
                                       </Typography>
                                    </Box>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                       <QuantityController
                                          value={item.qty}
                                          min={item.variant?.minimum_qty_order ?? item.service.minimum_qty_order ?? 1}
                                          onChange={(val) => handleUpdateServiceItemQty(idx, val)}
                                       />
                                       <IconButton size="small" color="error" onClick={() => handleRemoveServiceItem(idx)}>
                                          <Iconify icon="solar:trash-bin-trash-bold" />
                                       </IconButton>
                                    </Stack>
                                 </Box>
                              ))}
                           </Stack>
                        ) : (
                           <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                              Belum ada layanan dipilih
                           </Typography>
                        )}

                        <Box sx={{ mt: 3 }}>
                           <TextField
                              fullWidth
                              label="Voucher (opsional)"
                              placeholder="Masukkan kode voucher..."
                              value={voucherCodeInput}
                              onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                              size="small"
                           />
                        </Box>
                     </Grid>
                  </Grid>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                     <LoadingButton
                        size="large"
                        variant="contained"
                        color="warning"
                        loading={weighingLoading}
                        onClick={() => handleWeighingSubmit(false)}
                        startIcon={<Iconify icon="solar:diskette-bold" />}
                        sx={{ px: 4 }}
                     >
                        Simpan & Proses ke Pembayaran
                     </LoadingButton>
                  </Box>
               </CardContent>
            </Card>
         )}

         {/* STATUS PANEL 3: on_progress */}
         {order.status === 'on_progress' && (
            <Card sx={{ mb: 3, border: 1, borderColor: 'success.light', bgcolor: 'background.neutral' }}>
               <CardHeader
                  title={
                     <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon="solar:box-bold-duotone" width={24} sx={{ color: 'success.main' }} />
                        <Typography variant="h6">Laundry Selesai: Pengemasan & Pengiriman</Typography>
                     </Stack>
                  }
                  subheader="Upload bukti kemasan dan atur bagaimana pakaian diserahkan ke customer"
                  sx={{ pb: 2 }}
               />
               <Divider />
               <CardContent>
                  <Grid container spacing={3}>
                     {/* Kiri: upload packing images */}
                     <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Foto Hasil Packing (Wajib):</Typography>
                        <Box
                           sx={{
                              p: 3,
                              border: '2px dashed',
                              borderColor: 'divider',
                              borderRadius: 2,
                              textAlign: 'center',
                              bgcolor: 'background.paper',
                              cursor: 'pointer',
                           }}
                           onClick={() => packingFileInputRef.current?.click()}
                        >
                           <Iconify icon="solar:camera-add-bold" width={40} sx={{ color: 'text.disabled', mb: 1 }} />
                           <Typography variant="body2" color="text.secondary">Klik untuk memilih foto packing laundry</Typography>
                           <input
                              ref={packingFileInputRef}
                              type="file"
                              accept="image/*"
                              multiple
                              hidden
                              onChange={(e) => {
                                 if (e.target.files) setPackingImages(Array.from(e.target.files));
                              }}
                           />
                        </Box>
                        {packingImages.length > 0 && (
                           <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap">
                              {packingImages.map((f, i) => (
                                 <Box
                                    key={i}
                                    component="img"
                                    src={URL.createObjectURL(f)}
                                    sx={{ width: 64, height: 64, borderRadius: 1, objectFit: 'cover' }}
                                 />
                              ))}
                           </Stack>
                        )}
                     </Grid>

                     {/* Kanan: Fulfillment selector */}
                     <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Metode Serah Terima:</Typography>
                        <RadioGroup
                           row
                           value={fulMode}
                           onChange={(e) => setFulMode(e.target.value as 'pickup' | 'delivery')}
                           sx={{ mb: 2 }}
                        >
                           <FormControlLabel
                              value="pickup"
                              control={<Radio />}
                              label={
                                 <Box sx={{ ml: 0.5 }}>
                                    <Typography variant="subtitle2">Customer Ambil Di Toko</Typography>
                                    <Typography variant="caption" color="text.secondary">Pakaian diambil mandiri</Typography>
                                 </Box>
                              }
                              sx={{ mr: 4 }}
                           />
                           <FormControlLabel
                              value="delivery"
                              control={<Radio />}
                              label={
                                 <Box sx={{ ml: 0.5 }}>
                                    <Typography variant="subtitle2">Diantar Kurir</Typography>
                                    <Typography variant="caption" color="text.secondary">Pakaian diantar oleh staff / kurir</Typography>
                                 </Box>
                              }
                           />
                        </RadioGroup>

                        {fulMode === 'delivery' && (
                           <Stack spacing={2} sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1.5 }}>
                              <TextField
                                 fullWidth
                                 label="Nama Kurir / Pengantar"
                                 size="small"
                                 value={courierName}
                                 onChange={(e) => setCourierName(e.target.value)}
                              />
                              <TextField
                                 fullWidth
                                 label="No. Telepon Kurir"
                                 size="small"
                                 value={courierPhone}
                                 onChange={(e) => setCourierPhone(e.target.value)}
                              />
                              <TextField
                                 fullWidth
                                 label="Alamat Pengantaran"
                                 size="small"
                                 multiline
                                 rows={2}
                                 value={deliveryAddressInput}
                                 onChange={(e) => setDeliveryAddressInput(e.target.value)}
                              />
                           </Stack>
                        )}
                     </Grid>
                  </Grid>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                     <LoadingButton
                        size="large"
                        variant="contained"
                        color="success"
                        loading={fulfillmentLoading}
                        onClick={handleFulfillmentSubmit}
                        startIcon={<Iconify icon="solar:check-circle-bold" />}
                        sx={{ px: 4 }}
                     >
                        Pesanan Selesai Dicuci & Dikemas
                     </LoadingButton>
                  </Box>
               </CardContent>
            </Card>
         )}

         {/* STATUS PANEL 4: waiting_finish */}
         {order.status === 'waiting_finish' && (
            <Card sx={{ mb: 3, border: 1, borderColor: 'success.light', bgcolor: 'background.neutral' }}>
               <CardHeader
                  title={
                     <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon="solar:check-circle-bold-duotone" width={24} sx={{ color: 'success.main' }} />
                        <Typography variant="h6">
                           {order.fulfillment_mode === 'pickup' ? 'Menunggu Pengambilan Customer' : 'Pakaian Siap Diantar Kurir'}
                        </Typography>
                     </Stack>
                  }
                  subheader={order.fulfillment_mode === 'pickup' ? 'Pakaian siap diserahkan kepada customer di outlet' : 'Pakaian siap diserahkan kepada kurir pengantar'}
                  sx={{ pb: 2 }}
               />
               <Divider />
               <CardContent>
                  <Grid container spacing={3}>
                     <Grid size={{ xs: 12, md: 7 }}>
                        {order.fulfillment_mode === 'pickup' ? (
                           <Stack spacing={1}>
                              <Typography variant="body1">Pakaian customer sudah dikemas rapi.</Typography>
                              <Typography variant="body2" color="text.secondary">Silakan lakukan penyerahan pakaian secara fisik dan upload bukti serah terima.</Typography>
                           </Stack>
                        ) : (
                           <Stack spacing={2}>
                              <Box>
                                 <Typography variant="caption" color="text.secondary" display="block">Kurir Pengantar:</Typography>
                                 <Typography variant="subtitle1" fontWeight={700}>{order.delivery_name || courierName || '-'}</Typography>
                              </Box>
                              <Box>
                                 <Typography variant="caption" color="text.secondary" display="block">Alamat Kirim:</Typography>
                                 <Typography variant="subtitle1" fontWeight={700}>{order.delivery_address || order.address_receiver || '-'}</Typography>
                              </Box>
                           </Stack>
                        )}
                     </Grid>

                     <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center' }}>
                        {order.fulfillment_mode === 'pickup' ? (
                           <Stack spacing={2}>
                              <Button
                                 variant="outlined"
                                 color="success"
                                 startIcon={<Iconify icon="solar:camera-bold" />}
                                 onClick={() => proofFileInputRef.current?.click()}
                                 fullWidth
                              >
                                 {delProofImages.length > 0 ? `${delProofImages.length} Foto Bukti Terpilih` : 'Foto Bukti Serah Terima'}
                              </Button>
                              <input
                                 ref={proofFileInputRef}
                                 type="file"
                                 accept="image/*"
                                 multiple
                                 hidden
                                 onChange={(e) => {
                                    if (e.target.files) setDelProofImages(Array.from(e.target.files));
                                 }}
                              />
                              <LoadingButton
                                 size="large"
                                 variant="contained"
                                 color="success"
                                 loading={completeLoading}
                                 onClick={handleCompleteOrder}
                                 startIcon={<Iconify icon="solar:verified-check-bold" />}
                                 fullWidth
                              >
                                 Selesaikan & Serahkan Pakaian
                              </LoadingButton>
                           </Stack>
                        ) : (
                           <Stack spacing={2}>
                              {/* Option to change/set courier info before starting */}
                              <TextField
                                 fullWidth
                                 label="Nama Kurir"
                                 size="small"
                                 value={courierName}
                                 onChange={(e) => setCourierName(e.target.value)}
                              />
                              <LoadingButton
                                 size="large"
                                 variant="contained"
                                 color="primary"
                                 loading={deliveryLoading}
                                 onClick={handleStartDelivery}
                                 startIcon={<Iconify icon="solar:delivery-bold" />}
                                 fullWidth
                              >
                                 Mulai Pengantaran Kurir
                              </LoadingButton>
                           </Stack>
                        )}
                     </Grid>
                  </Grid>
               </CardContent>
            </Card>
         )}

         {/* STATUS PANEL 5: delivering */}
         {order.status === 'delivering' && (
            <Card sx={{ mb: 3, border: 1, borderColor: 'primary.light', bgcolor: 'background.neutral' }}>
               <CardHeader
                  title={
                     <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon="solar:delivery-bold-duotone" width={24} sx={{ color: 'primary.main' }} />
                        <Typography variant="h6">Dalam Pengantaran Kurir</Typography>
                     </Stack>
                  }
                  subheader="Pesanan dalam perjalanan menuju alamat customer"
                  sx={{ pb: 2 }}
               />
               <Divider />
               <CardContent>
                  <Grid container spacing={3}>
                     <Grid size={{ xs: 12, md: 7 }}>
                        <Stack spacing={1.5}>
                           <Box>
                              <Typography variant="caption" color="text.secondary" display="block">Kurir:</Typography>
                              <Typography variant="subtitle1" fontWeight={700}>
                                 {order.delivery_name} {order.delivery_phone ? `(${order.delivery_phone})` : ''}
                              </Typography>
                           </Box>
                           <Box>
                              <Typography variant="caption" color="text.secondary" display="block">Alamat Pengantaran:</Typography>
                              <Typography variant="subtitle1" fontWeight={700}>{order.delivery_address}</Typography>
                           </Box>
                        </Stack>
                     </Grid>
                     <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center' }}>
                        <Button
                           variant="outlined"
                           color="primary"
                           startIcon={<Iconify icon="solar:camera-bold" />}
                           onClick={() => proofFileInputRef.current?.click()}
                           fullWidth
                        >
                           {delProofImages.length > 0 ? `${delProofImages.length} Foto Bukti Terpilih` : 'Upload Foto Bukti Diterima'}
                        </Button>
                        <input
                           ref={proofFileInputRef}
                           type="file"
                           accept="image/*"
                           multiple
                           hidden
                           onChange={(e) => {
                              if (e.target.files) setDelProofImages(Array.from(e.target.files));
                           }}
                        />
                        <LoadingButton
                           size="large"
                           variant="contained"
                           color="success"
                           loading={completeLoading}
                           onClick={handleCompleteOrder}
                           startIcon={<Iconify icon="solar:verified-check-bold" />}
                           fullWidth
                        >
                           Konfirmasi Pesanan Diterima
                        </LoadingButton>
                     </Grid>
                  </Grid>
               </CardContent>
            </Card>
         )}

         {/* STATUS PANEL 6: finish */}
         {order.status === 'finish' && (
            <Card sx={{ mb: 3, border: 1, borderColor: 'success.light', bgcolor: 'background.neutral' }}>
               <CardHeader
                  title={
                     <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon="solar:verified-check-bold-duotone" width={24} sx={{ color: 'success.main' }} />
                        <Typography variant="h6">Pesanan Selesai</Typography>
                     </Stack>
                  }
                  subheader="Transaksi laundry ini telah selesai secara penuh"
                  sx={{ pb: 2 }}
               />
               <Divider />
               <CardContent>
                  <Grid container spacing={3}>
                     {/* Bukti Foto-foto */}
                     <Grid size={{ xs: 12, md: 8 }}>
                        <Stack spacing={2}>
                           {order.weighing_images && order.weighing_images !== '[]' && (
                              <Box>
                                 <Typography variant="caption" color="text.secondary" display="block">Bukti Penimbangan:</Typography>
                                 <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                    {parseImages(order.weighing_images).map((img, idx) => (
                                       <Box
                                          key={idx}
                                          component="img"
                                          src={`${CONFIG.apiHostUrl}/${img}`}
                                          sx={{ width: 80, height: 80, borderRadius: 1.5, objectFit: 'cover', cursor: 'pointer', border: 1, borderColor: 'divider' }}
                                          onClick={() => window.open(`${CONFIG.apiHostUrl}/${img}`, '_blank')}
                                       />
                                    ))}
                                 </Stack>
                              </Box>
                           )}
                           {order.video && (
                              <Box>
                                 <Typography variant="caption" color="text.secondary" display="block">Video Penimbangan:</Typography>
                                 <Box sx={{ mt: 0.5, maxWidth: 320 }}>
                                    <video
                                       src={order.video.startsWith('http') ? order.video : `${CONFIG.apiHostUrl}/${order.video}`}
                                       controls
                                       style={{ width: '100%', borderRadius: 8, border: '1px solid var(--mui-palette-divider)' }}
                                    />
                                 </Box>
                              </Box>
                           )}
                           {order.packing_images && order.packing_images !== '[]' && (
                              <Box>
                                 <Typography variant="caption" color="text.secondary" display="block">Bukti Kemasan:</Typography>
                                 <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                    {parseImages(order.packing_images).map((img, idx) => (
                                       <Box
                                          key={idx}
                                          component="img"
                                          src={`${CONFIG.apiHostUrl}/${img}`}
                                          sx={{ width: 80, height: 80, borderRadius: 1.5, objectFit: 'cover', cursor: 'pointer', border: 1, borderColor: 'divider' }}
                                          onClick={() => window.open(`${CONFIG.apiHostUrl}/${img}`, '_blank')}
                                       />
                                    ))}
                                 </Stack>
                              </Box>
                           )}
                           {order.delivery_proof_images && order.delivery_proof_images !== '[]' && (
                              <Box>
                                 <Typography variant="caption" color="text.secondary" display="block">Bukti Serah Terima:</Typography>
                                 <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                    {parseImages(order.delivery_proof_images).map((img, idx) => (
                                       <Box
                                          key={idx}
                                          component="img"
                                          src={`${CONFIG.apiHostUrl}/${img}`}
                                          sx={{ width: 80, height: 80, borderRadius: 1.5, objectFit: 'cover', cursor: 'pointer', border: 1, borderColor: 'divider' }}
                                          onClick={() => window.open(`${CONFIG.apiHostUrl}/${img}`, '_blank')}
                                       />
                                    ))}
                                 </Stack>
                              </Box>
                           )}
                        </Stack>
                     </Grid>

                     {/* Ringkasan status */}
                     <Grid size={{ xs: 12, md: 4 }}>
                        <Stack spacing={1.5} sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
                           <Typography variant="subtitle2">Informasi Pemenuhan:</Typography>
                           <Typography variant="body2">
                              <strong>Metode:</strong> {order.fulfillment_mode === 'pickup' ? 'Ambil Sendiri' : 'Diantar Kurir'}
                           </Typography>
                           {order.fulfillment_mode === 'delivery' && (
                              <>
                                 <Typography variant="body2"><strong>Kurir:</strong> {order.delivery_name || '-'}</Typography>
                                 <Typography variant="body2"><strong>Alamat Kirim:</strong> {order.delivery_address || '-'}</Typography>
                              </>
                           )}
                        </Stack>
                     </Grid>
                  </Grid>
               </CardContent>
            </Card>
         )}

         {/* Dialog for below minimum Warning */}
         <Dialog open={openBelowMinDialog} onClose={() => setOpenBelowMinDialog(false)} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
               <Iconify icon="solar:danger-triangle-bold" width={24} />
               <span>Kuantitas di Bawah Batas Minimum</span>
            </DialogTitle>
            <DialogContent>
               <Typography variant="body2" sx={{ mb: 2 }}>
                  Layanan berikut di bawah batas minimum pemesanan tradisional outlet kami:
               </Typography>
               <Stack spacing={1} sx={{ mb: 2 }}>
                  {belowMinDetails.map((detail, index) => (
                     <Chip key={index} label={detail} color="warning" variant="soft" size="small" />
                  ))}
               </Stack>
               <Typography variant="body2" fontWeight={600}>
                  Apakah Anda ingin tetap mengonfirmasi dan melanjutkan proses penimbangan (menghitung tagihan minimal)?
               </Typography>
            </DialogContent>
            <DialogActions>
               <Button onClick={() => { setOpenBelowMinDialog(false); setPendingWeighingData(null); }} disabled={weighingLoading}>Batal</Button>
               <LoadingButton loading={weighingLoading} variant="contained" color="warning" onClick={handleConfirmBelowMin}>
                  Ya, Tetap Lanjutkan
               </LoadingButton>
            </DialogActions>
         </Dialog>

         {renderPrintPreviewDialog()}

         {/* SECTION: Validasi dan Proses Pesanan (Manual Checkout Fallback) */}
         {['waiting_payment', 'payment_verification', 'waiting_process'].includes(order.status || '') && (
            <Card sx={{ mb: 3, border: 1, borderColor: 'primary.lighter', bgcolor: 'background.neutral' }}>
               <CardHeader
                  title={
                     <Stack direction="row" alignItems="center" spacing={1}>
                        <Iconify icon="solar:verified-check-bold-duotone" width={24} sx={{ color: 'primary.main' }} />
                        <Typography variant="h6">Verifikasi Pembayaran & Proses Laundry</Typography>
                     </Stack>
                  }
                  subheader="Lengkapi catatan fisik cucian dan langsung proses pesanan ke pengerjaan"
                  sx={{ pb: 2 }}
               />
               <Divider />
               <CardContent sx={{ pt: 3 }}>
                  <Grid container spacing={3}>
                     {/* Kiri: Bukti Pembayaran */}
                     <Grid size={{ xs: 12, md: 4 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                           Bukti Pembayaran:
                        </Typography>
                        {order.payment_proof ? (
                           <Box
                              sx={{
                                 position: 'relative',
                                 width: '100%',
                                 borderRadius: 1.5,
                                 overflow: 'hidden',
                                 border: 1,
                                 borderColor: 'divider',
                                 bgcolor: '#fff',
                                 lineHeight: 0
                              }}
                           >
                              <Box
                                 component="img"
                                 src={`${CONFIG.apiHostUrl}/${order.payment_proof}`}
                                 alt="Payment Proof"
                                 sx={{ width: '100%', height: 'auto', maxHeight: 260, objectFit: 'contain', cursor: 'pointer' }}
                                 onClick={() => window.open(`${CONFIG.apiHostUrl}/${order.payment_proof}`, '_blank')}
                              />
                           </Box>
                        ) : (
                           <Box
                              sx={{
                                 py: 4,
                                 px: 2,
                                 textAlign: 'center',
                                 border: '1px dashed',
                                 borderColor: 'divider',
                                 borderRadius: 1.5,
                                 bgcolor: 'background.default'
                              }}
                           >
                              <Iconify icon="solar:bill-cross-bold-duotone" width={48} sx={{ color: 'text.disabled', mb: 1.5, opacity: 0.6 }} />
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                 Belum ada bukti upload
                              </Typography>
                              <Typography variant="caption" display="block" color="text.disabled" sx={{ mt: 0.5, mb: 2 }}>
                                 (Pelanggan belum upload bukti transfer manual/QRIS)
                              </Typography>
                              <LoadingButton
                                 variant="contained"
                                 color="warning"
                                 startIcon={<Iconify icon="solar:upload-minimalistic-bold" />}
                                 onClick={() => paymentFileInputRef.current?.click()}
                                 loading={paymentUploadLoading}
                              >
                                 Upload Bukti Pembayaran
                              </LoadingButton>
                              <input
                                 type="file"
                                 ref={paymentFileInputRef}
                                 accept="image/*"
                                 hidden
                                 onChange={handlePaymentProofUpload}
                              />
                           </Box>
                        )}
                     </Grid>

                     {/* Kanan: Input Field */}
                     <Grid size={{ xs: 12, md: 8 }}>
                        <Stack spacing={2.5}>
                           <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
                              <TextField
                                 fullWidth
                                 label="Total Berat"
                                 placeholder="0.00"
                                 type="number"
                                 value={weightKg}
                                 onChange={(e) => setWeightKg(e.target.value)}
                                 slotProps={{
                                    input: {
                                       endAdornment: <Typography variant="body2" color="text.secondary">kg</Typography>
                                    }
                                 }}
                              />
                              <TextField
                                 fullWidth
                                 label="Total Pieces"
                                 placeholder="0"
                                 type="number"
                                 value={totalPcs}
                                 onChange={(e) => setTotalPcs(e.target.value)}
                                 slotProps={{
                                    input: {
                                       endAdornment: <Typography variant="body2" color="text.secondary">Pcs</Typography>
                                    }
                                 }}
                              />
                           </Stack>
                           <TextField
                              fullWidth
                              label="Catatan Deskripsi Cucian"
                              placeholder="Tulis catatan khusus kondisi barang, berat, atau permintaan pelanggan..."
                              multiline
                              rows={3}
                              value={orderNotes}
                              onChange={(e) => setOrderNotes(e.target.value)}
                           />
                           <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <LoadingButton
                                 size="large"
                                 variant="contained"
                                 loading={fastProcessLoading}
                                 onClick={handleFastProcessSubmit}
                                 startIcon={<Iconify icon="solar:bolt-circle-bold" />}
                                 sx={{ px: 4 }}
                              >
                                 Validasi & Proses Pesanan
                              </LoadingButton>
                           </Box>
                        </Stack>
                     </Grid>
                  </Grid>
               </CardContent>
            </Card>
         )}

         <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 7 }}>
               <Stack spacing={3}>
                  {/* Order Info */}
                  <Card>
                     <CardHeader title="Order Information" />
                     <CardContent>
                        <Stack spacing={2}>
                           <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">
                                 Order Number
                              </Typography>
                              <Typography variant="subtitle2">{order.order_number}</Typography>
                           </Box>
                           <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">
                                 Status
                              </Typography>
                              <Chip
                                 label={statusLabel[order.status || 'waiting_payment']}
                                 color={statusColor[order.status || 'waiting_payment']}
                                 size="small"
                              />
                           </Box>
                           <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">
                                 Customer
                              </Typography>
                              <Box sx={{ textAlign: 'right' }}>
                                 <Typography variant="subtitle2">{order.phone_receiver}</Typography>
                                 <Typography variant="caption" color="text.secondary">
                                    {order.address_receiver}
                                 </Typography>
                              </Box>
                           </Box>

                           <Divider sx={{ borderStyle: 'dashed' }} />

                           <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Iconify icon="solar:scale-bold-duotone" width={20} sx={{ color: 'primary.main' }} />
                              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                                 Total Berat
                              </Typography>
                              <Typography variant="subtitle2">
                                 {order.weight_kg ? `${order.weight_kg} kg` : '-'}
                              </Typography>
                           </Box>

                           <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Iconify icon="solar:box-minimalistic-bold-duotone" width={20} sx={{ color: 'warning.main' }} />
                              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                                 Total Pcs
                              </Typography>
                              <Typography variant="subtitle2">
                                 {order.total_pcs ? `${order.total_pcs} Pcs` : '-'}
                              </Typography>
                           </Box>

                           {(order.selimut_pcs || order.celana_pcs || order.baju_pcs || order.sempak_pcs || order.bra_pcs || order.sprei_pcs || order.lainnya_pcs) ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Iconify icon="solar:box-bold-duotone" width={20} sx={{ color: 'success.main' }} />
                                    <Typography variant="body2" color="text.secondary">
                                       Rincian Pcs Cucian
                                    </Typography>
                                 </Box>
                                 <Box sx={{ pl: 4.5 }}>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
                                       {!!order.selimut_pcs && (
                                          <Chip
                                             icon={<Iconify icon="solar:bed-bold-duotone" width={14} />}
                                             label={`Selimut: ${order.selimut_pcs} pcs`}
                                             variant="soft"
                                             color="info"
                                             size="small"
                                             sx={{ fontWeight: 600 }}
                                          />
                                       )}
                                       {!!order.celana_pcs && (
                                          <Chip
                                             icon={<Iconify icon="ph:pants-bold" width={14} />}
                                             label={`Celana: ${order.celana_pcs} pcs`}
                                             variant="soft"
                                             color="warning"
                                             size="small"
                                             sx={{ fontWeight: 600 }}
                                          />
                                       )}
                                       {!!order.baju_pcs && (
                                          <Chip
                                             icon={<Iconify icon="solar:t-shirt-bold-duotone" width={14} />}
                                             label={`Baju: ${order.baju_pcs} pcs`}
                                             variant="soft"
                                             color="success"
                                             size="small"
                                             sx={{ fontWeight: 600 }}
                                          />
                                       )}
                                       {!!order.sempak_pcs && (
                                          <Chip
                                             icon={<Iconify icon="solar:shield-user-bold-duotone" width={14} />}
                                             label={`Sempak: ${order.sempak_pcs} pcs`}
                                             variant="soft"
                                             color="error"
                                             size="small"
                                             sx={{ fontWeight: 600 }}
                                          />
                                       )}
                                       {!!order.bra_pcs && (
                                          <Chip
                                             icon={<Iconify icon="solar:heart-bold-duotone" width={14} />}
                                             label={`Bra: ${order.bra_pcs} pcs`}
                                             variant="soft"
                                             color="secondary"
                                             size="small"
                                             sx={{ fontWeight: 600 }}
                                          />
                                       )}
                                       {!!order.sprei_pcs && (
                                          <Chip
                                             icon={<Iconify icon="solar:document-bold-duotone" width={14} />}
                                             label={`Sprei: ${order.sprei_pcs} pcs`}
                                             variant="soft"
                                             color="primary"
                                             size="small"
                                             sx={{ fontWeight: 600 }}
                                          />
                                       )}
                                       {!!order.lainnya_pcs && (
                                          <Chip
                                             icon={<Iconify icon="solar:box-bold-duotone" width={14} />}
                                             label={`Lainnya: ${order.lainnya_pcs} pcs`}
                                             variant="soft"
                                             color="default"
                                             size="small"
                                             sx={{ fontWeight: 600 }}
                                          />
                                       )}
                                    </Stack>
                                 </Box>
                              </Box>
                           ) : null}

                           <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                 <Iconify icon="solar:document-text-bold-duotone" width={20} sx={{ color: 'info.main' }} />
                                 <Typography variant="body2" color="text.secondary">
                                    Catatan / Deskripsi
                                 </Typography>
                              </Box>
                              <Typography
                                 variant="body2"
                                 sx={{
                                    pl: 4.5,
                                    fontStyle: order.notes ? 'normal' : 'italic',
                                    color: order.notes ? 'text.primary' : 'text.disabled',
                                 }}
                              >
                                 {order.notes || 'Tidak ada catatan tambahan'}
                              </Typography>
                           </Box>

                           {((order.weighing_images && order.weighing_images !== '[]') || order.video) && (
                              <Stack spacing={1.5} sx={{ pt: 1 }}>
                                 <Divider sx={{ borderStyle: 'dashed' }} />
                                 <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Iconify icon="solar:videocamera-record-bold-duotone" sx={{ color: 'error.main' }} width={20} />
                                    Bukti Penimbangan Fisik
                                 </Typography>
                                 {order.weighing_images && order.weighing_images !== '[]' && (
                                    <Box sx={{ pl: 3.5 }}>
                                       <Typography variant="caption" color="text.secondary" display="block">Foto Timbangan:</Typography>
                                       <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5, gap: 1 }}>
                                          {parseImages(order.weighing_images).map((img, idx) => (
                                             <Box
                                                key={idx}
                                                component="img"
                                                src={`${CONFIG.apiHostUrl}/${img}`}
                                                sx={{ width: 70, height: 70, borderRadius: 1, objectFit: 'cover', cursor: 'pointer', border: 1, borderColor: 'divider' }}
                                                onClick={() => window.open(`${CONFIG.apiHostUrl}/${img}`, '_blank')}
                                             />
                                          ))}
                                       </Stack>
                                    </Box>
                                 )}
                                 {order.video && (
                                    <Box sx={{ pl: 3.5 }}>
                                       <Typography variant="caption" color="text.secondary" display="block">Video Timbangan:</Typography>
                                       <Box sx={{ mt: 0.5, maxWidth: '100%' }}>
                                          <video
                                             src={order.video.startsWith('http') ? order.video : `${CONFIG.apiHostUrl}/${order.video}`}
                                             controls
                                             style={{ width: '100%', borderRadius: 8, border: '1px solid var(--mui-palette-divider)' }}
                                          />
                                       </Box>
                                    </Box>
                                 )}
                              </Stack>
                           )}

                           <Divider sx={{ borderStyle: 'dashed' }} />
                           {((order.discount_amount || 0) > 0) && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                 <Box>
                                    <Typography variant="body2" color="error">
                                       Discount
                                    </Typography>
                                    {order.voucher && (
                                       <Typography variant="caption" color="text.secondary">
                                          Voucher: {order.voucher.code}
                                       </Typography>
                                    )}
                                 </Box>
                                 <Typography variant="subtitle2" color="error">
                                    -{fCurrency(order.discount_amount || 0)}
                                 </Typography>
                              </Box>
                           )}
                           <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="subtitle1">Total Bill</Typography>
                              <Typography variant="subtitle1" color="primary.main">
                                 {fCurrency(order.total_bill || 0)}
                              </Typography>
                           </Box>
                        </Stack>

                        {/* <Button
                           variant="contained"
                           fullWidth
                           startIcon={<Iconify icon="ic:baseline-whatsapp" width={24} />}
                           onClick={handleSendWhatsapp}
                           sx={{
                              mt: 3,
                              bgcolor: '#25D366',
                              color: 'white',
                              height: 48,
                              fontSize: '1rem',
                              fontWeight: 600,
                              boxShadow: (theme) => `0 8px 16px 0 rgba(37, 211, 102, 0.24)`,
                              '&:hover': {
                                 bgcolor: '#128C7E',
                                 boxShadow: 'none',
                              },
                           }}
                        >
                           Kirim Nota ke WhatsApp
                        </Button> */}
                     </CardContent>
                  </Card>
                  {/* Products */}
                  {order.order_products && order.order_products.length > 0 && (
                     <Card>
                        <CardHeader title="Products" />
                        <CardContent>
                           <Stack spacing={2}>
                              {order.order_products.map((item: any) => {
                                 const isIndividual = item.product?.tracking_mode === 'individual';
                                 const subtotal = isIndividual
                                    ? (item.price_at_order || 0) *
                                      (item.requested_length || 0) *
                                      (item.qty || 0)
                                    : (item.price_at_order || 0) * (item.qty || 0);

                                 return (
                                    <Box
                                       key={item.id}
                                       sx={{ display: 'flex', alignItems: 'center' }}
                                    >
                                       <Box sx={{ flexGrow: 1 }}>
                                          <Typography variant="subtitle2">
                                             {item.product?.title}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                             {isIndividual
                                                ? `${item.qty} × ${item.requested_length} ${item.measurement_unit}`
                                                : `${item.qty} × ${fCurrency(item.price_at_order || 0)}`}
                                          </Typography>
                                       </Box>
                                       <Typography variant="subtitle2">
                                          {fCurrency(subtotal)}
                                       </Typography>
                                    </Box>
                                 );
                              })}
                           </Stack>
                        </CardContent>
                     </Card>
                  )}
                  {/* Services */}
                  {order.order_services && order.order_services.length > 0 && (
                     <Card>
                        <CardHeader title="Services" />
                        <CardContent>
                           <Stack spacing={0}>
                              {order.order_services.map((item: any) => (
                                 <ServiceItem key={item.id} item={item} orderId={order.id || ''} />
                              ))}
                           </Stack>
                        </CardContent>
                     </Card>
                  )}
               </Stack>
            </Grid>

            {/* Right Column: Timeline */}
            <Grid size={{ xs: 12, md: 5 }}>
               {/* Used Raw Material List - Only for users with Read RawMaterial permission */}
               {order.status === 'finish' && canReadRawMaterial && <UsedRawMaterialList orderId={order.id || ''} />}

               {/* Order-Level Process Panel (kasir) */}
               <OrderProcessPanel
                  orderId={order.id || ''}
                  orderStatus={order.status || ''}
                  onOrderFinished={async () => {
                     if (id) {
                        await Promise.all([
                           getOrder({ id: id as string }),
                           getByOrderId({ orderId: id as string }),
                        ]);
                     }
                  }}
               />

               <Card sx={{ mt: 3 }}>
                  <CardHeader title="Status History" />
                  <CardContent>
                     <Timeline position="right" sx={{ pl: 0 }}>
                        {logs.map((log, index) => {
                           const images = parseImages(log.images);
                           const isLast = index === logs.length - 1;

                           return (
                              <TimelineItem key={log.id} sx={{ '&:before': { display: 'none' } }}>
                                 <TimelineSeparator>
                                    <TimelineDot color={statusColor[log.status || 'default']} />
                                    {!isLast && <TimelineConnector />}
                                 </TimelineSeparator>
                                 <TimelineContent>
                                    <Typography variant="subtitle2">
                                       {statusLabel[log.status || 'Unknown']}
                                    </Typography>
                                    <Typography
                                       variant="caption"
                                       color="text.secondary"
                                       display="block"
                                       sx={{ mb: 1 }}
                                    >
                                       {dayjs(log.created_at).format('DD MMM YYYY HH:mm')}
                                    </Typography>
                                    <Typography
                                       variant="body2"
                                       sx={{ color: 'text.secondary', mb: 1 }}
                                    >
                                       {log.reason}
                                    </Typography>
                                    {images.length > 0 && (
                                       <Box
                                          sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}
                                       >
                                          {images.map((img, idx) => (
                                             <Box
                                                key={idx}
                                                component="img"
                                                src={`${CONFIG.apiHostUrl}/${img}`}
                                                sx={{
                                                   width: 64,
                                                   height: 64,
                                                   borderRadius: 1,
                                                   cursor: 'pointer',
                                                   objectFit: 'cover',
                                                }}
                                                onClick={() =>
                                                   window.open(
                                                      `${CONFIG.apiHostUrl}/${img}`,
                                                      '_blank'
                                                   )
                                                }
                                             />
                                          ))}
                                       </Box>
                                    )}
                                 </TimelineContent>
                              </TimelineItem>
                           );
                        })}
                     </Timeline>
                  </CardContent>
               </Card>
            </Grid>
         </Grid>
      </DashboardContent>
   );
}
