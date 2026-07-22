import { useEffect, useRef } from 'react';

export function ScrollVideoHero({ videoSrc = '/videoeggscroll.mp4', heightVh = 260, title, tagline }) {
  const wrapperRef = useRef(null);
  const videoRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let durationReady = false;
    let pendingProgress = 0;
    let cleanup;

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

    let cancelled = false;

    (async () => {
      const { default: gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      if (cancelled || !wrapperRef.current) return;

      gsap.registerPlugin(ScrollTrigger);

      const trigger = ScrollTrigger.create({
        trigger: wrapperRef.current,
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

          if (overlayRef.current) {
            const fadeOutStart = 0.15;
            const opacity = progress < fadeOutStart ? 1 : Math.max(1 - (progress - fadeOutStart) / 0.35, 0);
            overlayRef.current.style.opacity = String(opacity);
            overlayRef.current.style.transform = `translateY(${progress * -60}px)`;
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
    <div ref={wrapperRef} className="ecommerce-hero-wrapper" style={{ height: `${heightVh}vh` }}>
      <div className="ecommerce-hero-sticky">
        <video ref={videoRef} src={videoSrc} muted playsInline preload="auto" className="ecommerce-hero-video" />
        <div className="ecommerce-hero-gradient" />
        {(title || tagline) && (
          <div ref={overlayRef} className="ecommerce-hero-overlay">
            {title && <h1>{title}</h1>}
            {tagline && <p>{tagline}</p>}
          </div>
        )}
        <div className="ecommerce-hero-scrollhint">role para ver os produtos ↓</div>
      </div>
    </div>
  );
}
