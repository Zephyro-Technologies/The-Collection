import { useState } from "react";
import { Eye, EyeOff, RefreshCw, Copy, Check } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { MIN_PASSWORD_LENGTH, generatePassword } from "./password";

interface Props {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  /** Shown under the field when the operator has typed something too short. */
  showHint?: boolean;
}

/**
 * The password field used for both provisioning and resetting a partner login.
 *
 * The Collection sets the password ON BEHALF of the partner and then has to
 * communicate it, so this deliberately supports reading it back: generate,
 * reveal, copy. That is a different trade-off from a normal password input —
 * it is correct here precisely because the operator is not the account holder.
 */
export function PasswordField({ value, onChange, label = "Password", showHint = true }: Props) {
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked (insecure context) — the reveal toggle is the fallback */
    }
  };

  const tooShort = value.length > 0 && value.length < MIN_PASSWORD_LENGTH;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor="partner-password">{label}</Label>
      <div className="flex items-center gap-1.5">
        <Input
          id="partner-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={reveal ? "text" : "password"}
          autoComplete="new-password"
          spellCheck={false}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          className="font-mono"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          title={reveal ? "Hide" : "Reveal"}
          onClick={() => setReveal((r) => !r)}
        >
          {reveal ? <EyeOff size={15} /> : <Eye size={15} />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Generate a strong password"
          onClick={() => { onChange(generatePassword()); setReveal(true); }}
        >
          <RefreshCw size={15} />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Copy"
          disabled={!value}
          onClick={copy}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </Button>
      </div>
      {showHint && (
        <p className={tooShort ? "text-signal-red" : "text-ink-40"} style={{ fontSize: "0.75rem" }}>
          {tooShort
            ? `Too short — at least ${MIN_PASSWORD_LENGTH} characters.`
            : "Copy this before saving — it is not shown again."}
        </p>
      )}
    </div>
  );
}
