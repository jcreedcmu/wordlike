const fs = require('fs');
const path = require('path');

function normalize(x) {
  return x.replace(/^\/src\//, '');
}

const edges = fs.readFileSync('/tmp/edges', 'utf8').split('\n').filter(x => x.length > 0).sort().map(line => {
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
      cache[x] = Infinity;
      return Infinity;
    }
    if (deps[x] == undefined)
      return 0;
    const depDepths = deps[x].map(dep => ({dep, depth: getDepth(dep, [...path, x])}));
    for (const {dep, depth} of depDepths) {
      if (depth === Infinity) {
        cycles.push(`${x} infinite because ${dep} is`);
        cache[x] = Infinity;
        return Infinity;
      }
    }
    const nextDepth = 1 + Math.max(...depDepths.map(x => x.depth));
    cache[x] = nextDepth;
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

if (icount > 0) {
  console.log(`${cycles.length} cycles found, ${icount} infinities found`);
  cycles.forEach(c => console.log('---\n'+ c));

  Object.keys(seen).forEach(file => {
    const depth = getDepth(file);
    console.log(`${file}: ${depth}`);
  });

  process.exit(1);
}
