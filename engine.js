let urlArray = [];
let activeLayout = null;
let urls = document.currentScript.dataset.css;
if (urls)
  urlArray = [...urls.matchAll(/\[([^\]]+)\]/g)].map(match => match[1]);
let isSeperationArchitecture;
if (!document.currentScript.dataset.sepration || document.currentScript.dataset.sepration == "false")
  isSeperationArchitecture = false;
else if (document.currentScript.dataset.sepration && document.currentScript.dataset.sepration == "true")
  isSeperationArchitecture = getCurrentDevice() == null ? false : true;
const specialVarsMapIndex = new Map();
const specialVarsMap = [];
function removePseudoClasses(selector) {
  return selector.replace(/:{1,2}[a-zA-Z-]+/g, '');
}
function addSpecialVar(obj) {
  const index = specialVarsMapIndex.get(obj.varName);
  if (index !== undefined) {
    specialVarsMap[index] = obj;
    return;
  }
  specialVarsMapIndex.set(obj.varName, specialVarsMap.length);
  specialVarsMap.push(obj)
}
let updatingVars = false;
async function fetchAllExternalCSS(links) {
  let allCSS = '';
  for (const link of links) {
    try {
      const response = await fetch(link);
      if (!response.ok) throw new Error(`Failed to fetch ${link}`);
      const cssText = await response.text();
      allCSS += cssText + '\n';
    } catch (err) {
      console.error(err);
    }
  }
  return allCSS;
}
function setupSpecialVarsInternal() {
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        processRule(rule);
      }
    } catch { }
  }
}
async function setupSpecialVarsExternal() {
  let css = await fetchAllExternalCSS(urlArray);
  let stylesheet = new CSSStyleSheet();
  stylesheet.replaceSync(css);
  for (const rule of stylesheet.cssRules) {
    processRule(rule);
  }
}
function processRule(rule) {
  if (rule.type === CSSRule.STYLE_RULE && !rule.selectorText.includes(":root")) {
    const css = rule.style.cssText;
    if (rule.selectorText == "title") {
      titleRule = rule;
    }
    css.split(";").forEach(decl => {
      const [prop, val] = decl.split(":");
      if (!prop || !val) return;
      extractVarsFromValue(val, rule.selectorText);
    });
  }
  else if (rule.type === CSSRule.KEYFRAMES_RULE) {
    for (const kf of rule.cssRules) {
      if (kf.type === CSSRule.KEYFRAME_RULE && kf.style) {
        for (let i = 0; i < kf.style.length; i++) {
          const value = kf.style.getPropertyValue(kf.style[i]);
          extractVarsFromValue(value);
        }
      }
    }
  }
  else if (rule.cssRules && rule.cssRules.length) {
    for (const subRule of rule.cssRules) {
      processRule(subRule);
    }
  }
}
function extractVarsFromValueNonFallBack(value, selector) {
  if (!value) return;
  let match;
  const regex = /var\(\s*(---[^\s,()]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*))?\)/g;
  while ((match = regex.exec(value)) !== null) {
    const varName = match[1];
    const body = varName.slice(3);
    const idx = body.lastIndexOf("--");
    if (idx === -1) continue;
    const elementName = body.slice(0, idx);
    const property = body.slice(idx + 2);
    specialVarsMap.push({ varName, elementName, property, selector });
  }
}
function extractVarCalls(value) {
  const results = [];
  let pos = 0;
  while (true) {
    const start = value.indexOf("var(", pos);
    if (start === -1) break;
    let i = start + 4;
    let depth = 1;
    for (; i < value.length; i++) {
      if (value[i] === "(") depth++;
      else if (value[i] === ")") {
        depth--;
        if (depth === 0) break;
      }
    }
    const inside = value.slice(start + 4, i); 
    let comma = -1;
    let d = 0;
    for (let k = 0; k < inside.length; k++) {
      const ch = inside[k];
      if (ch === "(") d++;
      else if (ch === ")") d--;
      else if (ch === "," && d === 0) {
        comma = k;
        break;
      }
    }
    const varName = (comma === -1 ? inside : inside.slice(0, comma)).trim();
    const fallback = (comma === -1 ? null : inside.slice(comma + 1).trim());
    results.push({ varName, fallback });
    pos = i + 1;
  }
  return results;
}
function extractVarsFromValue(value, selector) {
  if (!value) return;
  let varsResult = extractVarCalls(value);
  for (varR of varsResult) {
    const fallback = varR.fallback;
    const varName = varR.varName;
    const body = varName.slice(3);
    const idx = body.indexOf("--");
    if (idx === -1) continue;
    const elementName = body.slice(0, idx);
    const property = body.slice(idx + 2);
    addSpecialVar({ varName, elementName, property, selector, fallback })
  }
}
function updateVariables() {
  if (updatingVars) return;
  updatingVars = true;
  if (isSeperationArchitecture) {
    for (const entry of specialVarsMap) {
      let rEl = resolveElement(entry.elementName, true);
      if (!rEl && document.body.classList.contains(entry.elementName))
        rEl = document.body;
      else if (!rEl) {
        continue;
      }
      if (!rEl && entry.fallback) {
        const regex = /var\(\s*(---[a-zA-Z0-9_-]+)\s*(?:,[^)]+)?\)/g;
        const result = [...entry.fallback.matchAll(regex)].map(m => m[1]);
        for (let index = 0; index < result.length; index++) {
          const variable = result[index];
          const body = variable.slice(3);
          const idx = body.lastIndexOf("--");
          if (idx === -1) continue;
          const elementName = body.slice(0, idx);
          const property = body.slice(idx + 2);
          let selector = entry.selector;
          let varName = variable;
          let elem = resolveElement(elementName, true)
          if (!elem && document.body.classList.contains(elementName))
            elem = document.body
          else if (!elem)
            elem = resolveElement(elementName)
          const rElemVal = resolveComputedValue(elem, property);
          if (!elem) continue;
          if (rElemVal != null) document.documentElement.style.setProperty(variable, rElemVal);
          addSpecialVar({ varName, elementName, property, selector })
        }
        continue;
      }
      const rVal = resolveComputedValue(rEl, entry.property);
      if (entry._last === rVal) continue;
      if (rVal != null) {
        document.documentElement.style.setProperty(entry.varName, rVal);
        entry._last = rVal;
      }
    }
  }
  else {
    for (const entry of specialVarsMap) {
      let rEl = resolveElement(entry.elementName);
      if (!rEl && entry.fallback) {
        const regex = /var\(\s*(---[a-zA-Z0-9_-]+)\s*(?:,[^)]+)?\)/g;
        const result = [...entry.fallback.matchAll(regex)].map(m => m[1]);
        for (let index = 0; index < result.length; index++) {
          const variable = result[index];
          const body = variable.slice(3);
          const idx = body.lastIndexOf("--");
          if (idx === -1) continue;
          const elementName = body.slice(0, idx);
          const property = body.slice(idx + 2);
          let selector = entry.selector;
          let varName = variable;
          const elem = resolveElement(elementName)
          const rElemVal = resolveComputedValue(elem, property);
          if (!elem) continue;
          if (rElemVal != null) document.documentElement.style.setProperty(variable, rElemVal);
          document.documentElement.style.setProperty(varName, rElemVal);
          addSpecialVar({ varName, elementName, property, selector })
        }
        continue;
      }
      const rVal = resolveComputedValue(rEl, entry.property);
      if (!rEl) continue;
      if (rVal != null) document.documentElement.style.setProperty(entry.varName, rVal);
    }
  }
  updatingVars = false;
}
function resolveElement(name, currentDeviceSelector = false) {
  if (!name) return null; let firstElMode = "class";
  if (name.startsWith("___")) { firstElMode = "tag"; name = name.slice(3); }
  else if (name.startsWith("____")) { firstElMode = "id"; name = name.slice(4); }
  const parts = []; let current = "";
  let mode = null;
  for (let i = 0; i < name.length;) {
    if (name.startsWith("_____", i)) {
      if (current)
        parts.push({ mode, value: current });
      mode = "id";
      current = "";
      i += 5;
    }
    else if (name.startsWith("____", i)) {
      if (current)
        parts.push({ mode, value: current });
      mode = "tag";
      current = "";
      i += 4;
    }
    else if (name.startsWith("___", i)) {
      if (current)
        parts.push({ mode, value: current });
      mode = "class";
      current = "";
      i += 3;
    }
    else { current += name[i++]; }
  } if (current)
    parts.push({ mode, value: current });
  if (!parts.length)
    return null;
  const first = parts.shift();
  let el;
  if (!currentDeviceSelector) {
    switch (firstElMode) {
      case "tag": el = document.querySelector(first.value);
        break;
      case "id":
        el = document.querySelector("#" + first.value);
        break;
      case "class": el = document.querySelector("." + first.value);
        break;
    }
  }
  else {
    let currentDevice = getCurrentDeviceElement();
    switch (firstElMode) {
      case "tag": el = currentDevice.querySelector(first.value);
        break; case "id": el = currentDevice.querySelector("#" + first.value);
        break; case "class": el = currentDevice.querySelector("." + first.value);
        break;
    }
  }
  if (!el)
    return null;
  for (const p of parts) {
    if (!p.value) continue;
    const selectors = {
      class: "." + p.value,
      tag: p.value,
      id: "#" + p.value
    };
    let sel;
    if (p.mode === "class") {
      sel = selectors.class;
    } else if (p.mode === "tag") {
      sel = selectors.tag;
    } else {
      sel = selectors.id;
    }
    let next = el.querySelector(sel);
    if (!next) {
      if (p.mode === "class") {
        next = el.querySelector(selectors.tag);
        if (!next) next = el.querySelector(selectors.id);
      } else if (p.mode === "tag") {
        next = el.querySelector(selectors.id);
      }
    }
    if (!next) return null;
    el = next;
  }
  return el;
}
function resolveComputedValue(el, prop) {
  if (!el) return null;
  switch (prop) {
    case "CRH": return el.getBoundingClientRect().height + "px";
    case "CRW": return el.getBoundingClientRect().width + "px";
    case "CRT": return el.getBoundingClientRect().top + "px";
    case "CRB": return el.getBoundingClientRect().bottom + "px";
    case "CRX": return el.getBoundingClientRect().x + "px";
    case "CRY": return el.getBoundingClientRect().y + "px";
    case "CRR": return el.getBoundingClientRect().right + "px";
    case "CRL": return el.getBoundingClientRect().left + "px";
    case "CH": return el.clientHeight + "px";
    case "CW": return el.clientWidth + "px";
    case "CT": return el.clientTop + "px";
    case "CL": return el.clientLeft + "px";
    case "SH": return el.scrollHeight + "px";
    case "SW": return el.scrollWidth + "px";
    case "ST": return el.scrollTop + "px";
    case "SL": return el.scrollLeft + "px";
    case "OH": return el.offsetHeight + "px";
    case "OW": return el.offsetWidth + "px";
    case "OT": return el.offsetTop + "px";
    case "OL": return el.offsetLeft + "px";
  }
  const cs = getComputedStyle(el);
  let val = cs.getPropertyValue(prop);
  if (val && val.trim()) return val.trim();
  const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  val = cs[camel];
  if (val && String(val).trim()) return String(val).trim();
  switch (prop) {
    case "padding": return cs.padding;
    case "margin": return cs.marginTop;
    case "border-width":
    case "border": return cs.borderTopWidth;
  }
  return null;
}
let scheduled = false;
function scheduleUpdateVariables() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    updateVariables();
  });
}
const observer = new MutationObserver(scheduleUpdateVariables);
let domResizeObserver = new ResizeObserver(scheduleUpdateVariables);
let setupDone = false;
async function initalSetup() {
  if (urlArray.length <= 0) {
    setupSpecialVarsInternal();
  } else {
    await setupSpecialVarsExternal();
  }
  
  setupDone = true;
}
function attachObservers() {
  observer.observe(target, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class"]
  });
  domResizeObserver.observe(document.documentElement);
  window.addEventListener("orientationchange", scheduleUpdateVariables);
  if (document.fonts) {
    document.fonts.ready.then(scheduleUpdateVariables);
    document.fonts.addEventListener("loadingdone", scheduleUpdateVariables);
  }
}
window.addEventListener("load", async () => {
  document.body.style.height = window.innerHeight + "px";
  await initalSetup();
  attachObservers();
});
window.addEventListener("load", () => {
  document.body.style.height = window.innerHeight + "px";
  if (urlArray.length <= 0) {
    setupSpecialVarsInternal();
  }
  else {
    setupSpecialVarsExternal().then(() => {
    });
  }
  observer.observe(target, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class"],
    attributeOldValue: true,
  });
  if (document.fonts) {
    document.fonts.ready.then(scheduleUpdateVariables);
  }
  domResizeObserver.observe(document.documentElement);
  window.addEventListener("orientationchange", scheduleUpdateVariables)
  if (document.fonts)
    document.fonts.addEventListener("loadingdone", scheduleUpdateVariables);
});
window.addEventListener("resize", () => {
  document.body.style.height = window.innerHeight + "px";
  scheduleUpdateVariables();
})
function getCurrentDevice() {
  let lays = document.querySelectorAll(".\\@page-layout")
  for (let index = 0; index < lays.length; index++) {
    const lay = lays[index];
    if (getComputedStyle(lay).display == "contents") {
      return lay.getAttribute("data-layout");
    }
  }
  return null;
}
function getCurrentDeviceElement() {
  let lays = document.querySelectorAll(".\\@page-layout")
  for (let index = 0; index < lays.length; index++) {
    const lay = lays[index];
    if (getComputedStyle(lay).display == "contents") {
      activeLayout = lay;
      return lay
    }
  }
  return null;
}
function parseCss(cssText) {
  const blockRegex = /([^{]+)\{([^}]+)\}/g;
  const propRegex = /([\w-]+)\s*:\s*([^;]+);?/g;
  let blockMatch;
  while ((blockMatch = blockRegex.exec(cssText)) !== null) {
    const selector = blockMatch[1].trim();
    const block = blockMatch[2].trim();
    let propMatch;
    while ((propMatch = propRegex.exec(block)) !== null) {
      const propValue = propMatch[2].trim();
      if (propValue.includes("var(---")) {
        let engineMatch;
        const regexPattern = /var\((---[^),\s]+)/g;
        while ((engineMatch = regexPattern.exec(propValue)) !== null) {
          console.log(engineMatch[1])
          const varName = engineMatch[1];
          const body = varName.slice(3);
          const idx = body.lastIndexOf("--");
          if (idx === -1) continue;
          const elementName = body.slice(0, idx);
          const property = body.slice(idx + 2);
          let metaData = document.documentElement.style.getPropertyValue("----meta");
          let currentDevice = getCurrentDevice();
          const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(`<---${escaped}>([^<]*)<>`);
          const match = metaData.match(regex);
          const propDevice = match ? match[1] : null;
          if (propDevice == currentDevice) {

            const el = resolveElement(elementName);
            if (!el) continue;
            const val = resolveComputedValue(el, property);
            if (val != null) document.documentElement.style.setProperty(varName, val);
          }
          const el = resolveElement(elementName);
          if (!el) continue;
          const val = resolveComputedValue(el, property);
          if (val != null) document.documentElement.style.setProperty(varName, val);
          specialVarsMap.push({ varName, elementName, property, selector });
        }
      }
    }
  }
}
const target = document.body;

window.addEventListener("load", async () => {
  document.body.style.height = window.innerHeight + "px";
  await initalSetup();
  attachObservers();
  
  scheduleUpdateVariables(); // Force initial update
});

// Consolidated resize handler with double-check
let resizeTimeout;
function handleResize() {
  document.body.style.height = window.innerHeight + "px";
  
  // Immediate update for instant feedback
  scheduleUpdateVariables();
  
  // Clear previous timeout
  clearTimeout(resizeTimeout);
  
  // Only do the "double-check" update after resizing stops
  resizeTimeout = setTimeout(() => {
    scheduleUpdateVariables();
  }, 100);
}

window.addEventListener("resize", handleResize);

// Catch fullscreen events (F11)
document.addEventListener("fullscreenchange", handleResize);
document.addEventListener("webkitfullscreenchange", handleResize);
document.addEventListener("mozfullscreenchange", handleResize);
document.addEventListener("MSFullscreenChange", handleResize);

// Visual viewport for additional coverage
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", handleResize);
}

// Also watch for window state changes
window.addEventListener("focus", () => {
  setTimeout(scheduleUpdateVariables, 100);
});