import type { NextApiRequest, NextApiResponse, NextConfig } from "next";
import sharp from "sharp";
import Jimp from "jimp";
import imagemin, { Result } from "imagemin";
import imageminMozjpeg from "imagemin-mozjpeg";
import imageminPngquant from "imagemin-pngquant";
import imageminWebp from "imagemin-webp";

import { perf } from "../../../shared/perf";
import formidable, { File } from "formidable";

// !REFACTOR
type Config = {
  quality: number;
  webp: boolean;
  compressor: "sharp" | "imagemin" | "jimp" | "gm" | "compression";
};

type Files = {
  id: string;
  file: File | null;
  config: Config;
}[];

const defaultConfig: Config = {
  quality: 75,
  webp: false,
  compressor: "sharp",
};
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
          config: defaultConfig,
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
            config: defaultConfig,
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
            config: defaultConfig,
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

const resolveCompress = (
  resolve: Function,
  { id, filename }: { id: string; filename: string },
  buf: Buffer
) =>
  resolve({
    id,
    fileName: filename
      ? filename.replace(/(.png)|(.jpg)|(.jpeg)/g, ".webp")
      : "file.webp",
    data: buf,
    size: buf.length,
  });

async function compress(
  id: string,
  file: File,
  config: Config
): Promise<Compressed> {
  return new Promise(async (resolve, reject) => {
    if (!config)
      config = {
        quality: 75,
        webp: false,
        compressor: "sharp",
      };

    const filename = file.originalFilename || "";
    const originData = { id, filename };
    if (config.compressor === "sharp") {
      resolveCompress(resolve, originData, await useSharp(file, config));
    } else if (config.compressor === "jimp") {
      resolveCompress(resolve, originData, await useJimp(file, config));
    } else if (config.compressor === "imagemin") {
      resolveCompress(resolve, originData, await useImagemin(file, config));
    }
  });
}

interface Compressor {
  (img: File, config: Config): Promise<Buffer>;
}

const useSharp: Compressor = async (img: File, config: Config) => {
  const _s = sharp(img.filepath);
  if (config.webp) {
    return await new Promise((resolve, reject) => {
      _s.webp({ quality: config.quality, force: true }).toBuffer(
        (err, buffer, info) => {
          if (err) return reject(err);
          return resolve(buffer);
        }
      );
    });
  }
  if (img.mimetype === "image/png") {
    return await new Promise((resolve, reject) => {
      _s.png({
        quality: config.quality,
        compressionLevel: 9,
        force: true,
      }).toBuffer((err, buffer, info) => {
        if (err) return reject(err);
        return resolve(buffer);
      });
    });
    // } else if (img.mimetype === "image/jpg" || img.mimetype === "image/jpeg") {
  } else {
    return await new Promise((resolve, reject) => {
      _s.jpeg({ quality: config.quality, force: true }).toBuffer(
        (err, buffer, info) => {
          if (err) return reject(err);
          return resolve(buffer);
        }
      );
    });
  }
};

const useJimp: Compressor = async (img: File, config: Config) => {
  return (await Jimp.read(img.filepath))
    .quality(config.quality)
    .getBufferAsync(img.mimetype as string);
};

const useImagemin: Compressor = async (img: File, config: Config) => {
  const getBuffer = (ret: Result[]) => ret[0].data;
  if (config.webp) {
    return getBuffer(
      await imagemin([img.filepath], {
        destination: "build/images",
        plugins: [imageminWebp({ quality: config.quality })],
      })
    );
  }

  return getBuffer(
    await imagemin([img.filepath], {
      destination: "build/images",
      plugins: [
        imageminMozjpeg({
          quality: config.quality,
        }),
        imageminPngquant({
          quality: [config.quality / 100, config.quality / 100],
        }),
      ],
    })
  );
};
