import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/al/paths';
import { RouterLink } from 'src/routes/components';
import { Iconify } from 'src/components/iconify';
import { fCurrency } from 'src/utils/format-number';
import { IOrderService } from 'src/types/service';
import useServiceTrackingStore from 'src/stores/service-tracking';

import ServiceProcessTimeline from './service-process-timeline';
import ServiceDetailView from './service-detail-view';

type Props = {
   item: IOrderService;
   orderId: string;
   readOnly?: boolean;
   readOnlyProcess?: boolean;
};

export default function ServiceItem({
   item,
   orderId,
   readOnly = false,
   readOnlyProcess = false,
}: Props) {
   const { getServiceTracking, orderService, isLoading } = useServiceTrackingStore();

   const [expanded, setExpanded] = useState(false);
   const [currentTab, setCurrentTab] = useState('process');

   const handleExpand = useCallback(async () => {
      if (!expanded && item.id) {
         // Fetch detailed tracking data when expanding
         await getServiceTracking(orderId, item.id, readOnlyProcess);
      }
      setExpanded((prev) => !prev);
   }, [expanded, item.id, orderId, getServiceTracking, readOnlyProcess]);

   const handleChangeTab = (event: React.SyntheticEvent, newValue: string) => {
      setCurrentTab(newValue);
   };

   // Check if the loaded service tracking matches this item
   const isDataLoaded = orderService?.service?.id === item.service?.id;
   const processes = isDataLoaded ? orderService?.service_process || [] : [];
   const detail = isDataLoaded ? orderService?.service_detail : undefined;

   return (
      <Card sx={{ mb: 2 }}>
         <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
               <Typography variant="subtitle2">{item.service?.name}</Typography>
               {item.notes && (
                  <Typography variant="caption" color="text.secondary" display="block">
                     Note: {item.notes}
                  </Typography>
               )}
               <Typography variant="caption" color="text.secondary">
                  {item.qty} {item.service?.unit} × {fCurrency(item.price_at_order || 0)}
               </Typography>
            </Box>

            <Box sx={{ textAlign: 'right' }}>
               <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {fCurrency((item.price_at_order || 0) * (item.qty || 0))}
               </Typography>

               <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button
                     size="small"
                     variant="contained"
                     color="inherit"
                     endIcon={
                        <Iconify
                           icon={
                              expanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'
                           }
                        />
                     }
                     onClick={handleExpand}
                  >
                     {expanded ? 'Hide' : 'Details'}
                  </Button>

                  {!readOnly && !readOnlyProcess && (
                     <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<Iconify icon="mdi:timeline-clock-outline" />}
                        component={RouterLink}
                        href={paths.dashboard.orders.serviceTracking(orderId, item.id || '')}
                     >
                        Manage Process
                     </Button>
                  )}
               </Stack>
            </Box>
         </Box>

         <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Divider />
            <Box sx={{ bgcolor: 'background.neutral' }}>
               <Tabs
                  value={currentTab}
                  onChange={handleChangeTab}
                  sx={{
                     px: 2,
                     bgcolor: 'background.paper',
                     borderBottom: 1,
                     borderColor: 'divider',
                  }}
               >
                  <Tab value="process" label="Process Timeline" />
                  <Tab value="report" label="Report / Details" />
               </Tabs>

               <Box sx={{ p: 2 }}>
                  {isLoading && !isDataLoaded ? (
                     <Box sx={{ p: 3, textAlign: 'center' }}>Loading...</Box>
                  ) : (
                     <>
                        {currentTab === 'process' && (
                           <ServiceProcessTimeline
                              orderId={orderId}
                              serviceId={item.id || ''}
                              processes={processes}
                              readOnly
                           />
                        )}

                        {currentTab === 'report' && <ServiceDetailView detail={detail} />}
                     </>
                  )}
               </Box>
            </Box>
         </Collapse>
      </Card>
   );
}
