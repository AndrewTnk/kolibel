import { useAppSelector } from '../../app/store/hooks'
import { ProfileSheet } from '../../features/profile/ui/ProfileSheet/ProfileSheet'
import { CompanyMainContent } from '../../features/company/ui/CompanyMainContent'

export function PersonalPage() {
  const isCompany = useAppSelector((s) => s.account.type === 'company')

  // Профиль пользователя — «лист резюме» (редизайн).
  if (!isCompany) {
    return <ProfileSheet />
  }

  // Профиль компании — бренд-страница (редизайн): hero + табы + рейл, inline-модалки.
  return <CompanyMainContent />
}
