import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/utils/authCheck'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminLayout from '@/components/layouts/AdminLayout'
import Settings from '@/pages/Settings'

const queryClient = new QueryClient()

export const Route = createFileRoute('/settings')({
  beforeLoad: requireAuth,
  component: () => (
    <QueryClientProvider client={queryClient}>
      <AdminLayout>
        <Settings />
      </AdminLayout>
    </QueryClientProvider>
  ),
})
