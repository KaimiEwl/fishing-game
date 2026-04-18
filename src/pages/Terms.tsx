import ContentPageShell, { ContentPageBackLink } from '@/components/ContentPageShell';
import DocumentSection, { DocumentList } from '@/components/DocumentSection';
import { usePageScroll } from '@/hooks/usePageScroll';

const Terms = () => {
  usePageScroll();

  return (
    <ContentPageShell>
      <ContentPageBackLink />

      <h1 className="mb-2 text-4xl font-bold">Terms of Service</h1>
      <p className="mb-10 text-muted-foreground">Last updated: February 19, 2026</p>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <DocumentSection title="1. Acceptance of Terms">
          <p>
            By accessing or using the MonadFish website and game ("Service"), you agree to be bound
            by these Terms of Service. If you do not agree, you must not use the Service.
          </p>
        </DocumentSection>

        <DocumentSection title="2. Description of Service">
          <p>
            MonadFish is a browser-based entertainment game. The Service may include optional
            blockchain-related features such as digital collectible items (NFTs) and wallet
            connectivity.
          </p>
          <p className="mt-2">The Service is provided for entertainment purposes only.</p>
        </DocumentSection>

        <DocumentSection title="3. Eligibility">
          <p>
            You must be at least 18 years old or the age of majority in your jurisdiction to use
            this Service.
          </p>
          <p className="mt-2">You are responsible for ensuring that your use complies with local laws.</p>
        </DocumentSection>

        <DocumentSection title="4. No Financial or Investment Services">
          <p>MonadFish is not:</p>
          <DocumentList
            items={[
              'a financial platform',
              'an investment service',
              'a brokerage',
              'an exchange',
            ]}
          />
          <p className="mt-2">
            Digital assets used within the game are not securities or financial instruments and are
            intended solely for in-game or collectible use.
          </p>
          <p className="mt-2">We do not guarantee profit, value growth, or resale market availability.</p>
        </DocumentSection>

        <DocumentSection title="5. Wallet Connection">
          <p>If you choose to connect a blockchain wallet:</p>
          <DocumentList
            items={[
              'connection is voluntary',
              'we do not access private keys or seed phrases',
              'we cannot control your wallet or assets',
            ]}
          />
          <p className="mt-2">You are solely responsible for wallet security.</p>
        </DocumentSection>

        <DocumentSection title="6. User Responsibilities">
          <p>You agree not to:</p>
          <DocumentList
            items={[
              'exploit bugs',
              'use bots or automation',
              'reverse engineer the game',
              'impersonate others',
              'use the Service for illegal purposes',
            ]}
          />
          <p className="mt-2">We reserve the right to suspend or terminate access for violations.</p>
        </DocumentSection>

        <DocumentSection title="7. Intellectual Property">
          <p>
            All content, artwork, game mechanics, design elements, and branding belong to the
            project owner unless otherwise stated.
          </p>
          <p className="mt-2">You may not copy or redistribute content without permission.</p>
        </DocumentSection>

        <DocumentSection title="8. Disclaimer of Warranties">
          <p>The Service is provided "as is" without warranties of any kind.</p>
          <p className="mt-2">We do not guarantee:</p>
          <DocumentList items={['uninterrupted operation', 'error-free gameplay', 'permanent availability']} />
        </DocumentSection>

        <DocumentSection title="9. Limitation of Liability">
          <p>To the fullest extent permitted by law, MonadFish shall not be liable for:</p>
          <DocumentList
            items={[
              'losses related to digital assets',
              'wallet access issues',
              'blockchain network failures',
              'third-party services',
            ]}
          />
        </DocumentSection>

        <DocumentSection title="10. Modifications">
          <p>
            We may update these Terms at any time. Continued use of the Service means you accept
            updated terms.
          </p>
        </DocumentSection>

        <DocumentSection title="11. Contact">
          <p>For questions or legal requests:</p>
          <p className="mt-2">support.monadfish.xyz</p>
        </DocumentSection>
      </div>
    </ContentPageShell>
  );
};

export default Terms;
