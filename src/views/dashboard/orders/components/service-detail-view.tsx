import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import { Lightbox, useLightbox } from 'src/components/lightbox';
import { IOrderServiceDetail } from 'src/types/service';
import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

type Props = {
   detail?: IOrderServiceDetail;
};

export default function ServiceDetailView({ detail }: Props) {
   const getImages = (imagesStr?: string | string[]) => {
      try {
         if (!imagesStr) return [];
         // Handle if it's already an array
         const imgs = Array.isArray(imagesStr) ? imagesStr : JSON.parse(imagesStr);
         return imgs.map((img: string) => ({
            src: img.startsWith('http') ? img : `${CONFIG.apiHostUrl}/${img}`,
         }));
      } catch (e) {
         return [];
      }
   };

   const images = getImages(detail?.images);
   const lightbox = useLightbox(images);

   if (!detail) {
      return (
         <Card>
            <Box sx={{ p: 3, textAlign: 'center' }}>
               <Typography variant="body2" color="text.secondary">
                  No details available.
               </Typography>
            </Box>
         </Card>
      );
   }

   return (
      <Card>
         <CardHeader title="Report / Details" />

         <Stack spacing={3} sx={{ p: 3 }}>
            <Box>
               <Typography variant="subtitle2" gutterBottom>
                  Description
               </Typography>
               <Typography
                  variant="body2"
                  color="text.secondary"
                  component="div"
                  dangerouslySetInnerHTML={{ __html: detail.description || 'No description provided.' }}
               />
            </Box>

            {images.length > 0 && (
               <Box>
                  <Typography variant="subtitle2" gutterBottom>
                     Photos
                  </Typography>
                  <Box
                     gap={1}
                     display="grid"
                     gridTemplateColumns={{
                        xs: 'repeat(1, 1fr)',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(3, 1fr)',
                        lg: 'repeat(4, 1fr)',
                     }}
                  >
                     {images.map((img: any, i: number) => (
                        <Box
                           key={i}
                           component="img"
                           src={img.src}
                           sx={{
                              width: 1,
                              height: 160,
                              objectFit: 'cover',
                              borderRadius: 1,
                              cursor: 'pointer',
                              border: (theme) => `1px solid ${theme.palette.divider}`,
                           }}
                           onClick={() => lightbox.onOpen(img.src)}
                        />
                     ))}
                  </Box>

                  <Lightbox
                     index={lightbox.selected}
                     slides={images}
                     open={lightbox.open}
                     close={lightbox.onClose}
                  />
               </Box>
            )}
         </Stack>
      </Card>
   );
}
