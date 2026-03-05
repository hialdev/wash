'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { Logo } from 'src/components/logo';
import { paths } from 'src/routes/al/paths';
import useAuthStore from 'src/stores/auth';

// ----------------------------------------------------------------------

export default function Page() {
   const router = useRouter();
   const { authData } = useAuthStore();

   useEffect(() => {
      // Check auth status from store after a short delay for splashscreen effect
      const timer = setTimeout(() => {
         if (authData?.userId) {
            router.push(paths.dashboard.root);
         } else {
            router.push(paths.auth.signIn);
         }
      }, 1000);

      return () => clearTimeout(timer);
   }, [router, authData]);

   return (
      <Box
         sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            bgcolor: 'background.default',
         }}
      >
         <Box sx={{ mb: 4, transform: 'scale(1.5)' }}>
            <Logo isSingle={false} />
         </Box>
         <CircularProgress color="primary" />
      </Box>
   );
}
