const sparkles = [
  { size: 'h-1 w-1', position: 'left-[15%] top-[20%]', delay: '[animation-delay:0s]', duration: '[animation-duration:2s]' },
  { size: 'h-1.5 w-1.5', position: 'left-[29%] top-[45%]', delay: '[animation-delay:0.7s]', duration: '[animation-duration:2.5s]' },
  { size: 'h-2 w-2', position: 'left-[43%] top-[70%]', delay: '[animation-delay:1.4s]', duration: '[animation-duration:3s]' },
  { size: 'h-2.5 w-2.5', position: 'left-[57%] top-[20%]', delay: '[animation-delay:2.1s]', duration: '[animation-duration:3.5s]' },
  { size: 'h-3 w-3', position: 'left-[71%] top-[45%]', delay: '[animation-delay:2.8s]', duration: '[animation-duration:4s]' },
  { size: 'h-3.5 w-3.5', position: 'left-[85%] top-[70%]', delay: '[animation-delay:3.5s]', duration: '[animation-duration:4.5s]' },
] as const;

const WelcomeBackdrop = () => (
  <>
    <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(200,70%,25%)_0%,hsl(220,50%,18%)_40%,hsl(258,40%,15%)_100%)]" />
    <div className="absolute bottom-0 left-0 right-0 h-1/3 opacity-30">
      <div className="h-full w-full animate-wave bg-[linear-gradient(0deg,hsl(var(--lake-deep))_0%,transparent_100%)]" />
    </div>
    {sparkles.map((sparkle, index) => (
      <div
        key={index}
        className={`absolute rounded-full bg-primary/40 animate-shimmer ${sparkle.size} ${sparkle.position} ${sparkle.delay} ${sparkle.duration}`}
      />
    ))}
  </>
);

export default WelcomeBackdrop;
