// The Collection — central contact configuration.
//
// Every phone number, email, WhatsApp deep-link and social URL on the website is
// derived from here, so the client's details live in ONE place. These are the
// client's real details, except the email (still a TODO — not yet provided).

import { formatPKR, type Car } from "../app/data/cars";

// Client's WhatsApp number — international format, digits only, no "+" or leading
// 0 (local 0300 0555007 → 92 300 0555007). Used for every wa.me enquiry link.
export const WHATSAPP_NUMBER = "923000555007";

// Client's phone number (same line as WhatsApp).
export const PHONE_DISPLAY = "+92 300 0555007";
export const PHONE_HREF = "tel:+923000555007";

// TODO: the client has not provided a public email yet — confirm/replace before launch.
export const EMAIL = "concierge@thecollection.pk";
export const EMAIL_HREF = `mailto:${EMAIL}`;

// Client's real social profiles.
export const INSTAGRAM_URL = "https://www.instagram.com/thecollectionisb/";
export const FACEBOOK_URL = "https://www.facebook.com/p/The-Collection-61578397241405/";
export const YOUTUBE_URL = "https://www.youtube.com/@thecollectionisb";

/** Build a wa.me deep-link with a pre-filled, url-encoded message. */
export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// --- Message templates (kept here so the brand voice lives in one place) -----

export const GENERAL_VIEWING_MESSAGE =
  "Hello, I'd like to enquire about arranging a private viewing with The Collection.";

/** A general "request a viewing" WhatsApp link (header, hero, footer, appointment). */
export const generalWhatsapp = () => whatsappLink(GENERAL_VIEWING_MESSAGE);

const carName = (car: Car) =>
  [car.year, car.make, car.model, car.variant].filter(Boolean).join(" ");

/** Enquiry about a specific, available car. */
export function carViewingMessage(car: Car): string {
  return `Hello, I'm interested in the ${carName(car)} (${formatPKR(
    car.price,
    car.currency,
  )}) listed on The Collection. Is it available to view?`;
}

/** Enquiry about something comparable — used for sold cars. */
export function similarCarMessage(car: Car): string {
  return `Hello, I'm interested in something similar to the ${carName(
    car,
  )}. Do you have comparable motorcars available?`;
}

/** Register interest in a specific car that is currently reserved. */
export function reservedCarMessage(car: Car): string {
  return `Hello, I understand the ${carName(
    car,
  )} is currently reserved. I'd like to register my interest and be notified if it becomes available.`;
}
