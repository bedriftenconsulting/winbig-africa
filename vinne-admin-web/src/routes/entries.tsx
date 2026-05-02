import { createFileRoute, redirect } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminLayout from '@/components/layouts/AdminLayout'
import QuickAddEntry from '@/pages/QuickAddEntry'

const queryClient = new QueryClient()

export const Route = createFileRoute('/entries')({
  beforeLoad: ({ context }: any) => {
    if (!context.auth?.isAuthenticated) {
      throw redirect({ to: '/login', search: { redirect: '/entries' } })
    }
  },
  component: () => (
    <QueryClientProvider client={queryClient}>
      <AdminLayout>
        <QuickAddEntry />
      </AdminLayout>
    </QueryClientProvider>
  ),
})
