import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web/build/player/lottie_light';
import successAnimationData from '../assets/success-animation.json';

interface SuccessLottieAnimationProps {
  size?: number;
  loop?: boolean;
  className?: string;
}

/**
 * Renderiza a animação Lottie oficial de confirmação/sucesso em SVG.
 */
export const SuccessLottieAnimation: React.FC<SuccessLottieAnimationProps> = ({
  size = 136,
  loop = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';
    const lottiePlayer = (lottie as any)?.loadAnimation ? lottie : (lottie as any)?.default;
    if (!lottiePlayer?.loadAnimation) return;

    const anim = lottiePlayer.loadAnimation({
      container,
      renderer: 'svg',
      loop,
      autoplay: true,
      animationData: successAnimationData,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
      },
    });

    return () => {
      anim.destroy();
    };
  }, [loop]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
      aria-label="Agendamento confirmado com sucesso"
    />
  );
};

export default SuccessLottieAnimation;
