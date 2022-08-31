import type { NextPage } from "next";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { FileUploader } from "react-drag-drop-files";
import throttle from "lodash/throttle";
import { nanoid } from "nanoid";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import "image-compare-viewer/dist/image-compare-viewer.min.css";
import { Button } from "../../components/Button";

type Compressed = {
  id: string;
  fileName: string;
  url: string;
  size: number;
};
type Files = (File & {
  config: {
    quality: number;
    webp: boolean;
    compressor: string;
  };
  id: string;
  src: string;
  compressed?: Compressed;
  loading: boolean;
  compare: boolean;
})[];

const fileTypes = ["JPG", "JPEG", "PNG"];
const defaultQuality = 75;
const toBase64 = (arr: Buffer) => {
  return Buffer.from(arr).toString("base64");
};
const compressor = [
  {
    name: "sharp",
    supportedWebp: true,
  },
  {
    name: "jimp",
    supportedWebp: false,
  },
  {
    name: "imagemin",
    supportedWebp: true,
  },
];

const Transform: NextPage = () => {
  const [files, setFiles] = useState<Files>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [beforeUrl, setBeforeUrl] = useState<string>("");
  const [afterUrl, setAfterUrl] = useState<string>("");

  const handleChange = (newFiles: Files) => {
    newFiles = Array.from(newFiles) as Files;

    newFiles.forEach((file) => {
      file.id = nanoid();
      file.src = URL.createObjectURL(file);
      file.loading = true;
      file.config = {
        webp: false,
        quality: defaultQuality,
        compressor: "sharp",
      };
      file.compare = false;
    });

    setLoading(true);
    compress(newFiles).then((data) => {
      setFiles((files) => fillCompressed(files, data));
      setLoading(false);
    });

    setFiles([...files, ...newFiles]);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && beforeUrl && afterUrl) {
      const el = document.querySelector(".image-compare");
      // @ts-ignore
      import("image-compare-viewer").then(({ default: ImageCompare }) => {
        new (ImageCompare as any)(el).mount();
      });
    }
  }, [beforeUrl, afterUrl]);

  const clearAll = () => setFiles([]);
  const ratio = (beforeSize: number, afterSize: number) =>
    ~Math.floor(100 - (afterSize / beforeSize) * 100);
  const beforeSize = Math.floor(
    files.reduce((acc, cur) => acc + cur.size, 0) / 1000
  );
  const afterSize = Math.floor(
    files.reduce((acc, cur) => acc + (cur?.compressed?.size || 0), 0) / 1000
  );

  const imageCompareRef = useRef<any>();

  const totalReduced = ~Math.floor(100 - (afterSize / beforeSize) * 100);
  return (
    <div className="w-full mx-auto p-4 md:py-4 md:w-[1200px]">
      <header className="flex flex-col w-full gap-2 mb-4">
        <FileUploader
          classes="!flex w-full !max-w-full !min-w-[0px]"
          handleChange={handleChange}
          name="file"
          types={fileTypes}
          multiple={true}
        />
        {files.length > 0 && (
          <div className="flex justify-end gap-2">
            <Button onClick={clearAll}>Clear All</Button>
            {files.length > 1 && (
              <Button onClick={() => downloadFiles(files)}>Download All</Button>
            )}
          </div>
        )}
      </header>

      <main>
        <div className="flex flex-col gap-2">
          {files.length > 0 ? (
            <div className="flex items-center gap-1 py-1 text-sm font-bold text-center text-gray-700 border-b md:gap-4 md:text-md">
              <div className="w-20">view</div>
              <div className="w-24 md:w-60">name &amp; size</div>
              <div className="flex-1 ">ratio</div>
              <div className="hidden md:block md:w-40 ">quality</div>
              <div className="hidden md:block md:w-32 ">convert to webp</div>
              <div className="hidden md:block md:w-32 ">compressor</div>
              <div className="w-16 md:w-24">action</div>
            </div>
          ) : null}

          <div
            className="fixed top-0 bottom-0 left-0 right-0 flex items-center justify-center w-screen h-screen border glass-bg"
            style={{ display: beforeUrl && afterUrl ? "flex" : "none" }}
            onClick={(evt) => {
              if (imageCompareRef.current) {
                const target = evt.target as HTMLElement;
                if (
                  (imageCompareRef.current as HTMLDivElement).contains(target)
                ) {
                  return;
                }
                setBeforeUrl("");
                setAfterUrl("");
              }
            }}
          >
            <div
              ref={imageCompareRef}
              className="image-compare w-[80%] max-h-full max-w-full flex"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={beforeUrl} alt="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={afterUrl} alt="" />
            </div>
          </div>

          {files.map((file, i) => (
            <div key={file.name} className="flex items-center gap-1 md:gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={file.src}
                alt={file.name}
                className="object-contain w-20 h-12 rounded-sm"
                onClick={() => {
                  if (!file.compressed) return;
                  setBeforeUrl(file.src);
                  setAfterUrl(file.compressed?.url || "");
                }}
              />

              {file.compressed && !file.loading ? (
                <>
                  <div className="flex flex-col justify-between w-24 text-xs md:text-md md:w-60">
                    <div
                      className="overflow-hidden font-semibold text-ellipsis whitespace-nowrap"
                      title={file.name}
                    >
                      {file.name}
                    </div>

                    <div>
                      {Math.floor(file.size / 1000)} kb
                      <span className="text-green-600">
                        &rarr; {Math.floor(file.compressed.size / 1000)} kb
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 text-xl font-bold text-center text-green-600">
                    {ratio(file.size, file.compressed.size)}%
                  </div>

                  <div className="items-center hidden gap-1 md:flex md:visible md:w-40">
                    <input
                      type={"range"}
                      min={1}
                      max={100}
                      defaultValue={file.config.quality}
                      onMouseUp={throttle((evt) => {
                        if (evt.button === 0) {
                          file.config.quality = evt.target.valueAsNumber;
                          setLoading(true);
                          compress([file]).then((data) => {
                            setFiles((files) => fillCompressed(files, data));
                            setLoading(false);
                          });
                        }
                      }, 2_000)}
                    />
                    <span>{file.config.quality}</span>
                  </div>

                  <div className="items-center justify-center hidden gap-1 md:flex md:visible md:w-32">
                    <input
                      type={"checkbox"}
                      disabled={
                        !compressor.find(
                          (c) => c.name === file.config.compressor
                        )?.supportedWebp
                      }
                      onChange={throttle((evt) => {
                        file.config.webp = evt.target.checked;
                        setLoading(true);
                        compress([file]).then((data) => {
                          setFiles((files) => fillCompressed(files, data));
                          setLoading(false);
                        });
                      }, 5_00)}
                    />
                  </div>

                  <div className="items-center justify-center hidden gap-1 md:flex md:visible md:w-32">
                    <select
                      onChange={(evt) => {
                        file.config.compressor = evt.target.value;
                        setLoading(true);
                        compress([file]).then((data) => {
                          setFiles((files) => fillCompressed(files, data));
                          setLoading(false);
                        });
                      }}
                    >
                      <option>sharp</option>
                      <option>jimp</option>
                      <option>imagemin</option>
                    </select>
                  </div>

                  <div className="w-16 md:w-24">
                    <Button className="w-full !md:p-1 !p-0 text-sm border-none">
                      <a
                        href={file.compressed.url}
                        download={file.compressed.fileName}
                      >
                        download
                      </a>
                    </Button>
                  </div>
                </>
              ) : (
                <div>loading......</div>
              )}
            </div>
          ))}
        </div>

        {files.length > 0 ? (
          !loading ? (
            <div className="flex flex-col items-center justify-end gap-4 mt-4 text-lg font-semibold md:flex-row">
              <div>
                <span>
                  {beforeSize}
                  kb
                </span>
                <span className="text-green-600">
                  {" "}
                  &rarr; {afterSize}
                  kb
                </span>
              </div>
              <div>Total Reduced: {totalReduced}% </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-4 mt-4 text-lg font-semibold">
              loading......
            </div>
          )
        ) : null}
      </main>
    </div>
  );
};

export default Transform;

async function compress(newFiles: Files): Promise<Compressed[]> {
  let formData = new FormData();
  newFiles.forEach((file, i) => {
    formData.append(`id-${i}`, file.id);
    formData.append(`file-${i}`, file);
    formData.append(`config-${i}`, JSON.stringify(file.config));
  });
  const response = await axios.post("/api/compress-image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return new Promise((resolve) =>
    resolve(
      (response.data as any[]).map(
        ({
          id,
          fileName,
          data,
          size,
        }: {
          id: string;
          fileName: string;
          data: any;
          size: number;
        }) => ({
          id,
          fileName,
          url: `data:image/png;base64,${toBase64(data.data)}`,
          size,
        })
      )
    )
  );
}

const fillCompressed = (files: Files, data: Compressed[]) => {
  const cloneFiles = [...files];

  cloneFiles.forEach((file) => {
    const item = data.find((d) => d.id === file.id);

    if (item) {
      file.compressed = item;
      file.loading = false;
    }
  });
  return cloneFiles;
};

const downloadFiles = async (files: Files) => {
  const zip = new JSZip();

  const img = zip.folder("webbuild.me-compress-image");
  await Promise.all(
    files.map(async (file): Promise<any> => {
      if (file.compressed) {
        const res = await fetch(file.compressed?.url);
        img?.file(file.compressed.fileName, res.blob(), { base64: true });
        return new Promise<any>((resolve, reject) => {
          resolve(null);
        });
      }
    })
  );

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, "webbuild.me-compress-image.zip");
};
