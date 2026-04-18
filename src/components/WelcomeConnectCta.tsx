interface WelcomeConnectCtaProps {
  onConnect: () => void;
}

const WelcomeConnectCta = ({ onConnect }: WelcomeConnectCtaProps) => (
  <button
    onClick={onConnect}
    className="rounded-xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(270,80%,55%))] px-8 py-4 text-lg font-bold text-primary-foreground shadow-[0_4px_20px_hsl(var(--primary)/0.4)] transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95"
  >
    Connect Wallet
  </button>
);

export default WelcomeConnectCta;
