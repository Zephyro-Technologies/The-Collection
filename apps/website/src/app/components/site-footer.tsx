import { Link } from "react-router";
import { Wordmark } from "./wordmark";
import { WhatsAppIcon } from "./whatsapp-icon";
import { InstagramIcon, FacebookIcon, YouTubeIcon } from "./social-icons";
import {
  EMAIL,
  EMAIL_HREF,
  PHONE_DISPLAY,
  PHONE_HREF,
  generalWhatsapp,
  INSTAGRAM_URL,
  FACEBOOK_URL,
  YOUTUBE_URL,
} from "../../config/contact";

const CHANNELS = [
  { label: "Instagram", url: INSTAGRAM_URL, Icon: InstagramIcon },
  { label: "Facebook", url: FACEBOOK_URL, Icon: FacebookIcon },
  { label: "WhatsApp", url: generalWhatsapp(), Icon: WhatsAppIcon },
  { label: "YouTube", url: YOUTUBE_URL, Icon: YouTubeIcon },
];

export function SiteFooter() {
  return (
    <footer className="bg-[var(--surface-page)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
        <div className="grid gap-14 border-b border-cream/12 py-16 md:grid-cols-[1.2fr_1fr_1fr] md:py-20">
          <div>
            <Wordmark size="foot" tone="light" />
            <p
              className="mt-6 max-w-xs text-cream/62"
              style={{ lineHeight: 1.7, fontSize: "0.92rem" }}
            >
              A private dealership for high-value motorcars in Islamabad. A considered selection,
              acquired, never simply bought.
            </p>
          </div>

          <div>
            <div className="text-[0.66rem] uppercase tracking-[0.16em] text-cream/50">
              Visit
            </div>
            <div className="mt-5 space-y-1 text-cream/82" style={{ lineHeight: 1.7 }}>
              <div>F-6/3, Hill Road</div>
              <div>Islamabad, Pakistan</div>
            </div>
            <div className="mt-6 text-[0.66rem] uppercase tracking-[0.16em] text-[var(--accent-soft)]">
              By appointment only
            </div>
          </div>

          <div>
            <div className="text-[0.66rem] uppercase tracking-[0.16em] text-cream/50">
              Enquiries
            </div>
            <div className="mt-5 space-y-2 text-cream/82" style={{ lineHeight: 1.7 }}>
              <div>
                <a href={EMAIL_HREF} className="transition-colors hover:text-[var(--text-primary)]">{EMAIL}</a>
              </div>
              <div>
                <a href={PHONE_HREF} className="tabular-nums transition-colors hover:text-[var(--text-primary)]">{PHONE_DISPLAY}</a>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2.5">
              {CHANNELS.map(({ label, url, Icon }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[0.82rem] text-cream/70 transition-colors hover:text-[var(--text-primary)]"
                >
                  <Icon className="size-4" />
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 py-8 text-[0.74rem] text-cream/45 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} The Collection. All rights reserved.</span>
          <div className="flex gap-6">
            <Link to="/collection" className="transition-colors hover:text-[var(--text-primary)]">The Collection</Link>
            <Link to="/privacy" className="transition-colors hover:text-[var(--text-primary)]">Privacy</Link>
            <Link to="/terms" className="transition-colors hover:text-[var(--text-primary)]">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
