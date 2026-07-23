// Shared password rules for partner provisioning.
//
// MIN_PASSWORD_LENGTH must stay in step with the same constant in
// supabase/functions/admin-partners/index.ts — the function is the real
// enforcement, this is the copy that gives the operator a message before a
// round-trip. If you raise one, raise the other.

export const MIN_PASSWORD_LENGTH = 10;

// Ambiguous glyphs removed (0/O, 1/l/I): The Collection reads these out or
// writes them down for a partner, so a password that survives a phone call
// matters more here than the last few bits of entropy. 20 chars from this
// 58-character alphabet is ~117 bits — far past anything that needs defending.
const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * A strong, dictatable password. Uses crypto.getRandomValues (not Math.random)
 * and rejection-samples so every character is uniformly likely — a plain
 * modulo would bias the front of the alphabet.
 */
export function generatePassword(length = 20): string {
  const max = 256 - (256 % ALPHABET.length); // largest unbiased byte value
  const out: string[] = [];
  const buf = new Uint8Array(length * 2);
  while (out.length < length) {
    crypto.getRandomValues(buf);
    for (const byte of buf) {
      if (out.length === length) break;
      if (byte >= max) continue; // biased tail — resample
      out.push(ALPHABET[byte % ALPHABET.length]);
    }
  }
  return out.join("");
}
