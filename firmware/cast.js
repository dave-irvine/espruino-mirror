const heatshrink = require('heatshrink');
const pre = Array(19).fill(0);
const post = Array(19).fill(255);

let casting = false;

if (!g.__origFlip) {
  g.__origFlip = g.flip;
}

NRF.setServices(
  {
    0xfeed: {
      0xfe01: {
        value: new Uint16Array([g.getWidth()]).buffer,
        description: 'Screen width (pixels)',
        readable: true,
      },
      0xfe02: {
        value: new Uint16Array([g.getHeight()]).buffer,
        description: 'Screen height (pixels)',
        readable: true,
      },
      0xfeed: {
        value: new Uint8Array(20).buffer,
        // maxLen: 20,
        description: 'Mirror bit-stream',
        readable: true,
        notify: true,
      },
    },
  },
  { advertise: ['FEED'], uart: true },
);

NRF.on('connect', function() {
  casting = true;
});

NRF.on('disconnect', function() {
  casting = false;
});

g.flip = function() {
  let buf = new Uint8Array(g.buffer);

  if (casting) {
    let compressed = heatshrink.compress(buf);
    buf = null;

    const cbuff = new Uint8Array(compressed);
    compressed = null;

    NRF.updateServices({
      0xfeed: {
        0xfeed: {
          value: pre,
          notify: true,
        },
      },
    });

    let chunkSize = 18;
    for (let i = 0; i < cbuff.length; i += chunkSize, chunkSize = 18) {
      const val = cbuff.slice(i, i + chunkSize);
      const final = [i].concat(val);

      NRF.updateServices({
        0xfeed: {
          0xfeed: {
            value: final,
            notify: true,
          },
        },
      });
    }

    NRF.updateServices({
      0xfeed: {
        0xfeed: {
          value: post,
          notify: true,
        },
      },
    });
  }

  g.__origFlip();
};
