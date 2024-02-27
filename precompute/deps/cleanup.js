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

console.log('digraph {');
edges.forEach(({src,tgt}) => {
  console.log(`"${src}" -> "${tgt}";`);
});
console.log('}');
