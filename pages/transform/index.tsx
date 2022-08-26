import type { NextPage } from "next";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import Monaco from "@monaco-editor/react";
import {
  langAlias,
  OriginLang,
  languageConfig,
  languages,
} from "../../shared/config";

const defLang = languages[0];
const TsToJs: NextPage = () => {
  const editorRef = useRef<any>(null);
  const [outputCode, setOutputCode] = useState("");
  const [defaultCode, setDefaultCode] = useState("");
  const [time, setTime] = useState(0);
  const [originLang, setOriginLang] = useState(defLang);
  const [targetLang, setTargetLang] = useState<OriginLang>(
    languageConfig[defLang].targets[0].lang as OriginLang
  );
  const [compiler, setCompiler] = useState(
    languageConfig[defLang].targets[0].compilers[0]
  );
  useEffect(() => {
    import(`../../shared/default-codes/lru.${originLang}.txt`).then((res) => {
      setDefaultCode(res.default);
    });
  }, [originLang]);

  function handleEditorDidMount(editor: any) {
    editorRef.current = editor;
  }
  return (
    <div>
      <header className="flex items-start content-start p-1 flex-wrap md:items-center gap-2 h-[80px] md:h-[40px] md:px-2">
        <select
          className="border border-gray-400 py-1 px-2 rounded-sm outline-none"
          value={originLang}
          onChange={(e) => {
            setOriginLang(e.target.value as OriginLang);
            setTargetLang(
              languageConfig[e.target.value as OriginLang].targets[0]
                .lang as OriginLang
            );
          }}
        >
          {Object.keys(languageConfig).map((lang) => (
            <option key={lang}>{lang}</option>
          ))}
        </select>
        <select
          className="border border-gray-400 py-1 px-2 rounded-sm outline-none"
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value as OriginLang)}
        >
          {languageConfig[originLang].targets.map(({ lang }) => (
            <option key={lang}>{lang}</option>
          ))}
        </select>
        <select
          className="border border-gray-400 py-1 px-2 rounded-sm outline-none"
          value={compiler}
          onChange={(e) => setCompiler(e.target.value)}
        >
          {languageConfig[originLang].targets
            .find(({ lang }) => lang === targetLang)
            ?.compilers.map((compiler) => (
              <option key={compiler}>{compiler}</option>
            ))}
        </select>
        <button
          type="button"
          className="border border-gray-400 py-1 px-2 rounded-sm"
          onClick={() =>
            axios({
              url: `/api/transform/${originLang}/${targetLang}`,
              method: "POST",
              data: { code: editorRef.current?.getValue(), compiler },
            }).then((res) => {
              setOutputCode(res.data.code);
              setTime(res.data.time);
            })
          }
        >
          transform
        </button>

        {outputCode !== "" ? (
          <div>consume time: {Math.floor(time)}ms</div>
        ) : null}
      </header>

      <main className="flex flex-col h-[calc(100vh-80px)] md:flex-row md:h-[calc(100vh-40px)]">
        <div className="h-1/2 w-full md:w-1/2 md:h-full">
          <Monaco
            value={defaultCode}
            language={langAlias[originLang]}
            onMount={handleEditorDidMount}
          />
        </div>
        <div className="h-1/2 w-full md:w-1/2 md:h-full">
          <Monaco value={outputCode} language={langAlias[targetLang]} />
        </div>
      </main>
    </div>
  );
};

export default TsToJs;
