export const languageConfig: LanguageCOnfig = {
  ts: {
    compilers: ["babel", "swc", "esbuild"],
    targetLangs: ["es6", "es5"],
  },
  es6: {
    compilers: ["babel", "swc", "esbuild"],
    targetLangs: ["es5"],
  },
};

export type Langs = "ts" | "es6";
type LanguageCOnfig = {
  [key in Langs]: {
    compilers: string[];
    targetLangs: string[];
  };
};

export const languages: Langs[] = Object.keys(
  languageConfig
) as (keyof LanguageCOnfig)[];
