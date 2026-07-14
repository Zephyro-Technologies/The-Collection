
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  // Self-hosted fonts (bundled via @fontsource) — no runtime Google Fonts request.
  import "@fontsource-variable/inter";
  import "@fontsource-variable/fraunces/opsz.css";
  import "@fontsource-variable/fraunces/opsz-italic.css";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(<App />);
