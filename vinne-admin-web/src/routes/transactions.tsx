import { createFileRoute, redirect } from '@tanstack/react-router'
import AdminLayout from '@/components/layouts/AdminLayout'
import TransactionsModule from '@/pages/TransactionsModule'

export const Route = createFileRoute('/transactions')({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeLoad: ({ context }: any) => {
    // Check if user is authenticated
    if (!context.auth?.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: '/transactions',
        },
      })
    }
  },
  component: () => (
    <AdminLayout>
      <TransactionsModule />
    </AdminLayout>
  ),
})