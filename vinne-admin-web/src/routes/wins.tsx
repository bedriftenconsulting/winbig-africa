import { createFileRoute, redirect } from '@tanstack/react-router'
import AdminLayout from '@/components/layouts/AdminLayout'
import WinsModule from '@/pages/WinsModule'

export const Route = createFileRoute('/wins')({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeLoad: ({ context }: any) => {
    // Check if user is authenticated
    if (!context.auth?.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: '/wins',
        },
      })
    }
  },
  component: WinsComponent,
})

function WinsComponent() {
  return (
    <AdminLayout>
      <WinsModule />
    </AdminLayout>
  )
}