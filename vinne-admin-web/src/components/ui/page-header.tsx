import React from 'react'
import { Badge } from '@/components/ui/badge'

interface PageHeaderProps {
  title: string
  description?: string
  badge?: string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  children?: React.ReactNode
}

export function PageHeader({ 
  title, 
  description, 
  badge, 
  badgeVariant = 'default',
  children 
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-6 border-b border-border">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {badge && (
            <Badge variant={badgeVariant} className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-muted-foreground text-sm max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  )
}

export default PageHeader