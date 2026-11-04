'use client'

import { createContext, createElement, useContext, useState, type ReactNode } from 'react'
import { useSession } from '@/lib/api/hooks/auth'
import { canAccessPath, hasPermission, isReadOnlyPortalRole, isRole, ROLE_METADATA } from '@/lib/rbac'
import type { SessionViewModel } from '@/types/models'
import type { Permission, Role } from '@/types/rbac'

interface RoleAccessContextValue {
  role: Role | null
  session: SessionViewModel | null
  isSessionLoading: boolean
  setPreviewRole: (role: Role | null) => void
}

const RoleAccessContext = createContext<RoleAccessContextValue | null>(null)

export function isDevRolePreviewEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_ENABLE_UI_ROLE_PREVIEW === 'true'
  )
}

export function RoleAccessProvider({
  initialRole = null,
  enableSessionQuery = true,
  children,
}: {
  initialRole?: Role | null
  enableSessionQuery?: boolean
  children: ReactNode
}) {
  const [previewRole, setRole] = useState<Role | null | undefined>(undefined)
  const sessionQuery = useSession({ enabled: enableSessionQuery })

  const resolvedServerRole: Role | null = sessionQuery.data
    ? sessionQuery.data.role
    : isRole(initialRole)
      ? initialRole
      : null

  const allowPreview = isDevRolePreviewAllowedForRole(resolvedServerRole)
  const role = allowPreview && previewRole !== undefined ? previewRole : resolvedServerRole

  const setPreviewRole = (next: Role | null) => {
    if (isDevRolePreviewAllowedForRole(resolvedServerRole)) {
      setRole(isRole(next) ? next : null)
    }
  }

  return createElement(
    RoleAccessContext.Provider,
    {
      value: {
        role,
        session: sessionQuery.data ?? null,
        isSessionLoading: sessionQuery.isLoading,
        setPreviewRole,
      },
    },
    children,
  )
}

function isDevRolePreviewAllowedForRole(serverRole: Role | null): boolean {
  return isDevRolePreviewEnabled() && isRole(serverRole)
}

// UI hints only. Server authorization must independently verify the signed session.
export function useRoleAccess(explicitRole?: Role | null) {
  const context = useContext(RoleAccessContext)
  const role = explicitRole !== undefined ? explicitRole : context?.role ?? null
  return {
    role,
    session: context?.session ?? null,
    isSessionLoading: context?.isSessionLoading ?? false,
    meta: isRole(role) ? ROLE_METADATA[role] : null,
    isAuthenticated: isRole(role),
    setPreviewRole: context?.setPreviewRole,
    can: (permission: Permission) => hasPermission(role, permission),
    canAccessPortal: hasPermission(role, 'dashboard:read'),
    canAccessRoute: (pathname: string) => canAccessPath(role, pathname),
    isReadOnly: isReadOnlyPortalRole(role),
  }
}
