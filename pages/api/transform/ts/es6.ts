import type { NextApiRequest, NextApiResponse } from "next";
import { transformSync as babelTransformSync } from "@babel/core";
import { transformSync as SWCTransformSync } from "@swc/core";
import { transformSync as esbuildTransformSync } from "esbuild";

import { Response } from "../../../../shared/types";
import { perf } from "../../../../shared/perf";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  const { code, compiler = "babel" } = req.body;

  let transFn = null;
  if (compiler === "swc") {
    transFn = () =>
      SWCTransformSync(code, {
        jsc: {
          parser: {
            syntax: "typescript",
          },
          target: "es2022",
        },
      });
  } else if (compiler === "esbuild") {
    transFn = () =>
      esbuildTransformSync(code, {
        target: "es2022",
        loader: "ts",
      });
  } else {
    transFn = () =>
      babelTransformSync(code, {
        presets: ["@babel/preset-typescript"],
        filename: "file.ts",
      });
  }

  const response = perf(transFn as () => { code: string });
  res.status(200).json(response);
}
