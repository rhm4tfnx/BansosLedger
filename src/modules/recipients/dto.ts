import 'server-only'
import { recipientDtoSchema, type RecipientDto } from '@/lib/api-contract/dto'

export function toRecipientDto(doc: any): RecipientDto {
  const dto = {
    id: String(doc._id ?? doc.id),
    nikMasked: String(doc.nikMasked ?? ''),
    name: String(doc.name ?? ''),
    address: {
      dusun: String(doc.address?.dusun ?? ''),
      rt: String(doc.address?.rt ?? ''),
      rw: String(doc.address?.rw ?? ''),
    },
    phone: doc.phone ? String(doc.phone) : null,
    status: doc.status,
    commitment: doc.commitment ? String(doc.commitment) : null,
    enrollments: Array.isArray(doc.enrollments)
      ? doc.enrollments.map((item: any) => ({
          programCode: String(item.programCode ?? ''),
          status: item.status,
        }))
      : [],
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt ?? new Date().toISOString()),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt ?? new Date().toISOString()),
    finalizedAt: doc.finalizedAt ? (doc.finalizedAt instanceof Date ? doc.finalizedAt.toISOString() : String(doc.finalizedAt)) : null,
  }
  return recipientDtoSchema.parse(dto)
}

