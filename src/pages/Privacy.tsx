import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Game
          </Link>
        </Button>

        <h1 className="text-4xl font-bold mb-2">🔐 Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: February 19, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Introduction</h2>
            <p>This Privacy Policy explains how MonadFish ("we", "our", "us") collects and uses information when you use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Information We Collect</h2>
            <h3 className="font-medium text-foreground/80 mt-4 mb-2">Automatically Collected Data</h3>
            <p>When you access the Service, we may collect:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>browser type</li>
              <li>device type</li>
              <li>IP address</li>
              <li>gameplay interactions</li>
              <li>basic analytics data</li>
            </ul>
            <h3 className="font-medium text-foreground/80 mt-4 mb-2">Wallet Information</h3>
            <p>If you connect a blockchain wallet, we may store:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>wallet public address</li>
            </ul>
            <p className="mt-4">We never collect:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>private keys</li>
              <li>seed phrases</li>
              <li>passwords</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. How We Use Data</h2>
            <p>We use collected information to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>operate the game</li>
              <li>improve performance</li>
              <li>prevent abuse or fraud</li>
              <li>maintain security</li>
              <li>analyze usage statistics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Cookies</h2>
            <p>The Service may use cookies or similar technologies for:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>session functionality</li>
              <li>analytics</li>
              <li>preferences</li>
            </ul>
            <p className="mt-2">You can disable cookies in your browser settings.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Sharing of Information</h2>
            <p>We do not sell personal data.</p>
            <p className="mt-2">We may share limited data only:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>if required by law</li>
              <li>to comply with legal processes</li>
              <li>to protect rights or security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Third-Party Services</h2>
            <p>The Service may interact with third-party providers such as:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
              <li>blockchain networks</li>
              <li>wallet providers</li>
              <li>analytics tools</li>
            </ul>
            <p className="mt-2">We are not responsible for their privacy practices.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Data Security</h2>
            <p>We implement reasonable technical measures to protect data. However, no system is completely secure.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Children's Privacy</h2>
            <p>The Service is not intended for children under 13.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. International Users</h2>
            <p>You understand that your data may be processed in jurisdictions different from your own.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">10. Changes</h2>
            <p>We may update this Privacy Policy periodically. Continued use means acceptance of updates.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">11. Contact</h2>
            <p>Privacy inquiries:</p>
            <p className="mt-2">📧 support.monadfish.xyz</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
