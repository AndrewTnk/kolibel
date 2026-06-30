import { useEffect, useState } from 'react'
import { AppHeader } from '../../shared/ui/AppHeader/AppHeader'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import {
  MyConnectionsModal,
  type ConnectionGroups,
} from '../../features/network/ui/NetworkPeekModals'
import { loadNetwork, toggleFollow } from '../../features/network/model/networkThunks'
import { networkActions } from '../../features/network/model/networkSlice'
import { loadVacancies } from '../../features/vacancies/model/vacancyThunks'
import { NetworkHero } from '../../widgets/NetworkHero/NetworkHero'
import { NetworkRecommendations } from '../../widgets/NetworkRecommendations/NetworkRecommendations'
import { NetworkActivity } from '../../widgets/NetworkActivity/NetworkActivity'
import styles from './NetworkPage.module.css'

type NetModal = { kind: 'connections'; groups: ConnectionGroups } | null

/** Единый вид «Сети» (Hero + Рекомендуем + Активность) — общий для пользователя и
 *  компании; различаются только формулировки (через `audience`). */
function NetworkView({ audience }: { audience: 'user' | 'company' }) {
  const dispatch = useAppDispatch()
  const [modal, setModal] = useState<NetModal>(null)
  const vacanciesLoaded = useAppSelector((s) => s.vacanciesList.loaded)
  const graphModalOpen = useAppSelector((s) => s.network.graphModalOpen)

  useEffect(() => {
    void dispatch(loadNetwork())
    // Вакансии нужны рекомендациям (матчинг людей под вакансии / вакансий под профессию).
    if (!vacanciesLoaded) void dispatch(loadVacancies())
  }, [dispatch, vacanciesLoaded])

  // Сбросить UI-состояние хедера (граф-модалка/поиск) при входе на страницу.
  useEffect(() => {
    dispatch(networkActions.closeGraphModal())
    dispatch(networkActions.setRecSearch(''))
  }, [dispatch])

  function onFollow(id: string) {
    void dispatch(toggleFollow(id))
  }

  const openConnections = (groups: ConnectionGroups) => setModal({ kind: 'connections', groups })

  return (
    <div className={styles.page}>
      <AppHeader />
      <main className={styles.main}>
        <div className={styles.userInner}>
          {/* На мобилке Hero уезжает в полноэкранную граф-модалку (иконка в шапке). */}
          <div className="hideOnMobile">
            <NetworkHero audience={audience} onOpenConnections={openConnections} />
          </div>

          <NetworkRecommendations onFollow={onFollow} />

          <NetworkActivity audience={audience} />
        </div>
      </main>

      {graphModalOpen ? (
        <div className={styles.graphModal} role="dialog" aria-modal aria-label="Состав сети">
          <div className={styles.graphModalHead}>
            <span className={styles.graphModalTitle}>
              {audience === 'company' ? 'Состав сети компании' : 'Состав твоей сети'}
            </span>
            <button
              type="button"
              className={styles.graphModalClose}
              aria-label="Закрыть"
              onClick={() => dispatch(networkActions.closeGraphModal())}
            >
              ✕
            </button>
          </div>
          <div className={styles.graphModalBody}>
            <NetworkHero audience={audience} onOpenConnections={openConnections} />
          </div>
        </div>
      ) : null}

      {modal?.kind === 'connections' ? (
        <MyConnectionsModal groups={modal.groups} onClose={() => setModal(null)} />
      ) : null}
    </div>
  )
}

export function NetworkPage() {
  const isCompany = useAppSelector((s) => s.account.type === 'company')
  return <NetworkView audience={isCompany ? 'company' : 'user'} />
}
