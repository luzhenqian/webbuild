import type { NextPage } from "next";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { FileUploader } from "react-drag-drop-files";
import throttle from "lodash/throttle";
import { nanoid } from "nanoid";
import JSZip from "jszip";
import { saveAs } from "file-saver";
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
})[];

const fileTypes = ["JPG", "JPEG", "PNG"];

const toBase64 = (arr: Buffer) => {
  return Buffer.from(arr).toString("base64");
};

const Transform: NextPage = () => {
  const [files, setFiles] = useState<Files>([]);

  const handleChange = (newFiles: Files) => {
    newFiles = Array.from(newFiles) as Files;

    newFiles.forEach((file) => {
      file.id = nanoid();
      file.src = URL.createObjectURL(file);
      file.config = {
        webp: false,
        quality: 80,
        compressor: "sharp",
      };
    });

    compress(newFiles).then((data) => {
      setFiles((files) => fillCompressed(files, data));
    });

    setFiles([...files, ...newFiles]);
  };

  useEffect(() => {
    return () => files.forEach((file) => URL.revokeObjectURL(file.src));
  }, [files]);

  const clearAll = () => setFiles([]);
  const ratio = (beforeSize: number, afterSize: number) =>
    ~Math.floor(100 - (afterSize / beforeSize) * 100);
  const beforeSize = Math.floor(
    files.reduce((acc, cur) => acc + cur.size, 0) / 1000
  );
  const afterSize = Math.floor(
    files.reduce((acc, cur) => acc + (cur?.compressed?.size || 0), 0) / 1000
  );
  const totalReduced = ~Math.floor(100 - (afterSize / beforeSize) * 100);
  return (
    <div className="w-[1200px] mx-auto py-4">
      <header className="flex flex-col w-full gap-2 mb-4">
        <FileUploader
          classes="!flex w-full !max-w-full"
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
            <div className="flex gap-4 items-center font-bold text-gray-700 text-center border-b py-1">
              <div className="w-20">view</div>
              <div className="w-60">name &amp; size</div>
              <div className="flex-1 ">ratio</div>
              <div className="w-40 ">quality</div>
              <div className="w-32 ">convert to webp</div>
              <div className="w-32 ">compressor</div>
              <div className="w-24">action</div>
            </div>
          ) : null}
          {files.map((file) => (
            <div key={file.name} className="flex gap-4 items-center">
              <img
                src={file.src}
                alt={file.name}
                className="w-20 h-12 rounded-sm object-contain"
              />

              {file.compressed ? (
                <>
                  <div className="flex flex-col justify-between w-60">
                    <div
                      className=" overflow-hidden text-ellipsis whitespace-nowrap font-semibold"
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

                  <div className="flex-1 text-center text-xl font-bold text-green-600">
                    {ratio(file.size, file.compressed.size)}%
                  </div>

                  <div className="flex items-center gap-1 w-40">
                    <input
                      type={"range"}
                      min={1}
                      max={100}
                      defaultValue={file.config.quality}
                      onMouseUp={throttle((evt) => {
                        if (evt.button === 0) {
                          file.config.quality = evt.target.valueAsNumber;
                          compress([file]).then((data) => {
                            setFiles((files) => fillCompressed(files, data));
                          });
                        }
                      }, 2_000)}
                    />
                    <span>{file.config.quality}</span>
                  </div>

                  <div className="flex items-center gap-1 w-32 justify-center">
                    <input
                      type={"checkbox"}
                      onChange={throttle((evt) => {
                        file.config.webp = evt.target.checked;
                        compress([file]).then((data) => {
                          setFiles((files) => fillCompressed(files, data));
                        });
                      }, 5_00)}
                    />
                  </div>

                  <div className="flex items-center gap-1 w-32 justify-center">
                    <select>
                      <option>sharp</option>
                      <option disabled>jimp</option>
                      <option disabled>imagemin</option>
                    </select>
                  </div>

                  <div className="w-24">
                    <Button className="w-full !p-1">
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

        {files.length > 0 && (
          <div className="flex items-center gap-4 justify-end mt-4 text-lg font-semibold">
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
        )}
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
