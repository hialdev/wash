import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  weight?: number;
  totalPcs?: number;
  notes?: string;
};

export function OrderDetailsPhysical({ weight, totalPcs, notes }: Props) {
  return (
    <>
      <CardHeader title="Detail Fisik & Catatan" />

      <Stack spacing={2.5} sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Iconify icon="solar:scale-bold-duotone" width={32} sx={{ color: 'primary.main' }} />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Total Berat
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {weight ? `${weight} kg` : '-'}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          <Iconify icon="solar:box-minimalistic-bold-duotone" width={32} sx={{ color: 'warning.main' }} />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Total Pcs
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {totalPcs ? `${totalPcs} Pcs` : '-'}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Iconify icon="solar:document-text-bold-duotone" width={32} sx={{ color: 'info.main', mt: 0.5 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Catatan / Deskripsi
            </Typography>
            <Typography variant="body2" color={notes ? 'text.primary' : 'text.disabled'} sx={{ fontStyle: notes ? 'normal' : 'italic' }}>
              {notes || 'Tidak ada catatan tambahan'}
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </>
  );
}
