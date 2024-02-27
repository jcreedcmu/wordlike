const fs = require('fs');
const path = require('path');

function normalize(x) {
  return x.replace(/^\/src\//, '');
}

const edges = fs.readFileSync('/tmp/edges', 'utf8').split('\n').filter(x => x.length > 0).map(line => {
  let m;
  if (m = line.match(/(.*):(.*)/)) {
    const src = '/' + m[1].replace(/\.tsx?$/, '');
    const tgt = path.resolve(path.dirname(src), m[2]);
    return {src: normalize(src), tgt: normalize(tgt)}
  }
  else {
    throw new Error(`Can't parse ${line}`);
  }
});

const deps = {};
const seen = {};
edges.forEach(({src, tgt}) => {
  seen[src] = 1;
  seen[tgt] = 1;
  if (!deps[src])
    deps[src] = [];
  deps[src].push(tgt);
});

const cycles = [];
const cache = {};

function getDepth(x, path) {
  if (cache[x] === undefined) {
    if (path == undefined)
      path = [];
    if (path.includes(x)) {
      cycles.push([...path, x].map(x => ' ' + x).join("\n"));
      return Infinity;
    }
    if (deps[x] == undefined)
      return 0;
    cache[x] = 1 + Math.max(...deps[x].map(d => getDepth(d, [...path, x])));
  }
  return cache[x];
}

let icount = 0;
Object.keys(seen).forEach(file => {
  const depth = getDepth(file);
  if (depth == Infinity) {
    icount++;
  }
});

console.log(`${cycles.length} cycles found, ${icount} infinities found`);
cycles.forEach(c => console.log('---\n'+ c));


Object.keys(seen).forEach(file => {
  const depth = getDepth(file);
  console.log(`${file}: ${depth}`);
});
