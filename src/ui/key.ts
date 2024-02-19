const table: { [k: number]: string } = {
  188: ',',
  190: '.',
  192: '`',
  189: '-',
  187: '=',
  219: '[',
  220: '\\',
  221: ']',
  173: '-',
  61: '=',
  8: '<backspace>',
  9: '<tab>',
  32: '<space>',
  27: '<esc>',
  186: ';',
  222: "'",
  191: '/',
  13: '<return>',
  38: '<up>',
  40: '<down>',
  39: '<right>',
  37: '<left>',
};

const shift_table: { [k: string]: string } = {
  ',': '<',
  '.': '>',
  '`': '~',
  '-': '_',
  '=': '+',
  '[': '{',
  '\\': '|',
  ']': '}',
  ';': ':',
  "'": "\"",
  '/': '?',
  '1': '!',
  '2': '@',
  '3': '#',
  '4': '$',
  '5': '%',
  '6': '^',
  '7': '&',
  '8': '*',
  '9': '(',
  '0': ')',
};


export function key(e: KeyboardEvent) {
  const keyCode = (e as any).keyCode;

  var base = '[' + keyCode + ']';
  if ((keyCode > 64 && keyCode <= 64 + 26)
    || (keyCode >= 48 && keyCode <= 48 + 9)) {
    base = String.fromCharCode(keyCode).toLowerCase();
  }
  if (table[keyCode]) {
    base = table[keyCode];
  }
  if (e.shiftKey) {
    if (keyCode == 16) {
      return '<shift>';
    }
    if (shift_table[base]) {
      base = shift_table[base];
    }
    else {
      base = 'S-' + base;
    }
  }
  if (e.ctrlKey) {
    if (keyCode == 17)
      return '<ctrl>';
    base = 'C-' + base;
  }
  if (e.altKey) {
    if (keyCode == 18)
      return '<alt>';
    base = 'A-' + base;
  }
  if (e.metaKey)
    base = 'M-' + base;
  return base;
}
