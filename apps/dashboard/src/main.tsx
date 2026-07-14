
  import { createRoot } from "react-dom/client";
  // Self-hosted fonts (bundled via @fontsource) — no runtime Google Fonts request.
  import "@fontsource-variable/inter";
  import "@fontsource-variable/fraunces/opsz.css";
  import "@fontsource-variable/fraunces/opsz-italic.css";
  import "@fontsource-variable/oswald";
  import "@fontsource/pinyon-script";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(<App />);
  