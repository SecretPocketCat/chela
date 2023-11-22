import { atom } from "jotai";
import { AppConfig } from "../../src-tauri/bindings/AppConfig";

export const configAtom = atom<AppConfig>(
  // config is set at the very start
  undefined as unknown as AppConfig
);
