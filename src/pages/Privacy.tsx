import ContentPageShell, { ContentPageBackLink } from '@/components/ContentPageShell';
import DocumentSection, { DocumentList, DocumentSubheading } from '@/components/DocumentSection';
import { usePageScroll } from '@/hooks/usePageScroll';

const Privacy = () => {
  usePageScroll();

  return (
    <ContentPageShell>
      <ContentPageBackLink />

      <h1 className="mb-2 text-4xl font-bold">Privacy Policy</h1>
      <p className="mb-10 text-muted-foreground">Last updated: February 19, 2026</p>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <DocumentSection title="1. Introduction">
          <p>
            This Privacy Policy explains how MonadFish ("we", "our", "us") collects and uses
            information when you use the Service.
          </p>
        </DocumentSection>

        <DocumentSection title="2. Information We Collect">
          <DocumentSubheading>Automatically Collected Data</DocumentSubheading>
          <p>When you access the Service, we may collect:</p>
          <DocumentList
            items={[
              'browser type',
              'device type',
              'IP address',
              'gameplay interactions',
              'basic analytics data',
            ]}
          />
          <DocumentSubheading>Wallet Information</DocumentSubheading>
          <p>If you connect a blockchain wallet, we may store:</p>
          <DocumentList items={['wallet public address']} />
          <p className="mt-4">We never collect:</p>
          <DocumentList items={['private keys', 'seed phrases', 'passwords']} />
        </DocumentSection>

        <DocumentSection title="3. How We Use Data">
          <p>We use collected information to:</p>
          <DocumentList
            items={[
              'operate the game',
              'improve performance',
              'prevent abuse or fraud',
              'maintain security',
              'analyze usage statistics',
            ]}
          />
        </DocumentSection>

        <DocumentSection title="4. Cookies">
          <p>The Service may use cookies or similar technologies for:</p>
          <DocumentList items={['session functionality', 'analytics', 'preferences']} />
          <p className="mt-2">You can disable cookies in your browser settings.</p>
        </DocumentSection>

        <DocumentSection title="5. Sharing of Information">
          <p>We do not sell personal data.</p>
          <p className="mt-2">We may share limited data only:</p>
          <DocumentList
            items={[
              'if required by law',
              'to comply with legal processes',
              'to protect rights or security',
            ]}
          />
        </DocumentSection>

        <DocumentSection title="6. Third-Party Services">
          <p>The Service may interact with third-party providers such as:</p>
          <DocumentList items={['blockchain networks', 'wallet providers', 'analytics tools']} />
          <p className="mt-2">We are not responsible for their privacy practices.</p>
        </DocumentSection>

        <DocumentSection title="7. Data Security">
          <p>
            We implement reasonable technical measures to protect data. However, no system is
            completely secure.
          </p>
        </DocumentSection>

        <DocumentSection title="8. Children's Privacy">
          <p>The Service is not intended for children under 13.</p>
        </DocumentSection>

        <DocumentSection title="9. International Users">
          <p>You understand that your data may be processed in jurisdictions different from your own.</p>
        </DocumentSection>

        <DocumentSection title="10. Changes">
          <p>We may update this Privacy Policy periodically. Continued use means acceptance of updates.</p>
        </DocumentSection>

        <DocumentSection title="11. Contact">
          <p>Privacy inquiries:</p>
          <p className="mt-2">support.monadfish.xyz</p>
        </DocumentSection>
      </div>
    </ContentPageShell>
  );
};

export default Privacy;
