import { useMemo, useState, useEffect } from 'react';
import {
   Page,
   Text,
   View,
   Font,
   Image,
   Document,
   StyleSheet,
   PDFDownloadLink,
} from '@react-pdf/renderer';
import Button from '@mui/material/Button';
import { Iconify } from 'src/components/iconify';
import dayjs from 'dayjs';

import { CONFIG } from 'src/global-config';
import { fCurrency } from 'src/utils/format-number';
import { type OrderProcessLog } from 'src/stores/order-process-log';
import { type OrderLogStatusData } from 'src/stores/order-log-status';

// ----------------------------------------------------------------------

Font.register({
   family: 'Roboto',
   fonts: [
      { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
      { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
   ],
});

const useStyles = () =>
   useMemo(
      () =>
         StyleSheet.create({
            page: {
               fontSize: 9,
               lineHeight: 1.6,
               fontFamily: 'Roboto',
               backgroundColor: '#FFFFFF',
               padding: '32px 32px 60px 32px',
            },
            header: {
               flexDirection: 'row',
               justifyContent: 'space-between',
               alignItems: 'center',
               borderBottomWidth: 1,
               borderColor: '#EEEEEE',
               paddingBottom: 16,
               marginBottom: 24,
            },
            logoSection: {
               flexDirection: 'column',
            },
            title: {
               fontSize: 18,
               fontWeight: 700,
               color: '#1C252E',
               marginBottom: 4,
            },
            subtitle: {
               fontSize: 10,
               color: '#637381',
            },
            statusBadge: {
               fontSize: 9,
               fontWeight: 700,
               padding: '4px 10px',
               borderRadius: 4,
               textTransform: 'uppercase',
               backgroundColor: '#E4F8DD',
               color: '#118D57',
            },
            
            // Grid container for side-by-side info
            grid: {
               flexDirection: 'row',
               marginBottom: 24,
            },
            col6: {
               width: '50%',
            },
            
            sectionTitle: {
               fontSize: 11,
               fontWeight: 700,
               color: '#1C252E',
               marginBottom: 8,
               borderBottomWidth: 1,
               borderStyle: 'solid',
               borderColor: '#F4F6F8',
               paddingBottom: 4,
            },
            label: {
               fontSize: 9,
               color: '#637381',
               marginBottom: 2,
            },
            value: {
               fontSize: 10,
               fontWeight: 400,
               color: '#1C252E',
               marginBottom: 8,
            },
            valueBold: {
               fontSize: 10,
               fontWeight: 700,
               color: '#1C252E',
               marginBottom: 8,
            },

            // Table styles
            table: {
               display: 'flex',
               width: '100%',
               marginBottom: 24,
            },
            tableHeader: {
               flexDirection: 'row',
               backgroundColor: '#F4F6F8',
               padding: '8px 12px',
               fontWeight: 700,
               borderRadius: 4,
            },
            tableRow: {
               flexDirection: 'row',
               borderBottomWidth: 1,
               borderStyle: 'solid',
               borderColor: '#F4F6F8',
               padding: '10px 12px',
               alignItems: 'center',
            },
            colNo: { width: '5%' },
            colDesc: { width: '55%' },
            colQty: { width: '10%', textAlign: 'center' },
            colPrice: { width: '15%', textAlign: 'right' },
            colSubtotal: { width: '15%', textAlign: 'right' },

            // Summary block
            summaryContainer: {
               flexDirection: 'row',
               justifyContent: 'flex-end',
               marginBottom: 32,
            },
            summaryBlock: {
               width: '40%',
            },
            summaryRow: {
               flexDirection: 'row',
               justifyContent: 'space-between',
               marginBottom: 6,
               paddingHorizontal: 4,
            },
            totalRow: {
               flexDirection: 'row',
               justifyContent: 'space-between',
               marginTop: 8,
               paddingTop: 8,
               borderTopWidth: 1,
               borderStyle: 'dashed',
               borderColor: '#919EAB',
               paddingHorizontal: 4,
            },
            totalLabel: {
               fontSize: 12,
               fontWeight: 700,
               color: '#1C252E',
            },
            totalValue: {
               fontSize: 14,
               fontWeight: 700,
               color: '#00A76F',
            },

            // Footer / Extra section
            horizontalContainer: {
               flexDirection: 'row',
               gap: 24,
               marginBottom: 24,
            },
            halfCard: {
               width: '50%',
               padding: 12,
               borderRadius: 8,
               backgroundColor: '#F9FAFB',
            },
            
            // Timeline styles
            timelineItem: {
               flexDirection: 'row',
               marginBottom: 10,
            },
            timelineLeft: {
               width: '30%',
               fontSize: 8,
               color: '#637381',
            },
            timelineLine: {
               width: 10,
               alignItems: 'center',
               justifyContent: 'center',
            },
            timelineDot: {
               width: 6,
               height: 6,
               borderRadius: 3,
               backgroundColor: '#919EAB',
            },
            timelineContent: {
               width: '70%',
               paddingLeft: 8,
            },
            timelineTitle: {
               fontSize: 9,
               fontWeight: 700,
               color: '#1C252E',
            },
            timelineDesc: {
               fontSize: 8,
               color: '#637381',
               marginTop: 2,
            },
            
            paymentProofImg: {
               width: 120,
               height: 160,
               borderRadius: 6,
               objectFit: 'cover',
               borderWidth: 1,
               borderColor: '#EAEAEA',
               marginTop: 8,
            },
            noProof: {
               fontSize: 9,
               color: '#919EAB',
               marginTop: 8,
            }
         }),
      []
   );

// Helper to get readable global status label and color
const getGlobalStatusProps = (status: string) => {
   const maps: Record<string, { label: string; bg: string; text: string }> = {
      waiting_payment: { label: 'Menunggu Pembayaran', bg: '#FFF5CC', text: '#B76E00' },
      stock_issue: { label: 'Masalah Stok', bg: '#FFE2E5', text: '#F64E60' },
      confirmed: { label: 'Pembayaran Diterima', bg: '#E4F8DD', text: '#118D57' },
      payment_verification: { label: 'Verifikasi Kasir', bg: '#E2F0FF', text: '#1890FF' },
      waiting_process: { label: 'Menunggu Diproses', bg: '#F4F6F8', text: '#637381' },
      on_progress: { label: 'Sedang Diproses', bg: '#FFF5CC', text: '#B76E00' },
      canceled: { label: 'Dibatalkan', bg: '#FFE2E5', text: '#F64E60' },
      finish: { label: 'Selesai', bg: '#E4F8DD', text: '#118D57' },
   };
   return maps[status] || { label: status, bg: '#F4F6F8', text: '#637381' };
};

// Helper to format process type labels
const getProcessLabel = (processType: string): string => {
   const maps: Record<string, string> = {
      pickup: 'Penjemputan',
      queue: 'Antrian',
      washing: 'Pencucian',
      drying: 'Pengeringan',
      ironing: 'Setrika',
      packing: 'Packing',
      ready: 'Siap Diambil',
      delivery: 'Pengiriman',
      done: 'Selesai',
      other: 'Lainnya',
   };
   return maps[processType] || processType;
};

interface Props {
   order: any;
   logs: OrderLogStatusData[];
   processLogs: OrderProcessLog[];
   base64PaymentProof?: string;
}

export default function OrderDetailsPdfDocument({ order, logs, processLogs, base64PaymentProof }: Props) {
   const styles = useStyles();
   
   const globalStatus = getGlobalStatusProps(order.status || '');
   const sortedLogs = [...logs].sort((a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix());
   const sortedProcessLogs = [...processLogs].sort((a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix());

   // Calculate manual subtotal
   const calculateSubtotal = () => {
      let total = 0;
      if (order.order_products) {
         order.order_products.forEach((p: any) => {
            const isIndividual = p.product?.tracking_mode === 'individual';
            const sub = isIndividual
               ? (p.price_at_order || 0) * (p.requested_length || 0) * (p.qty || 0)
               : (p.price_at_order || 0) * (p.qty || 0);
            total += sub;
         });
      }
      if (order.order_services) {
         order.order_services.forEach((s: any) => {
            total += (s.price_at_order || 0) * (s.qty || 0);
         });
      }
      return total;
   };

   const invoiceSubtotal = calculateSubtotal();
   const voucherDiscount = order.discount_amount || 0;

   return (
      <Document>
         <Page size="A4" style={styles.page}>
            {/* 1. Header Section */}
            <View style={styles.header}>
               <View style={styles.logoSection}>
                  <Text style={styles.title}>ORDER RECEIPT</Text>
                  <Text style={styles.subtitle}>{order.order_number}</Text>
                  <Text style={{ fontSize: 8, color: '#919EAB', marginTop: 2 }}>
                     Dibuat: {dayjs(order.created_at).format('DD MMM YYYY HH:mm')}
                  </Text>
               </View>
               <View>
                  <Text
                     style={[
                        styles.statusBadge,
                        { backgroundColor: globalStatus.bg, color: globalStatus.text },
                     ]}
                  >
                     {globalStatus.label}
                  </Text>
               </View>
            </View>

            {/* 2. Order Information (Grid style) */}
            <View style={styles.grid}>
               {/* Left: Customer Details */}
               <View style={styles.col6}>
                  <Text style={styles.sectionTitle}>INFORMASI PELANGGAN</Text>
                  <Text style={styles.label}>Nama Customer:</Text>
                  <Text style={styles.valueBold}>{order.user?.name || 'Umum'}</Text>

                  <Text style={styles.label}>Telepon Penerima:</Text>
                  <Text style={styles.value}>{order.phone_receiver || '-'}</Text>

                  <Text style={styles.label}>Alamat Pengantaran:</Text>
                  <Text style={[styles.value, { paddingRight: 20 }]}>{order.address_receiver || '-'}</Text>
               </View>

               {/* Right: Physical Measurements & Notes */}
               <View style={styles.col6}>
                  <Text style={styles.sectionTitle}>DETAIL LAYANAN & CUCIAN</Text>
                  
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                     <View style={{ width: '50%' }}>
                        <Text style={styles.label}>Total Berat:</Text>
                        <Text style={styles.valueBold}>{order.weight_kg ? `${order.weight_kg} kg` : '-'}</Text>
                     </View>
                     <View style={{ width: '50%' }}>
                        <Text style={styles.label}>Total Pieces:</Text>
                        <Text style={styles.valueBold}>{order.total_pcs ? `${order.total_pcs} Pcs` : '-'}</Text>
                     </View>
                  </View>

                  <Text style={styles.label}>Deskripsi / Catatan:</Text>
                  <Text style={styles.value}>
                     {order.notes || 'Tidak ada catatan tambahan.'}
                  </Text>
               </View>
            </View>

            {/* 3. List Services/Products */}
            <Text style={styles.sectionTitle}>RINCIAN ITEM & LAYANAN</Text>
            <View style={styles.table}>
               {/* Table Header */}
               <View style={styles.tableHeader}>
                  <Text style={[styles.colNo, { fontSize: 8, color: '#637381' }]}>#</Text>
                  <Text style={[styles.colDesc, { fontSize: 8, color: '#637381' }]}>Deskripsi Item / Layanan</Text>
                  <Text style={[styles.colQty, { fontSize: 8, color: '#637381' }]}>Qty</Text>
                  <Text style={[styles.colPrice, { fontSize: 8, color: '#637381' }]}>Harga Satuan</Text>
                  <Text style={[styles.colSubtotal, { fontSize: 8, color: '#637381' }]}>Subtotal</Text>
               </View>

               {/* Table Rows for Products */}
               {order.order_products?.map((item: any, idx: number) => {
                  const isIndividual = item.product?.tracking_mode === 'individual';
                  const qtyLabel = isIndividual 
                     ? `${item.qty} x ${item.requested_length} ${item.measurement_unit}`
                     : `${item.qty}`;
                  const subtotal = isIndividual
                     ? (item.price_at_order || 0) * (item.requested_length || 0) * (item.qty || 0)
                     : (item.price_at_order || 0) * (item.qty || 0);

                  return (
                     <View key={`p-${idx}`} style={styles.tableRow}>
                        <Text style={styles.colNo}>{idx + 1}</Text>
                        <View style={styles.colDesc}>
                           <Text style={{ fontWeight: 700 }}>{item.product?.title}</Text>
                           <Text style={{ fontSize: 8, color: '#637381' }}>Produk</Text>
                        </View>
                        <Text style={styles.colQty}>{qtyLabel}</Text>
                        <Text style={styles.colPrice}>{fCurrency(item.price_at_order || 0)}</Text>
                        <Text style={styles.colSubtotal}>{fCurrency(subtotal)}</Text>
                     </View>
                  );
               })}

               {/* Table Rows for Services */}
               {order.order_services?.map((item: any, idx: number) => {
                  const offset = (order.order_products?.length || 0);
                  const serviceName = item.service?.parent 
                     ? `${item.service.parent.name} - ${item.service.name}` 
                     : item.service?.name || 'Layanan';
                  
                  return (
                     <View key={`s-${idx}`} style={styles.tableRow}>
                        <Text style={styles.colNo}>{offset + idx + 1}</Text>
                        <View style={styles.colDesc}>
                           <Text style={{ fontWeight: 700 }}>{serviceName}</Text>
                           {item.notes && <Text style={{ fontSize: 8, color: '#637381' }}>Catatan: {item.notes}</Text>}
                        </View>
                        <Text style={styles.colQty}>{item.qty}</Text>
                        <Text style={styles.colPrice}>{fCurrency(item.price_at_order || 0)}</Text>
                        <Text style={styles.colSubtotal}>{fCurrency((item.price_at_order || 0) * (item.qty || 0))}</Text>
                     </View>
                  );
               })}
            </View>

            {/* 4. Pricing Breakdown */}
            <View style={styles.summaryContainer}>
               <View style={styles.summaryBlock}>
                  <View style={styles.summaryRow}>
                     <Text style={{ color: '#637381' }}>Subtotal:</Text>
                     <Text style={{ fontWeight: 700 }}>{fCurrency(invoiceSubtotal)}</Text>
                  </View>

                  {voucherDiscount > 0 && (
                     <View style={styles.summaryRow}>
                        <Text style={{ color: '#FF5630' }}>
                           Diskon {order.voucher?.code ? `(${order.voucher.code})` : ''}:
                        </Text>
                        <Text style={{ fontWeight: 700, color: '#FF5630' }}>-{fCurrency(voucherDiscount)}</Text>
                     </View>
                  )}

                  <View style={styles.totalRow}>
                     <Text style={styles.totalLabel}>Total Bayar:</Text>
                     <Text style={styles.totalValue}>{fCurrency(order.total_bill || 0)}</Text>
                  </View>
               </View>
            </View>

            {/* 5. Two-Column Layout for Payment Proof and Status Logs */}
            <View style={styles.horizontalContainer}>
               
               {/* Bukti Pembayaran */}
               <View style={styles.halfCard}>
                  <Text style={styles.sectionTitle}>BUKTI PEMBAYARAN</Text>
                  {order.payment_proof ? (
                     <View>
                        <Text style={{ fontSize: 8, color: '#637381', marginBottom: 4 }}>
                           Lampiran bukti transfer fisik:
                        </Text>
                        <Image 
                           src={base64PaymentProof || `${CONFIG.apiHostUrl}/${order.payment_proof}`} 
                           style={styles.paymentProofImg} 
                        />
                     </View>
                  ) : (
                     <Text style={styles.noProof}>Tidak ada lampiran bukti transfer fisik (atau pembayaran non-tunai).</Text>
                  )}
               </View>

               {/* Global Status Log */}
               <View style={styles.halfCard}>
                  <Text style={styles.sectionTitle}>RIWAYAT STATUS PESANAN</Text>
                  
                  {sortedLogs.length === 0 ? (
                     <Text style={styles.noProof}>Belum ada riwayat status.</Text>
                  ) : (
                     sortedLogs.map((log, i) => {
                        const logProps = getGlobalStatusProps(log.status || '');
                        return (
                           <View key={`log-${i}`} style={styles.timelineItem}>
                              <Text style={styles.timelineLeft}>
                                 {dayjs(log.created_at).format('DD MMM HH:mm')}
                              </Text>
                              <View style={styles.timelineLine}>
                                 <View style={[styles.timelineDot, { backgroundColor: logProps.text }]} />
                              </View>
                              <View style={styles.timelineContent}>
                                 <Text style={[styles.timelineTitle, { color: logProps.text }]}>
                                    {logProps.label}
                                 </Text>
                                 {log.reason && <Text style={styles.timelineDesc}>{log.reason}</Text>}
                              </View>
                           </View>
                        );
                     })
                  )}
               </View>
            </View>

            {/* 6. Rincian Proses Laundry (Timeline) */}
            {sortedProcessLogs.length > 0 && (
               <View style={{ padding: 12, backgroundColor: '#F9FAFB', borderRadius: 8, marginTop: 8 }}>
                  <Text style={styles.sectionTitle}>RINCIAN PROSES WORKFLOW LAUNDRY</Text>
                  
                  <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                     {sortedProcessLogs.map((pl, i) => {
                        return (
                           <View key={`pl-${i}`} style={{ width: '50%', flexDirection: 'row', marginBottom: 8 }}>
                              <Text style={{ width: '30%', fontSize: 8, color: '#637381' }}>
                                 {dayjs(pl.created_at).format('DD MMM HH:mm')}
                              </Text>
                              <View style={{ width: '70%', paddingLeft: 6 }}>
                                 <Text style={{ fontSize: 9, fontWeight: 700, color: '#007B55' }}>
                                    {getProcessLabel(pl.process_type)}
                                 </Text>
                                 {pl.description && (
                                    <Text style={{ fontSize: 8, color: '#637381' }}>{pl.description}</Text>
                                 )}
                              </View>
                           </View>
                        );
                     })}
                  </View>
               </View>
            )}
            
         </Page>
      </Document>
   );
}

export function OrderDetailsPDFDownload({ order, logs, processLogs }: Props) {
   const [base64Image, setBase64Image] = useState<string | undefined>(undefined);
   const [converting, setConverting] = useState(false);

   useEffect(() => {
      if (order?.payment_proof) {
         const convertImageToPng = async () => {
            setConverting(true);
            try {
               const fullUrl = `${CONFIG.apiHostUrl}/${order.payment_proof}`;
               const base64 = await new Promise<string>((resolve, reject) => {
                  const img = new window.Image();
                  img.crossOrigin = 'anonymous'; // Enable CORS
                  img.onload = () => {
                     const canvas = document.createElement('canvas');
                     canvas.width = img.width;
                     canvas.height = img.height;
                     const ctx = canvas.getContext('2d');
                     if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/png'));
                     } else {
                        reject(new Error('Canvas context null'));
                     }
                  };
                  img.onerror = (e) => reject(new Error('Failed to load image'));
                  img.src = fullUrl;
               });
               setBase64Image(base64);
            } catch (err) {
               console.warn('Failed to convert payment proof format to base64:', err);
            } finally {
               setConverting(false);
            }
         };
         convertImageToPng();
      }
   }, [order?.payment_proof]);

   return (
      <PDFDownloadLink
         document={
            <OrderDetailsPdfDocument
               order={order}
               logs={logs}
               processLogs={processLogs}
               base64PaymentProof={base64Image}
            />
         }
         fileName={`Order-${order.order_number || 'Receipt'}.pdf`}
         style={{ textDecoration: 'none' }}
      >
         {({ loading }) => (
            <Button
               variant="contained"
               color="primary"
               loading={loading || converting}
               startIcon={<Iconify icon="solar:file-download-bold-duotone" />}
            >
               Download PDF
            </Button>
         )}
      </PDFDownloadLink>
   );
}
