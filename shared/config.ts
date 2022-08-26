export const languageConfig: LanguageCOnfig = {
  es6: {
    targets: [
      {
        lang: "es5",
        compilers: ["babel", "swc"],
      },
    ],
  },
  ts: {
    targets: [
      {
        lang: "es6",
        compilers: ["babel", "swc", "esbuild"],
      },
      {
        lang: "es5",
        compilers: ["babel", "swc"],
      },
    ],
  },
};

export const langAlias: { [key in OriginLang | TargetLang]: string } = {
  es6: "javascript",
  ts: "typescript",
  es5: "javascript",
};
export type TargetLang = "es6" | "es5";
export type OriginLang = "ts" | "es6";
type LanguageCOnfig = {
  [key in OriginLang]: {
    targets: {
      lang: string;
      compilers: string[];
    }[];
  };
};

export const languages: OriginLang[] = Object.keys(
  languageConfig
) as (keyof LanguageCOnfig)[];
