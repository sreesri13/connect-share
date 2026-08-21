/// <reference types="vite/client" />

declare global {
  interface Window {
    flutter_inappwebview?: {
      callHandler: (handlerName: string, ...args: any[]) => void;
    };
  }
}

export {};

