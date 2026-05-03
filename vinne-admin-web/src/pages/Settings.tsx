import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { User, Lock, ShieldCheck, CheckCircle, Eye, EyeOff } from 'lucide-react'
import api from '@/lib/api'

interface ProfileData {
  id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  is_active: boolean
  mfa_enabled: boolean
  last_login?: string
  roles?: { name: string }[]
}

export default function Settings() {
  const qc = useQueryClient()

  // Profile
  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ['admin-profile'],
    queryFn: async () => {
      const res = await api.get<{ data: ProfileData }>('/admin/profile')
      return res.data.data
    },
  })

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [profileDirty, setProfileDirty] = useState(false)

  // Sync form fields once when profile data arrives
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '')
      setLastName(profile.last_name ?? '')
      setEmail(profile.email ?? '')
      setProfileDirty(false)
    }
  }, [profile])

  const profileMutation = useMutation({
    mutationFn: async () => {
      await api.put('/admin/profile', { first_name: firstName, last_name: lastName, email })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-profile'] })
      setProfileDirty(false)
      toast({ title: 'Profile updated' })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Update failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    },
  })

  // Change password
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwError, setPwError] = useState('')

  const passwordMutation = useMutation({
    mutationFn: async () => {
      await api.post('/admin/auth/change-password', {
        current_password: currentPw,
        new_password: newPw,
      })
    },
    onSuccess: () => {
      setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwError('')
      toast({ title: 'Password changed', description: 'Your password has been updated.' })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Password change failed'
      setPwError(msg)
    },
  })

  const handlePasswordSubmit = () => {
    setPwError('')
    if (!currentPw) { setPwError('Current password is required'); return }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return }
    passwordMutation.mutate()
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account and security preferences</p>
      </div>

      {/* Profile card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> Profile
          </CardTitle>
          <CardDescription>Your name and email address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <>
              {/* Username + role (read-only) */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-primary">
                    {profile?.username?.[0]?.toUpperCase() ?? 'A'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{profile?.username}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {profile?.roles?.map(r => (
                    <Badge key={r.name} variant="secondary" className="text-xs capitalize">
                      {r.name.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                  {profile?.is_active && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>First Name</Label>
                  <Input value={firstName} onChange={e => { setFirstName(e.target.value); setProfileDirty(true) }} placeholder="First name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name</Label>
                  <Input value={lastName} onChange={e => { setLastName(e.target.value); setProfileDirty(true) }} placeholder="Last name" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => { setEmail(e.target.value); setProfileDirty(true) }} placeholder="email@example.com" />
              </div>

              {profile?.last_login && (
                <p className="text-xs text-muted-foreground">
                  Last login: {new Date(profile.last_login).toLocaleString('en-GH')}
                </p>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => profileMutation.mutate()}
                  disabled={!profileDirty || profileMutation.isPending}
                  size="sm"
                >
                  {profileMutation.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Change password card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" /> Change Password
          </CardTitle>
          <CardDescription>Use a strong password of at least 8 characters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Current Password</Label>
            <div className="relative">
              <Input
                type={showCurrent ? 'text' : 'password'}
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="••••••••"
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(v => !v)}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>New Password</Label>
            <div className="relative">
              <Input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="••••••••"
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
            />
          </div>

          {newPw && confirmPw && newPw !== confirmPw && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
          {pwError && <p className="text-xs text-destructive">{pwError}</p>}

          <div className="flex justify-end">
            <Button
              onClick={handlePasswordSubmit}
              disabled={!currentPw || !newPw || !confirmPw || passwordMutation.isPending}
              size="sm"
            >
              {passwordMutation.isPending ? 'Changing…' : 'Change Password'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* MFA info card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" /> Two-Factor Authentication
          </CardTitle>
          <CardDescription>Extra security layer for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {profile?.mfa_enabled ? 'Enabled' : 'Not enabled'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {profile?.mfa_enabled
                  ? 'Your account is protected with 2FA.'
                  : 'Contact a super admin to enable 2FA on your account.'}
              </p>
            </div>
            <Badge variant={profile?.mfa_enabled ? 'default' : 'secondary'} className="shrink-0">
              {profile?.mfa_enabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
