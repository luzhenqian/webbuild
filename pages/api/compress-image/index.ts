import type { NextApiRequest, NextApiResponse, NextConfig } from "next";
import sharp from "sharp";
import { perf } from "../../../shared/perf";
import formidable, { File } from "formidable";

type Files = {
  file: File | null;
  config: {
    quality: number;
    webp: boolean;
    compressor: "sharp" | "imagemin" | "jimp" | "gm";
  } | null;
}[];
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  /* Get files using formidable */
  const files = await new Promise<Files>((resolve, reject) => {
    const form = new formidable.IncomingForm();
    const files: Files = [];
    form.on("file", (field, file) => {
      const idx = Number(field.split("-")[1]);
      if (!files[idx]) {
        files[idx] = {
          file: null,
          config: null,
        };
      }
      files[idx].file = file;
    });
    form.on("field", (field, value) => {
      const idx = Number(field.split("-")[1]);
      if (!files[idx]) {
        files[idx] = {
          file: null,
          config: null,
        };
      }
      files[idx].config = JSON.parse(value);
    });
    form.on("end", () => {
      resolve(files);
    });
    form.on("error", (err) => resolve([]));
    form.parse(req, () => {});
  }).catch((e) => {
    console.log(e);
  });

  const ret = await Promise.all(
    (files as { file: File; config: any }[]).map(
      async ({ file, config }): Promise<any> =>
        await new Promise((resolve, reject) => {
          if (file.mimetype === "image/png") {
            sharp(file.filepath)
              .png({
                quality: config.quality,
                compressionLevel: 9,
                force: true,
              })
              .toBuffer((err, buffer, info) => {
                if (err) return reject(err);
                resolve({
                  fileName: file.originalFilename,
                  data: buffer,
                  size: buffer.length,
                });
              });
          } else if (
            file.mimetype === "image/jpg" ||
            file.mimetype === "image/jpeg"
          ) {
            sharp(file.filepath)
              .jpeg({ quality: config.quality, force: true })
              .toBuffer((err, buffer, info) => {
                if (err) return reject(err);
                resolve({
                  fileName: file.originalFilename,
                  data: buffer,
                  size: buffer.length,
                });
              });
          } else {
            reject("Unsupported file type");
          }
        })
    )
  );
  let transFn = null;
  // if (use === "sharp") {
  //   transFn = () => null;
  // } else {
  //   transFn = () => null;
  // }

  // const response = perf(transFn);
  res.status(200).json(ret);
}

/* Don't miss that! */
export const config: NextConfig = {
  api: {
    bodyParser: false,
  },
};
