import { MACOS } from "./ua";

const MODIFIERS: Record<string, string> = {
  alt: "altKey",
  control: "ctrlKey",
  meta: "metaKey",
  shift: "shiftKey",
};
const ALIASES: Record<string, string> = {
  add: "+",
  break: "pause",
  cmd: "meta",
  command: "meta",
  ctl: "control",
  ctrl: "control",
  del: "delete",
  down: "arrowdown",
  esc: "escape",
  ins: "insert",
  left: "arrowleft",
  mod: MACOS ? "meta" : "control",
  opt: "alt",
  option: "alt",
  return: "enter",
  right: "arrowright",
  space: " ",
  spacebar: " ",
  up: "arrowup",
  win: "meta",
  windows: "meta",
};
const CODES: Record<string, number> = {
  backspace: 8,
  tab: 9,
  enter: 13,
  shift: 16,
  control: 17,
  alt: 18,
  pause: 19,
  capslock: 20,
  escape: 27,
  " ": 32,
  pageup: 33,
  pagedown: 34,
  end: 35,
  home: 36,
  arrowleft: 37,
  arrowup: 38,
  arrowright: 39,
  arrowdown: 40,
  insert: 45,
  delete: 46,
  meta: 91,
  numlock: 144,
  scrolllock: 145,
  ";": 186,
  "=": 187,
  ",": 188,
  "-": 189,
  ".": 190,
  "/": 191,
  "`": 192,
  "[": 219,
  "\\": 220,
  "]": 221,
  "'": 222,
};
export const compareHotkey = (
  object: Record<string, any>,
  event: KeyboardEvent
) => {
  for (const key in object) {
    const expected = object[key];
    let actual;

    if (expected == null) {
      continue;
    }

    if (key === "key") {
      actual = event.key.toLowerCase();
    } else if (key === "which") {
      actual = expected === 91 && event.which === 93 ? 91 : event.which;
    } else {
      actual = event[key as keyof KeyboardEvent];
    }

    if (actual == null && expected === false) {
      continue;
    }

    if (actual !== expected) {
      return false;
    }
  }

  return true;
};
export const toKeyCode = (name: string) => {
  name = toKeyName(name);
  const code = CODES[name] || name.toUpperCase().charCodeAt(0);
  return code;
};

export const toKeyName = (name: string) => {
  name = name.toLowerCase();
  name = ALIASES[name] || name;
  return name;
};

export const parseHotkey = (hotkey: string, options?: { byKey?: boolean }) => {
  const byKey = options && options.byKey;
  const ret: Record<string, any> = {};

  // Special case to handle the `+` key since we use it as a separator.
  hotkey = hotkey.replace("++", "+add");
  const values = hotkey.split("+");
  const { length } = values;

  // Ensure that all the modifiers are set to false unless the hotkey has them.
  for (const k in MODIFIERS) {
    ret[MODIFIERS[k]] = false;
  }

  for (let value of values) {
    const optional = value.endsWith("?");

    if (optional) {
      value = value.slice(0, -1);
    }

    const name = toKeyName(value);
    const modifier = MODIFIERS[name];

    if (length === 1 || !modifier) {
      if (byKey) {
        ret.key = name;
      } else {
        ret.which = toKeyCode(value);
      }
    }

    if (modifier) {
      ret[modifier] = !optional || null;
    }
    if (length === 1 && !modifier && byKey) {
      ret.shiftKey = null;
    }
  }

  return ret;
};
export const isHotkey = (
  hotkey: string | string[],
  event: KeyboardEvent | null,
  options?: { byKey?: boolean } | null
) => {
  if (!Array.isArray(hotkey)) {
    hotkey = [hotkey];
  }

  const array = hotkey.map((str) => parseHotkey(str, options || undefined));
  const check = (e: KeyboardEvent) =>
    array.some((object) => compareHotkey(object, e));
  const ret = event == null ? check : check(event);
  return ret;
};

export const isCharacter = (event: KeyboardEvent) => {
  return (
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !isHotkey("ctrl", event) &&
    !isHotkey("alt", event) &&
    !isHotkey("shift", event) &&
    !isHotkey("cmd", event) &&
    !isHotkey("capslock", event) &&
    !isHotkey("pageup", event) &&
    !isHotkey("pagedown", event) &&
    !isHotkey("pageup", event) &&
    !isHotkey("esc", event) &&
    !isHotkey("pause", event) &&
    !isHotkey("home", event) &&
    !isHotkey("right", event) &&
    !isHotkey("left", event) &&
    !isHotkey("down", event) &&
    !isHotkey("up", event) &&
    !isHotkey("backspace", event)
  );
};

export const isCodeHotkey = (hotkey: string | string[], event: null) => {
  return isHotkey(hotkey, event, null);
};

export const isKeyHotkey = (
  hotkey: string | string[],
  event: KeyboardEvent | null
) => {
  return isHotkey(hotkey, event, { byKey: true });
};
