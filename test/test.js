var test = require('tape');
var regl = require('regl');
var transform = require('../');
var iota = require('iota-array');
var glsl = require('glslify');
var show = require('ndarray-show');
var ndarray = require('ndarray');
var ndFft = require('ndarray-fft');
var pool = require('ndarray-scratch');
var almostEqual = require('almost-equal');
var ndt = require('ndarray-tests');
var ops = require('ndarray-ops');

var seed = 1;
function random () {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

test('regl', function (t) {
  var canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;

  regl({
    canvas: canvas,
    extensions: ['oes_texture_float'],
    onDone: function (err, regl) {
      if (err) {
        t.notOk('fail');
        t.end();
      }

      var fbos;

      function createOperator (frag) {
        return regl({
          vert: `
            precision mediump float;
            attribute vec2 xy;
            void main () {
              gl_Position = vec4(xy, 0, 1);
            }
          `,
          frag: frag,
          uniforms: {
            resolution: regl.prop('resolution'),
            forward: regl.prop('forward'),
            subtransformSize: regl.prop('subtransformSize'),
            horizontal: regl.prop('horizontal'),
            normalization: regl.prop('normalization'),
            src: (ctx, props) => fbos[props.input],
          },
          attributes: {xy: [-4, -4, 4, -4, 0, 4]},
          framebuffer: (ctx, props) => fbos[props.output],
          depth: {enable: false},
          count: 3
        });
      }

      var operators = {
        fft: createOperator(glsl(`
          precision highp float;
          #pragma glslify: fft = require(../fft)
          uniform sampler2D src;
          uniform vec2 resolution;
          uniform float subtransformSize;
          uniform bool horizontal, forward;
          void main () {
            gl_FragColor = fft(src, resolution, subtransformSize, horizontal, forward);
          }
        `)),
        untangle: createOperator(glsl(`
          precision highp float;
          #pragma glslify: untangle = require(../untangle)
          uniform sampler2D src;
          uniform vec2 resolution;
          uniform bool horizontal;
          uniform float normalization;
          void main () {
            gl_FragColor = untangle(src, resolution, horizontal, normalization);
          }
        `)),
        tangle: createOperator(glsl(`
          precision highp float;
          #pragma glslify: tangle = require(../tangle)
          uniform sampler2D src;
          uniform vec2 resolution;
          uniform bool horizontal;
          uniform float normalization;
          void main () {
            gl_FragColor = tangle(src, resolution, horizontal, normalization);
          }
        `)),
      };

      function read(fbo) {
        var data;
        fbo.use(() => data = regl.read());
        return data;
      }

      function execute (phases) {
        for (var i = 0; i < phases.length; i++) {
          operators[phases[i].operation](phases[i].passes);
        }
      }

      function testFFT (M, N, tol) {
        var label = 'size: ' + M + ' x ' + N + ': ';
        var i, j, forward, inverse;
        var M2 = M / 2 + 1;
        var N2 = N / 2 + 1;
        var input = new Array(M * N * 4).fill(0).map(d => random() - 0.5);

        var Ar0 = ndarray(new Float32Array(input.slice()), [M, N, 4]);
        var Ar = ndarray(new Float32Array(input.slice()), [M, N, 4]);
        var Ai = ndarray(new Float32Array(input.slice().fill(0)), [M, N, 4]);

        for (j = 0; j < 4; j++) {
          ndFft(1, Ar.pick(null, null, j), Ai.pick(null, null, j));
        }
        ops.divseq(Ar, Math.sqrt(M * N));
        ops.divseq(Ai, Math.sqrt(M * N));

        fbos = [0, 1, 2].map(function () {
          return regl.framebuffer({
            color: regl.texture({
              type: 'float',
              format: 'rgba',
              data: ndarray(input, [M, N, 4]).transpose(1, 0),
              width: N,
              height: M
            })
          })
        });

        forward = transform({width: N, height: M, input: 0, ping: 1, pong: 2, output: 0, forward: true, splitNormalization: true});
        inverse = transform({width: N, height: M, input: 0, ping: 1, pong: 2, output: 0, forward: false, splitNormalization: true});

        execute(forward);

        B = ndarray(read(fbos[0]), [M, N, 4]);

        t.ok(ndt.equal(B.hi(M, N2 - 1).lo(0, 1), Ar.hi(M, N2 - 1).lo(0, 1), tol), label + 'FFT(A)[ 0:M, 1:N/2-1 ]');
        t.ok(ndt.equal(B.lo(0, N2), Ai.hi(M, N2 - 1).lo(0, 1), tol), label + 'FFT(A)[ 0:M, N/2:N ]:');
        t.ok(ndt.equal(B.hi(M2, 1), Ar.hi(M2, 1), tol), label + 'FFT(A)[ 0:M/2, 0:1 ]');
        t.ok(ndt.equal(B.hi(M, 1).lo(M2, 0), Ai.hi(M2 - 1, 1).lo(1, 0), tol), label + 'FFT(A)[ M/2:M, 0:1 ]');
        t.ok(ndt.equal(B.hi(M2, N2).lo(0, N2 - 1), Ar.hi(M2, N2).lo(0, N2 - 1), tol), label + 'FFT(A)[ 0:M/2, N/2-1:N/2 ]');
        t.ok(ndt.equal(B.hi(M, N2).lo(M2, N2 - 1), Ai.hi(M2 - 1, N2).lo(1, N2 - 1), tol), label + 'FFT(A)[ M/2:M, N/2-1:N ]');

        execute(inverse);

        B = ndarray(read(fbos[0]), [M, N, 4]);

        t.ok(ndt.equal(B, Ar0, 4e-4), label + 'A[ 0:M, 0:N ]');

        fbos.forEach(fbo => fbo.destroy());
      }

      testFFT(4, 4, 1e-6);
      testFFT(8, 4, 5e-6);
      testFFT(16, 4, 1e-5);
      testFFT(32, 4, 5e-5);
      testFFT(64, 4, 5e-5);

      testFFT(4, 8, 5e-6);
      testFFT(8, 8, 5e-6);
      testFFT(16, 8, 1e-5);
      testFFT(32, 8, 5e-5);
      testFFT(64, 8, 5e-5);

      testFFT(4, 16, 1e-5);
      testFFT(8, 16, 1e-5);
      testFFT(16, 16, 1e-5);
      testFFT(32, 16, 5e-5);
      testFFT(64, 16, 1e-4);

      testFFT(4, 32, 5e-5);
      testFFT(8, 32, 5e-5);
      testFFT(16, 32, 5e-5);
      testFFT(32, 32, 5e-5);
      testFFT(64, 32, 1e-4);

      testFFT(256, 256, 5e-4);
      testFFT(512, 256, 1e-3);
      testFFT(256, 512, 1e-3);

      regl.destroy();

      t.end();
    }
  });
});
