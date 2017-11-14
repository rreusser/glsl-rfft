# glsl-rfft

> GLSL setup for performing a [Fast Fourier Transform][fft] of real-valued input

## Installation

```sh
$ npm install glsl-rfft
```

## Example

```javascript
var rfft = require('glsl-rfft');

// Set up a forward transform:
var forwardTransform = rfft({
  width: 4,
  height: 4,
  input: 0,
  ping: 1,
  pong: 2,
  output: 0,
  forward: true,
  splitNormalization: true
}));

// Output is a list of passes:
// => [{
//   operation: 'fft',
//   passes:[
//     {horizontal: true, forward: true, resolution: [0.25, 0.25], subtransformSize: 2, input: 0, output: 2},
//     {horizontal: true, forward: true, resolution: [0.25, 0.25], subtransformSize: 4, input: 2, output: 1}
//   ]
// }, {
//   operation: 'untangle',
//   passes:[
//     {resolution: [0.25, 0.25], horizontal: true, normalization: 0.5, input: 1, output: 2}
//   ]},
// {
//   operation: 'fft',
//   passes:[
//     {horizontal: false, forward: true, resolution: [0.25, 0.25], subtransformSize: 2, input: 2, output: 1},
//     {horizontal: false, forward: true, resolution: [0.25, 0.25], subtransformSize: 4, input: 1, output: 2}
//   ]
// },{
//   operation: 'untangle',
//   passes:[
//     {resolution: [0.25, 0.25], horizontal: false, normalization: 0.5, input: 2, output: 0}
//   ]
// }]
```

Usage of the GLSL fragment shader using the above parameters as uniforms for the `fft` phase:

```glsl
precision highp float;

#pragma glslify: fft = require(glsl-rfft/fft)

uniform sampler2D src;
uniform vec2 resolution;
uniform float subtransformSize;
uniform bool horizontal, forward;

void main () {
  gl_FragColor = fft(src, resolution, subtransformSize, horizontal, forward);
}
```

See [test/test.js](test/test.js) for a fully worked forward and inverse transform using [regl][regl].

## Usage 

### What does it compute?

This shader computes the 2D [Fast Fourier Transform][fft] of four real-valued input matrices contained in a single four-channel floating point (or half float) WebGL texture. Each channel contains one of four real-valued input matrices. The results match and are tested against [ndarray-fft][ndarray-fft].

The output follows the format of Moreland and Angel <a href="#user-content-fftonagpu">[1]</a>. To within a sign, it contains every unique entry of the full complex FFT, but the output is compressed to fit in the same storage space as the input. See <a href="#user-content-fftonagpu">[1]</a> for more details.

### What is required?

This module does not interface with WebGL or have WebGL-specific peer dependencies. It only performs the setup work and exposes a fragment shader that performs the Fourier transform.

This module is designed for use with [glslify][glslify], though it's not required. It also works relatively effortlessly with [regl][regl], though that's also not required. At minimum, you'll need no less than two float or half-float WebGL framebuffers, including input, output, and two buffers to ping-pong back and forth between during the passes. The ping-pong framebuffers may include the input and output framebuffers as long as the parity of the number of steps permits the final output without requiring an extra copy operation.

The size of the textures must be a power of two, but not necessarily square.

### Is it fast?

As far as FFTs go, it's not great, in particular since it makes quite a few calls to `sin` and `cos` and requires `log2(M) + log2(N) + 2` passes for `M x N` input. Though it's much faster than transferring data to and from the GPU each time you need to compute a Fourier transform.

## JavaScript API

#### `require('glsl-rfft')(options)`

Perform the setup work required to compute the real-valued FFT. Input arguments are:

- `input` (`Any`): An identifier or object for the input framebuffer.
- `output` (`Any`): An identifier or object for the final output framebuffer.
- `ping` (`Any`): An identifier or object for the first ping-pong framebuffer.
- `pong` (`Any`): An identifier or object for the second ping-pong framebuffer.
- `forward` (`Boolean`): `true` if the transform is in the forward direction.
- `size` (`Number`): size of the input, equal to the `width` and `height`. Must be a power of two.
- `width` (`Number`): width of the input. Must be a power of two. Ignored if `size` is specified.
- `height` (`Number`): height of the input. Must be a power of two. Ignored if `size` is specifid.
- `splitNormalization`: (`Boolean`): If `true`, normalize by `1 / √(width * height)` on both the forward and inverse transforms. If `false`, normalize by `1 / (width * height)` on only the inverse transform. Default is `true`. Provided to avoid catastrophic overflow during the forward transform when using half-float textures. One-way transforms will match [ndarray-fft][ndarray-fft] only if `false`.

Returns a list of phases. Each phase is identified by the name of the the corresponding fragment shader and a list of uniforms for each individual pass. Each pass must be rendered to a full-screen quad or triangle from the input specified by `input` and to the output specified by `output`.

## GLSL API

#### `#pragma glslify: fft = require(glsl-rfft/fft)`
#### `vec4 fft(sampler2D src, vec2 resolution, float subtransformSize, bool horizontal, bool forward)`

Returns the `gl_FragColor` in order to perform a single pass of the FFT comptuation. Uniforms map directly to the output of the JavaScript setup function, with the exception of `src` which is a `sampler2D` for the input framebuffer or texture.

#### `#pragma glslify: untangle = require(glsl-rfft/untangle)`
#### `vec4 untangle(sampler2D src, vec2 resolution, bool horizontal, float normalization)`

Returns the `gl_FragColor` in order to untangle the output from a pass of the FFT computation.

#### `#pragma glslify: tangle = require(glsl-rfft/tangle)`
#### `vec4 tangle(sampler2D src, vec2 resolution, bool horizontal, float normalization)`

Returns the `gl_FragColor` in order to tangle the output from a pass of the FFT computation.

## See also

- [ndarray-fft][ndarray-fft]
- [glsl-fft][glsl-fft]

## References

<a href="#user-content-fftonagpu" id="fftonagpu">[1]</a> Moreland, K., Angel, E., [The FFT on a GPU][fftonagpu], Graphics Hardware (2003).

## License

&copy; Ricky Reusser 2017. MIT License. Based on the [filtering example][dli] of David Li. See LICENSE for more details.

[glslify]: https://github.com/glslify/glslify
[fft]: https://en.wikipedia.org/wiki/Fast_Fourier_transform
[dli]: https://github.com/dli/filtering
[regl]: https://github.com/regl-project/regl
[ndarray-fft]: https://github.com/scijs/ndarray-fft
[glsl-fft]: https://github.com/rreusser/glsl-fft
[gaussian]: https://en.wikipedia.org/wiki/Gaussian_blur
[fftonagpu]: http://www.kennethmoreland.com/fftgpu/fftgpu.pdf
