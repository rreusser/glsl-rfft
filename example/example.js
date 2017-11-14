var fft = require('../');

console.log(fft({
  width: 4,
  height: 4,
  input: 0,
  ping: 1,
  pong: 2,
  output: 0,
  forward: true,
  splitNormalization: true
}));
