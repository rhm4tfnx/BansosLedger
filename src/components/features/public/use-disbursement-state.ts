'use client'

import { useRoleAccess } from '@/hooks/use-role-access'
import { useDisbursementsQuery } from '@/lib/api/hooks/disbursements'

export function useDisbursements() {
  const { can } = useRoleAccess()
  const query = useDisbursementsQuery({ page: 1, limit: 20 })
  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    operator: can('disbursement:create'),
  }
}
