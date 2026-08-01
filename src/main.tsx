import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Native (Capacitor) shell detection: adds safe-area padding + native tweaks.
const isNative =
  typeof window !== "undefined" &&
  ((window as any).Capacitor?.isNativePlatform?.() ??
    /\bcapacitor:\/\//.test(window.location.protocol));

if (isNative) {
  document.documentElement.classList.add("native-app");
  import("@capacitor/status-bar")
    .then(({ StatusBar, Style }) => {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    })
    .catch(() => {});
  import("@capacitor/splash-screen")
    .then(({ SplashScreen }) => SplashScreen.hide().catch(() => {}))
    .catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
