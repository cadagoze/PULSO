"use client";

import Link from "next/link";
import { Bell, ChevronRight, Clock3, Dumbbell, MoveRight, Sparkles, TrendingDown } from "lucide-react";
import { habits, user, weightHistory } from "@/data/mock-data";
import { HabitRow } from "@/components/dashboard/habit-row";
import { TrendChart } from "@/components/progress/trend-chart";
import { ProgressBar, SectionHeader } from "@/components/ui";
import { usePersistentState } from "@/lib/use-persistent-state";

export default function Home() {
  const [completed, setCompleted] = usePersistentState<number[]>("pulso:habits", [1]);
  const toggleHabit = (id: number) => setCompleted((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);

  return (
    <div className="page-stack home-page">
      <header className="home-header">
        <div className="wordmark">PULSO<span>.</span></div>
        <div className="header-actions"><button className="icon-button notification" aria-label="Notificaciones"><Bell size={20} /><i /></button><div className="avatar">{user.initials}</div></div>
      </header>

      <section className="hero-copy">
        <p>Viernes, 31 de julio</p>
        <h1>Hola, {user.name}</h1>
        <span>Tu salud en movimiento.</span>
      </section>

      <section className="daily-note"><div className="note-icon"><Sparkles size={19} /></div><div><small>Tu foco de hoy</small><p>Hoy avanzamos con una sesión breve y alcanzable.</p></div></section>

      <section>
        <SectionHeader title="Esta semana" />
        <div className="summary-grid">
          <article className="metric-card movement-card"><div className="metric-icon"><Dumbbell size={19} /></div><p>Movimiento</p><strong>2 <small>de 3</small></strong><span>sesiones completadas</span><ProgressBar value={67} /></article>
          <article className="metric-card food-card"><div className="metric-ring">75%</div><p>Alimentación</p><strong>6 <small>de 8</small></strong><span>comidas equilibradas</span><ProgressBar value={75} purple /></article>
        </div>
      </section>

      <section>
        <SectionHeader title="Tu peso" action="Ver progreso" href="/progreso" />
        <Link href="/progreso" className="weight-card">
          <div><span>Peso actual</span><strong>82,4 <small>kg</small></strong><p><TrendingDown size={15} /> −1,6 kg este mes</p></div>
          <TrendChart data={weightHistory} compact />
          <ChevronRight className="card-chevron" size={18} />
        </Link>
      </section>

      <section>
        <SectionHeader title="Entrenamiento de hoy" />
        <article className="workout-feature">
          <div className="workout-visual"><div className="figure-art" aria-hidden="true"><span className="figure-head" /><span className="figure-body" /><span className="figure-arm a" /><span className="figure-arm b" /><span className="figure-leg a" /><span className="figure-leg b" /></div><span>FUERZA · NIVEL INICIAL</span></div>
          <div className="workout-copy"><h3>Fuerza en casa</h3><div className="workout-meta"><span><Clock3 size={15} />20 min</span><span><Dumbbell size={15} />5 ejercicios</span><span>Sin equipamiento</span></div><Link href="/entrenar/sesion" className="button button-primary">Comenzar ahora <MoveRight size={18} /></Link><Link href="/entrenar/sesion?corta=true" className="short-link">Versión de 10 minutos</Link></div>
        </article>
      </section>

      <section>
        <SectionHeader title="Hábitos de hoy" />
        <div className="habit-list">{habits.map((habit) => <HabitRow key={habit.id} habit={habit} checked={completed.includes(habit.id)} onToggle={() => toggleHabit(habit.id)} />)}</div>
        <p className="habit-count">{completed.length} de {habits.length} completados</p>
      </section>
    </div>
  );
}
