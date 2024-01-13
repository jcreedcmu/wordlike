export async function asyncReplace(str: string, re: RegExp, f: (x: RegExpExecArray) => Promise<string>): Promise<string> {
  const substrs = [];
  let match;
  let i = 0;
  while (true) {
    const match = re.exec(str);
    if (match == null)
      break;
    substrs.push(str.slice(i, match.index));
    substrs.push(f(match));
    i = re.lastIndex;
  }
  substrs.push(str.slice(i));
  return (await Promise.all(substrs)).join('');
};
