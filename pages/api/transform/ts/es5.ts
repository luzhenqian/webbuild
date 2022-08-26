import type { NextApiRequest, NextApiResponse } from "next";
import { transformSync as babelTransformSync } from "@babel/core";
import { transformSync as SWCTransformSync } from "@swc/core";

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
  } else {
    transFn = () =>
      babelTransformSync(code, {
        presets: ["@babel/preset-env", "@babel/preset-typescript"],
        filename: "file.ts",
      });
  }

  const response = perf(transFn as () => { code: string });
  res.status(200).json(response);
}
