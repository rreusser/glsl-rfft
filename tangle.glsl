vec4 tangle (sampler2D src, vec2 resolution, bool horizontal, float normalization) {
  vec2 pos = gl_FragCoord.xy * resolution;
  vec2 res = horizontal ? resolution.xy : resolution.yx;
  vec4 uv = horizontal ? pos.xyxy : pos.yxyx;
  vec2 sgn = vec2(0.5);

  bool regularRow = uv.x > res.x && (uv.x < 0.5 || uv.x > 0.5 + res.x);
  bool specialCol = uv.y < res.y || (uv.y > 0.5 && uv.y < 0.5 + res.y);

  if (regularRow && (horizontal || specialCol)) {
    sgn = vec2(1.0);

    if (uv.x < 0.5) {
      if (uv.y > 0.5) {
        uv.xy += 0.5;
      } else {
        uv.zw += 0.5;
        sgn.y = -1.0;
      }
    } else {
      uv.xz = 0.5 + res.x - uv.xz;

      if (uv.y > 0.5) {
        uv.xw += 0.5;
        sgn.y = -1.0;
      } else {
        uv.yz += 0.5;
      }
    }

    uv = mod(uv, 1.0);
  }

  if (!horizontal) {
    uv = uv.yxwz;
  }

  return normalization * (
    sgn.x * texture2D(src, uv.xy) +
    sgn.y * texture2D(src, uv.zw)
  );
}

#pragma glslify: export(tangle)
