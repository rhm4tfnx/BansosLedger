'use client'

import { hasPermission } from '@/lib/rbac'
import type { Permission, Role } from '@/types/rbac'

// UI hints only; server authorization must use a verified session, never this hook.
export function useRoleAccess(role: Role | null = null) {
  return {
    can: (permission: Permission) => hasPermission(role, permission),
    canAccessPortal: hasPermission(role, 'portal:read'),
    isReadOnly: !hasPermission(role, 'draft:update'),
  }
}
