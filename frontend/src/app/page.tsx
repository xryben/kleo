'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '@/lib/useAuth';

function AnimatedCounter({ target, suffix = '' }: { target: string; suffix?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);
  return (
    <span
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      {target}
      {suffix}
    </span>
  );
}

export default function Home() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace('/dashboard');
      return;
    }
    setLoaded(true);
  }, [router]);

  if (!loaded) return null;

  return (
    <div className="min-h-screen bg-surface-base text-content-primary overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-surface-border-subtle bg-surface-base/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-2xl">✂️</span>
            <span className="text-xl font-bold text-white">Kleo</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-content-secondary hover:text-white transition-colors px-4 py-2"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-primary hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg transition-all hover:shadow-glow"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6">
        {/* Background glow effects */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-glow opacity-60 pointer-events-none" />
        <div className="absolute top-40 right-[10%] w-[400px] h-[400px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-surface-raised/80 border border-surface-border-subtle rounded-full px-4 py-1.5 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse-soft" />
            <span className="text-caption text-content-secondary">
              Plataforma activa — clippers ganando ahora mismo
            </span>
          </div>

          <h1 className="text-display md:text-[4rem] md:leading-[1.05] font-bold text-white mb-6 animate-fade-up">
            Distribuye tus clips virales.{' '}
            <span className="text-gradient-primary">Gana dinero.</span>
          </h1>

          <p
            className="text-body-lg md:text-xl text-content-secondary max-w-2xl mx-auto mb-12 animate-fade-up"
            style={{ animationDelay: '100ms' }}
          >
            Kleo conecta a infoproductores con clippers que publican sus mejores clips en TikTok,
            Instagram y YouTube. Más alcance, más ventas, más ingresos.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up"
            style={{ animationDelay: '200ms' }}
          >
            <Link
              href="/register?role=infoproductor"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-primary hover:opacity-90 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:shadow-glow text-base"
            >
              Quiero distribuir mi contenido
              <svg
                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/register?role=clipper"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-surface-raised border border-surface-border hover:border-accent/50 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:shadow-glow-accent text-base"
            >
              Quiero ganar dinero
              <svg
                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-y border-surface-border-subtle">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '10K+', label: 'Clips distribuidos' },
            { value: '500+', label: 'Clippers activos' },
            { value: '3', label: 'Plataformas' },
            { value: '24h', label: 'Primeros resultados' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-heading-1 md:text-display font-bold text-white">
                <AnimatedCounter target={stat.value} />
              </div>
              <div className="text-body-sm text-content-secondary mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-heading-1 md:text-display font-bold text-white mb-4">
              ¿Cómo funciona?
            </h2>
            <p className="text-body-lg text-content-secondary max-w-xl mx-auto">
              Tres pasos simples para empezar a distribuir o ganar
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: (
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                    />
                  </svg>
                ),
                title: 'Sube tu contenido',
                description:
                  'Los infoproductores suben sus videos y crean campañas con las reglas de distribución que prefieran.',
                iconClass: 'bg-primary/10 text-primary',
              },
              {
                step: '02',
                icon: (
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
                    />
                  </svg>
                ),
                title: 'Los clippers publican',
                description:
                  'Clippers eligen las campañas que más les gustan y publican los clips en sus redes sociales.',
                iconClass: 'bg-accent/10 text-accent',
              },
              {
                step: '03',
                icon: (
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                    />
                  </svg>
                ),
                title: 'Todos ganan',
                description:
                  'El infoproductor consigue alcance masivo. El clipper cobra por cada publicación verificada.',
                iconClass: 'bg-success/10 text-success',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group relative glass rounded-2xl p-8 hover:border-primary/30 transition-all duration-300 hover:shadow-glow-sm"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-xl ${item.iconClass}`}
                  >
                    {item.icon}
                  </div>
                  <span className="text-caption font-mono text-content-tertiary">{item.step}</span>
                </div>
                <h3 className="text-heading-3 font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-body text-content-secondary leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Infoproductores */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-6">
                <span className="text-caption font-medium text-primary-400">
                  Para Infoproductores
                </span>
              </div>
              <h2 className="text-heading-1 md:text-[2.5rem] md:leading-[1.15] font-bold text-white mb-6">
                Tu contenido en <span className="text-gradient-primary">miles de cuentas</span>
              </h2>
              <p className="text-body-lg text-content-secondary mb-8">
                Deja de depender de un solo canal. Con Kleo, cientos de clippers publican tus
                mejores clips simultáneamente en TikTok, Instagram Reels y YouTube Shorts.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Crea campañas en minutos',
                  'Define tu presupuesto y reglas',
                  'Monitorea resultados en tiempo real',
                  'Paga solo por publicaciones verificadas',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-primary-400 mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-body-lg text-content-secondary">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register?role=infoproductor"
                className="inline-flex items-center gap-2 bg-gradient-primary text-white font-semibold px-7 py-3.5 rounded-xl hover:opacity-90 transition-all hover:shadow-glow"
              >
                Empezar como infoproductor
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

            {/* Visual card mockup */}
            <div className="relative">
              <div className="glass rounded-2xl p-6 border-surface-border">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-heading-4 text-white">Campaña activa</h3>
                  <span className="flex items-center gap-1.5 bg-success/10 text-success text-caption font-medium px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
                    En vivo
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-surface-border-subtle">
                    <span className="text-body text-content-secondary">Clips publicados</span>
                    <span className="text-heading-4 text-white">847</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-surface-border-subtle">
                    <span className="text-body text-content-secondary">Vistas totales</span>
                    <span className="text-heading-4 text-white">2.4M</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-surface-border-subtle">
                    <span className="text-body text-content-secondary">Clippers activos</span>
                    <span className="text-heading-4 text-white">126</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-body text-content-secondary">ROI estimado</span>
                    <span className="text-heading-4 text-success">+340%</span>
                  </div>
                </div>
              </div>
              {/* Decorative glow behind card */}
              <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* For Clippers */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.03] to-transparent pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Visual card mockup - left side */}
            <div className="relative order-2 md:order-1">
              <div className="glass rounded-2xl p-6 border-surface-border">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-heading-4 text-white">Tus ganancias</h3>
                  <span className="text-caption text-content-tertiary">Este mes</span>
                </div>
                <div className="text-[2.5rem] font-bold text-white mb-1">$1,240</div>
                <div className="flex items-center gap-1.5 text-success text-body-sm mb-6">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                    />
                  </svg>
                  +28% vs mes anterior
                </div>
                <div className="space-y-3">
                  {[
                    { platform: 'TikTok', clips: 34, earnings: '$520' },
                    { platform: 'Instagram', clips: 28, earnings: '$410' },
                    { platform: 'YouTube', clips: 19, earnings: '$310' },
                  ].map((row) => (
                    <div
                      key={row.platform}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-surface-sunken/50"
                    >
                      <span className="text-body text-content-secondary">{row.platform}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-caption text-content-tertiary">
                          {row.clips} clips
                        </span>
                        <span className="text-body font-medium text-white">{row.earnings}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -inset-4 bg-accent/10 rounded-3xl blur-2xl -z-10" />
            </div>

            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-3 py-1 mb-6">
                <span className="text-caption font-medium text-accent-400">Para Clippers</span>
              </div>
              <h2 className="text-heading-1 md:text-[2.5rem] md:leading-[1.15] font-bold text-white mb-6">
                Monetiza tu audiencia <span className="text-gradient-accent">publicando clips</span>
              </h2>
              <p className="text-body-lg text-content-secondary mb-8">
                Elige las campañas que más te gusten, publica los clips en tus redes y cobra por
                cada publicación verificada. Sin inventar contenido, sin complicaciones.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Elige entre cientos de campañas',
                  'Publica en TikTok, Instagram o YouTube',
                  'Cobro automático por publicación verificada',
                  'Sin mínimos — empieza desde el día uno',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-accent-400 mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-body-lg text-content-secondary">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register?role=clipper"
                className="inline-flex items-center gap-2 bg-surface-raised border border-accent/30 hover:border-accent/60 text-white font-semibold px-7 py-3.5 rounded-xl transition-all hover:shadow-glow-accent"
              >
                Empezar como clipper
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="py-20 px-6 border-y border-surface-border-subtle">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-caption text-content-tertiary uppercase tracking-wider mb-8">
            Distribuye en las plataformas que importan
          </p>
          <div className="flex items-center justify-center gap-12 md:gap-20 flex-wrap">
            {['TikTok', 'Instagram Reels', 'YouTube Shorts'].map((platform) => (
              <span
                key={platform}
                className="text-heading-2 font-semibold text-content-tertiary hover:text-white transition-colors cursor-default"
              >
                {platform}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-glow opacity-40 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-heading-1 md:text-display font-bold text-white mb-6">
            ¿Listo para empezar?
          </h2>
          <p className="text-body-lg text-content-secondary mb-10 max-w-xl mx-auto">
            Únete a la plataforma que está cambiando cómo se distribuye el contenido viral en
            español.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register?role=infoproductor"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-primary text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-all hover:shadow-glow text-base"
            >
              Soy infoproductor
            </Link>
            <Link
              href="/register?role=clipper"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-surface-raised border border-surface-border hover:border-accent/50 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:shadow-glow-accent text-base"
            >
              Soy clipper
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-surface-border-subtle">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">✂️</span>
            <span className="text-sm font-semibold text-white">Kleo</span>
            <span className="text-caption text-content-tertiary ml-2">© 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-body-sm text-content-secondary hover:text-white transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="text-body-sm text-content-secondary hover:text-white transition-colors"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
