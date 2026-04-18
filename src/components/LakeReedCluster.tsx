interface LakeReedClusterProps {
  height: number;
  variant?: number;
  offsetX?: number;
  offsetY?: number;
}

const LakeReedCluster = ({
  height,
  variant = 0,
  offsetX = 0,
  offsetY = 0,
}: LakeReedClusterProps) => {
  const colors = [
    { stem: 'hsl(100, 45%, 35%)', stemDark: 'hsl(100, 50%, 28%)', tip: 'hsl(35, 50%, 40%)', leaf: 'hsl(100, 40%, 42%)' },
    { stem: 'hsl(95, 50%, 32%)', stemDark: 'hsl(95, 55%, 25%)', tip: 'hsl(30, 45%, 35%)', leaf: 'hsl(95, 45%, 40%)' },
    { stem: 'hsl(105, 40%, 38%)', stemDark: 'hsl(105, 45%, 30%)', tip: 'hsl(32, 48%, 38%)', leaf: 'hsl(105, 35%, 45%)' },
  ];

  const color = colors[variant % colors.length];
  const stemCount = 5 + (variant % 3);

  return (
    <svg
      width={height * 1.2}
      height={height * 1.3}
      viewBox={`0 0 ${height * 1.2} ${height * 1.3}`}
      style={{ transform: `translate(${offsetX}px, ${offsetY}px)` }}
      className="flex-shrink-0"
    >
      {[...Array(stemCount)].map((_, index) => {
        const xOffset = (index / stemCount) * height * 0.9 + height * 0.15;
        const stemHeight = height * (0.75 + (index % 4) * 0.08);
        const curve = (index % 2 === 0 ? 1 : -1) * (4 + index * 0.8);
        const baseY = height * 1.3;
        const hasCattail = index % 3 === 0;

        return (
          <g key={index}>
            <path
              d={`M${xOffset} ${baseY} Q${xOffset + curve * 0.5} ${baseY - stemHeight * 0.5} ${xOffset + curve} ${baseY - stemHeight}`}
              stroke={color.stem}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M${xOffset + 1} ${baseY} Q${xOffset + curve * 0.5 + 1} ${baseY - stemHeight * 0.5} ${xOffset + curve + 1} ${baseY - stemHeight}`}
              stroke={color.leaf}
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
              opacity="0.5"
            />

            {index % 2 === 0 && (
              <>
                <path
                  d={`M${xOffset + curve * 0.3} ${baseY - stemHeight * 0.4} Q${xOffset + curve * 0.3 + 12} ${baseY - stemHeight * 0.5} ${xOffset + curve * 0.3 + 18} ${baseY - stemHeight * 0.35}`}
                  stroke={color.leaf}
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d={`M${xOffset + curve * 0.5} ${baseY - stemHeight * 0.6} Q${xOffset + curve * 0.5 - 10} ${baseY - stemHeight * 0.7} ${xOffset + curve * 0.5 - 15} ${baseY - stemHeight * 0.55}`}
                  stroke={color.stem}
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            )}

            {hasCattail ? (
              <>
                <ellipse cx={xOffset + curve} cy={baseY - stemHeight - 8} rx="3.5" ry="10" fill={color.tip} />
                <line
                  x1={xOffset + curve - 2}
                  y1={baseY - stemHeight - 12}
                  x2={xOffset + curve - 2}
                  y2={baseY - stemHeight - 4}
                  stroke={color.stemDark}
                  strokeWidth="0.5"
                  opacity="0.4"
                />
                <line
                  x1={xOffset + curve + 2}
                  y1={baseY - stemHeight - 14}
                  x2={xOffset + curve + 2}
                  y2={baseY - stemHeight - 2}
                  stroke={color.stemDark}
                  strokeWidth="0.5"
                  opacity="0.4"
                />
              </>
            ) : (
              <path
                d={`M${xOffset + curve} ${baseY - stemHeight} L${xOffset + curve + 1} ${baseY - stemHeight - 6} L${xOffset + curve - 1} ${baseY - stemHeight - 5} Z`}
                fill={color.leaf}
              />
            )}
          </g>
        );
      })}

      {[...Array(4)].map((_, index) => {
        const xPos = height * 0.2 + index * height * 0.25;
        const grassHeight = height * 0.25;
        const lean = index % 2 === 0 ? 3 : -3;

        return (
          <path
            key={`grass-${index}`}
            d={`M${xPos} ${height * 1.3} Q${xPos + lean} ${height * 1.3 - grassHeight * 0.6} ${xPos + lean * 1.5} ${height * 1.3 - grassHeight}`}
            stroke={color.stem}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            opacity="0.7"
          />
        );
      })}
    </svg>
  );
};

export default LakeReedCluster;
