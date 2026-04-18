interface LakeWaveLayerProps {
  delaySeconds: number;
  opacity: number;
  topPercent: number;
}

const LakeWaveLayer = ({ delaySeconds, opacity, topPercent }: LakeWaveLayerProps) => (
  <svg
    className="absolute w-[200%] animate-wave-move"
    style={{
      top: `${topPercent}%`,
      animationDelay: `${delaySeconds}s`,
      opacity,
    }}
    viewBox="0 0 1200 60"
    preserveAspectRatio="none"
  >
    <path
      d="M0 30 Q 75 10 150 30 T 300 30 T 450 30 T 600 30 T 750 30 T 900 30 T 1050 30 T 1200 30 V 60 H 0 Z"
      fill="hsla(195, 80%, 70%, 0.5)"
    />
  </svg>
);

export default LakeWaveLayer;
