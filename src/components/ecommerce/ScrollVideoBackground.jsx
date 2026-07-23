import { useEffect, useRef } from 'react';

export function ScrollVideoBackground({ videoSrc = '/videoeggscroll.mp4' }) {
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
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);

      // A altura real da página inteira (header + categorias + grid + footer) é a
      // timeline do vídeo — sem wrapper artificial, o scroll do catálogo todo é o scrubber.
      const trigger = ScrollTrigger.create({
        trigger: document.documentElement,
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

      cleanup = () => trigger.kill();
    })();

    return () => {
      cancelled = true;
      video.removeEventListener('loadedmetadata', markReady);
      cleanup?.();
    };
  }, [videoSrc]);

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
