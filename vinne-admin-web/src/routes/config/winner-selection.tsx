import { createFileRoute, redirect } from '@tanstack/react-router'
import AdminLayout from '@/components/layouts/AdminLayout'
import WinnerSelectionConfig from '@/pages/WinnerSelectionConfig'

export const Route = createFileRoute('/config/winner-selection')({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeLoad: ({ context }: any) => {
    // Check if user is authenticated
    if (!context.auth?.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: '/config/winner-selection',
        },
      })
    }
  },
  component: () => (
    <AdminLayout>
      <WinnerSelectionConfig />
    </AdminLayout>
  ),
})