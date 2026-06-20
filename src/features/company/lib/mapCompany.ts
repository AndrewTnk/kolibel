import type {
  CompanyContact,
  CompanyDirection,
  CompanyPhoto,
  CompanyProduct,
  CompanyProfile,
  CompanyValue,
} from '../model/companyData'

/** Строка таблицы public.companies. */
export type CompanyRow = {
  id: string
  name: string | null
  tagline: string | null
  directions: CompanyDirection[] | null
  culture_values: CompanyValue[] | null
  gallery: CompanyPhoto[] | null
  avatar_url: string | null
  logo_url: string | null
  banner_url: string | null
  industry: string | null
  location: string | null
  country: string | null
  about: string | null
  website: string | null
  size: string | null
  headquarters: string | null
  connected_members: string | null
  verified_date: string | null
  specialties: string[] | null
  products: CompanyProduct[] | null
  contacts: CompanyContact[] | null
}

/** Строка БД → модель CompanyProfile для UI. */
export function rowToCompany(row: CompanyRow): CompanyProfile {
  const name = row.name ?? ''
  return {
    name,
    logoInitial: name.trim().charAt(0).toUpperCase() || 'K',
    tagline: row.tagline ?? undefined,
    directions: row.directions ?? [],
    cultureValues: row.culture_values ?? [],
    gallery: row.gallery ?? [],
    avatar: row.avatar_url ?? undefined,
    logo: row.logo_url ?? undefined,
    banner: row.banner_url ?? '',
    industry: row.industry ?? '',
    location: row.location ?? '',
    country: row.country ?? undefined,
    isOnline: true,
    about: row.about ?? '',
    website: row.website ?? '',
    verifiedDate: row.verified_date ?? '',
    size: row.size ?? '',
    connectedMembers: row.connected_members ?? '',
    headquarters: row.headquarters ?? '',
    specialties: row.specialties ?? [],
    products: row.products ?? [],
    // «Люди» — будущая реляционная фича (сотрудники), пока пусто для реальных компаний
    people: [],
    contacts: row.contacts ?? [],
  }
}

/** Модель CompanyProfile → поля для UPDATE в БД. */
export function companyToRow(c: CompanyProfile): Partial<CompanyRow> {
  return {
    name: c.name,
    tagline: c.tagline ?? null,
    directions: c.directions,
    culture_values: c.cultureValues,
    gallery: c.gallery,
    avatar_url: c.avatar ?? null,
    logo_url: c.logo ?? null,
    banner_url: c.banner || null,
    industry: c.industry,
    location: c.location,
    country: c.country ?? null,
    about: c.about,
    website: c.website,
    size: c.size,
    headquarters: c.headquarters,
    connected_members: c.connectedMembers,
    verified_date: c.verifiedDate || null,
    specialties: c.specialties,
    products: c.products,
    contacts: c.contacts,
  }
}
