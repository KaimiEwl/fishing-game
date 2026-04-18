import WaterLily from './WaterLily';
import LakeCloud from '@/components/LakeCloud';
import LakeDetailedTree from '@/components/LakeDetailedTree';
import LakeWaveLayer from '@/components/LakeWaveLayer';
import LakeReedCluster from '@/components/LakeReedCluster';

const lilyConfigs = [
  { size: 'lg', hasFlower: true, position: 'right-[15%] top-[2%]' },
  { size: 'md', hasFlower: false, position: 'right-[30%] top-[5%]' },
  { size: 'lg', hasFlower: true, position: 'right-[8%] top-[8%]' },
  { size: 'sm', hasFlower: false, position: 'right-[50%] top-[3%]' },
  { size: 'xl', hasFlower: true, position: 'right-[70%] top-[6%]' },
  { size: 'md', hasFlower: false, position: 'right-[85%] top-[4%]' },
] as const;

const LakeScene = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, hsl(200, 70%, 75%) 0%, hsl(200, 60%, 85%) 50%, hsl(200, 50%, 90%) 100%)',
        }}
      />

      <div
        className="absolute right-12 top-4 h-16 w-16 animate-pulse rounded-full"
        style={{
          background:
            'radial-gradient(circle, hsl(45, 100%, 70%) 0%, hsl(45, 100%, 60%) 50%, transparent 70%)',
          boxShadow: '0 0 40px hsl(45, 100%, 60%)',
        }}
      />

      <div className="absolute left-[50%] top-6">
        <LakeCloud driftDelaySeconds={0} />
      </div>

      <div className="absolute bottom-[38%] left-0 right-0 flex h-[50%] items-end">
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around">
          {[...Array(20)].map((_, index) => (
            <LakeDetailedTree
              key={`far-${index}`}
              height={100 + (index % 3) * 25}
              variant={index % 3}
              depth="far"
            />
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around">
          {[...Array(16)].map((_, index) => (
            <LakeDetailedTree
              key={`back-${index}`}
              height={150 + (index % 4) * 40}
              variant={index % 3}
              depth="back"
            />
          ))}
        </div>
        <div className="absolute bottom-0 left-[2%] right-[2%] flex items-end justify-around">
          {[...Array(12)].map((_, index) => (
            <LakeDetailedTree
              key={`front-${index}`}
              height={200 + (index % 3) * 50}
              variant={(index + 1) % 3}
              depth="front"
            />
          ))}
        </div>
      </div>

      <div
        className="absolute bottom-[35%] left-0 right-0 h-[10%]"
        style={{
          background: 'linear-gradient(180deg, hsl(120, 50%, 45%) 0%, hsl(120, 40%, 35%) 100%)',
          borderRadius: '50% 50% 0 0 / 50% 50% 0 0',
        }}
      />

      <div className="pointer-events-none absolute bottom-[38%] left-0 right-0 z-10 flex h-[8%] items-end justify-around">
        {[...Array(30)].map((_, index) => (
          <LakeReedCluster
            key={`reed-${index}`}
            height={25 + (index % 4) * 10}
            variant={index % 3}
            offsetX={Math.sin(index) * 10}
            offsetY={0}
          />
        ))}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-[40%] overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, hsl(195, 70%, 50%) 0%, hsl(200, 80%, 35%) 100%)',
        }}
      >
        <div className="absolute inset-0">
          <LakeWaveLayer delaySeconds={0} opacity={0.3} topPercent={10} />
          <LakeWaveLayer delaySeconds={1} opacity={0.2} topPercent={30} />
          <LakeWaveLayer delaySeconds={2} opacity={0.25} topPercent={50} />
        </div>

        <div className="absolute inset-0">
          {[...Array(8)].map((_, index) => (
            <div
              key={index}
              className="absolute h-1 w-2 animate-shimmer rounded-full bg-white/40"
              style={{
                left: `${10 + index * 12}%`,
                top: `${20 + (index % 3) * 25}%`,
                animationDelay: `${index * 0.3}s`,
              }}
            />
          ))}
        </div>

        {lilyConfigs.map((lily, index) => (
          <div key={`lily-${index}`} className={`absolute ${lily.position}`}>
            <WaterLily size={lily.size} hasFlower={lily.hasFlower} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LakeScene;
