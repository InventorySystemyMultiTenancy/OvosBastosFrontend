import { useEffect, useRef } from 'react';

export function ScrollVideoBackground({ videoSrc = '/videoeggscroll.mp4', containerRef }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let durationReady = false;
    let pendingProgress = 0;
    let cleanup;
    let cancelled = false;

    const markReady = () => {
      if (durationReady) return;
      durationReady = Number.isFinite(video.duration) && video.duration > 0;
      if (!durationReady) return;

      video.currentTime = pendingProgress * video.duration;

      // vídeo pausado que nunca rodou não pinta frame em iOS/Safari — play+pause
      // imediato força o decode/paint do primeiro frame sem o usuário perceber.
      const playPromise = video.play();
      if (playPromise) playPromise.then(() => video.pause()).catch(() => {});
    };

    video.addEventListener('loadedmetadata', markReady);
    // se o vídeo já veio do cache, 'loadedmetadata' pode já ter disparado antes deste listener existir
    if (video.readyState >= 1) markReady();

    (async () => {
      const { default: gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      if (cancelled || !containerRef?.current) return;

      gsap.registerPlugin(ScrollTrigger);

      // Usa o wrapper real do conteúdo (não document.documentElement/body): com
      // `html, body { height: 100% }` no CSS global, a altura "própria" do body fica
      // travada em 100vh mesmo quando o conteúdo estoura — o ScrollTrigger mede errado
      // se aponta pra lá. O container real cresce de verdade com o conteúdo.
      const trigger = ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          const progress = self.progress;
          pendingProgress = progress;

          if (durationReady && video.duration) {
            // nunca seekar exatamente na duration: alguns browsers travam no último frame
            video.currentTime = Math.min(progress * video.duration, video.duration - 0.05);
          }
        },
      });

      // Os produtos vêm da API depois do primeiro render: a grade cresce e muda a
      // altura da página DEPOIS do ScrollTrigger já ter medido o range de scroll.
      // Sem recalcular, o scrub fica preso na medida antiga (curta) e trava.
      const resizeObserver = new ResizeObserver(() => ScrollTrigger.refresh());
      resizeObserver.observe(containerRef.current);

      cleanup = () => {
        resizeObserver.disconnect();
        trigger.kill();
      };
    })();

    return () => {
      cancelled = true;
      video.removeEventListener('loadedmetadata', markReady);
      cleanup?.();
    };
  }, [videoSrc, containerRef]);

  return (
    <video
      ref={videoRef}
      src={videoSrc}
      muted
      playsInline
      preload="auto"
      className="ecommerce-bg-video"
    />
  );
}
