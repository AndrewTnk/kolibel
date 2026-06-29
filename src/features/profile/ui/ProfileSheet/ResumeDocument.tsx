import type { Resume } from '../../model/types'
import d from './ResumeDocument.module.css'

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '—'
  )
}

/** Смешать два hex-цвета: c1·w + c2·(1−w). Возвращает конкретный hex
 *  (вместо CSS color-mix, который не понимает html2canvas при экспорте). */
function mix(c1: string, c2: string, w: number): string {
  const h = (c: string) => {
    const v = c.replace('#', '')
    const f = v.length === 3 ? v.split('').map((x) => x + x).join('') : v
    return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)]
  }
  const [r1, g1, b1] = h(c1)
  const [r2, g2, b2] = h(c2)
  const ch = (a: number, b: number) => Math.round(a * w + b * (1 - w))
  const hex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${hex(ch(r1, r2))}${hex(ch(g1, g2))}${hex(ch(b1, b2))}`
}

type Props = {
  resume: Resume
  /** Акцентный цвет шаблона. */
  accent: string
}

/**
 * Самодостаточный A4-лист резюме — рендерится и как живое превью в модалке (масштаб),
 * и в скрытом портале для печати/«Сохранить в PDF» (вектор, выделяемый текст).
 * Визуально повторяет лист резюме на странице профиля.
 */
export function ResumeDocument({ resume: r, accent }: Props) {
  const metaLine = [r.location, r.workFormat].filter(Boolean).join('  ·  ')
  const role = [r.jobTitle, r.jobStatus.company].filter(Boolean).join(' · ')

  const accentVars = {
    ['--accent' as string]: accent,
    ['--accentSoft' as string]: mix(accent, '#ffffff', 0.12),
    ['--accentInk' as string]: mix(accent, '#1f2328', 0.55),
    ['--accentBorder' as string]: mix(accent, '#ffffff', 0.26),
  }

  return (
    <div className={d.doc} style={accentVars}>
      {/* Шапка */}
      <header className={d.header}>
        <div className={d.avatar}>
          {r.avatar ? <img src={r.avatar} alt="" /> : <span>{initials(r.fullName)}</span>}
        </div>
        <div className={d.headMeta}>
          <h1 className={d.name}>{r.fullName || 'Ваше имя'}</h1>
          {role ? <div className={d.role}>{role}</div> : null}
          {metaLine ? <div className={d.metaLine}>{metaLine}</div> : null}
        </div>
      </header>

      <div className={d.grid}>
        {/* Левая колонка */}
        <aside className={d.aside}>
          {r.contacts.length ? (
            <section className={d.sec}>
              <h2 className={d.secTitle}>Контакты</h2>
              <ul className={d.contacts}>
                {r.contacts.map((c, i) => (
                  <li key={i}>
                    <span className={d.contactLab}>{c.label}</span>
                    <span className={d.contactVal}>{c.value}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {r.skills.length ? (
            <section className={d.sec}>
              <h2 className={d.secTitle}>Навыки</h2>
              <div className={d.skills}>
                {r.skills.map((sk) => (
                  <span key={sk} className={d.skill}>
                    {sk}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {r.languages.length ? (
            <section className={d.sec}>
              <h2 className={d.secTitle}>Языки</h2>
              <ul className={d.langs}>
                {r.languages.map((l, i) => (
                  <li key={i} className={d.lang}>
                    <div className={d.langTop}>
                      <span className={d.langName}>{l.name}</span>
                      <span className={d.langLevel}>{l.level}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>

        {/* Правая колонка */}
        <main className={d.main}>
          {r.about.trim() ? (
            <section className={d.sec}>
              <h2 className={d.secTitle}>О себе</h2>
              <div className={d.about}>
                {r.about.split('\n\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ) : null}

          {r.experience.length ? (
            <section className={d.sec}>
              <h2 className={d.secTitle}>Опыт работы</h2>
              <div className={d.timeline}>
                {r.experience.map((e) => (
                  <div key={e.id} className={d.expItem}>
                    <div className={d.expRow}>
                      <span className={d.expRole}>{e.role}</span>
                      <span className={d.expPeriod}>{e.period}</span>
                    </div>
                    <div className={d.expCompany}>{e.company}</div>
                    {e.summary ? <p className={d.expSummary}>{e.summary}</p> : null}
                    {e.achievements.length ? (
                      <ul className={d.expBullets}>
                        {e.achievements.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    ) : null}
                    {e.stack.length ? (
                      <div className={d.expStack}>
                        {e.stack.map((st) => (
                          <span key={st} className={d.tag}>
                            {st}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {r.education.length ? (
            <section className={d.sec}>
              <h2 className={d.secTitle}>Образование</h2>
              <div className={d.eduList}>
                {r.education.map((e) => (
                  <div key={e.id} className={d.eduItem}>
                    <div className={d.eduRow}>
                      <span className={d.eduInst}>{e.institution}</span>
                      <span className={d.expPeriod}>{e.period}</span>
                    </div>
                    {e.degree ? <div className={d.eduDegree}>{e.degree}</div> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  )
}
