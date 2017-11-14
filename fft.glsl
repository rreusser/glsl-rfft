const float TWOPI = 6.283185307179586;
const float PI2 = 1.5707963267948966;

vec4 fft (
  sampler2D src,
  vec2 resolution,
  float subtransformSize,
  bool horizontal,
  bool forward
) {
  vec2 twiddle;
  vec4 rePos, imPos, evenVal, oddRe, oddIm;;
  float index, evenIndex, twiddleArgument;

  vec2 pos = gl_FragCoord.xy * resolution;
  bool real = (horizontal ? pos.y : pos.x) < 0.5;

  index = (horizontal ? gl_FragCoord.x : gl_FragCoord.y) - 0.5;

  evenIndex = floor(index / subtransformSize) *
    (subtransformSize * 0.5) +
    mod(index, subtransformSize * 0.5) +
    0.5;

  if (horizontal) {
    rePos = vec4(evenIndex, gl_FragCoord.y, evenIndex, gl_FragCoord.y);
  } else {
    rePos = vec4(gl_FragCoord.x, evenIndex, gl_FragCoord.x, evenIndex);
  }

  rePos *= resolution.xyxy;

  if (horizontal) {
    rePos.z += 0.5;
  } else {
    rePos.w += 0.5;
  }

  imPos = rePos;

  if (horizontal) {
    if (real) {
      imPos.yw += 0.5;
    } else {
      rePos.yw -= 0.5;
    }
  } else {
    if (real) {
      imPos.xz += 0.5;
    } else {
      rePos.xz -= 0.5;
    }
  }

  evenVal = texture2D(src, real ? rePos.xy : imPos.xy);
  oddRe = texture2D(src, rePos.zw);
  oddIm = texture2D(src, imPos.zw);

  twiddleArgument = (forward ? TWOPI : -TWOPI) * (index / subtransformSize);
  if (!real) twiddleArgument -= PI2;
  twiddle = vec2(cos(twiddleArgument), sin(twiddleArgument));

  return evenVal + twiddle.x * oddRe + -twiddle.y * oddIm;
}

#pragma glslify: export(fft)
