import s from './admin.module.css'

/** Линейный график с заливкой (рост показателя). data — массив значений. */
export function LineChart({ data, height = 190 }: { data: number[]; height?: number }) {
  const W = 600
  const H = 200
  const pad = 8
  if (data.length < 2) {
    return <div className={s.chartWrap} style={{ height }} />
  }
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const span = max - min || 1
  const stepX = (W - pad * 2) / (data.length - 1)
  const x = (i: number) => pad + i * stepX
  const y = (v: number) => pad + (H - pad * 2) * (1 - (v - min) / span)
  const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(data.length - 1).toFixed(1)} ${H - pad} L${x(0).toFixed(1)} ${H - pad} Z`

  return (
    <div className={s.chartWrap} style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height="100%">
        <defs>
          <linearGradient id="aLineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--a-primary)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--a-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#aLineFill)" />
        <path d={line} fill="none" stroke="var(--a-primary)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}

/** Столбчатый график регистрации/активности (стек new + active). */
export function BarChart({ data }: { data: { new: number; active: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.new + d.active))
  const H = 168
  return (
    <div className={s.bars} style={{ height: H }}>
      {data.map((d, i) => (
        <div key={i} className={s.barCol} title={`Новые: ${d.new} · Активные: ${d.active}`}>
          <div className={s.barActive} style={{ height: `${(d.active / max) * H}px` }} />
          <div className={s.barNew} style={{ height: `${(d.new / max) * H}px` }} />
        </div>
      ))}
    </div>
  )
}
