const h = require('h');
const fs = require('fs');
const rfft = require('../');
const css = require('insert-css');
const path = require('path');
const resl = require('resl');
const regl = require('regl');
const glsl = require('glslify');
const mobile = require('is-mobile')();

css(fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8'));

const radiusSlider = h('input', {type: 'range', min: 0, max: 50, step: 0.1, id: 'radius', value: 10});
const angleSlider = h('input', {type: 'range', min: 0, max: 180, step: 1, id: 'angle', value: 0});
const radiusReadout = h('span', {class: 'readout'});
const angleReadout = h('span', {class: 'readout'});
const controls = h('div', [
  h('div', [h('label', 'Radius:', {for: 'radius'}), radiusSlider, radiusReadout]),
  h('div', [h('label', 'Angle:', {for: 'angle'}), angleSlider, angleReadout]),
]);
const root = h('div', {id: 'root'});
document.body.appendChild(root);
document.body.appendChild(controls);

resl({
  manifest: {mist: {type: 'image', src: 'mist.jpg'}},
  onDone: ({mist}) => {
    regl({
      pixelRatio: 1,
      container: root,
      attributes: {antialias: false},
      onDone: require('fail-nicely')(regl => start(regl, mist)),
      optionalExtensions: ['oes_texture_float'],
      extensions: ['oes_texture_half_float']
    })
  }
})


function start (regl, mist) {
  const width = regl._gl.canvas.width;
  const height = regl._gl.canvas.height;
  const res = [1.0 / width, 1.0 / height];
  const img = regl.texture({data: mist, flipY: true});
  const type = (regl.hasExtension('oes_texture_float') && !mobile) ? 'float' : 'half float';
  const fbos = [0, 1, 2, 3].map(() => regl.framebuffer({colorType: type, width: width, height: height}));

  function createOperator (opts) {
    return regl({
      vert: opts.vert || `
        precision mediump float;
        attribute vec2 xy;
        void main () {
          gl_Position = vec4(xy, 0, 1);
        }
      `,
      frag: opts.frag,
      uniforms: Object.assign({
        resolution: regl.prop('resolution'),
        forward: regl.prop('forward'),
        subtransformSize: regl.prop('subtransformSize'),
        horizontal: regl.prop('horizontal'),
        normalization: regl.prop('normalization'),
        src: regl.prop('input')
      }, opts.uniforms || {}),
      attributes: {xy: [-4, -4, 4, -4, 0, 4]},
      framebuffer: regl.prop('output'),
      depth: {enable: false},
      count: 3
    });
  }

  const operators = {
    fft: createOperator({frag: glsl(`
      precision highp float;
      #pragma glslify: fft = require(../fft)
      uniform sampler2D src;
      uniform vec2 resolution;
      uniform float subtransformSize;
      uniform bool horizontal, forward;
      void main () {
        gl_FragColor = vec4(fft(src, resolution, subtransformSize, horizontal, forward).xyz, 1.0);
      }
    `)}),
    untangle: createOperator({frag: glsl(`
      precision highp float;
      #pragma glslify: untangle = require(../untangle)
      uniform sampler2D src;
      uniform vec2 resolution;
      uniform bool horizontal;
      uniform float normalization;
      void main () {
        gl_FragColor = vec4(untangle(src, resolution, horizontal, normalization).xyz, 1.0);
      }
    `)}),
    tangle: createOperator({frag: glsl(`
      precision highp float;
      #pragma glslify: tangle = require(../tangle)
      uniform sampler2D src;
      uniform vec2 resolution;
      uniform bool horizontal;
      uniform float normalization;
      void main () {
        gl_FragColor = vec4(tangle(src, resolution, horizontal, normalization).xyz, 1.0);
      }
    `)}),
    spot: createOperator({
      frag: glsl(`
        precision mediump float;
        uniform vec2 resolution;
        void main () {
          vec2 uv = gl_FragCoord.xy * resolution;
          vec2 p = mod(uv - resolution - 0.5, 1.0) - 0.5;
          float r1 = 1.0 / 512.0;
          float r2 = 50.0 / 512.0;
          float l = length(p);
          gl_FragColor = vec4(
            vec3(
              (l < r1 ? 0.9 : 0.0) +
              (l < r2 ? 0.1 : 0.0)
            ), 1.0);
        }
      `)
    }),
    convolve: createOperator({
      frag: glsl(`
        precision mediump float;
        uniform sampler2D src1, src2;
        uniform vec2 resolution;
        void main () {
          vec2 uv = gl_FragCoord.xy * resolution;

          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

          vec4 uv1 = uv.xyxy;
          vec4 uv2 = uv.xyxy;
          float im = 1.0;

          if (uv.x < resolution.x || (uv.x > 0.5 && uv.x < 0.5 + resolution.x)) {
            if (uv.y < resolution.y || (uv.y > 0.5 && uv.y < 0.5 + resolution.y)) {
              im = 0.0;
            } else {
              uv2.yw += 0.5;
            }
          } else {
            uv2 += 0.5;
          }
          uv2 = mod(uv2, 1.0);

          vec4 re1 = texture2D(src1, uv1.xy);
          vec4 im1 = texture2D(src1, uv1.zw);
          vec4 re2 = texture2D(src2, uv2.xy);
          vec4 im2 = texture2D(src2, uv2.zw);

          if (uv.x < resolution.x || (uv.x > 0.5 && uv.x < 0.5 + resolution.x)) {
            if (uv.y < resolution.y || (uv.y > 0.5 && uv.y < 0.5 + resolution.y)) {
              gl_FragColor = vec4(256.0);
            } else {
              gl_FragColor = (re1 * im2 - re2 * im1) * 0.0;
            }
          } else {
            gl_FragColor = (re1 * im2 + re2 * im1) * 0.0;
          }
        }
      `),
      uniforms: {
        src1: regl.prop('input1'),
        src2: regl.prop('input2')
      }
    })
  };

  function execute (phases, opts) {
    phases[0].passes[0].input = opts.input;
    phases[phases.length - 1].passes[phases[phases.length - 1].passes.length - 1].output = opts.output;
    for (var i = 0; i < phases.length; i++) {
      operators[phases[i].operation](phases[i].passes);
    }
  }

  const forwardFFT = rfft({
    width: width,
    height: height,
    ping: fbos[1],
    pong: fbos[2],
  });

  const inverseFFT = rfft({
    width: width,
    height: height,
    ping: fbos[1],
    pong: fbos[2],
    forward: false
  });

  operators.spot({
    resolution: res,
    output: fbos[3]
  });

  execute(forwardFFT, {
    input: fbos[3],
    output: fbos[3]
  });

  execute(forwardFFT, {
    input: img,
    output: fbos[1]
  });

  operators.convolve({
    input1: fbos[1],
    input2: fbos[3],
    output: fbos[0],
    resolution: res,
  });

  execute(inverseFFT, {
    input: fbos[0],
    output: null
  });

}
