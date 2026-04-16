import { createFileRoute, redirect } from '@tanstack/react-router'
import AdminLayout from '@/components/layouts/AdminLayout'
import GameConfiguration from '@/pages/GameConfiguration'

export const Route = createFileRoute('/games/create')({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeLoad: ({ context }: any) => {
    // Check if user is authenticated
    if (!context.auth?.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: '/games/create',
        },
      })
    }
  },
  component: () => (
    <AdminLayout>
      <GameConfiguration />
    </AdminLayout>
  ),
})