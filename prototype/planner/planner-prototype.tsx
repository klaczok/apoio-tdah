'use client'

import { useEffect, useMemo, useState, type CSSProperties, type PointerEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import styles from './prototype.module.css'

type VariantKey = 'A' | 'B' | 'C'
type EventCategory = 'trabalho' | 'familia' | 'saude' | 'estudo' | 'musica' | 'margem'
type CalendarEvent = {
  id: number
  title: string
  day: number
  start: number
  end: number
  category: EventCategory
  fixed?: boolean
  note?: string
}

type Draft = {
  dayStart: number
  dayEnd: number
  start: number
  end: number
}

const variants: { key: VariantKey; name: string }[] = [
  { key: 'A', name: 'Agenda de mesa' },
  { key: 'B', name: 'Caderno da semana' },
  { key: 'C', name: 'Ritual tranquilo' },
]

const days = [
  { short: 'Seg', date: '12', full: 'Segunda' },
  { short: 'Ter', date: '13', full: 'Terça' },
  { short: 'Qua', date: '14', full: 'Quarta' },
  { short: 'Qui', date: '15', full: 'Quinta' },
  { short: 'Sex', date: '16', full: 'Sexta' },
  { short: 'Sáb', date: '17', full: 'Sábado' },
  { short: 'Dom', date: '18', full: 'Domingo' },
]

const initialEvents: CalendarEvent[] = [
  { id: 1, title: 'Trabalho focado', day: 0, start: 9, end: 12, category: 'trabalho' },
  { id: 2, title: 'Almoço', day: 0, start: 12.5, end: 13.25, category: 'saude', fixed: true },
  { id: 3, title: 'Buscar o Bento', day: 1, start: 17, end: 18, category: 'familia', fixed: true },
  { id: 4, title: 'Escritório', day: 2, start: 10, end: 16, category: 'trabalho', fixed: true },
  { id: 5, title: 'Deslocamento', day: 2, start: 8.75, end: 9.75, category: 'margem' },
  { id: 6, title: 'Terapia', day: 3, start: 18, end: 19, category: 'saude', fixed: true },
  { id: 7, title: 'Estudo · laboratório', day: 4, start: 14, end: 15.5, category: 'estudo' },
  {
    id: 8,
    title: 'Ensaio de orquestra',
    day: 5,
    start: 9,
    end: 13,
    category: 'musica',
    fixed: true,
  },
  {
    id: 9,
    title: 'Tempo em família',
    day: 6,
    start: 10,
    end: 12,
    category: 'familia',
    fixed: true,
  },
  { id: 10, title: 'Espaço para respirar', day: 4, start: 16, end: 17, category: 'margem' },
]

const categories: { key: EventCategory; label: string; icon: string }[] = [
  { key: 'trabalho', label: 'Trabalho', icon: '▤' },
  { key: 'familia', label: 'Família', icon: '⌂' },
  { key: 'saude', label: 'Saúde', icon: '＋' },
  { key: 'estudo', label: 'Estudo', icon: '◇' },
  { key: 'musica', label: 'Música', icon: '♪' },
  { key: 'margem', label: 'Respiro', icon: '≈' },
]

const hours = Array.from({ length: 14 }, (_, index) => index + 7)

const formatTime = (value: number) => {
  const hour = Math.floor(value)
  const minutes = Math.round((value - hour) * 60)
  return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const duration = (event: CalendarEvent) => `${Math.round((event.end - event.start) * 60)} min`

function Header({ density = 'wide' }: { density?: 'wide' | 'compact' }) {
  return (
    <header className={`${styles.header} ${density === 'compact' ? styles.headerCompact : ''}`}>
      <a className={styles.brand} href="#top" aria-label="Apoio à Rotina, início">
        <span className={styles.brandMark}>ar</span>
        <span>
          <strong>Apoio à Rotina</strong>
          <small>um plano possível, não perfeito</small>
        </span>
      </a>
      <nav className={styles.nav} aria-label="Navegação principal">
        <button className={styles.navActive}>Semana</button>
        <button>Hoje</button>
        <button>Histórico</button>
      </nav>
      <button className={styles.iconButton} aria-label="Abrir preferências">
        ⋮
      </button>
    </header>
  )
}

function CategoryLegend() {
  return (
    <div className={styles.legend} aria-label="Categorias">
      {categories.map((category) => (
        <span key={category.key}>
          <i className={`${styles.dot} ${styles[category.key]}`} />
          {category.label}
        </span>
      ))}
    </div>
  )
}

function EventCard({
  event,
  onSelect,
}: {
  event: CalendarEvent
  onSelect: (event: CalendarEvent) => void
}) {
  return (
    <button
      className={`${styles.event} ${styles[event.category]}`}
      style={
        {
          '--event-top': `${((event.start - 7) / 14) * 100}%`,
          '--event-height': `${Math.max(((event.end - event.start) / 14) * 100, 4.8)}%`,
        } as CSSProperties
      }
      onClick={(click) => {
        click.stopPropagation()
        onSelect(event)
      }}
      aria-label={`${event.title}, ${days[event.day].full}, ${formatTime(event.start)} até ${formatTime(event.end)}`}
    >
      <span className={styles.eventIcon}>
        {categories.find((item) => item.key === event.category)?.icon}
      </span>
      <span className={styles.eventText}>
        <strong>{event.title}</strong>
        <small>
          {formatTime(event.start)}–{formatTime(event.end)} {event.fixed ? '· fixo' : ''}
        </small>
      </span>
    </button>
  )
}

function WeekCalendar({
  events,
  onSelect,
  onDraft,
  draft,
  compact = false,
}: {
  events: CalendarEvent[]
  onSelect: (event: CalendarEvent) => void
  onDraft: (draft: Draft) => void
  draft: Draft | null
  compact?: boolean
}) {
  const [dragStart, setDragStart] = useState<{ day: number; time: number } | null>(null)
  const [dragCurrent, setDragCurrent] = useState<{ day: number; time: number } | null>(null)

  const pointerTime = (event: PointerEvent<HTMLButtonElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const raw = 7 + ((event.clientY - box.top) / box.height) * 14
    return Math.max(7, Math.min(21, Math.round(raw * 4) / 4))
  }

  const finishSelection = (day: number, time: number) => {
    if (!dragStart) return
    const dayStart = Math.min(dragStart.day, day)
    const dayEnd = Math.max(dragStart.day, day)
    const start = Math.min(dragStart.time, time)
    const end = Math.max(dragStart.time, time) || start + 0.5
    onDraft({ dayStart, dayEnd, start, end: end === start ? start + 0.5 : end })
    setDragStart(null)
    setDragCurrent(null)
  }

  return (
    <div className={`${styles.calendarShell} ${compact ? styles.calendarCompact : ''}`}>
      <div className={styles.calendarScroller}>
        <div className={styles.calendar}>
          <div className={styles.corner}>GMT−3</div>
          {days.map((day, index) => (
            <button
              key={day.short}
              className={`${styles.dayHeader} ${index === 2 ? styles.today : ''}`}
            >
              <span>{day.short}</span>
              <strong>{day.date}</strong>
              {index === 2 && <small>hoje</small>}
            </button>
          ))}
          <div className={styles.timeColumn}>
            {hours.map((hour) => (
              <span key={hour} style={{ top: `${((hour - 7) / 14) * 100}%` }}>
                {String(hour).padStart(2, '0')}:00
              </span>
            ))}
          </div>
          {days.map((day, dayIndex) => {
            const activeStart = dragStart
              ? Math.min(dragStart.day, dragCurrent?.day ?? dragStart.day)
              : -1
            const activeEnd = dragStart
              ? Math.max(dragStart.day, dragCurrent?.day ?? dragStart.day)
              : -1
            const isDragging = dayIndex >= activeStart && dayIndex <= activeEnd
            const selectionStart = Math.min(
              dragStart?.time ?? 0,
              dragCurrent?.time ?? dragStart?.time ?? 0
            )
            const selectionEnd = Math.max(
              dragStart?.time ?? 0,
              dragCurrent?.time ?? dragStart?.time ?? 0
            )
            const savedDraft = draft && dayIndex >= draft.dayStart && dayIndex <= draft.dayEnd
            return (
              <button
                key={day.short}
                className={styles.dayColumn}
                aria-label={`Selecionar horário em ${day.full}`}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId)
                  const time = pointerTime(event)
                  setDragStart({ day: dayIndex, time })
                  setDragCurrent({ day: dayIndex, time })
                }}
                onPointerMove={(event) => {
                  if (!dragStart) return
                  setDragCurrent({ day: dayIndex, time: pointerTime(event) })
                }}
                onPointerUp={(event) => finishSelection(dayIndex, pointerTime(event))}
              >
                {(isDragging || savedDraft) && (
                  <span
                    className={styles.selection}
                    style={
                      {
                        '--selection-top': `${(((isDragging ? selectionStart : draft!.start) - 7) / 14) * 100}%`,
                        '--selection-height': `${Math.max((((isDragging ? selectionEnd : draft!.end) - (isDragging ? selectionStart : draft!.start)) / 14) * 100, 2.5)}%`,
                      } as CSSProperties
                    }
                  />
                )}
                {events
                  .filter((item) => item.day === dayIndex)
                  .map((event) => (
                    <EventCard key={event.id} event={event} onSelect={onSelect} />
                  ))}
              </button>
            )
          })}
        </div>
      </div>
      <p className={styles.calendarHint}>
        Clique e arraste no calendário para escolher dias e horários.
      </p>
    </div>
  )
}

function EventDrawer({ event, onClose }: { event: CalendarEvent | null; onClose: () => void }) {
  if (!event) return null
  return (
    <aside className={styles.drawer} aria-label="Detalhes do compromisso">
      <button className={styles.drawerClose} onClick={onClose} aria-label="Fechar detalhes">
        ×
      </button>
      <span className={`${styles.categoryPill} ${styles[event.category]}`}>
        {categories.find((item) => item.key === event.category)?.icon}{' '}
        {categories.find((item) => item.key === event.category)?.label}
      </span>
      <h2>{event.title}</h2>
      <p>
        {days[event.day].full}, {formatTime(event.start)}–{formatTime(event.end)} ·{' '}
        {duration(event)}
      </p>
      <div className={styles.drawerActions}>
        <button>◫ Duplicar</button>
        <button>↔ Mover</button>
        <button>✎ Ajustar</button>
      </div>
      <div className={styles.protection}>
        <span>{event.fixed ? 'Compromisso protegido' : 'Bloco flexível'}</span>
        <small>
          {event.fixed
            ? 'Só muda quando você confirmar conscientemente.'
            : 'Pode ser reposicionado para aliviar a semana.'}
        </small>
      </div>
    </aside>
  )
}

function CreatePanel({
  draft,
  onClose,
  onSave,
}: {
  draft: Draft | null
  onClose: () => void
  onSave: (title: string, category: EventCategory, fixed: boolean) => void
}) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<EventCategory>('trabalho')
  const [fixed, setFixed] = useState(false)
  if (!draft) return null

  return (
    <aside className={styles.createPanel} aria-label="Novo compromisso">
      <div className={styles.panelHeading}>
        <div>
          <span className={styles.eyebrow}>Novo compromisso</span>
          <h2>Quando isso acontece?</h2>
        </div>
        <button className={styles.drawerClose} onClick={onClose} aria-label="Fechar criação">
          ×
        </button>
      </div>
      <div className={styles.rangeSummary}>
        <span>De</span>
        <strong>
          {days[draft.dayStart].short}, {days[draft.dayStart].date} out
        </strong>
        <strong>{formatTime(draft.start)}</strong>
        <i>→</i>
        <span>Até</span>
        <strong>
          {days[draft.dayEnd].short}, {days[draft.dayEnd].date} out
        </strong>
        <strong>{formatTime(draft.end)}</strong>
      </div>
      <label className={styles.textLabel}>
        <span>Um nome curto</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex.: Consulta ou foco no relatório"
          autoFocus
        />
      </label>
      <fieldset className={styles.chipFieldset}>
        <legend>Que tipo de tempo é esse?</legend>
        {categories.slice(0, 5).map((item) => (
          <button
            type="button"
            key={item.key}
            className={category === item.key ? styles.chipSelected : ''}
            onClick={() => setCategory(item.key)}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </fieldset>
      <button
        className={`${styles.toggleRow} ${fixed ? styles.toggleActive : ''}`}
        onClick={() => setFixed(!fixed)}
      >
        <span>
          <strong>Proteger este horário</strong>
          <small>Evita mudanças acidentais na agenda.</small>
        </span>
        <i>{fixed ? 'Sim' : 'Não'}</i>
      </button>
      <div className={styles.panelFooter}>
        <button className={styles.secondaryButton} onClick={onClose}>
          Cancelar
        </button>
        <button
          className={styles.primaryButton}
          onClick={() => onSave(title.trim() || 'Novo compromisso', category, fixed)}
        >
          Colocar na semana
        </button>
      </div>
    </aside>
  )
}

function WeekSummary({ events }: { events: CalendarEvent[] }) {
  const totals = useMemo(
    () =>
      categories.slice(0, 5).map((category) => ({
        ...category,
        hours: events
          .filter((event) => event.category === category.key)
          .reduce((sum, event) => sum + event.end - event.start, 0),
      })),
    [events]
  )
  return (
    <aside className={styles.summaryCard}>
      <span className={styles.eyebrow}>Equilíbrio da semana</span>
      <h2>Há espaço para o que importa.</h2>
      <p>Quarta concentra mais carga. Sexta ainda tem uma margem confortável.</p>
      <div className={styles.balanceBars}>
        {totals.map((item) => (
          <div key={item.key}>
            <span>
              {item.icon} {item.label}
            </span>
            <i>
              <b
                className={styles[item.key]}
                style={{ width: `${Math.min(item.hours * 10 + 12, 100)}%` }}
              />
            </i>
            <small>{item.hours.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h</small>
          </div>
        ))}
      </div>
      <button className={styles.softButton}>Ver equilíbrio completo</button>
    </aside>
  )
}

function VariantA({
  events,
  draft,
  onDraft,
  onSelect,
}: {
  events: CalendarEvent[]
  draft: Draft | null
  onDraft: (draft: Draft) => void
  onSelect: (event: CalendarEvent) => void
}) {
  return (
    <main id="top" className={`${styles.prototype} ${styles.variantA}`}>
      <Header />
      <section className={styles.toolbar}>
        <div>
          <span className={styles.eyebrow}>12–18 de outubro</span>
          <h1>Minha semana</h1>
          <p>Veja o ritmo antes de decidir onde cabe mais uma coisa.</p>
        </div>
        <div className={styles.toolbarActions}>
          <button className={styles.iconButton} aria-label="Semana anterior">
            ←
          </button>
          <button className={styles.todayButton}>Esta semana</button>
          <button className={styles.iconButton} aria-label="Próxima semana">
            →
          </button>
          <button
            className={styles.primaryButton}
            onClick={() => onDraft({ dayStart: 3, dayEnd: 3, start: 14, end: 15 })}
          >
            ＋ Compromisso
          </button>
        </div>
      </section>
      <section className={styles.workspace}>
        <div className={styles.calendarArea}>
          <CategoryLegend />
          <WeekCalendar events={events} draft={draft} onDraft={onDraft} onSelect={onSelect} />
        </div>
        <WeekSummary events={events} />
      </section>
    </main>
  )
}

function VariantB({
  events,
  draft,
  onDraft,
  onSelect,
}: {
  events: CalendarEvent[]
  draft: Draft | null
  onDraft: (draft: Draft) => void
  onSelect: (event: CalendarEvent) => void
}) {
  const [focusDay, setFocusDay] = useState(2)
  const dayEvents = events
    .filter((event) => event.day === focusDay)
    .sort((a, b) => a.start - b.start)
  return (
    <main id="top" className={`${styles.prototype} ${styles.variantB}`}>
      <Header density="compact" />
      <section className={styles.notebookTop}>
        <div>
          <span className={styles.handwritten}>Semana 42</span>
          <h1>O que já tem lugar</h1>
          <p>Uma página por vez. O restante continua visível, sem pedir atenção.</p>
        </div>
        <button
          className={styles.roundAdd}
          onClick={() => onDraft({ dayStart: focusDay, dayEnd: focusDay, start: 15, end: 16 })}
        >
          ＋
        </button>
      </section>
      <section className={styles.notebook}>
        <aside className={styles.bookmarkDays} aria-label="Escolher dia">
          {days.map((day, index) => (
            <button
              key={day.short}
              className={focusDay === index ? styles.bookmarkActive : ''}
              onClick={() => setFocusDay(index)}
            >
              <span>{day.short}</span>
              <strong>{day.date}</strong>
            </button>
          ))}
        </aside>
        <div className={styles.notebookPage}>
          <div className={styles.paperHeading}>
            <div>
              <span>{days[focusDay].full}</span>
              <h2>{days[focusDay].date} de outubro</h2>
            </div>
            <span className={styles.capacityStamp}>
              ritmo possível · {dayEvents.reduce((sum, event) => sum + event.end - event.start, 0)}h
              ocupadas
            </span>
          </div>
          <div className={styles.pageColumns}>
            <section className={styles.dayTimeline}>
              <h3>Com hora marcada</h3>
              {dayEvents.length ? (
                dayEvents.map((event) => (
                  <button
                    key={event.id}
                    className={styles.timelineEntry}
                    onClick={() => onSelect(event)}
                  >
                    <time>{formatTime(event.start)}</time>
                    <i className={`${styles[event.category]} ${styles.timelinePin}`} />
                    <span>
                      <strong>{event.title}</strong>
                      <small>
                        {duration(event)} {event.fixed ? '· protegido' : '· flexível'}
                      </small>
                    </span>
                  </button>
                ))
              ) : (
                <p className={styles.emptyDay}>Nada marcado. Este espaço pode continuar livre.</p>
              )}
              <button
                className={styles.addLine}
                onClick={() =>
                  onDraft({ dayStart: focusDay, dayEnd: focusDay, start: 14, end: 15 })
                }
              >
                ＋ Escolher um horário
              </button>
            </section>
            <aside className={styles.notesColumn}>
              <span className={styles.tape}>para lembrar</span>
              <h3>Até 3 prioridades</h3>
              <label>
                <input type="checkbox" defaultChecked /> Revisar proposta
              </label>
              <label>
                <input type="checkbox" /> Separar material do escritório
              </label>
              <label>
                <input type="checkbox" /> Responder escola
              </label>
              <div className={styles.breathingNote}>
                <strong>Margem protegida</strong>
                <span>16:00–17:00</span>
                <small>Não precisa preencher.</small>
              </div>
            </aside>
          </div>
        </div>
        <aside className={styles.weekStrip}>
          <h3>Semana inteira</h3>
          <p>Arraste para selecionar um intervalo. Toque em um bloco para abrir detalhes.</p>
          <WeekCalendar
            events={events}
            draft={draft}
            onDraft={onDraft}
            onSelect={onSelect}
            compact
          />
        </aside>
      </section>
    </main>
  )
}

function VariantC({
  events,
  draft,
  onDraft,
  onSelect,
}: {
  events: CalendarEvent[]
  draft: Draft | null
  onDraft: (draft: Draft) => void
  onSelect: (event: CalendarEvent) => void
}) {
  const [activeDay, setActiveDay] = useState(3)
  const activeEvents = events
    .filter((event) => event.day === activeDay)
    .sort((a, b) => a.start - b.start)
  return (
    <main id="top" className={`${styles.prototype} ${styles.variantC}`}>
      <Header density="compact" />
      <section className={styles.calmHero}>
        <div>
          <span className={styles.eyebrow}>Boa noite</span>
          <h1>Vamos deixar amanhã respirável?</h1>
          <p>
            Os compromissos fixos já estão protegidos. Você só precisa olhar o que cabe ao redor
            deles.
          </p>
        </div>
        <div className={styles.calmScore}>
          <strong>6h30</strong>
          <span>planejadas</span>
          <small>carga equilibrada</small>
        </div>
      </section>
      <section className={styles.calmLayout}>
        <aside className={styles.miniMonth}>
          <div className={styles.monthHeading}>
            <button>←</button>
            <strong>Outubro 2026</strong>
            <button>→</button>
          </div>
          <div className={styles.monthWeekdays}>
            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className={styles.monthDays}>
            {Array.from({ length: 31 }, (_, index) => index + 1).map((date) => (
              <button
                key={date}
                className={
                  date === activeDay + 12
                    ? styles.monthActive
                    : date >= 12 && date <= 18
                      ? styles.monthRange
                      : ''
                }
                onClick={() => date >= 12 && date <= 18 && setActiveDay(date - 12)}
              >
                {date}
              </button>
            ))}
          </div>
          <WeekSummary events={events} />
        </aside>
        <section className={styles.calmAgenda}>
          <div className={styles.calmTabs}>
            {days.map((day, index) => (
              <button
                key={day.short}
                className={activeDay === index ? styles.calmTabActive : ''}
                onClick={() => setActiveDay(index)}
              >
                <span>{day.short}</span>
                <strong>{day.date}</strong>
              </button>
            ))}
          </div>
          <div className={styles.calmDayHeading}>
            <div>
              <span>
                {days[activeDay].full}, {days[activeDay].date} de outubro
              </span>
              <h2>{activeDay === 3 ? 'Um dia com âncoras claras' : 'O ritmo deste dia'}</h2>
            </div>
            <button
              className={styles.primaryButton}
              onClick={() =>
                onDraft({ dayStart: activeDay, dayEnd: activeDay, start: 15, end: 16 })
              }
            >
              ＋ Adicionar
            </button>
          </div>
          <div className={styles.calmTimeline}>
            {activeEvents.map((event, index) => (
              <button key={event.id} className={styles.calmEvent} onClick={() => onSelect(event)}>
                <time>{formatTime(event.start)}</time>
                <span className={`${styles.calmNode} ${styles[event.category]}`}>
                  {categories.find((item) => item.key === event.category)?.icon}
                </span>
                <span>
                  <strong>{event.title}</strong>
                  <small>
                    {formatTime(event.start)}–{formatTime(event.end)} ·{' '}
                    {event.fixed ? 'horário protegido' : 'pode ser ajustado'}
                  </small>
                </span>
                <i>›</i>
              </button>
            ))}
            <button
              className={styles.openSpace}
              onClick={() =>
                onDraft({ dayStart: activeDay, dayEnd: activeDay, start: 14, end: 16 })
              }
            >
              <time>14:00</time>
              <span>≈</span>
              <strong>Espaço disponível</strong>
              <small>arraste para ajustar</small>
            </button>
          </div>
          <details className={styles.calendarReveal}>
            <summary>Ver calendário completo e selecionar vários dias</summary>
            <WeekCalendar
              events={events}
              draft={draft}
              onDraft={onDraft}
              onSelect={onSelect}
              compact
            />
          </details>
        </section>
      </section>
    </main>
  )
}

function PrototypeSwitcher({
  current,
  onChange,
}: {
  current: VariantKey
  onChange: (variant: VariantKey) => void
}) {
  const index = variants.findIndex((variant) => variant.key === current)
  const cycle = (direction: number) =>
    onChange(variants[(index + direction + variants.length) % variants.length].key)

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
        return
      if (event.key === 'ArrowLeft') cycle(-1)
      if (event.key === 'ArrowRight') cycle(1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  return (
    <div className={styles.switcher} aria-label="Alternar proposta visual">
      <button onClick={() => cycle(-1)} aria-label="Proposta anterior">
        ←
      </button>
      <span>
        <small>Protótipo</small>
        <strong>
          {current} · {variants[index].name}
        </strong>
      </span>
      <button onClick={() => cycle(1)} aria-label="Próxima proposta">
        →
      </button>
    </div>
  )
}

export function PlannerPrototype({ initialVariant }: { initialVariant?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [variant, setVariant] = useState<VariantKey>(
    variants.some((item) => item.key === initialVariant) ? (initialVariant as VariantKey) : 'A'
  )
  const [events, setEvents] = useState(initialEvents)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const changeVariant = (next: VariantKey) => {
    setVariant(next)
    router.replace(`${pathname}?variant=${next}`, { scroll: false })
  }

  const saveEvent = (title: string, category: EventCategory, fixed: boolean) => {
    if (!draft) return
    setEvents((current) => [
      ...current,
      ...Array.from({ length: draft.dayEnd - draft.dayStart + 1 }, (_, index) => ({
        id: Date.now() + index,
        title,
        day: draft.dayStart + index,
        start: draft.start,
        end: draft.end,
        category,
        fixed,
      })),
    ])
    setDraft(null)
  }

  const common = { events, draft, onDraft: setDraft, onSelect: setSelectedEvent }

  return (
    <>
      {variant === 'A' && <VariantA {...common} />}
      {variant === 'B' && <VariantB {...common} />}
      {variant === 'C' && <VariantC {...common} />}
      <EventDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      <CreatePanel draft={draft} onClose={() => setDraft(null)} onSave={saveEvent} />
      <PrototypeSwitcher current={variant} onChange={changeVariant} />
    </>
  )
}
