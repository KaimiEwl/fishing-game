import type { ReactNode } from 'react';

interface DocumentSectionProps {
  title: string;
  children: ReactNode;
}

const DocumentSection = ({ title, children }: DocumentSectionProps) => (
  <section>
    <h2 className="mb-2 text-lg font-semibold text-foreground">{title}</h2>
    {children}
  </section>
);

interface DocumentSubheadingProps {
  children: ReactNode;
}

export const DocumentSubheading = ({ children }: DocumentSubheadingProps) => (
  <h3 className="mb-2 mt-4 font-medium text-foreground/80">{children}</h3>
);

interface DocumentListProps {
  items: string[];
}

export const DocumentList = ({ items }: DocumentListProps) => (
  <ul className="ml-2 mt-2 list-inside list-disc space-y-1">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

export default DocumentSection;
