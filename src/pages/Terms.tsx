import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageScroll } from '@/hooks/usePageScroll';

const Terms = () => {
  usePageScroll();

  return (
    <div className="min-h-screen overflow-y-auto bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Game
          </Link>
        </Button>

        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-10">Last updated: February 19, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using the MonadFish website and game ("Service"), you agree to be bound by these Terms of Service. If you do not agree, you must not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Description of Service</h2>
            <p>MonadFish is a browser-based entertainment game. The Service may include optional blockchain-related features such as digital collectible items (NFTs) and wallet connectivity.</p>
            <p className="mt-2">The Service is provided for entertainment purposes only.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Eligibility</h2>
            <p>You must be at least 18 years old or the age of majority in your jurisdiction to use this Service.</p>
            <p className="mt-2">You are responsible for ensuring that your use complies with local laws.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. No Financial or Investment Services</h2>
            <p>MonadFish is not:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>a financial platform</li>
              <li>an investment service</li>
              <li>a brokerage</li>
              <li>an exchange</li>
            </ul>
            <p className="mt-2">Digital assets used within the game are not securities or financial instruments and are intended solely for in-game or collectible use.</p>
            <p className="mt-2">We do not guarantee profit, value growth, or resale market availability.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Wallet Connection</h2>
            <p>If you choose to connect a blockchain wallet:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>connection is voluntary</li>
              <li>we do not access private keys or seed phrases</li>
              <li>we cannot control your wallet or assets</li>
            </ul>
            <p className="mt-2">You are solely responsible for wallet security.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. User Responsibilities</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>exploit bugs</li>
              <li>use bots or automation</li>
              <li>reverse engineer the game</li>
              <li>impersonate others</li>
              <li>use the Service for illegal purposes</li>
            </ul>
            <p className="mt-2">We reserve the right to suspend or terminate access for violations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Intellectual Property</h2>
            <p>All content, artwork, game mechanics, design elements, and branding belong to the project owner unless otherwise stated.</p>
            <p className="mt-2">You may not copy or redistribute content without permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" without warranties of any kind.</p>
            <p className="mt-2">We do not guarantee:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>uninterrupted operation</li>
              <li>error-free gameplay</li>
              <li>permanent availability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, MonadFish shall not be liable for:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>losses related to digital assets</li>
              <li>wallet access issues</li>
              <li>blockchain network failures</li>
              <li>third-party services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">10. Modifications</h2>
            <p>We may update these Terms at any time. Continued use of the Service means you accept updated terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">11. Contact</h2>
            <p>For questions or legal requests:</p>
            <p className="mt-2">📧 support.monadfish.xyz</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
