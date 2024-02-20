function leftPad(s: string, pad: string, len: number) {
  if (pad.length == 0)
    throw new Error(`can't pad with empty string`);
  while (s.length < len) s = pad + s;
  return s;
}

export function formatTime(x_in_ms: number) {

  const x_in_s = Math.floor(x_in_ms / 1000);
  let rv = leftPad(`${x_in_s % 60}`, '0', 2);

  const x_in_minutes = Math.floor(x_in_s / 60);
  const minutes = x_in_minutes % 60;
  const minutes_str = leftPad(`${minutes}`, '0', 2);

  const x_in_hours = Math.floor(x_in_minutes / 60);
  const hours = x_in_hours;
  const hours_str = leftPad(`${hours}`, '0', 2);

  rv = `${minutes_str}:${rv}`;

  if (hours > 0)
    rv = `${hours_str}:${rv}`;

  return rv;
}
