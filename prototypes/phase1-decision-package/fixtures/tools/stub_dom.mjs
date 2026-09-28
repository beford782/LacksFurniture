// Shared minimal DOM stub + variant executor for the prototype checks.
// Used by contract_check.mjs (positive contracts) and
// contract_negative_check.mjs (retained mutation evidence). No layout
// engine: geometry, painting and CSS resolution are out of scope by design.
//
// PROTOTYPE-ONLY TOOLING. Never imported by production code.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export class StubNode {
  constructor(tag, doc) {
    this.tagName = (tag || "").toUpperCase();
    this._doc = doc;
    this.children = [];
    this.parentNode = null;
    this._attrs = new Map();
    this._classes = new Set();
    this._text = "";
    this._innerHTML = null;
    this._listeners = new Map();
    this.style = Object.assign(Object.create({ setProperty() {} }), {});
    this.nodeType = 1;
    this._focusCalls = 0;
    this._scrollIntoViewCalls = 0;
  }
  get id() { return this._attrs.get("id") || ""; }
  set id(v) { this._attrs.set("id", v); this._doc._register(this); }
  get className() { return [...this._classes].join(" "); }
  set className(v) { this._classes = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get classList() {
    const self = this;
    return {
      add: (c) => self._classes.add(c),
      remove: (c) => self._classes.delete(c),
      contains: (c) => self._classes.has(c),
    };
  }
  setAttribute(k, v) {
    this._attrs.set(k, String(v));
    if (k === "id") this._doc._register(this);
    if (k === "class") this.className = v;
  }
  getAttribute(k) { return this._attrs.has(k) ? this._attrs.get(k) : null; }
  removeAttribute(k) { this._attrs.delete(k); }
  get hidden() { return this._attrs.has("hidden"); }
  set hidden(v) { if (v) this._attrs.set("hidden", ""); else this._attrs.delete("hidden"); }
  appendChild(n) {
    if (n && typeof n === "object") { n.parentNode = this; this.children.push(n); }
    return n;
  }
  get textContent() {
    let t = this._text || "";
    if (this._innerHTML) t += stripTags(this._innerHTML);
    for (const c of this.children) t += c.nodeType === 3 ? c.textContent : c.textContent;
    return t;
  }
  set textContent(v) { this._text = String(v); this.children = []; this._innerHTML = null; }
  get innerHTML() { return this._innerHTML || ""; }
  set innerHTML(v) {
    this._innerHTML = String(v) || null;
    this.children = []; this._text = "";
  }
  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(fn);
  }
  dispatch(type, eventProps) {
    const e = Object.assign({ type, target: this, currentTarget: this, preventDefault() {} }, eventProps || {});
    for (const fn of this._listeners.get(type) || []) fn(e);
    return e;
  }
  focus() { this._focusCalls++; this._doc.activeElement = this; this._doc.focusLog.push(this); }
  scrollIntoView() { this._scrollIntoViewCalls++; this._doc.scrollLog.push(this); }
  getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; }
  get offsetHeight() { return 0; }
  querySelectorAll(sel) { return queryAll(this, sel); }
  querySelector(sel) { return queryAll(this, sel)[0] || null; }
  // template-element support: the journey rail parses captured production
  // markup through template.content.querySelectorAll(".cls").
  get content() {
    const html = this._innerHTML || "";
    return {
      querySelectorAll(sel) {
        const cls = sel.replace(/^\./, "");
        const out = [];
        const re = new RegExp(`<[a-z]+[^>]*class="[^"]*${cls}[^"]*"[^>]*>([\\s\\S]*?)<\\/`, "g");
        let m;
        while ((m = re.exec(html))) out.push({ textContent: stripTags(m[1]) });
        return out;
      },
    };
  }
}

export function stripTags(html) { return String(html).replace(/<[^>]*>/g, ""); }

export function walk(node, fn) {
  fn(node);
  for (const c of node.children || []) if (c.nodeType === 1) walk(c, fn);
}

export function queryAll(rootNode, sel) {
  const out = [];
  // supports ".class", "tag", "[attr]" and comma lists — enough for the variants
  const alts = sel.split(",").map((s) => s.trim());
  walk(rootNode, (n) => {
    if (n === rootNode) return;
    for (const a of alts) {
      if (a.startsWith(".") && n._classes && n._classes.has(a.slice(1))) { out.push(n); return; }
      if (a.startsWith("[") && n._attrs && n._attrs.has(a.slice(1, -1))) { out.push(n); return; }
      if (/^[a-z][a-z0-9]*$/i.test(a) && n.tagName === a.toUpperCase()) { out.push(n); return; }
    }
  });
  return out;
}

export function makeDocument() {
  const registry = new Map();
  const doc = {
    _register(n) { if (n.id) registry.set(n.id, n); },
    activeElement: null,
    focusLog: [],
    scrollLog: [],
    title: "",
    documentElement: null,
    body: null,
    createElement(tag) { return new StubNode(tag, doc); },
    createTextNode(text) { return { nodeType: 3, textContent: String(text) }; },
    getElementById(id) {
      if (!registry.has(id)) {
        // auto-create (the variants' static skeleton elements): matches the
        // capture harness's recording-shim approach.
        const n = new StubNode("div", doc);
        n.setAttribute("id", id);
        registry.set(id, n);
      }
      return registry.get(id);
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
  };
  doc.documentElement = new StubNode("html", doc);
  doc.body = new StubNode("body", doc);
  return doc;
}

export function deepFreeze(obj) {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    Object.keys(obj).forEach((k) => deepFreeze(obj[k]));
  }
  return obj;
}

// Executes one variant script against one fixture.
//
// opts.mode: "reviewer" (default) or "evaluation" — passed through ctx.mode
//   exactly as the shared harness does.
// opts.search: the location.search string the variant sees (default "").
//
// ctx.L is deliberately STRICT here (returns null when the active
// language's value is missing — NO English fallback). The recommended
// candidates carry their own strict resolvers and must not depend on
// ctx.L's semantics; passing a strict one means any accidental dependence
// on the shared harness's en-fallback surfaces as a failure instead of
// being silently satisfied by this runner (the earlier runner passed a
// fallback resolver, which made its "no English fallback" checks weaker
// than they read — corrected in the focused pass).
export function runVariant(scriptPath, fixture, scenario, lang, opts = {}) {
  const src = readFileSync(scriptPath, "utf8");
  const doc = makeDocument();
  const win = {
    addEventListener() {}, removeEventListener() {},
    scrollByCalls: [],
    scrollBy(...a) { win.scrollByCalls.push(a); },
    location: { search: opts.search || "" },
  };
  const DF = { _cb: null, onReady(cb) { DF._cb = cb; } };
  const LStrict = (obj) => {
    if (obj == null) return null;
    if (typeof obj === "string") return obj;
    return obj[lang] != null && obj[lang] !== "" ? obj[lang] : null;
  };
  const noTimer = () => 0;
  new Function("window", "document", "DF", "setTimeout", "clearTimeout", "URLSearchParams", src)(
    win, doc, DF, noTimer, noTimer, URLSearchParams);
  if (!DF._cb) throw new Error("variant registered no DF.onReady callback");
  // Deep-frozen, matching the shared harness: an in-place mutation of engine
  // output throws instead of silently re-ordering it.
  DF._cb(deepFreeze(JSON.parse(JSON.stringify(fixture))), {
    scenario, lang, L: LStrict, mode: opts.mode || "reviewer",
  });
  return { doc, win };
}

export function loadFixture(fixturesDir, name) {
  return JSON.parse(readFileSync(join(fixturesDir, `scenario-${name}.json`), "utf8"));
}
