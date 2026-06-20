import { useState } from 'react'
import { AppHeader } from '../../shared/ui/AppHeader/AppHeader'
import { menuItems, type SectionKey } from '../../features/settings/model/settingsData'
import {
  AccountSection,
  SecuritySection,
  NotificationsSection,
  AnalyticsSection,
  BillingSection,
  AdsSection,
  BlacklistSection,
} from '../../features/settings/ui/sections'
import { SupportLinks } from '../../shared/ui/Recommendations/SupportLinks'
import styles from './SettingsPage.module.css'

const sectionMap: Record<SectionKey, () => React.ReactElement> = {
  account: AccountSection,
  security: SecuritySection,
  notifications: NotificationsSection,
  analytics: AnalyticsSection,
  billing: BillingSection,
  ads: AdsSection,
  blacklist: BlacklistSection,
}

export function SettingsPage() {
  const [active, setActive] = useState<SectionKey>('account')
  const ActiveSection = sectionMap[active]

  return (
    <div className={styles.page}>
      <AppHeader />
      <main className={styles.main}>
        <div className={styles.layout}>
          {/* Левая колонка: меню разделов + ссылки */}
          <div className={styles.sidebar}>
            <aside className={styles.menu} aria-label="Разделы настроек">
              <h1 className={styles.menuTitle}>Настройки</h1>
              <nav className={styles.menuList}>
                {menuItems.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    className={[styles.menuItem, active === m.key ? styles.menuItemActive : ''].join(' ')}
                    onClick={() => setActive(m.key)}
                    aria-current={active === m.key}
                  >
                    {m.label}
                  </button>
                ))}
              </nav>
            </aside>

            <div className="hideOnMobile">
              <SupportLinks />
            </div>
          </div>

          {/* Контент выбранного раздела */}
          <section className={styles.content}>
            <ActiveSection />
          </section>
        </div>
      </main>
    </div>
  )
}
