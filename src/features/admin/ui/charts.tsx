import { useEffect, useRef, useState } from 'react'
import s from './admin.module.css'

// ── Вспомогательное ────────────────────────────────────────

/** Измеряет ширину контейнера (для крепких осей/текста рисуем в пикселях). */
function useWidth(ref: React.RefObject<HTMLDivElement | null>): number {
  const [w, setW] = useState(600)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect.width
      if (cw) setW(cw)
    })
    ro.observe(el)
    setW(el.clientWidth || 600)
    return () => ro.disconnect()
  }, [ref])
  return w
}

/** «Красивый» шаг для оси (1/2/5 × 10ⁿ). */
function niceStep(range: number, target: number): number {
  const raw = Math.max(range, 1) / target
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const n = raw / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

/** Целочисленные деления оси Y: 0 … верх (кратно шагу). */
function yAxis(max: number, target = 4): { ticks: number[]; top: number } {
  const step = niceStep(max, target)
  const top = Math.max(step, Math.ceil(max / step) * step)
  const ticks: number[] = []
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(Math.round(v))
  return { ticks, top }
}

/** Дата 'YYYY-MM-DD' → 'дд.мм'. */
function fmtDay(d: string): string {
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}`
}

const PAD = { l: 40, r: 14, t: 14, b: 26 }

// ── Линейный график (рост пользователей) ───────────────────

export function LineChart({
  data,
  height = 188,
}: {
  data: { d: string; total: number }[]
  height?: number
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const width = useWidth(ref)
  const [hover, setHover] = useState<number | null>(null)

  if (data.length < 2) return <div ref={ref} className={s.chart} style={{ height }} />

  const max = Math.max(...data.map((p) => p.total), 1)
  const { ticks, top } = yAxis(max)
  const plotW = Math.max(width - PAD.l - PAD.r, 10)
  const plotH = height - PAD.t - PAD.b
  const stepX = plotW / (data.length - 1)
  const x = (i: number) => PAD.l + i * stepX
  const y = (v: number) => PAD.t + plotH * (1 - v / top)

  const line = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.total).toFixed(1)}`).join(' ')
  const area = `${line} L${x(data.length - 1).toFixed(1)} ${(PAD.t + plotH).toFixed(1)} L${x(0).toFixed(1)} ${(PAD.t + plotH).toFixed(1)} Z`

  // Подписи дат: ~6 равномерно + всегда последняя.
  const k = Math.max(1, Math.ceil(data.length / 6))
  const xLabelIdx = data.map((_, i) => i).filter((i) => i % k === 0 || i === data.length - 1)

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.round((e.clientX - rect.left - PAD.l) / stepX)
    setHover(Math.max(0, Math.min(data.length - 1, i)))
  }

  const hp = hover != null ? data[hover] : null

  return (
    <div ref={ref} className={s.chart} style={{ height }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="aLineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--a-primary)" stopOpacity="0.30" />
            <stop offset="100%" stopColor="var(--a-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Сетка + подписи оси Y */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} y1={y(t)} x2={width - PAD.r} y2={y(t)} className={s.chartGrid} />
            <text x={PAD.l - 8} y={y(t)} className={s.chartYLabel}>
              {t}
            </text>
          </g>
        ))}

        {/* Подписи оси X */}
        {xLabelIdx.map((i) => (
          <text key={i} x={x(i)} y={height - 8} className={s.chartXLabel}>
            {fmtDay(data[i].d)}
          </text>
        ))}

        <path d={area} fill="url(#aLineFill)" />
        <path d={line} fill="none" stroke="var(--a-primary)" strokeWidth="2.5" strokeLinejoin="round" />

        {/* Наведение: вертикаль + точка */}
        {hp && (
          <g>
            <line x1={x(hover!)} y1={PAD.t} x2={x(hover!)} y2={PAD.t + plotH} className={s.chartCursor} />
            <circle cx={x(hover!)} cy={y(hp.total)} r="4.5" fill="var(--a-primary)" stroke="var(--a-card)" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hp && (
        <div
          className={s.chartTip}
          style={{ left: x(hover!), top: y(hp.total), transform: 'translate(-50%, calc(-100% - 12px))' }}
        >
          <div className={s.chartTipDate}>{fmtDay(hp.d)}</div>
          <div className={s.chartTipVal}>
            <span className={s.legendDot} style={{ background: 'var(--a-primary)' }} />
            {hp.total} польз.
          </div>
        </div>
      )}
    </div>
  )
}

// ── Столбчатый график (регистрация + активность) ───────────

export function BarChart({
  data,
  height = 188,
}: {
  data: { d: string; new: number; active: number }[]
  height?: number
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const width = useWidth(ref)
  const [hover, setHover] = useState<number | null>(null)

  if (!data.length) return <div ref={ref} className={s.chart} style={{ height }} />

  const max = Math.max(1, ...data.map((d) => d.new + d.active))
  const { ticks, top } = yAxis(max)
  const plotW = Math.max(width - PAD.l - PAD.r, 10)
  const plotH = height - PAD.t - PAD.b
  const band = plotW / data.length
  const barW = Math.min(band * 0.6, 26)
  const cx = (i: number) => PAD.l + band * i + band / 2
  const hY = (v: number) => (v / top) * plotH // высота сегмента в px
  const baseY = PAD.t + plotH

  const k = Math.max(1, Math.ceil(data.length / 6))
  const xLabelIdx = data.map((_, i) => i).filter((i) => i % k === 0 || i === data.length - 1)

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.floor((e.clientX - rect.left - PAD.l) / band)
    setHover(Math.max(0, Math.min(data.length - 1, i)))
  }

  const hp = hover != null ? data[hover] : null

  return (
    <div ref={ref} className={s.chart} style={{ height }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} y1={baseY - hY(t)} x2={width - PAD.r} y2={baseY - hY(t)} className={s.chartGrid} />
            <text x={PAD.l - 8} y={baseY - hY(t)} className={s.chartYLabel}>
              {t}
            </text>
          </g>
        ))}

        {xLabelIdx.map((i) => (
          <text key={i} x={cx(i)} y={height - 8} className={s.chartXLabel}>
            {fmtDay(data[i].d)}
          </text>
        ))}

        {data.map((d, i) => {
          const hNew = hY(d.new)
          const hAct = hY(d.active)
          const dim = hover != null && hover !== i
          return (
            <g key={i} opacity={dim ? 0.4 : 1}>
              {/* Новые — снизу */}
              <rect x={cx(i) - barW / 2} y={baseY - hNew} width={barW} height={hNew} rx="3" fill="var(--a-primary)" />
              {/* Активные — стек сверху */}
              <rect x={cx(i) - barW / 2} y={baseY - hNew - hAct} width={barW} height={hAct} rx="3" fill="var(--a-blue)" />
            </g>
          )
        })}
      </svg>

      {hp && (
        <div
          className={s.chartTip}
          style={{ left: cx(hover!), top: baseY - hY(hp.new + hp.active), transform: 'translate(-50%, calc(-100% - 10px))' }}
        >
          <div className={s.chartTipDate}>{fmtDay(hp.d)}</div>
          <div className={s.chartTipVal}>
            <span className={s.legendDot} style={{ background: 'var(--a-primary)' }} />
            Новые: {hp.new}
          </div>
          <div className={s.chartTipVal}>
            <span className={s.legendDot} style={{ background: 'var(--a-blue)' }} />
            Активные: {hp.active}
          </div>
        </div>
      )}
    </div>
  )
}
