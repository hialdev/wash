import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { fCurrency } from 'src/utils/format-number';
import { IOrderService } from 'src/types/service';

// ----------------------------------------------------------------------

type Props = {
   item: IOrderService;
   orderId: string;
   readOnly?: boolean;
   readOnlyProcess?: boolean;
};

export default function ServiceItem({ item }: Props) {
   return (
      <Card sx={{ mb: 2 }}>
         <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
               <Typography variant="subtitle2">
                  {item.service?.name} {item.service_variant && `— ${item.service_variant.name}`}
               </Typography>
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
               <Typography variant="subtitle2">
                  {fCurrency((item.price_at_order || 0) * (item.qty || 0))}
               </Typography>
            </Box>
         </Box>
      </Card>
   );
}
