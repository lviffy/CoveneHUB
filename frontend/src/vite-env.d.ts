/// <reference types="vite/client" />

declare module "next" {
  export type Metadata = Record<string, unknown>;
  export type Viewport = Record<string, unknown>;
}
