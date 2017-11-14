/*
const h = require('h');
const fs = require('fs');
const fft = require('../');
const css = require('insert-css');
const path = require('path');
const resl = require('resl');
const regl = require('regl');
const glsl = require('glslify');
const iota = require('iota-array');
const ndarray = window.ndarray = require('ndarray');
const ndFFT = window.ndFFT = require('ndarray-fft');
const show = require('ndarray-show');
const ops = require('ndarray-ops');

var seed = 1;
function random () {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

const width = 8;
const height = 8;

regl({
  canvas: h('canvas', {width: width, height: height}),
  pixelRatio: 1,
  attributes: {antialias: false},
  onDone: require('fail-nicely')(regl => start(regl)),
  optionalExtensions: ['oes_texture_float'],
  extensions: ['oes_texture_half_float']
})

function start (regl) {
  var data = iota(width * height).map(random);
  //data[0] = 1;

  const ar = ndarray(data.slice(), [height / 2, width]);
  const ai = ndarray(data.map((d, i) => data[i + width * height / 2]), [height / 2, width]);
  const acr = ndarray(data.slice(), [width, height]);
  const aci = ndarray(data.slice().fill(0), [width, height]);

  const input = new Array(width * height * 4).fill(0).map((i, d) => data[Math.floor(d / 4)]);

  const fbos = [0, 1, 2].map(() => regl.framebuffer({
    color: regl.texture({width: width, height: height, data: input, format: 'rgba', type: 'float'})
  }));

  const operations = {
    fft: regl({
      vert: `
        precision mediump float;
        attribute vec2 xy;
        void main () {
          gl_Position = vec4(xy, 0, 1);
        }
      `,
      frag: glsl(`
        precision highp float;
        #pragma glslify: fft = require(../)
        uniform sampler2D src;
        uniform vec2 resolution;
        uniform float subtransformSize, normalization;
        uniform bool horizontal, forward;

        void main () {
          gl_FragColor = fft(src, resolution, subtransformSize, horizontal, forward);
        }
      `),
      uniforms: {
        resolution: regl.prop('resolution'),
        forward: regl.prop('forward'),
        subtransformSize: regl.prop('subtransformSize'),
        horizontal: regl.prop('horizontal'),
        normalization: regl.prop('normalization'),
        real: regl.prop('real'),
        src: (ctx, props) => fbos[props.input],
      },
      attributes: {xy: [-4, -4, 4, -4, 0, 4]},
      framebuffer: (ctx, props) => fbos[props.output],
      depth: {enable: false},
      count: 3
    }),
    untangle: regl({
      vert: `
        precision mediump float;
        attribute vec2 xy;
        void main () {
          gl_Position = vec4(xy, 0, 1);
        }
      `,
      frag: glsl(`
        precision highp float;
        #pragma glslify: untangle = require(../untangle)
        uniform sampler2D src;
        uniform vec2 resolution;
        uniform bool horizontal;

        void main () {
          gl_FragColor = untangle(src, resolution, horizontal);
        }
      `),
      uniforms: {
        resolution: regl.prop('resolution'),
        forward: regl.prop('forward'),
        subtransformSize: regl.prop('subtransformSize'),
        horizontal: regl.prop('horizontal'),
        normalization: regl.prop('normalization'),
        real: regl.prop('real'),
        src: (ctx, props) => fbos[props.input],
      },
      attributes: {xy: [-4, -4, 4, -4, 0, 4]},
      framebuffer: (ctx, props) => fbos[props.output],
      depth: {enable: false},
      count: 3
    }),
    tangle: regl({
      vert: `
        precision mediump float;
        attribute vec2 xy;
        void main () {
          gl_Position = vec4(xy, 0, 1);
        }
      `,
      frag: glsl(`
        precision highp float;
        #pragma glslify: tangle = require(../tangle)
        uniform sampler2D src;
        uniform vec2 resolution;
        uniform bool horizontal;
        uniform float normalization;

        void main () {
          gl_FragColor = tangle(src, resolution, horizontal, normalization);
        }
      `),
      uniforms: {
        resolution: regl.prop('resolution'),
        forward: regl.prop('forward'),
        subtransformSize: regl.prop('subtransformSize'),
        horizontal: regl.prop('horizontal'),
        normalization: regl.prop('normalization'),
        real: regl.prop('real'),
        src: (ctx, props) => fbos[props.input],
      },
      attributes: {xy: [-4, -4, 4, -4, 0, 4]},
      framebuffer: (ctx, props) => fbos[props.output],
      depth: {enable: false},
      count: 3
    })
  };

  const forward = fft({width: width, height: height, input: 0, ping: 1, pong: 2, output: 0});
  const inverse = fft({width: width, height: height, input: 0, ping: 1, pong: 2, output: 0, forward: false});

  let applied = [];
  function apply (op) {
    if (op.passes) op = [op];
    applied = applied.concat(op);
    for (i = 0; i < op.length; i++) {
      operations[op[i].operation](op[i].passes);
    }
  }
  function setOutput (op, num) {
    op.passes[op.passes.length - 1].output = num || 0;
  }
  function setInput (op, num) {
    op.passes[op.passes.length - 1].input = num || 0;
  }

  //setInput(forward[3]);
  //setOutput(forward[3], 1);
  //setInput(inverse[0], 1);
  //setOutput(inverse[0]);

  apply(forward[0]);
  apply(forward[1]);
  apply(forward[2]);
  apply(forward[3]);
  apply(inverse[0]);
  apply(inverse[1]);
  apply(inverse[2]);
  apply(inverse[3]);

  console.log(applied);

  fbos[0].use(() => {
    const data = regl.read();
    const nd = ndarray(data, [height, width, 4]);
    ops.divseq(nd, 8 * 8);
    console.log('computed = \n' + show(nd.pick(null, null, 0)));
  });
}
*/
