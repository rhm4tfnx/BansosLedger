'use client'

import { createContext, createElement, useContext, useState, type ReactNode } from 'react'
import { canAccessPath, hasPermission, isReadOnlyPortalRole, isRole, ROLE_METADATA } from '@/lib/rbac'
import type { Permission, Role } from '@/types/rbac'

const RoleAccessContext = createContext<{ role: Role | null; setPreviewRole: (role: Role | null) => void } | null>(null)
export function RoleAccessProvider({ initialRole = null, children }: { initialRole?: Role | null; children: ReactNode }) {
  const [previewRole, setRole] = useState<Role | null | undefined>(undefined)
  const role = previewRole === undefined ? (isRole(initialRole) ? initialRole : null) : previewRole
  const setPreviewRole = (next: Role | null) => { if (process.env.NEXT_PUBLIC_ENABLE_UI_ROLE_PREVIEW === 'true' && isRole(initialRole)) setRole(isRole(next) ? next : null) }
  return createElement(RoleAccessContext.Provider, { value: { role, setPreviewRole } }, children)
}
// UI hints only. Server authorization must independently verify the signed session.
export function useRoleAccess(explicitRole?: Role | null) {
  const context = useContext(RoleAccessContext)
  const role = explicitRole !== undefined ? explicitRole : context?.role ?? null
  return { role, meta: isRole(role) ? ROLE_METADATA[role] : null, isAuthenticated: isRole(role), setPreviewRole: context?.setPreviewRole,
    can: (permission: Permission) => hasPermission(role, permission), canAccessPortal: hasPermission(role, 'dashboard:read'),
    canAccessRoute: (pathname: string) => canAccessPath(role, pathname), isReadOnly: isReadOnlyPortalRole(role) }
}
