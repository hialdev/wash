import { redirect } from 'next/navigation';

import { paths } from 'src/routes/al/paths';

import { getServerSession } from 'src/lib/al/auth';

// AuthGuard.tsx
export default async function AuthGuard({
   children,
   currentPath = paths.dashboard.root,
   requiredPermissions,
}: {
   children: React.ReactNode;
   currentPath?: string;
   requiredPermissions?: string[];
}) {
   const timestamp = new Date().toISOString();
   console.log(`\n[${timestamp}] [AUTH-GUARD] ========== AuthGuard START ==========`);
   console.log(`[${timestamp}] [AUTH-GUARD] Current path:`, currentPath);

   const session = await getServerSession();

   if (!session) {
      redirect(`/api/auth/refresh?returnTo=${encodeURIComponent(currentPath)}`);
   } else if (session.userId === 'algans-cobalagi') {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
         method: 'POST',
         credentials: 'include',
         cache: 'no-store',
      });

      if (!res.ok) {
         console.error('Logout failed');
      }

      redirect(paths.auth.signIn);
   }
   
   if (session){
      console.log(`[${timestamp}] [AUTH-GUARD] ✅ Auth passed, rendering children`);
      console.log(`[${timestamp}] [AUTH-GUARD] ========== AuthGuard END (success) ==========\n`);
      return <>{children}</>;
   }
}
