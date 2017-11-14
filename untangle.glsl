vec4 untangle (sampler2D src, vec2 resolution, bool horizontal, float normalization) {
  vec2 pos = gl_FragCoord.xy * resolution;
  float res = horizontal ? resolution.x : resolution.y;
  vec4 uv = horizontal ? pos.xyxy : pos.yxyx;

  uv.x = res - uv.x;
  vec2 sgn = vec2(0.5);

  if (uv.x < -0.5) sgn.x = -0.5;
  if (uv.y > 0.5) sgn = sgn.yx;
  if (uv.x < -0.5) uv += 0.5;

  uv = mod(uv, 1.0);

  if (!horizontal) {
    if (pos.x > resolution.x && (pos.x < 0.5 || pos.x > 0.5 + resolution.x)) {
      // These two rows are a pass-through. This is a bit of a waste,
      // but we have to transfer everything anyway, so what's a bit
      // of extra math compared to all the sines and cosines in the
      // fft passes?
      sgn = vec2(0.5);
      uv.xyzw = pos.xyxy;
    } else {
      // Otherwise flip the computation to vertical and apply it for
      // columns 0 and N / 2:
      uv = uv.yxwz;
    }
  }

  return normalization * (
    sgn.x * texture2D(src, uv.xy) +
    sgn.y * texture2D(src, uv.zw)
  );
}

#pragma glslify: export(untangle)
