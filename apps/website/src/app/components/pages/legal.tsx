import type { ReactNode } from "react";
import { Link } from "react-router";
import { EMAIL, EMAIL_HREF } from "../../../config/contact";
import { useDocumentTitle } from "../../hooks/use-document-title";

// Minimal, on-brand Privacy + Terms pages. The content below is reasonable
// placeholder boilerplate — NOT legal advice.
// TODO (client + legal counsel): review and finalise both before launch.

function LegalLayout({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <div className="mx-auto max-w-[760px] px-6 pt-32 pb-24 lg:pt-40">
        <span className="text-[0.66rem] uppercase tracking-[0.16em] text-[var(--accent)]">{eyebrow}</span>
        <h1
          className="mt-5"
          style={{ fontFamily: "var(--typeface-serif)", fontSize: "clamp(2rem, 4.5vw, 3rem)", fontWeight: 500, lineHeight: 1.1, letterSpacing: "-0.015em" }}
        >
          {title}
        </h1>
        <p className="mt-4 text-[0.8rem] text-[var(--text-muted)]">{updated}</p>
        <div className="mt-10 space-y-8 text-[var(--text-body)]" style={{ lineHeight: 1.8, fontSize: "1rem" }}>
          {children}
        </div>
        <div className="mt-14 border-t border-[var(--border)] pt-8">
          <Link
            to="/"
            className="text-[0.72rem] uppercase tracking-[0.14em] text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 style={{ fontFamily: "var(--typeface-serif)", fontSize: "1.25rem", fontWeight: 500, color: "var(--text-primary)" }}>{heading}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function Privacy() {
  useDocumentTitle("Privacy · The Collection");
  return (
    <LegalLayout eyebrow="The Collection" title="Privacy" updated="TODO: last updated (to be finalised)">
      <p>
        The Collection is a private, by-appointment dealership in Islamabad. We treat every enquiry
        in confidence. This notice explains, in plain terms, what we hold and how we use it.
      </p>
      <Section heading="What we collect">
        <p>
          When you enquire, by WhatsApp, email, or telephone, we receive the details you choose to
          share: typically your name, contact details, and the motorcar or brief you have in mind. We
          do not require you to create an account, and we do not collect payment details through this
          website.
        </p>
      </Section>
      <Section heading="How we use it">
        <p>
          We use your details solely to respond to your enquiry, arrange a private viewing, and
          correspond with you about motorcars relevant to your interest. We do not sell your details,
          and we do not share them with third parties for marketing.
        </p>
      </Section>
      <Section heading="Messaging platforms">
        <p>
          Enquiries you send through WhatsApp are also handled under WhatsApp's own terms and privacy
          policy, which govern that platform.
        </p>
      </Section>
      <Section heading="Retention & your choices">
        <p>
          We keep enquiry correspondence only as long as needed to assist you. To ask what we hold, or
          to have it removed, contact{" "}
          <a href={EMAIL_HREF} className="underline transition-colors hover:text-[var(--text-primary)]">{EMAIL}</a>.
        </p>
      </Section>
      <p className="text-[0.85rem] text-[var(--text-muted)]">
        TODO (client + legal counsel): this is placeholder boilerplate and not legal advice. Review
        against applicable Pakistani data-protection law before publishing.
      </p>
    </LegalLayout>
  );
}

export function Terms() {
  useDocumentTitle("Terms · The Collection");
  return (
    <LegalLayout eyebrow="The Collection" title="Terms" updated="TODO: last updated (to be finalised)">
      <p>
        These terms govern your use of this website. By browsing it, you accept them.
      </p>
      <Section heading="The collection & availability">
        <p>
          Motorcars shown here are presented for information. Availability, specification, and status
          can change without notice, and a listing is neither an offer nor a contract of sale.
        </p>
      </Section>
      <Section heading="Guide prices">
        <p>
          Prices shown are guide prices, in Pakistani Rupees, and are indicative only. Final terms are
          agreed privately and in writing, as part of a viewing and acquisition.
        </p>
      </Section>
      <Section heading="Enquiries & viewings">
        <p>
          Viewings are strictly by appointment. Making an enquiry places you under no obligation, and
          places us under none until terms are agreed in writing.
        </p>
      </Section>
      <Section heading="Intellectual property">
        <p>
          The name, wordmark, text, and imagery on this site belong to The Collection or its licensors
          and may not be reproduced without permission.
        </p>
      </Section>
      <p className="text-[0.85rem] text-[var(--text-muted)]">
        TODO (client + legal counsel): placeholder boilerplate, not legal advice. Review before
        publishing.
      </p>
    </LegalLayout>
  );
}
