import type { RawMaterialMovement } from 'src/types/raw-material';

import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

import useRawMaterialMovementStore from 'src/stores/raw-material-movement';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
   orderId: string;
};

export default function UsedRawMaterialList({ orderId }: Props) {
   const { getOrderMovements } = useRawMaterialMovementStore();
   const [movements, setMovements] = useState<RawMaterialMovement[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const fetch = async () => {
         setLoading(true);
         try {
            const res = await getOrderMovements({ orderId });
            setMovements(res || []);
         } catch (error: any) {
            // Silently ignore permission errors (e.g. kasir doesn't have Read RawMaterial)
            const status = error?.response?.status ?? error?.status;
            if (status !== 403 && status !== 401) {
               console.error('Failed to load raw material movements', error);
            }
            setMovements([]);
         } finally {
            setLoading(false);
         }
      };
      fetch();
   }, [orderId, getOrderMovements]);

   if (loading) return null;
   if (!movements.length) return null;

   return (
      <Card sx={{ mb: 3 }}>
         <CardHeader title="Used Raw Material" />
         <CardContent sx={{ p:0, py:2 }}>
            <Table size="small">
               <TableHead>
                  <TableRow>
                     <TableCell>Material</TableCell>
                     <TableCell align="center">Usage</TableCell>
                     <TableCell>Notes</TableCell>
                  </TableRow>
               </TableHead>
               <TableBody>
                  {movements.map((mv) => (
                     <TableRow key={mv.id} hover>
                        <TableCell>
                           <Box>
                              <Typography variant="body2" fontWeight={600}>
                                 {mv.raw_material?.title ?? '-'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                 {mv.raw_material?.unit ?? ''}
                              </Typography>
                           </Box>
                        </TableCell>
                        <TableCell align="center">
                           <Chip
                              label={`-${mv.qty} ${mv.raw_material?.unit ?? ''}`}
                              color="error"
                              size="small"
                              variant="soft"
                              icon={<Iconify icon="solar:arrow-down-bold" width={14} />}
                           />
                        </TableCell>
                        <TableCell>
                           <Typography variant="caption" color="text.secondary">
                              {mv.notes || '-'}
                           </Typography>
                        </TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
         </CardContent>
      </Card>
   );
}
