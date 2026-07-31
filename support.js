"use strict";
(() => {
  const CORE_GLOBAL = "__dcRuntimeCore";
  const REACT_URL = "https://unpkg.com/react@18.3.1/umd/react.production.min.js";
  const REACT_SRI = "sha384-DGyLxAyjq0f9SPpVevD6IgztCFlnMF6oW/XQGmfe+IsZ8TqEiDrcHkMLKI6fiB/Z";
  const REACT_DOM_URL = "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js";
  const REACT_DOM_SRI = "sha384-gTGxhz21lVGYNMcdJOyq01Edg0jhn/c22nsx0kyqP0TxaV5WVdsSH1fSDUf5YJj1";

  function getCoreRuntime() {
    const core = window[CORE_GLOBAL];
    if (!core || typeof core.createRuntime !== "function" || typeof core.boot !== "function") {
      throw new Error("dc-runtime: support.runtime-core.js must load before support.js");
    }
    return core;
  }

  function hideRawTemplate() {
    const style = document.createElement("style");
    style.textContent = "x-dc{display:none!important}";
    document.head.appendChild(style);
  }

  function loadScript(src, integrity) {
    return new Promise((resolve2, reject) => {
      //! nosemgrep: create-script-element
      const script = document.createElement("script");
      script.src = src;
      script.integrity = integrity;
      script.crossOrigin = "anonymous";
      script.async = false;
      script.onload = () => resolve2();
      script.onerror = () => reject(new Error(`failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  function loadReactUmd() {
    const w = window;
    if (w.React && w.ReactDOM) return Promise.resolve();
    return Promise.all([
      loadScript(REACT_URL, REACT_SRI),
      loadScript(REACT_DOM_URL, REACT_DOM_SRI)
    ]).then(() => void 0);
  }

  function init() {
    const core = getCoreRuntime();
    const runtime = core.createRuntime(document);
    let rootName = "Root";

    const baseCss = document.createElement("style");
    baseCss.textContent = core.BASE_CSS;
    document.head.prepend(baseCss);

    const notifyHost = () => {
      if (window.parent === window) return;
      const r = runtime.registry.entries[rootName];
      try {
        window.parent.postMessage(
          {
            type: "__dc_booted",
            rootName,
            propsMeta: r && r.propsMeta || null,
            preview: r && r.preview || null
          },
          "*"
        );
      } catch {
      }
    };

    const api = {
      __dcUpdate: (name, kind, content, streaming) => {
        runtime.dcUpdate(name, kind, content, streaming);
        if (name === rootName && !streaming && kind === "props") notifyHost();
      },
      __dcSetProps: (name, overrides) => runtime.setProps(name, overrides),
      __dcRootName: () => rootName,
      __dcAnnotatedTemplate: (name) => runtime.annotatedTemplate(name),
      __dcTemplateSource: (name) => runtime.templateSource(name),
      __dcBoot: () => {
        rootName = core.boot(runtime, document) ?? rootName;
        notifyHost();
      },
      __dcRegistry: runtime.registry.entries,
      getDC: (name) => runtime.getDC(name),
      DCLogic: runtime.StreamableLogic,
      StreamableLogic: runtime.StreamableLogic
    };

    Object.assign(window, api);
    if (document.readyState !== "loading") api.__dcBoot();
    else document.addEventListener("DOMContentLoaded", () => api.__dcBoot());
  }

  hideRawTemplate();
  loadReactUmd().then(init).catch((err) => {
    console.error("[dc] failed to load React or boot:", err);
    throw err;
  });
})();
