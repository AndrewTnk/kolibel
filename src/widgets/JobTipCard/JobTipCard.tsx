import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../app/store/hooks'
import { loadPortfolio } from '../../features/portfolio/model/portfolioThunks'
import { IcEdit } from '../../features/vacancies/ui/icons'
import styles from './JobTipCard.module.css'

type Tip = { id: string; body: ReactNode; ctaLabel: string; to: string }

/**
 * Левый сайдбар страницы вакансий (режим соискателя): подсказка от Kolibel.
 * Текст реальный, без выдуманных цифр. Собираем список подсказок из НЕзаполненных
 * пунктов профиля (те же критерии, что в блоке «Готовность профиля») + пустое
 * портфолио, и показываем одну случайную. Если профиль заполнен целиком — крутим
 * общие советы. Каждая подсказка объясняет, как это повышает шанс на отклик.
 */
export function JobTipCard() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const resume = useAppSelector((s) => s.profile.resume)
  const myId = useAppSelector((s) => s.auth.user?.id)
  const portfolioCount = useAppSelector((s) => (myId ? s.portfolio.byOwner[myId]?.length ?? 0 : 0))
  const portfolioLoaded = useAppSelector((s) => !!myId && s.portfolio.loadedOwners.includes(myId))

  // Портфолио на странице вакансий отдельно не грузится — подтягиваем его, чтобы
  // подсказка о портфолио была достоверной. Карточку показываем только когда статус
  // портфолио известен, иначе подсказка бы «прыгнула» после догрузки.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!myId || portfolioLoaded) {
      setReady(true)
      return
    }
    let alive = true
    void dispatch(loadPortfolio(myId)).finally(() => {
      if (alive) setReady(true)
    })
    return () => {
      alive = false
    }
  }, [myId, portfolioLoaded, dispatch])

  // Сид случайного выбора — раз на монтаж (новая подсказка при каждом заходе на страницу).
  const [pickSeed] = useState(() => Math.random())

  const tip = useMemo<Tip>(() => {
    // Незаполненные пункты профиля (критерии совпадают с блоком «Готовность профиля»).
    const gaps: Tip[] = []
    if (!resume.avatar)
      gaps.push({
        id: 'avatar',
        to: '/profile',
        ctaLabel: 'Дополнить профиль',
        body: (
          <>
            Профиль с <b>настоящим фото</b> вызывает больше доверия — добавь фото, и HR будут
            откликаться охотнее.
          </>
        ),
      })
    if (!resume.about.trim())
      gaps.push({
        id: 'about',
        to: '/profile',
        ctaLabel: 'Дополнить профиль',
        body: (
          <>
            Расскажи <b>о себе</b> в профиле — живое описание помогает HR понять тебя и чаще звать
            на связь.
          </>
        ),
      })
    if (resume.experience.length === 0)
      gaps.push({
        id: 'exp',
        to: '/profile',
        ctaLabel: 'Дополнить профиль',
        body: (
          <>
            Добавь <b>опыт работы</b> — на кандидатов с заполненной историей откликаются заметно
            чаще.
          </>
        ),
      })
    if (resume.skills.length === 0)
      gaps.push({
        id: 'skills',
        to: '/profile',
        ctaLabel: 'Дополнить профиль',
        body: (
          <>
            Перечисли свои <b>навыки</b> — по ним тебя находят в поиске и приглашают на вакансии.
          </>
        ),
      })
    if (resume.education.length === 0)
      gaps.push({
        id: 'edu',
        to: '/profile',
        ctaLabel: 'Дополнить профиль',
        body: (
          <>
            Укажи <b>образование</b> — это добавит тебе веса в глазах работодателя.
          </>
        ),
      })
    if (resume.contacts.length === 0)
      gaps.push({
        id: 'contacts',
        to: '/profile',
        ctaLabel: 'Дополнить профиль',
        body: (
          <>
            Добавь <b>контакты</b> в профиль, чтобы работодателю было проще с тобой связаться.
          </>
        ),
      })
    if (!resume.banner)
      gaps.push({
        id: 'banner',
        to: '/profile',
        ctaLabel: 'Дополнить профиль',
        body: (
          <>
            Загрузи <b>обложку профиля</b> — оформленный профиль привлекает больше внимания HR.
          </>
        ),
      })
    if (portfolioCount === 0)
      gaps.push({
        id: 'portfolio',
        to: '/profile',
        ctaLabel: 'Добавить кейсы',
        body: (
          <>
            Добавь <b>кейсы в портфолио</b> — кандидатов с примерами работ приглашают на собеседование
            заметно чаще.
          </>
        ),
      })

    // Профиль заполнен — общие советы (тоже без цифр), показываем случайный.
    const generic: Tip[] = [
      {
        id: 'g-early',
        to: '/vacancies',
        ctaLabel: 'К вакансиям',
        body: (
          <>
            Откликайся <b>в первый день</b> публикации вакансии — так тебя увидят раньше других.
          </>
        ),
      },
      {
        id: 'g-cover',
        to: '/vacancies',
        ctaLabel: 'К вакансиям',
        body: (
          <>
            Короткое <b>сопроводительное письмо</b> под конкретную вакансию заметно повышает шанс на
            ответ.
          </>
        ),
      },
      {
        id: 'g-fresh',
        to: '/profile',
        ctaLabel: 'Открыть профиль',
        body: (
          <>
            Держи профиль <b>актуальным</b> — свежие проекты и навыки помогают попадать в поиск HR.
          </>
        ),
      },
      {
        id: 'g-follow',
        to: '/network',
        ctaLabel: 'Найти компании',
        body: (
          <>
            Подпишись на интересные <b>компании</b> — так ты первым узнаешь об их новых вакансиях.
          </>
        ),
      },
    ]

    const pool = gaps.length ? gaps : generic
    return pool[Math.floor(pickSeed * pool.length)] ?? generic[0]
  }, [resume, portfolioCount, pickSeed])

  if (!ready) return null

  return (
    <div className={styles.card}>
      <div className={styles.title}>Подсказка от Kolibel</div>
      <p className={styles.body}>{tip.body}</p>
      <button type="button" className={styles.action} onClick={() => navigate(tip.to)}>
        <IcEdit /> {tip.ctaLabel}
      </button>
    </div>
  )
}
