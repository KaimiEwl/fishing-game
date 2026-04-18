interface LakeDetailedTreeProps {
  height: number;
  variant?: number;
  depth?: 'far' | 'back' | 'front';
}

const depthOpacityClass = {
  far: 'opacity-50',
  back: 'opacity-75',
  front: '',
} as const;

const LakeDetailedTree = ({ height, variant = 0, depth = 'front' }: LakeDetailedTreeProps) => {
  const trunkHeight = height * 0.2;
  const treeWidth = height * 0.6;

  const colors = [
    {
      dark: 'hsl(140, 60%, 22%)',
      medium: 'hsl(140, 55%, 30%)',
      light: 'hsl(140, 50%, 38%)',
      highlight: 'hsl(140, 45%, 45%)',
      trunk: 'hsl(25, 45%, 25%)',
      trunkDark: 'hsl(25, 50%, 18%)',
    },
    {
      dark: 'hsl(150, 55%, 20%)',
      medium: 'hsl(150, 50%, 28%)',
      light: 'hsl(150, 45%, 36%)',
      highlight: 'hsl(150, 40%, 42%)',
      trunk: 'hsl(20, 40%, 28%)',
      trunkDark: 'hsl(20, 45%, 20%)',
    },
    {
      dark: 'hsl(130, 65%, 20%)',
      medium: 'hsl(130, 60%, 28%)',
      light: 'hsl(130, 55%, 35%)',
      highlight: 'hsl(130, 50%, 42%)',
      trunk: 'hsl(28, 42%, 26%)',
      trunkDark: 'hsl(28, 48%, 18%)',
    },
  ];

  const color = colors[variant % colors.length];
  const centerX = treeWidth / 2;

  return (
    <svg
      width={treeWidth}
      height={height}
      viewBox={`0 0 ${treeWidth} ${height}`}
      className={depthOpacityClass[depth]}
    >
      <rect
        x={centerX - height * 0.04}
        y={height - trunkHeight}
        width={height * 0.08}
        height={trunkHeight}
        fill={color.trunk}
      />
      <line
        x1={centerX - height * 0.02}
        y1={height - trunkHeight}
        x2={centerX - height * 0.02}
        y2={height}
        stroke={color.trunkDark}
        strokeWidth="2"
        opacity="0.6"
      />
      <line
        x1={centerX + height * 0.02}
        y1={height - trunkHeight + 5}
        x2={centerX + height * 0.02}
        y2={height - 5}
        stroke={color.trunkDark}
        strokeWidth="1.5"
        opacity="0.4"
      />

      <polygon
        points={`${centerX},${height * 0.12} ${treeWidth * 0.95},${height * 0.82} ${treeWidth * 0.05},${height * 0.82}`}
        fill={color.dark}
      />
      <polygon
        points={`${centerX},${height * 0.08} ${treeWidth * 0.85},${height * 0.60} ${treeWidth * 0.15},${height * 0.60}`}
        fill={color.medium}
      />
      <polygon
        points={`${centerX},${height * 0.04} ${treeWidth * 0.75},${height * 0.42} ${treeWidth * 0.25},${height * 0.42}`}
        fill={color.light}
      />
      <polygon
        points={`${centerX},0 ${treeWidth * 0.65},${height * 0.28} ${treeWidth * 0.35},${height * 0.28}`}
        fill={color.highlight}
      />

      <polygon
        points={`${treeWidth * 0.3},${height * 0.55} ${treeWidth * 0.45},${height * 0.55} ${treeWidth * 0.15},${height * 0.82}`}
        fill={color.dark}
        opacity="0.5"
      />
      <polygon
        points={`${treeWidth * 0.55},${height * 0.55} ${treeWidth * 0.70},${height * 0.55} ${treeWidth * 0.85},${height * 0.82}`}
        fill={color.dark}
        opacity="0.5"
      />
      <polygon
        points={`${centerX},${height * 0.04} ${treeWidth * 0.25},${height * 0.42} ${treeWidth * 0.35},${height * 0.35}`}
        fill="hsla(120, 40%, 60%, 0.2)"
      />
      <polygon
        points={`${centerX},0 ${centerX + height * 0.03},${height * 0.06} ${centerX - height * 0.03},${height * 0.06}`}
        fill="hsla(140, 30%, 60%, 0.5)"
      />
    </svg>
  );
};

export default LakeDetailedTree;
