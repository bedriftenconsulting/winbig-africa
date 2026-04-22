import { createFileRoute, redirect } from '@tanstack/react-router'
import AdminLayout from '@/components/layouts/AdminLayout'
import UssdSessions from '@/pages/UssdSessions'

export const Route = createFileRoute('/ussd-sessions')({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeLoad: ({ context }: any) => {
    if (!context.auth?.isAuthenticated) {
      throw redirect({ to: '/login', search: { redirect: '/ussd-sessions' } })
    }
  },
  component: () => (
    <AdminLayout>
      <UssdSessions />
    </AdminLayout>
  ),
})
