window.__ModuleLoader__.load({id:"dsh-conversation-split",factory:(require)=>{var module={exports:{}};var exports=module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// src/layout/tree.ts
var MIN_RATIO = 0.15;
var MAX_PANES = 8;
var leaf = (id, sessionId = null) => ({ kind: "leaf", id, sessionId });
var clampRatio = (ratio) => Math.min(1 - MIN_RATIO, Math.max(MIN_RATIO, ratio));
function split(axis, first, second, ratio = 0.5) {
  return { kind: "split", axis, ratio: clampRatio(ratio), first, second };
}
function leaves(node) {
  return node.kind === "leaf" ? [node] : [...leaves(node.first), ...leaves(node.second)];
}
var paneCount = (node) => leaves(node).length;
var findPane = (node, id) => leaves(node).find((l) => l.id === id);
var paneOfSession = (node, sessionId) => leaves(node).find((l) => l.sessionId === sessionId);
function pathOf(node, id, prefix = []) {
  if (node.kind === "leaf") return node.id === id ? prefix : void 0;
  return pathOf(node.first, id, [...prefix, 0]) ?? pathOf(node.second, id, [...prefix, 1]);
}
function nodeAt(node, path) {
  let cur = node;
  for (const step of path) {
    if (cur === void 0 || cur.kind !== "split") return void 0;
    cur = step === 0 ? cur.first : cur.second;
  }
  return cur;
}
function replaceAt(node, path, next) {
  if (path.length === 0) return next(node);
  if (node.kind !== "split") return node;
  const [head, ...rest] = path;
  return head === 0 ? { ...node, first: replaceAt(node.first, rest, next) } : { ...node, second: replaceAt(node.second, rest, next) };
}
function splitPane(root, target, side, fresh) {
  const path = pathOf(root, target);
  if (path === void 0 || paneCount(root) >= MAX_PANES) return void 0;
  const axis = side === "left" || side === "right" ? "row" : "column";
  const leads = side === "left" || side === "top";
  return replaceAt(root, path, (old) => leads ? split(axis, fresh, old) : split(axis, old, fresh));
}
function removePane(root, id) {
  const path = pathOf(root, id);
  if (path === void 0) return root;
  if (path.length === 0) return void 0;
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  return replaceAt(
    root,
    parentPath,
    (parent) => parent.kind === "split" ? index === 0 ? parent.second : parent.first : parent
  );
}
function assignSession(root, id, sessionId) {
  const path = pathOf(root, id);
  return path === void 0 ? root : replaceAt(root, path, (n) => n.kind === "leaf" ? { ...n, sessionId } : n);
}
function swapPanes(root, a, b) {
  const la = findPane(root, a);
  const lb = findPane(root, b);
  if (la === void 0 || lb === void 0 || a === b) return root;
  return assignSession(assignSession(root, a, lb.sessionId), b, la.sessionId);
}
function setRatio(root, path, ratio) {
  return replaceAt(root, path, (n) => n.kind === "split" ? { ...n, ratio: clampRatio(ratio) } : n);
}
function movePane(root, source, target, side) {
  if (source === target) return root;
  const moving = findPane(root, source);
  const without = removePane(root, source);
  if (moving === void 0 || without === void 0) return void 0;
  return splitPane(without, target, side, moving);
}
function place(layout, box, gap = 6) {
  if (layout.zoom !== null) {
    const pane = findPane(layout.root, layout.zoom);
    if (pane !== void 0) return { panes: [{ pane, rect: box }], dividers: [] };
  }
  const panes = [];
  const dividers = [];
  const walk = (node, rect, path) => {
    if (node.kind === "leaf") {
      panes.push({ pane: node, rect });
      return;
    }
    if (node.axis === "row") {
      const firstWidth = Math.round((rect.width - gap) * node.ratio);
      walk(node.first, { ...rect, width: firstWidth }, [...path, 0]);
      dividers.push({ path, axis: "row", rect: { left: rect.left + firstWidth, top: rect.top, width: gap, height: rect.height } });
      walk(node.second, { ...rect, left: rect.left + firstWidth + gap, width: rect.width - firstWidth - gap }, [...path, 1]);
    } else {
      const firstHeight = Math.round((rect.height - gap) * node.ratio);
      walk(node.first, { ...rect, height: firstHeight }, [...path, 0]);
      dividers.push({ path, axis: "column", rect: { left: rect.left, top: rect.top + firstHeight, width: rect.width, height: gap } });
      walk(node.second, { ...rect, top: rect.top + firstHeight + gap, height: rect.height - firstHeight - gap }, [...path, 1]);
    }
  };
  walk(layout.root, box, []);
  return { panes, dividers };
}
function neighbour(placed, from, direction) {
  const origin = placed.find((p) => p.pane.id === from);
  if (origin === void 0) return void 0;
  const cx = (r) => r.left + r.width / 2;
  const cy = (r) => r.top + r.height / 2;
  let best;
  for (const p of placed) {
    if (p.pane.id === from) continue;
    const dx = cx(p.rect) - cx(origin.rect);
    const dy = cy(p.rect) - cy(origin.rect);
    const ahead = direction === "left" ? -dx : direction === "right" ? dx : direction === "top" ? -dy : dy;
    if (ahead <= 0) continue;
    const score = ahead + Math.abs(direction === "left" || direction === "right" ? dy : dx) * 2;
    if (best === void 0 || score < best.score) best = { id: p.pane.id, score };
  }
  return best?.id;
}
function cycle(root, from, delta) {
  const ids = leaves(root).map((l) => l.id);
  const index = ids.indexOf(from);
  if (ids.length === 0) return from;
  return ids[(index + delta + ids.length) % ids.length] ?? from;
}
function isValidLayout(value) {
  if (typeof value !== "object" || value === null) return false;
  const v = value;
  const ids = /* @__PURE__ */ new Set();
  const validNode = (n) => {
    if (typeof n !== "object" || n === null) return false;
    const node = n;
    if (node.kind === "leaf") {
      if (typeof node.id !== "string" || ids.has(node.id)) return false;
      ids.add(node.id);
      return node.sessionId === null || typeof node.sessionId === "string";
    }
    if (node.kind !== "split") return false;
    return (node.axis === "row" || node.axis === "column") && typeof node.ratio === "number" && node.ratio > 0 && node.ratio < 1 && validNode(node.first) && validNode(node.second);
  };
  if (!validNode(v.root)) return false;
  if (typeof v.focus !== "string" || !ids.has(v.focus)) return false;
  return v.zoom === null || typeof v.zoom === "string" && ids.has(v.zoom);
}

// src/client/anchor.ts
var import_react = require("react");
function createAnchorStore() {
  let element = null;
  const listeners = /* @__PURE__ */ new Set();
  return {
    get: () => element,
    set(next) {
      if (next === element) return;
      element = next;
      for (const l of listeners) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
function SplitAnchor({ anchor }) {
  const ref = (0, import_react.useCallback)(
    (element) => {
      if (element !== null) anchor.set(element);
      else if (anchor.get()?.isConnected !== true) anchor.set(null);
    },
    [anchor]
  );
  return (0, import_react.createElement)("div", { ref, className: "dcs-anchor", "data-split-anchor": "" });
}

// src/client/locale.ts
var NS = "dsh-conversation-split";
var en = {
  "header.split": "Split conversation",
  "menu.splitRight": "Split right",
  "menu.splitDown": "Split down",
  "menu.openInSplit": "Open in split view",
  "pane.untitled": "New conversation",
  "pane.empty": "Pick a conversation for this pane",
  "pane.opening": "Opening\u2026",
  "pane.failed": "This conversation could not be opened.",
  "pane.retry": "Retry",
  "pane.maximize": "Maximize pane",
  "pane.restore": "Restore panes",
  "pane.close": "Close pane",
  "pane.sidebar": "Toggle right sidebar",
  "pane.splitRight": "Split right",
  "pane.splitDown": "Split down",
  "pane.newBeside": "New conversation here",
  "pane.switch": "Switch conversation",
  "pane.running": "Running",
  "picker.title": "Conversations",
  "picker.search": "Search conversations\u2026",
  "picker.new": "New conversation",
  "picker.none": "No conversations",
  "toast.paneLimit": "At most {max} panes can be open.",
  "toast.createFailed": "Could not create a conversation.",
  "shortcut.splitRight": "Split view: split right",
  "shortcut.splitDown": "Split view: split down",
  "shortcut.close": "Split view: close pane",
  "shortcut.zoom": "Split view: maximize / restore pane",
  "shortcut.next": "Split view: focus next pane",
  "shortcut.previous": "Split view: focus previous pane",
  "shortcut.left": "Split view: focus pane to the left",
  "shortcut.right": "Split view: focus pane to the right",
  "shortcut.up": "Split view: focus pane above",
  "shortcut.down": "Split view: focus pane below"
};
var zh = {
  "header.split": "\u5206\u5C4F\u5BF9\u8BDD",
  "menu.splitRight": "\u5411\u53F3\u5206\u5C4F",
  "menu.splitDown": "\u5411\u4E0B\u5206\u5C4F",
  "menu.openInSplit": "\u5728\u5206\u5C4F\u4E2D\u6253\u5F00",
  "pane.untitled": "\u65B0\u5BF9\u8BDD",
  "pane.empty": "\u4E3A\u8FD9\u4E2A\u9762\u677F\u9009\u62E9\u4E00\u4E2A\u5BF9\u8BDD",
  "pane.opening": "\u6B63\u5728\u6253\u5F00\u2026",
  "pane.failed": "\u65E0\u6CD5\u6253\u5F00\u8FD9\u4E2A\u5BF9\u8BDD\u3002",
  "pane.retry": "\u91CD\u8BD5",
  "pane.maximize": "\u6700\u5927\u5316\u9762\u677F",
  "pane.restore": "\u8FD8\u539F\u9762\u677F",
  "pane.close": "\u5173\u95ED\u9762\u677F",
  "pane.sidebar": "\u5207\u6362\u53F3\u4FA7\u8FB9\u680F",
  "pane.splitRight": "\u5411\u53F3\u5206\u5C4F",
  "pane.splitDown": "\u5411\u4E0B\u5206\u5C4F",
  "pane.newBeside": "\u5728\u6B64\u65B0\u5EFA\u5BF9\u8BDD",
  "pane.switch": "\u5207\u6362\u5BF9\u8BDD",
  "pane.running": "\u8FD0\u884C\u4E2D",
  "picker.title": "\u5BF9\u8BDD\u5217\u8868",
  "picker.search": "\u641C\u7D22\u5BF9\u8BDD\u2026",
  "picker.new": "\u65B0\u5EFA\u5BF9\u8BDD",
  "picker.none": "\u6682\u65E0\u5BF9\u8BDD",
  "toast.paneLimit": "\u6700\u591A\u53EA\u80FD\u6253\u5F00 {max} \u4E2A\u9762\u677F\u3002",
  "toast.createFailed": "\u65E0\u6CD5\u521B\u5EFA\u5BF9\u8BDD\u3002",
  "shortcut.splitRight": "\u5206\u5C4F\uFF1A\u5411\u53F3\u5206\u5C4F",
  "shortcut.splitDown": "\u5206\u5C4F\uFF1A\u5411\u4E0B\u5206\u5C4F",
  "shortcut.close": "\u5206\u5C4F\uFF1A\u5173\u95ED\u9762\u677F",
  "shortcut.zoom": "\u5206\u5C4F\uFF1A\u6700\u5927\u5316 / \u8FD8\u539F\u9762\u677F",
  "shortcut.next": "\u5206\u5C4F\uFF1A\u805A\u7126\u4E0B\u4E00\u4E2A\u9762\u677F",
  "shortcut.previous": "\u5206\u5C4F\uFF1A\u805A\u7126\u4E0A\u4E00\u4E2A\u9762\u677F",
  "shortcut.left": "\u5206\u5C4F\uFF1A\u805A\u7126\u5DE6\u4FA7\u9762\u677F",
  "shortcut.right": "\u5206\u5C4F\uFF1A\u805A\u7126\u53F3\u4FA7\u9762\u677F",
  "shortcut.up": "\u5206\u5C4F\uFF1A\u805A\u7126\u4E0A\u65B9\u9762\u677F",
  "shortcut.down": "\u5206\u5C4F\uFF1A\u805A\u7126\u4E0B\u65B9\u9762\u677F"
};
function registerLocale(ctx) {
  return ctx.locale.register(NS, { zh, en });
}
function bindTranslate(ctx) {
  const bound = ctx.locale.bind(NS);
  const lang = typeof navigator === "undefined" ? "en" : navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
  return (key, params) => {
    let text = bound(key, params);
    if (text === key || text === `${NS}:${key}` || text === "") text = (lang === "zh" ? zh : en)[key];
    if (params !== void 0) for (const [k, v] of Object.entries(params)) text = text.replace(`{${k}}`, String(v));
    return text;
  };
}

// src/client/Overlay.tsx
var import_react3 = require("react");

// src/client/shortcuts.ts
var COMMANDS = [
  { id: "conversation-split.split-right", label: "shortcut.splitRight", aliases: ["split", "side by side", "\u5206\u5C4F"], binding: { code: "KeyD", modifiers: ["primary", "shift"] }, whileSplit: false, run: (c) => c.splitPane("right") },
  { id: "conversation-split.split-down", label: "shortcut.splitDown", aliases: ["split", "stack", "\u5206\u5C4F"], binding: { code: "KeyE", modifiers: ["primary", "shift"] }, whileSplit: false, run: (c) => c.splitPane("bottom") },
  { id: "conversation-split.close-pane", label: "shortcut.close", aliases: ["split", "close pane"], binding: { code: "KeyW", modifiers: ["primary", "shift"] }, whileSplit: true, run: (c) => {
    const s = c.getSnapshot();
    if (s) c.closePane(s.focus);
  } },
  { id: "conversation-split.zoom-pane", label: "shortcut.zoom", aliases: ["split", "maximize", "zoom"], binding: { code: "Enter", modifiers: ["primary", "shift"] }, whileSplit: true, run: (c) => c.toggleZoom() },
  { id: "conversation-split.next-pane", label: "shortcut.next", aliases: ["split", "pane"], binding: { code: "BracketRight", modifiers: ["primary", "shift"] }, whileSplit: true, run: (c) => c.focusStep(1) },
  { id: "conversation-split.previous-pane", label: "shortcut.previous", aliases: ["split", "pane"], binding: { code: "BracketLeft", modifiers: ["primary", "shift"] }, whileSplit: true, run: (c) => c.focusStep(-1) },
  { id: "conversation-split.focus-left", label: "shortcut.left", aliases: ["split", "pane"], binding: { code: "ArrowLeft", modifiers: ["primary", "alt"] }, whileSplit: true, run: (c) => c.focusDirection("left", currentPlacement()) },
  { id: "conversation-split.focus-right", label: "shortcut.right", aliases: ["split", "pane"], binding: { code: "ArrowRight", modifiers: ["primary", "alt"] }, whileSplit: true, run: (c) => c.focusDirection("right", currentPlacement()) },
  { id: "conversation-split.focus-up", label: "shortcut.up", aliases: ["split", "pane"], binding: { code: "ArrowUp", modifiers: ["primary", "alt"] }, whileSplit: true, run: (c) => c.focusDirection("top", currentPlacement()) },
  { id: "conversation-split.focus-down", label: "shortcut.down", aliases: ["split", "pane"], binding: { code: "ArrowDown", modifiers: ["primary", "alt"] }, whileSplit: true, run: (c) => c.focusDirection("bottom", currentPlacement()) }
];
var placement = [];
var publishPlacement = (placed) => {
  placement = placed;
};
var currentPlacement = () => placement;
var isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
function formatBinding(binding) {
  const key = binding.code.replace(/^Key|^Digit/, "").replace("BracketRight", "]").replace("BracketLeft", "[").replace("Enter", "\u21B5").replace(/^Arrow/, "");
  if (isMac()) {
    const order = ["control", "alt", "shift", "primary", "meta"];
    const glyph = { control: "\u2303", alt: "\u2325", shift: "\u21E7", primary: "\u2318", meta: "\u2318" };
    return [...binding.modifiers].sort((a, b) => order.indexOf(a) - order.indexOf(b)).map((m) => glyph[m]).join("") + key;
  }
  const name2 = { control: "Ctrl", alt: "Alt", shift: "Shift", primary: "Ctrl", meta: "Win" };
  return [...binding.modifiers.map((m) => name2[m]), key].join("+");
}
function matches(event, binding) {
  const mac = isMac();
  const want = new Set(binding.modifiers.map((m) => m === "primary" ? mac ? "meta" : "control" : m));
  return event.code === binding.code && event.metaKey === want.has("meta") && event.ctrlKey === want.has("control") && event.altKey === want.has("alt") && event.shiftKey === want.has("shift");
}
function registerShortcuts(shortcuts, controller, t) {
  const disposers = [];
  const fallback = [];
  for (const spec of COMMANDS) {
    if (shortcuts === void 0) {
      fallback.push(spec);
      continue;
    }
    try {
      disposers.push(
        shortcuts.register({
          id: spec.id,
          label: () => t(spec.label),
          aliases: spec.aliases,
          defaults: { [`${shortcuts.runtime}:${shortcuts.platform}`]: spec.binding },
          regions: ["page", "editable"],
          modals: [],
          resolve: () => spec.whileSplit && controller.getSnapshot() === null ? { status: "pass" } : { status: "handled", run: () => spec.run(controller) }
        })
      );
    } catch (error) {
      console.warn("[dsh-conversation-split] shortcut service refused", spec.id, error);
      fallback.push(spec);
    }
  }
  if (fallback.length > 0) {
    const onKey = (event) => {
      if (event.defaultPrevented) return;
      for (const spec of fallback) {
        if (!matches(event, spec.binding)) continue;
        if (spec.whileSplit && controller.getSnapshot() === null) return;
        event.preventDefault();
        event.stopPropagation();
        spec.run(controller);
        return;
      }
    };
    document.addEventListener("keydown", onKey, true);
    disposers.push(() => document.removeEventListener("keydown", onKey, true));
  }
  return () => {
    for (const d of disposers) d();
  };
}

// src/client/PaneSession.tsx
var import_react2 = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var RETAIN_SOURCE = "conversationSplit";
var PANE_SLOT = "dsh-conversation-split.pane";
var RETAIN_ATTEMPTS = 3;
var RETAIN_RETRY_MS = 200;
var PaneSession = (0, import_react2.memo)(function PaneSession2(props) {
  const [attempt, setAttempt] = (0, import_react2.useState)(0);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RetainedPane, { ...props, onRetry: () => setAttempt((n) => n + 1) }, attempt);
});
function RetainedPane({ paneId, sessionId, sessions, SessionProvider, renderSlot, t, onRetry }) {
  const [held, setHeld] = (0, import_react2.useState)({ kind: "opening" });
  (0, import_react2.useEffect)(() => {
    const controller = new AbortController();
    let reference;
    let timer;
    let tries = 0;
    const acquire = () => {
      timer = void 0;
      let result;
      try {
        result = sessions.retain(sessionId, { source: RETAIN_SOURCE, signal: controller.signal });
      } catch (error) {
        console.error("[dsh-conversation-split] retain failed", sessionId, error);
      }
      if (result !== void 0) {
        reference = result;
        setHeld({ kind: "held", reference: result });
        return;
      }
      if (++tries >= RETAIN_ATTEMPTS) {
        setHeld({ kind: "failed" });
        return;
      }
      timer = setTimeout(acquire, RETAIN_RETRY_MS);
    };
    acquire();
    return () => {
      if (timer !== void 0) clearTimeout(timer);
      controller.abort();
      const release = reference;
      if (release !== void 0) setTimeout(() => release.release(), 0);
    };
  }, [sessions, sessionId]);
  if (held.kind === "opening") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dcs-note", children: t("pane.opening") });
  if (held.kind === "failed") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcs-note", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("pane.failed") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: onRetry, children: t("pane.retry") })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionProvider, { session: held.reference, children: renderSlot(PANE_SLOT, { paneId }) });
}
function FixedChat(props) {
  return props.renderSlot("conversation.session", { view: "chat" });
}
function PaneBody({ sessionId, useSession, useConversation, useSessions, renderFactorySlot }) {
  const session = useSession((s) => s);
  const active = useConversation((c) => c.activeTargets.size > 0);
  const summaryBlank = useSessions((state) => state.byId[sessionId]?.blank);
  const started = active || !session.blank && !session.awaitingFirstTurn || summaryBlank === false;
  const phase = started ? "active" : "hero";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dcs-body", "data-split-pane-body": "", children: renderFactorySlot("conversation.content", { variant: "embedded", phase, hero: false }, { slots: { views: FixedChat } }) });
}

// src/layout/storage.ts
function serializeLayout(layout) {
  return JSON.stringify(layout);
}
function parseLayout(raw) {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw);
    return isValidLayout(value) ? value : null;
  } catch {
    return null;
  }
}

// src/client/store.ts
var seq = 0;
var newPaneId = () => `p${Date.now().toString(36)}${(seq++).toString(36)}`;
function createSplitController(host) {
  let state = parseLayout(host.readStorage());
  if (state !== null && leaves(state.root).length < 2) state = null;
  const listeners = /* @__PURE__ */ new Set();
  const commit = (next) => {
    const previousFocus = state === null ? void 0 : findPane(state.root, state.focus)?.sessionId;
    state = next;
    host.writeStorage(next === null ? null : serializeLayout(next));
    for (const l of listeners) l();
    const focused = next === null ? void 0 : findPane(next.root, next.focus)?.sessionId;
    if (focused !== void 0 && focused !== null && focused !== previousFocus) host.openSession(focused);
  };
  const ensureOpen = () => {
    if (state !== null) return state;
    const first = leaf(newPaneId(), host.mainSession() ?? null);
    return { root: first, focus: first.id, zoom: null };
  };
  const doSplit = (side, sessionId, target) => {
    const base = ensureOpen();
    const at = target ?? base.focus;
    const fresh = leaf(newPaneId(), sessionId);
    const root = splitPane(base.root, at, side, fresh);
    if (root === void 0) {
      if (leaves(base.root).length >= MAX_PANES) host.notify("paneLimit");
      return void 0;
    }
    commit({ root, focus: fresh.id, zoom: null });
    return fresh.id;
  };
  const controller = {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    splitPane(side, sessionId = null, target) {
      doSplit(side, sessionId, target);
    },
    async newBeside(side, target) {
      const near = state === null ? host.mainSession() : findPane(state.root, target ?? state.focus)?.sessionId ?? void 0;
      const paneId = doSplit(side, null, target);
      if (paneId === void 0) return;
      try {
        const created = await host.createSession(near);
        controller.assign(paneId, created);
      } catch (error) {
        console.error("[dsh-conversation-split] create failed", error);
        host.notify("createFailed");
        controller.closePane(paneId);
      }
    },
    async newBesideInPane(paneId) {
      if (state === null) return;
      const near = leaves(state.root).find((l) => l.id !== paneId && l.sessionId !== null)?.sessionId ?? host.mainSession();
      try {
        const created = await host.createSession(near ?? void 0);
        controller.assign(paneId, created);
      } catch (error) {
        console.error("[dsh-conversation-split] create failed", error);
        host.notify("createFailed");
      }
    },
    openInSplit(sessionId) {
      if (state !== null) {
        const existing = paneOfSession(state.root, sessionId);
        if (existing !== void 0) return controller.focus(existing.id);
        const empty = leaves(state.root).find((l) => l.sessionId === null);
        if (empty !== void 0) return controller.assign(empty.id, sessionId);
      }
      doSplit("right", sessionId);
    },
    assign(paneId, sessionId) {
      if (state === null) return;
      if (sessionId !== null) {
        const other = paneOfSession(state.root, sessionId);
        if (other !== void 0 && other.id !== paneId) {
          commit({ ...state, root: swapPanes(state.root, paneId, other.id), focus: paneId });
          return;
        }
      }
      commit({ ...state, root: assignSession(state.root, paneId, sessionId), focus: paneId });
    },
    closePane(paneId) {
      if (state === null) return;
      const root = removePane(state.root, paneId);
      if (root === void 0 || leaves(root).length < 2) {
        const survivor = root === void 0 ? void 0 : leaves(root)[0];
        commit(null);
        if (survivor?.sessionId) host.openSession(survivor.sessionId);
        return;
      }
      const focus = findPane(root, state.focus) ? state.focus : leaves(root)[0].id;
      commit({ root, focus, zoom: state.zoom !== null && findPane(root, state.zoom) ? state.zoom : null });
    },
    closeAll() {
      if (state === null) return;
      const focused = findPane(state.root, state.focus)?.sessionId;
      commit(null);
      if (focused) host.openSession(focused);
    },
    focus(paneId) {
      if (state === null || state.focus === paneId || findPane(state.root, paneId) === void 0) return;
      commit({ ...state, focus: paneId });
    },
    focusStep(delta) {
      if (state === null) return;
      controller.focus(cycle(state.root, state.focus, delta));
    },
    focusDirection(side, placed) {
      if (state === null) return;
      const next = neighbour(placed, state.focus, side);
      if (next !== void 0) controller.focus(next);
    },
    toggleZoom(paneId) {
      if (state === null) return;
      const id = paneId ?? state.focus;
      commit({ ...state, focus: id, zoom: state.zoom === id ? null : id });
    },
    resize(path, ratio) {
      if (state === null) return;
      commit({ ...state, root: setRatio(state.root, path, ratio) });
    },
    move(source, target, side) {
      if (state === null) return;
      const root = movePane(state.root, source, target, side);
      if (root !== void 0) commit({ ...state, root, focus: source });
    },
    swap(a, b) {
      if (state === null) return;
      commit({ ...state, root: swapPanes(state.root, a, b) });
    },
    reconcile(known) {
      if (state === null) return;
      let root = state.root;
      for (const pane of leaves(root)) {
        if (pane.sessionId !== null && !known.has(pane.sessionId)) root = assignSession(root, pane.id, null);
      }
      if (root !== state.root) commit({ ...state, root });
    }
  };
  return controller;
}

// src/client/glyphs.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var PATHS = {
  splitRight: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M12 4v16" })
  ] }),
  splitDown: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M3 12h18" })
  ] }),
  maximize: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M8 3H5a2 2 0 0 0-2 2v3" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M16 3h3a2 2 0 0 1 2 2v3" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M3 16v3a2 2 0 0 0 2 2h3" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M21 16v3a2 2 0 0 1-2 2h-3" })
  ] }),
  restore: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M8 3v3a2 2 0 0 1-2 2H3" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M16 3v3a2 2 0 0 0 2 2h3" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M3 16h3a2 2 0 0 1 2 2v3" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M21 16h-3a2 2 0 0 0-2 2v3" })
  ] }),
  close: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M6 6l12 12" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M18 6L6 18" })
  ] }),
  chevron: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M6 9l6 6 6-6" }),
  sidebar: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M15 4v16" })
  ] }),
  plus: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M12 5v14" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M5 12h14" })
  ] }),
  chat: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" })
};
function Glyph({ name: name2 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("svg", { viewBox: "0 0 24 24", width: 16, height: 16, "aria-hidden": "true", style: { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", flex: "none" }, children: PATHS[name2] });
}

// src/client/Overlay.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var NARROW_PX = 440;
var TIGHT_PX = 260;
var DRAG_THRESHOLD = 6;
function sideOf(rect, x, y) {
  const dx = (x - rect.left) / rect.width - 0.5;
  const dy = (y - rect.top) / rect.height - 0.5;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "top" : "bottom";
}
function dropRect(rect, side) {
  switch (side) {
    case "left":
      return { ...rect, width: rect.width / 2 };
    case "right":
      return { ...rect, left: rect.left + rect.width / 2, width: rect.width / 2 };
    case "top":
      return { ...rect, height: rect.height / 2 };
    case "bottom":
      return { ...rect, top: rect.top + rect.height / 2, height: rect.height / 2 };
  }
}
function SplitOverlay(props) {
  const { controller, anchor, t } = props;
  const layout = (0, import_react3.useSyncExternalStore)(controller.subscribe, controller.getSnapshot);
  const box = useAnchorRect(anchor);
  const [menu, setMenu] = (0, import_react3.useState)(null);
  const [drag, setDrag] = (0, import_react3.useState)(null);
  const [resizing, setResizing] = (0, import_react3.useState)(null);
  const toastText = (0, import_react3.useSyncExternalStore)(props.toast.subscribe, props.toast.getSnapshot);
  const placement2 = (0, import_react3.useMemo)(() => layout && box ? place(layout, { left: 0, top: 0, width: box.width, height: box.height }) : null, [layout, box]);
  (0, import_react3.useEffect)(() => {
    publishPlacement(placement2?.panes ?? []);
  }, [placement2]);
  (0, import_react3.useEffect)(() => {
    if (layout === null) setMenu(null);
  }, [layout]);
  if (layout === null || box === null || placement2 === null) return toastText ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dcs-toast", children: toastText }) : null;
  const single = placement2.panes.length === 1;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    "div",
    {
      className: "dcs-root",
      "data-resizing": resizing ?? void 0,
      "data-single": single ? "" : void 0,
      style: { left: box.left, top: box.top, width: box.width, height: box.height },
      onPointerDownCapture: (event) => {
        const paneEl = event.target.closest("[data-pane-id]");
        if (paneEl?.dataset.paneId) controller.focus(paneEl.dataset.paneId);
      },
      children: [
        placement2.panes.map(({ pane, rect }) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          Pane,
          {
            pane,
            rect,
            active: layout.focus === pane.id,
            zoomed: layout.zoom === pane.id,
            dragging: drag?.source === pane.id,
            panes: placement2.panes,
            onMenu: (kind, x, y) => setMenu({ kind, paneId: pane.id, x, y }),
            onDrag: setDrag,
            ...props
          },
          pane.id
        )),
        placement2.dividers.map((d) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Divider, { path: d.path, axis: d.axis, rect: d.rect, box, controller, onResizing: setResizing }, d.path.join("."))),
        drag?.target && drag.side && (() => {
          const target = placement2.panes.find((p) => p.pane.id === drag.target);
          return target ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dcs-drop", style: dropRect(target.rect, drag.side) }) : null;
        })(),
        menu && (menu.kind === "picker" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Picker, { ...props, paneId: menu.paneId, x: menu.x, y: menu.y, onClose: () => setMenu(null) }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ActionsMenu, { controller, layout, paneId: menu.paneId, x: menu.x, y: menu.y, t, onClose: () => setMenu(null) })),
        toastText && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dcs-toast", children: toastText })
      ]
    }
  );
}
function Pane({ pane, rect, active, zoomed, dragging, panes, onMenu, onDrag, controller, sessions, t, useSessions, useSessionStatus, SessionProvider, renderSlot, toggleSidebar }) {
  const title = useSessions((s) => pane.sessionId ? s.byId[pane.sessionId]?.title : void 0);
  const running = useSessionStatus((m) => pane.sessionId ? m.get(pane.sessionId)?.running === true : false);
  const ref = (0, import_react3.useRef)(null);
  (0, import_react3.useEffect)(() => {
    if (active && ref.current && !ref.current.contains(document.activeElement)) {
      const editor = ref.current.querySelector('textarea, [contenteditable="true"]');
      if (editor && document.activeElement === document.body) editor.focus({ preventScroll: true });
    }
  }, [active, pane.sessionId]);
  const startDrag = (event) => {
    if (event.button !== 0 || panes.length < 2) return;
    const startX = event.clientX;
    const startY = event.clientY;
    let started = false;
    let current = { source: pane.id };
    const root = ref.current?.parentElement;
    const move = (e) => {
      if (!started) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD) return;
        started = true;
        onDrag(current);
      }
      const origin = root?.getBoundingClientRect();
      if (!origin) return;
      const x = e.clientX - origin.left;
      const y = e.clientY - origin.top;
      const hit = panes.find((p) => p.pane.id !== pane.id && x >= p.rect.left && x <= p.rect.left + p.rect.width && y >= p.rect.top && y <= p.rect.top + p.rect.height);
      current = hit ? { source: pane.id, target: hit.pane.id, side: sideOf(hit.rect, x, y) } : { source: pane.id };
      onDrag(current);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      onDrag(null);
      if (started && current.target && current.side) controller.move(pane.id, current.target, current.side);
      else if (!started) onMenu("picker", startX, startY + 8);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  const label = pane.sessionId ? title && title.trim() !== "" ? title : t("pane.untitled") : t("pane.empty");
  const shortcut = (id) => formatBinding(COMMANDS.find((c) => c.id === id).binding);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    "div",
    {
      ref,
      className: "dcs-pane",
      "data-pane-id": pane.id,
      "data-active": active ? "" : void 0,
      "data-narrow": rect.width < NARROW_PX ? "" : void 0,
      "data-tight": rect.width < TIGHT_PX ? "" : void 0,
      "data-drag-source": dragging ? "" : void 0,
      style: { left: rect.left, top: rect.top, width: rect.width, height: rect.height, opacity: dragging ? 0.55 : void 0 },
      onContextMenu: (event) => {
        if (event.target.closest(".dcs-pane-head")) {
          event.preventDefault();
          onMenu("actions", event.clientX, event.clientY);
        }
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dcs-pane-head", "data-window-drag": "", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("button", { type: "button", className: "dcs-title", title: t("pane.switch"), onPointerDown: startDrag, children: [
            running && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dcs-dot", title: t("pane.running") }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dcs-title-text", children: label }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Glyph, { name: "chevron" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dcs-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "dcs-btn", title: `${t("pane.splitRight")} (${shortcut("conversation-split.split-right")})`, onClick: () => controller.splitPane("right", null, pane.id), children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Glyph, { name: "splitRight" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "dcs-btn", title: `${t("pane.splitDown")} (${shortcut("conversation-split.split-down")})`, onClick: () => controller.splitPane("bottom", null, pane.id), children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Glyph, { name: "splitDown" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "dcs-btn", title: `${zoomed ? t("pane.restore") : t("pane.maximize")} (${shortcut("conversation-split.zoom-pane")})`, onClick: () => controller.toggleZoom(pane.id), children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Glyph, { name: zoomed ? "restore" : "maximize" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "dcs-btn", title: `${t("pane.close")} (${shortcut("conversation-split.close-pane")})`, onClick: () => controller.closePane(pane.id), children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Glyph, { name: "close" }) }),
            active && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "dcs-btn dcs-btn-sidebar", title: t("pane.sidebar"), onClick: toggleSidebar, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Glyph, { name: "sidebar" }) })
          ] })
        ] }),
        pane.sessionId === null ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dcs-note", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("pane.empty") }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", onClick: (e) => onMenu("picker", e.clientX, e.clientY), children: t("pane.switch") }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", onClick: () => void controller.newBesideInPane(pane.id), children: t("picker.new") })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(PaneSession, { paneId: pane.id, sessionId: pane.sessionId, sessions, SessionProvider, renderSlot, t })
      ]
    }
  );
}
function Divider({ path, axis, rect, box, controller, onResizing }) {
  const [dragging, setDragging] = (0, import_react3.useState)(false);
  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const el = event.currentTarget;
    const parent = el.parentElement;
    if (!parent) return;
    const snapshot = controller.getSnapshot();
    if (!snapshot) return;
    const placed = place(snapshot, { left: 0, top: 0, width: box.width, height: box.height });
    const node = nodeRect(placed.panes, path, snapshot);
    if (!node) return;
    setDragging(true);
    onResizing(axis);
    const origin = parent.getBoundingClientRect();
    const move = (e) => {
      const ratio = axis === "row" ? (e.clientX - origin.left - node.left) / node.width : (e.clientY - origin.top - node.top) / node.height;
      controller.resize(path, ratio);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDragging(false);
      onResizing(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    "div",
    {
      className: "dcs-divider",
      "data-axis": axis,
      "data-dragging": dragging ? "" : void 0,
      style: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      onPointerDown,
      onDoubleClick: () => controller.resize(path, 0.5)
    }
  );
}
function nodeRect(panes, path, layout) {
  const node = nodeAt(layout.root, path);
  if (!node) return void 0;
  const ids = new Set(leaves(node).map((l) => l.id));
  const rects = panes.filter((p) => ids.has(p.pane.id)).map((p) => p.rect);
  if (rects.length === 0) return void 0;
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.left + r.width));
  const bottom = Math.max(...rects.map((r) => r.top + r.height));
  return { left, top, width: right - left, height: bottom - top };
}
function useDismiss(onClose, ref) {
  (0, import_react3.useEffect)(() => {
    const down = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const key = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key, true);
    };
  }, [onClose, ref]);
}
function clampToViewport(x, y, width, height) {
  return {
    left: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
    top: Math.max(8, Math.min(y, window.innerHeight - height - 8))
  };
}
function Picker({ controller, paneId, x, y, onClose, t, useSessions, useSessionStatus }) {
  const list = useSessions((s) => s);
  const statuses = useSessionStatus((m) => m);
  const [query, setQuery] = (0, import_react3.useState)("");
  const ref = (0, import_react3.useRef)(null);
  useDismiss(onClose, ref);
  const snapshot = controller.getSnapshot();
  const inUse = new Set((snapshot ? leaves(snapshot.root) : []).map((l) => l.sessionId));
  const items = list.ids.map((id) => ({ id, summary: list.byId[id] })).filter(({ summary }) => summary && !summary.archived).filter(({ id, summary }) => {
    const q = query.trim().toLowerCase();
    return q === "" || id.toLowerCase().includes(q) || (summary?.title ?? "").toLowerCase().includes(q);
  }).slice(0, 200);
  const pos = clampToViewport(x, y, 300, 400);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { ref, className: "dcs-menu", style: { left: pos.left, top: pos.top, width: 300 }, role: "menu", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { autoFocus: true, className: "dcs-menu-search", placeholder: t("picker.search"), value: query, onChange: (e) => setQuery(e.target.value) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("button", { type: "button", className: "dcs-menu-item", onClick: () => {
      onClose();
      void controller.newBesideInPane(paneId);
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Glyph, { name: "plus" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: t("picker.new") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dcs-menu-sep" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dcs-menu-list", children: [
      items.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dcs-menu-item", "aria-disabled": true, children: t("picker.none") }),
      items.map(({ id, summary }) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("button", { type: "button", className: "dcs-menu-item", "data-active": inUse.has(id) ? "" : void 0, onClick: () => {
        onClose();
        controller.assign(paneId, id);
      }, children: [
        statuses.get(id)?.running ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dcs-dot" }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Glyph, { name: "chat" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: summary?.title?.trim() || t("pane.untitled") })
      ] }, id))
    ] })
  ] });
}
function ActionsMenu({ controller, layout, paneId, x, y, t, onClose }) {
  const ref = (0, import_react3.useRef)(null);
  useDismiss(onClose, ref);
  const pos = clampToViewport(x, y, 220, 200);
  const item = (label, cmd, run, glyph) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("button", { type: "button", className: "dcs-menu-item", onClick: () => {
    onClose();
    run();
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Glyph, { name: glyph }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("kbd", { children: formatBinding(COMMANDS.find((c) => c.id === cmd).binding) })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { ref, className: "dcs-menu", style: pos, role: "menu", children: [
    item(t("pane.splitRight"), "conversation-split.split-right", () => controller.splitPane("right", null, paneId), "splitRight"),
    item(t("pane.splitDown"), "conversation-split.split-down", () => controller.splitPane("bottom", null, paneId), "splitDown"),
    item(layout.zoom === paneId ? t("pane.restore") : t("pane.maximize"), "conversation-split.zoom-pane", () => controller.toggleZoom(paneId), layout.zoom === paneId ? "restore" : "maximize"),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dcs-menu-sep" }),
    item(t("pane.close"), "conversation-split.close-pane", () => controller.closePane(paneId), "close")
  ] });
}
function useAnchorRect(anchor) {
  const element = (0, import_react3.useSyncExternalStore)(anchor.subscribe, anchor.get);
  const [rect, setRect] = (0, import_react3.useState)(null);
  const measure = (0, import_react3.useCallback)(() => {
    if (!element || !element.isConnected) return null;
    const b = element.getBoundingClientRect();
    return b.width === 0 && b.height === 0 ? null : { left: b.left, top: b.top, width: b.width, height: b.height };
  }, [element]);
  (0, import_react3.useLayoutEffect)(() => {
    let last = null;
    const update = () => {
      const next = measure();
      if (last === null !== (next === null) || last && next && (last.left !== next.left || last.top !== next.top || last.width !== next.width || last.height !== next.height)) {
        last = next;
        setRect(next);
      }
    };
    update();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    if (element && ro) ro.observe(element);
    window.addEventListener("resize", update);
    const timer = setInterval(update, 250);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
      clearInterval(timer);
    };
  }, [element, measure]);
  return rect;
}

// src/client/SessionMenuItem.tsx
var import_react4 = require("react");
var import_jsx_runtime4 = require("react/jsx-runtime");
function adoptSiblingClass(button) {
  if (button === null) return;
  const sibling = [...button.parentElement?.querySelectorAll('[role="menuitem"]') ?? []].find(
    (el) => el !== button && !el.classList.contains("dcs-menu-item")
  );
  if (sibling === void 0 || sibling.className === "") return;
  button.className = sibling.className;
  const [icon, label] = sibling.children;
  const [ownIcon, ownLabel] = button.children;
  if (icon && ownIcon && icon.className !== "") ownIcon.className = icon.className;
  if (label && ownLabel && label.className !== "") ownLabel.className = label.className;
}
function SessionMenuItem({ sessionId, useMenuOpenState, openInSplit, t }) {
  const state = useMenuOpenState?.();
  const close = state?.[1];
  const ref = (0, import_react4.useCallback)(adoptSiblingClass, []);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "button",
    {
      ref,
      type: "button",
      role: "menuitem",
      className: "dcs-menu-item",
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        close?.(false);
        openInSplit(sessionId);
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { display: "inline-flex" }, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Glyph, { name: "splitRight" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: t("menu.openInSplit") })
      ]
    }
  );
}

// src/client/SplitButton.tsx
var import_react5 = require("react");
var import_jsx_runtime5 = require("react/jsx-runtime");
function SplitButton({ controller, t }) {
  const [open, setOpen] = (0, import_react5.useState)(false);
  const ref = (0, import_react5.useRef)(null);
  (0, import_react5.useEffect)(() => {
    if (!open) return;
    const down = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const key = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key, true);
    };
  }, [open]);
  const keys = (id) => formatBinding(COMMANDS.find((c) => c.id === id).binding);
  const item = (label, cmd, glyph, run) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("button", { type: "button", className: "dcs-menu-item", role: "menuitem", onClick: () => {
    setOpen(false);
    run();
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Glyph, { name: glyph }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("kbd", { children: keys(cmd) })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { ref, style: { position: "relative", display: "inline-flex" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      "button",
      {
        type: "button",
        className: "dcs-btn",
        "data-split-header-button": "",
        title: `${t("header.split")} (${keys("conversation-split.split-right")})`,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        onClick: (e) => e.shiftKey || e.altKey ? controller.splitPane("bottom") : setOpen((v) => !v),
        children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Glyph, { name: "splitRight" })
      }
    ),
    open && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dcs-menu", role: "menu", style: { position: "absolute", right: 0, top: "100%", marginTop: 4 }, children: [
      item(t("menu.splitRight"), "conversation-split.split-right", "splitRight", () => controller.splitPane("right")),
      item(t("menu.splitDown"), "conversation-split.split-down", "splitDown", () => controller.splitPane("bottom")),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dcs-menu-sep" }),
      item(t("pane.newBeside"), "conversation-split.split-right", "plus", () => void controller.newBeside("right"))
    ] })
  ] });
}

// src/client/styles.ts
var PKG = "dsh-conversation-split";
var CSS = `
.dcs-anchor{width:100%;height:100%;min-height:0;}
.dcs-root{position:fixed;overflow:hidden;isolation:isolate;pointer-events:auto;z-index:5;background:var(--dsw-alias-bg-base,var(--rail-bg,#fff));--dcs-accent:var(--dsw-alias-accent,var(--rail-business,#4d6bfe));--dcs-border:var(--dsw-alias-border,rgba(127,127,127,.28));--dcs-fg:var(--dsw-alias-fg-secondary,inherit);--dcs-hover:var(--dsw-alias-bg-hover,rgba(127,127,127,.12));}
.dcs-root[data-resizing]{user-select:none;cursor:col-resize;}
.dcs-root[data-resizing="column"]{cursor:row-resize;}
.dcs-root[data-resizing] .dcs-pane{pointer-events:none;}
.dcs-pane{position:absolute;display:flex;flex-direction:column;box-sizing:border-box;min-width:0;min-height:0;overflow:hidden;outline:none;border-radius:10px;background:var(--dsw-alias-bg-base,var(--rail-bg,#fff));box-shadow:0 0 0 1px var(--dcs-border);transition:box-shadow 160ms ease;}
.dcs-pane[data-active]{box-shadow:0 0 0 1.5px color-mix(in srgb,var(--dcs-accent) 70%,transparent);}
.dcs-root[data-single] .dcs-pane[data-active]{box-shadow:0 0 0 1px var(--dcs-border);}
.dcs-pane-head{flex:none;display:flex;align-items:center;gap:4px;height:36px;padding:0 6px;box-sizing:border-box;border-bottom:1px solid var(--dcs-border);color:var(--dcs-fg);font-size:13px;}
.dcs-pane-head[data-window-drag]{-webkit-app-region:drag;}
.dcs-pane-head[data-window-drag] button,.dcs-pane-head[data-window-drag] .dcs-title{-webkit-app-region:no-drag;}
/* Antigravity 2.24: narrow panes show their toolbar only while focused or hovered. */
.dcs-pane[data-narrow]:not([data-active]):not(:hover) .dcs-actions{display:none;}
.dcs-pane[data-narrow] .dcs-pane-head{padding:0 2px;gap:0;}
.dcs-pane[data-narrow] .dcs-title{padding:0 4px;}
.dcs-pane[data-tight][data-active] .dcs-title-text,.dcs-pane[data-tight]:hover .dcs-title-text{display:none;}
.dcs-title{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:6px;height:28px;padding:0 8px;border-radius:7px;cursor:grab;user-select:none;background:transparent;border:0;color:inherit;font:inherit;text-align:left;}
.dcs-title:hover{background:var(--dcs-hover);}
.dcs-title:active{cursor:grabbing;}
.dcs-title-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dcs-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--dcs-accent);animation:dcs-pulse 1.2s ease-in-out infinite;}
@keyframes dcs-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.dcs-actions{flex:none;display:flex;align-items:center;gap:2px;}
.dcs-btn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:7px;background:transparent;color:inherit;cursor:pointer;}
.dcs-btn:hover{background:var(--dcs-hover);}
.dcs-btn svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}
.dcs-body{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;position:relative;}
.dcs-body>*{flex:1 1 auto;min-height:0;}
.dcs-note{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--dcs-fg);font-size:13px;padding:16px;text-align:center;}
.dcs-note button{font:inherit;padding:6px 14px;border-radius:8px;border:1px solid var(--dcs-border);background:transparent;color:inherit;cursor:pointer;}
.dcs-note button:hover{background:var(--dcs-hover);}
.dcs-divider{position:absolute;z-index:2;}
.dcs-divider[data-axis="row"]{cursor:col-resize;}
.dcs-divider[data-axis="column"]{cursor:row-resize;}
.dcs-divider::after{content:"";position:absolute;inset:0;margin:auto;border-radius:2px;background:transparent;transition:background 120ms;}
.dcs-divider[data-axis="row"]::after{width:2px;}
.dcs-divider[data-axis="column"]::after{height:2px;}
.dcs-divider:hover::after,.dcs-divider[data-dragging]::after{background:var(--dcs-accent);}
.dcs-drop{position:absolute;z-index:3;pointer-events:none;border-radius:10px;background:color-mix(in srgb,var(--dcs-accent) 18%,transparent);box-shadow:inset 0 0 0 2px var(--dcs-accent);transition:left 90ms,top 90ms,width 90ms,height 90ms;}
.dcs-menu{position:fixed;z-index:1000;min-width:200px;max-width:320px;padding:4px;border-radius:10px;background:var(--dsw-alias-bg-elevated,var(--rail-bg,#fff));box-shadow:0 0 0 1px var(--dcs-border),0 10px 30px rgba(0,0,0,.18);font-size:13px;}
.dcs-menu-item{display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border:0;border-radius:7px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;}
.dcs-menu-item:hover,.dcs-menu-item[data-active]{background:var(--dcs-hover);}
.dcs-menu-item span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dcs-menu-item kbd{margin-left:auto;opacity:.6;font-size:11px;font-family:inherit;}
.dcs-menu-sep{height:1px;margin:4px 6px;background:var(--dcs-border);}
.dcs-menu-search{box-sizing:border-box;width:100%;margin:2px 0 4px;padding:7px 10px;border:1px solid var(--dcs-border);border-radius:7px;background:transparent;color:inherit;font:inherit;outline:none;}
.dcs-menu-list{max-height:320px;overflow:auto;}
.dcs-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:1001;padding:8px 14px;border-radius:8px;background:rgba(20,20,20,.9);color:#fff;font-size:13px;pointer-events:none;}
`;

// src/client/toast.ts
function createToastStore() {
  let text = null;
  let timer;
  const listeners = /* @__PURE__ */ new Set();
  const emit = () => {
    for (const l of listeners) l();
  };
  return {
    getSnapshot: () => text,
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    show(next, ms = 2600) {
      if (timer) clearTimeout(timer);
      text = next;
      emit();
      timer = setTimeout(() => {
        text = null;
        emit();
      }, ms);
    }
  };
}

// src/client/index.tsx
var name = "dsh-conversation-split";
var inject = ["slots", "locale", "sessions", "uiWorkspace", "sidebarRight"];
function injectStyle(css) {
  document.head.querySelector(`style[data-plugin-css="${PKG}"]`)?.remove();
  const el = document.createElement("style");
  el.dataset.pluginCss = PKG;
  el.textContent = css;
  document.head.append(el);
  return () => el.remove();
}
function dispose(d) {
  if (typeof d === "function") d();
  else d?.[Symbol.dispose]?.();
}
function apply(ctx) {
  ctx.effect(() => registerLocale(ctx), `${PKG}: locale`);
  ctx.effect(() => injectStyle(CSS), `${PKG}: style`);
  const t = bindTranslate(ctx);
  const anchor = createAnchorStore();
  const toast = createToastStore();
  let workspaces;
  let shadow = null;
  const knownSession = (id) => id !== void 0 && ctx.sessions.list.getSnapshot().byId[id] !== void 0 ? id : void 0;
  const host = {
    openSession: (id) => {
      try {
        ctx.uiWorkspace.openSession(id);
      } catch (e) {
        console.warn("[dsh-conversation-split] openSession", e);
      }
    },
    mainSession: () => knownSession(ctx.sidebarRight.mounted.getSnapshot()),
    async createSession(near) {
      const workspaceId = near === void 0 ? void 0 : workspaces?.list.getSnapshot().items.find((w) => w.sessionIds.includes(near))?.workspaceId;
      if (workspaceId !== void 0) return await ctx.sessions.create({ workspaceId });
      const cwd = near === void 0 ? void 0 : ctx.sessions.list.getSnapshot().byId[near]?.cwd;
      return await ctx.sessions.create(cwd === void 0 ? {} : { cwd });
    },
    notify: (kind) => toast.show(kind === "paneLimit" ? t("toast.paneLimit", { max: MAX_PANES }) : t("toast.createFailed")),
    readStorage: () => {
      try {
        return localStorage.getItem("dsh-conversation-split.layout.v1");
      } catch {
        return null;
      }
    },
    writeStorage: (v) => {
      try {
        v === null ? localStorage.removeItem("dsh-conversation-split.layout.v1") : localStorage.setItem("dsh-conversation-split.layout.v1", v);
      } catch {
      }
    }
  };
  const controller = createSplitController(host);
  const enterSplit = () => {
    if (shadow !== null) return;
    shadow = ctx.effect(
      () => ctx.slots.inject("main.conversation", () => ctx.slots.register({ name: "main.conversation", priority: -1, inject: () => ({ anchor }) }, SplitAnchor)),
      `${PKG}: placeholder`
    );
  };
  const leaveSplit = () => {
    const current = shadow;
    shadow = null;
    if (current !== null) dispose(current);
  };
  const syncShadow = () => {
    controller.getSnapshot() === null ? leaveSplit() : enterSplit();
  };
  ctx.effect(() => {
    const off = controller.subscribe(syncShadow);
    syncShadow();
    return () => {
      off();
      leaveSplit();
    };
  }, `${PKG}: shadow`);
  ctx.effect(() => ctx.slots.inject(PANE_SLOT, () => ctx.slots.register({ name: PANE_SLOT }, PaneBody)), `${PKG}: pane slot`);
  ctx.effect(
    () => ctx.slots.inject("shell.overlay", () => ctx.slots.register({ name: "shell.overlay", id: `${PKG}.overlay`, children: { [PANE_SLOT]: { kind: "single", scope: "session" } }, inject: () => ({ controller, anchor, sessions: ctx.sessions, toast, t, toggleSidebar: () => ctx.sidebarRight.toggleExpanded() }) }, SplitOverlay)),
    `${PKG}: overlay`
  );
  ctx.effect(
    () => ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({ name: "conversation.session.header.utilities", id: `${PKG}.split`, order: 900, inject: () => ({ controller, t }) }, SplitButton)),
    `${PKG}: header button`
  );
  ctx.effect(
    () => ctx.slots.inject("sidebar.workspaces.session.menu.item", () => ctx.slots.register({ name: "sidebar.workspaces.session.menu.item", id: `${PKG}.open-in-split`, order: 500, inject: () => ({ openInSplit: controller.openInSplit, t }) }, SessionMenuItem)),
    `${PKG}: session menu item`
  );
  const reconcile = () => controller.reconcile(new Set(ctx.sessions.list.getSnapshot().ids));
  ctx.effect(() => {
    const off = ctx.sessions.list.subscribe(reconcile);
    reconcile();
    return off;
  }, `${PKG}: reconcile`);
  ctx.effect(() => ctx.sidebarRight.mounted.subscribe(() => {
    const state = controller.getSnapshot();
    const mounted = knownSession(ctx.sidebarRight.mounted.getSnapshot());
    if (state === null || mounted === void 0) return;
    if (leaves(state.root).some((l) => l.sessionId === mounted)) return;
    controller.assign(state.focus, mounted);
  }), `${PKG}: follow sidebar`);
  ctx.inject(["workspaces"], (child) => {
    workspaces = child.workspaces;
  });
  let shortcutsBound = false;
  ctx.inject(["shortcuts"], (child) => {
    shortcutsBound = true;
    child.effect(() => registerShortcuts(child.shortcuts, controller, t), `${PKG}: shortcuts`);
  });
  ctx.effect(() => {
    let off;
    const timer = setTimeout(() => {
      if (!shortcutsBound) off = registerShortcuts(void 0, controller, t);
    }, 3e3);
    return () => {
      clearTimeout(timer);
      off?.();
    };
  }, `${PKG}: shortcut fallback`);
}
return module.exports;}});
