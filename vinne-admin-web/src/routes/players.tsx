import { createFileRoute, redirect } from '@tanstack/react-router'
import AdminLayout from '@/components/layouts/AdminLayout'
import PlayersModule from '@/pages/PlayersModule'

export const Route = createFileRoute('/players')({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeLoad: ({ context }: any) => {
    // Check if user is authenticated
    if (!context.auth?.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: '/players',
        },
      })
    }
  },
  component: () => (
    <AdminLayout>
      <PlayersModule />
    </AdminLayout>
  ),
})
