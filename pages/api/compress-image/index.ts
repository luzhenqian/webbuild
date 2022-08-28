import type { NextApiRequest, NextApiResponse, NextConfig } from "next";
import sharp from "sharp";
import { perf } from "../../../shared/perf";
import formidable, { File } from "formidable";

// !REFACTOR
type FileConfig = {
  quality: number;
  webp: boolean;
  compressor: "sharp" | "imagemin" | "jimp" | "gm";
} | null;

type Files = {
  id: string;
  file: File | null;
  config: FileConfig;
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
          id: "",
          file: null,
          config: null,
        };
      }
      files[idx].file = file;
    });
    form.on("field", (field, value) => {
      if (/^id/.test(field)) {
        const idx = Number(field.split("-")[1]);
        if (!files[idx]) {
          files[idx] = {
            id: "",
            file: null,
            config: null,
          };
        }
        files[idx].id = value;
      }
      if (/^config/.test(field)) {
        const idx = Number(field.split("-")[1]);
        if (!files[idx]) {
          files[idx] = {
            id: "",
            file: null,
            config: null,
          };
        }
        files[idx].config = JSON.parse(value);
      }
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
    (files as { id: string; file: File; config: any }[]).map(
      async ({ id, file, config }): Promise<any> =>
        await compress(id, file, config)
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

// ! Don't miss that!
export const config: NextConfig = {
  api: {
    bodyParser: false,
  },
};

type Compressed = {
  id: string;
  fileName: string;
  data: Buffer;
  size: Number;
};

async function compress(
  id: string,
  file: File,
  config: FileConfig
): Promise<Compressed> {
  return new Promise((resolve, reject) => {
    if (!config)
      config = {
        quality: 80,
        webp: false,
        compressor: "sharp",
      };
    if (config.compressor === "sharp") {
      const _s = sharp(file.filepath);
      if (config.webp) {
        _s.webp({ quality: config.quality, force: true }).toBuffer(
          (err, buffer, info) => {
            if (err) return reject(err);
            const filename = file.originalFilename;
            resolve({
              id,
              fileName: filename
                ? filename.replace(/(.png)|(.jpg)|(.jpeg)/g, ".webp")
                : "file.webp",
              data: buffer,
              size: buffer.length,
            });
          }
        );
        return;
      }
      if (file.mimetype === "image/png") {
        _s.png({
          quality: config.quality,
          compressionLevel: 9,
          force: true,
        }).toBuffer((err, buffer, info) => {
          if (err) return reject(err);
          resolve({
            id,
            fileName: file.originalFilename
              ? file.originalFilename.replace(
                  /(\.png)|(\.jpg)|(\.jpeg)/,
                  ".png"
                )
              : "file.png",
            data: buffer,
            size: buffer.length,
          });
        });
      } else if (
        file.mimetype === "image/jpg" ||
        file.mimetype === "image/jpeg"
      ) {
        _s.jpeg({ quality: config.quality, force: true }).toBuffer(
          (err, buffer, info) => {
            if (err) return reject(err);
            resolve({
              id,
              fileName: file.originalFilename
                ? file.originalFilename.replace(
                    /(\.png)|(\.jpg)|(\.jpeg)/,
                    ".jpeg"
                  )
                : "file.jpeg",
              data: buffer,
              size: buffer.length,
            });
          }
        );
      }
    }
  });
}
