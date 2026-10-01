import { useEffect, useRef } from 'react';

const FRASES = [
  {
    titulo: 'Cuidado com seu alimento desde o início até o fim',
    subtitulo: 'Da granja até a sua mesa, cada etapa acompanhada de perto.',
  },
  {
    titulo: 'Empresa tradicional e familiar',
    subtitulo: 'Décadas de experiência entregando ovos frescos com confiança.',
  },
  {
    titulo: 'Organização e preocupação com nossos clientes',
    subtitulo: 'Estoque sempre em dia e atendimento pensado pra quem compra.',
  },
];

// TODO: troque pelo número real da empresa (só dígitos, com DDI+DDD, ex: 5511999999999)
const NUMERO_WHATSAPP = '5511999999999';
const LINK_WHATSAPP = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent('Olá! Vim pelo catálogo da Ovos Bastos.')}`;

export function CompanyShowcase() {
  const fraseRefs = useRef([]);
  const ctaRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const triggers = [];

    (async () => {
      const { default: gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);

      fraseRefs.current.forEach((el, i) => {
        if (!el) return;
        const deEsquerda = i % 2 === 0;
        const distancia = 140;

        gsap.set(el, { opacity: 0, x: deEsquerda ? -distancia : distancia });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            end: 'top 25%',
            scrub: 0.4,
          },
        });
        tl.to(el, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' })
          .to(el, { opacity: 1, duration: 0.25 })
          .to(el, { opacity: 0, x: deEsquerda ? distancia : -distancia, duration: 0.35, ease: 'power2.in' });

        triggers.push(tl.scrollTrigger);
      });

      if (ctaRef.current) {
        gsap.set(ctaRef.current, { opacity: 0, y: 30 });
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: ctaRef.current,
            start: 'top 92%',
            end: 'top 65%',
            scrub: 0.4,
          },
        });
        tl.to(ctaRef.current, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
        triggers.push(tl.scrollTrigger);
      }
    })();

    return () => {
      cancelled = true;
      triggers.forEach((t) => t.kill());
    };
  }, []);

  return (
    <section className="empresa-showcase">
      <div className="empresa-frases">
        {FRASES.map((f, i) => (
          <div
            className={`empresa-frase ${i % 2 === 0 ? 'empresa-frase-esquerda' : 'empresa-frase-direita'}`}
            key={f.titulo}
            ref={(el) => {
              fraseRefs.current[i] = el;
            }}
          >
            <div className="empresa-frase-card">
              <h3>{f.titulo}</h3>
              {f.subtitulo && <p>{f.subtitulo}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="empresa-cta" ref={ctaRef}>
        <a href={LINK_WHATSAPP} target="_blank" rel="noopener noreferrer" className="empresa-whatsapp-btn">
          <span aria-hidden="true">💬</span> Fale conosco
        </a>
      </div>
    </section>
  );
}
