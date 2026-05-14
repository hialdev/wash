'use client';

import { useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import Timeline from '@mui/lab/Timeline';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';

import { Iconify } from 'src/components/iconify';
import { CONFIG } from 'src/global-config';

import useOrderProcessLogStore from 'src/stores/order-process-log';

// ----------------------------------------------------------------------

const PROCESS_TYPES = [
   { value: 'pickup',    label: 'Penjemputan',     icon: 'solar:delivery-bold-duotone',        color: 'info' },
   { value: 'queue',     label: 'Antrian',          icon: 'solar:clock-circle-bold-duotone',    color: 'secondary' },
   { value: 'washing',   label: 'Pencucian',        icon: 'solar:waterdrops-bold-duotone',      color: 'primary' },
   { value: 'drying',    label: 'Pengeringan',      icon: 'solar:sun-bold-duotone',             color: 'warning' },
   { value: 'ironing',   label: 'Setrika',          icon: 'solar:bolt-bold-duotone',            color: 'warning' },
   { value: 'packing',   label: 'Packing',          icon: 'solar:box-bold-duotone',             color: 'secondary' },
   { value: 'ready',     label: 'Siap Diambil',     icon: 'solar:check-circle-bold-duotone',   color: 'success' },
   { value: 'delivery',  label: 'Pengiriman',       icon: 'solar:delivery-bold-duotone',        color: 'info' },
   { value: 'done',      label: 'Selesai',          icon: 'solar:verified-check-bold-duotone',  color: 'success' },
   { value: 'other',     label: 'Lainnya',          icon: 'solar:notes-bold-duotone',           color: 'default' },
] as const;

type ProcessTypeColor = 'info' | 'secondary' | 'primary' | 'warning' | 'success' | 'default';

function getProcessType(value: string) {
   return PROCESS_TYPES.find((p) => p.value === value) ?? {
      value,
      label: value,
      icon: 'solar:notes-bold-duotone',
      color: 'default' as ProcessTypeColor,
   };
}

function parseImages(images?: string): string[] {
   if (!images) return [];
   try {
      const arr = JSON.parse(images);
      return arr.map((url: string) => (url.startsWith('http') ? url : `${CONFIG.apiHostUrl}/${url}`));
   } catch {
      return [];
   }
}

// ----------------------------------------------------------------------

interface Props {
   orderId: string;
}

export default function MyOrderProcessLog({ orderId }: Props) {
   const { logs, loading, getUserLogs, reset } = useOrderProcessLogStore();

   useEffect(() => {
      if (orderId) {
         getUserLogs(orderId);
      }
      return () => {
         reset();
      };
   }, [orderId, getUserLogs, reset]);

   // If loading and logs is empty, show loading state
   if (loading && logs.length === 0) {
      return (
         <Card sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 140 }}>
            <Typography variant="body2" color="text.secondary">
               Memuat rincian proses pencucian...
            </Typography>
         </Card>
      );
   }

   // Only render the whole card if there are actually logs present
   if (logs.length === 0) {
      return null;
   }

   return (
      <Card>
         <CardHeader
            title={
               <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify icon="solar:refresh-circle-bold-duotone" width={22} sx={{ color: 'primary.main' }} />
                  <Typography variant="h6">Rincian Proses Laundry</Typography>
               </Stack>
            }
         />
         <CardContent sx={{ pt: 0.5 }}>
            <Timeline sx={{ m: 0, p: 0 }}>
               {logs.map((log, idx) => {
                  const pt = getProcessType(log.process_type);
                  const imgs = parseImages(log.images);
                  const isLast = idx === logs.length - 1;
                  return (
                     <TimelineItem key={log.id} sx={{ '&:before': { flex: 0, p: 0 }, minHeight: isLast ? 'auto' : 60 }}>
                        <TimelineOppositeContent
                           sx={{ m: 'auto 0', minWidth: 72, textAlign: 'right', pr: 1.5 }}
                           variant="caption"
                           color="text.secondary"
                        >
                           {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                           <br />
                           {new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                        </TimelineOppositeContent>
                        <TimelineSeparator>
                           <TimelineDot color={pt.color === 'default' ? 'grey' : (pt.color as any)} sx={{ boxShadow: 'none' }}>
                              <Iconify icon={pt.icon} width={16} />
                           </TimelineDot>
                           {!isLast && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent sx={{ py: 1.5, px: 2 }}>
                           <Stack spacing={0.5}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                 <Chip label={pt.label} size="small" color={pt.color as any} variant="soft" sx={{ fontWeight: 'bold' }} />
                              </Stack>
                              {log.description && (
                                 <Typography variant="body2" color="text.primary">
                                    {log.description}
                                 </Typography>
                              )}
                              {imgs.length > 0 && (
                                 <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 1 }}>
                                    {imgs.map((src, i) => (
                                       <Box
                                          key={i}
                                          component="img"
                                          src={src}
                                          sx={{ 
                                             width: 64, 
                                             height: 64, 
                                             borderRadius: 1, 
                                             objectFit: 'cover', 
                                             cursor: 'pointer',
                                             border: (theme) => `solid 1px ${theme.palette.divider}`,
                                             '&:hover': { opacity: 0.8 }
                                          }}
                                          onClick={() => window.open(src, '_blank')}
                                       />
                                    ))}
                                 </Stack>
                              )}
                           </Stack>
                        </TimelineContent>
                     </TimelineItem>
                  );
               })}
            </Timeline>
         </CardContent>
      </Card>
   );
}
