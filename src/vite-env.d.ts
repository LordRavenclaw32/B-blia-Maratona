/// <reference types="vite/client" />

declare module 'virtual:igrejas' {
  import type { ChurchConfig } from './lib/church';
  const igrejas: ChurchConfig[];
  export default igrejas;
}
