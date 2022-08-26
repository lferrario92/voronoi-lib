/* eslint-disable */
function Point (x, y) {
  return {x: x, y: y};
}

export function Hex (q, r, s) {
  if (!s) {
    s = -q-r
  }
  if (Math.round(q + r + s) !== 0) throw "q + r + s must be 0";
  return {q: q, r: r, s: s};
}

function Cube (q, r, s) {
  if (Math.round(q + r + s) !== 0) throw "q + r + s must be 0";
  return {q: q, r: r, s: s};
}

function qoffset_to_cube(offset, h) {
    var q = h.col;
    var r = h.row - (h.col + offset * (h.col & 1)) / 2;
    var s = -q - r;
    if (offset !== EVEN && offset !== ODD)
    {
        throw "offset must be EVEN (+1) or ODD (-1)";
    }
    return Hex(q, r, s);
}

export function hex_lerp(a, b, t) {
  return Hex(a.q * (1.0 - t) + b.q * t, a.r * (1.0 - t) + b.r * t, a.s * (1.0 - t) + b.s * t);
}

function cube_subtract(a, b) {
  return Cube(a.q - b.q, a.r - b.r, a.s - b.s)
}

function cube_distance(a, b) {
  var vec = cube_subtract(a, b)
  return Math.max(Math.abs(vec.q), Math.abs(vec.r), Math.abs(vec.s))
}

export function distance (a, b) {
  var q = a.q
  var r = a.r
  var s = -q-r
  
  let origin = Cube(q, r, s)

  q = b.q
  r = b.r
  s = -q-r

  let destination = Cube(q, r, s)

  let vector = Cube(origin.q - destination.q, origin.r - destination.r, origin.s - destination.s)

  return Math.max(Math.abs(vector.q), Math.abs(vector.r), Math.abs(vector.s))
}
