import type { NextPage } from "next";
import axios from "axios";
import { useRef, useState } from "react";
import { Langs, languageConfig, languages } from "../../shared/config";

const defLang = languages[0];
const TsToJs: NextPage = () => {
  const codeRef = useRef<any>(null);
  const [outputCode, setOutputCode] = useState("");
  const [time, setTime] = useState(0);
  const [originLang, setOriginLang] = useState(defLang);
  const [targetLang, setTargetLang] = useState(
    languageConfig[defLang].targetLangs[0]
  );
  const [compiler, setCompiler] = useState(
    languageConfig[defLang].compilers[0]
  );
  return (
    <div>
      <select
        value={originLang}
        onChange={(e) => {
          setOriginLang(e.target.value as Langs);
          setTargetLang(languageConfig[e.target.value as Langs].targetLangs[0]);
        }}
      >
        {Object.keys(languageConfig).map((lang) => (
          <option key={lang}>{lang}</option>
        ))}
      </select>
      <select
        value={targetLang}
        onChange={(e) => setTargetLang(e.target.value)}
      >
        {languageConfig[originLang].targetLangs.map((lang) => (
          <option key={lang}>{lang}</option>
        ))}
      </select>
      <select value={compiler} onChange={(e) => setCompiler(e.target.value)}>
        {languageConfig[originLang].compilers.map((compiler) => (
          <option key={compiler}>{compiler}</option>
        ))}
      </select>
      <textarea ref={codeRef} defaultValue={"const a : number = 1"} />
      <button
        type="button"
        onClick={() =>
          axios({
            url: `/api/transform/${originLang}/${targetLang}`,
            method: "POST",
            data: { code: codeRef.current.value, compiler },
          }).then((res) => {
            setOutputCode(res.data.code);
            setTime(res.data.time);
          })
        }
      >
        transform
      </button>
      <div>
        <div>{outputCode}</div>
        <div>{Math.floor(time)}sm</div>
      </div>
    </div>
  );
};

export default TsToJs;
