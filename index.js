var isPOT = require('is-power-of-two');

function checkPOT (label, value) {
  if (!isPOT(value)) {
    throw new Error(label + ' must be a power of two. got ' + label + ' = ' + value);
  }
}

module.exports = function (opts) {
  var i, ping, pong, uniforms, tmp, width, height;

  opts = opts || {};
  opts.forward = opts.forward === undefined ? true : opts.forward;
  opts.splitNormalization = opts.splitNormalization === undefined ? true : opts.splitNormalization;

  function swap () {
    tmp = ping;
    ping = pong;
    pong = tmp;
  }

  if (opts.size !== undefined) {
    width = height = opts.size;
    checkPOT('size', width);
  } else if (opts.width !== undefined && opts.height !== undefined) {
    width = opts.width;
    height = opts.height;
    checkPOT('width', width);
    checkPOT('height', width);
  } else {
    throw new Error('either size or both width and height must provided.');
  }

  // Swap to avoid collisions with the input:
  ping = opts.ping;
  if (opts.input === opts.pong) {
    ping = opts.pong;
  }
  pong = ping === opts.ping ? opts.pong : opts.ping;

  var xIterations = Math.round(Math.log(width) / Math.log(2));
  var yIterations = Math.round(Math.log(height) / Math.log(2));
  var iterations = xIterations + yIterations + 2;

  // Swap to avoid collisions with output:
  if (opts.output === ((iterations % 2 === 0) ? pong : ping)) {
    swap();
  }

  // If we've avoiding collision with output creates an input collision,
  // then you'll just have to rework your framebuffers and try again.
  if (opts.input === pong) {
    throw new Error([
      'not enough framebuffers to compute without copying data. You may perform',
      'the computation with only two framebuffers, but the output must equal',
      'the input when an even number of iterations are required.'
    ].join(' '));
  }

  function computeNorm (n) {
    if (opts.splitNormalization) {
      if (opts.forward) {
        return 1 / Math.sqrt(n);
      } else {
        return 1 / Math.sqrt(n);
      }
    } else {
      if (opts.forward) {
        return 1;
      } else {
        return 1 / n;
      }
    }
  }

  var resolution = [1.0 / width, 1.0 / height];

  var phase1 = [];
  for (i = 0; i < xIterations; i++) {
    phase1[i] = {
      horizontal: true,
      forward: !!opts.forward,
      resolution: resolution,
      subtransformSize: Math.pow(2, i + 1)
    };
  }

  var phase2 = [];
  for (i = 0; i < yIterations; i++) {
    phase2[i] = {
      horizontal: false,
      forward: !!opts.forward,
      resolution: resolution,
      subtransformSize: Math.pow(2, i + 1)
    };
  }

  // Assemble a list of phases:
  var phases = [{
    operation: 'fft',
    passes: phase1
  }, {
    operation: opts.forward ? 'untangle' : 'tangle',
    passes: [{
      resolution: resolution,
      horizontal: true,
      normalization: computeNorm(width)
    }]
  }, {
    operation: 'fft',
    passes: phase2
  }, {
    operation: opts.forward ? 'untangle' : 'tangle',
    passes: [{
      resolution: resolution,
      horizontal: false,
      normalization: computeNorm(height)
    }]
  }];

  if (!opts.forward) {
    phases.reverse();
  }

  // Assign alternating buffers for the computed passes:
  for (i = 0; i < phases.length; i++) {
    for (j = 0; j < phases[i].passes.length; j++) {
      phases[i].passes[j].input = ping;
      phases[i].passes[j].output = pong;
      swap();
    }
  }

  phases[0].passes[0].input = opts.input;
  phases[3].passes[phases[3].passes.length - 1].output = opts.output;

  return phases;
}
