# Ideohint Template for Source Han Sans

This is a template for using [Caryll Ideohint](https://github.com/caryll/ideohint) to build Source Han Sans' TTF version. The template contains:

- The full set of [Source Han Sans](https://github.com/adobe-fonts/source-han-sans) in OTF.
- The corresponded parameters for hinting.
- MAKEFILE and corresponded support files.

To run this build you need...

 - Node.js:
     - Download it here: https://nodejs.org/en/
     - The installer will make it visible so don’t worry about PATH.
- GNU `make`.
- TTFAutohint:
  - Download it here: https://www.freetype.org/ttfautohint/
  - Make it visible in your PATH.
    - If you already made a folder into PATH and put `make` into it, then put `ttfautohint` into the same directory would work. No need to set the environment variable again, because you already did that.
- [*otfcc*](https://github.com/caryll/otfcc).
  - Download it here: https://github.com/caryll/otfcc
  - Make them (yes, there are two executables) visible in your PATH.
- **CPU. A LOT.** (It takes me about 30 hours to build on a 16-core server. Really.)

To run the hinting:

- Open your *Terminal* or *PowerShell*.
- `cd` into the directory containing this README.
- Type: `npm install`.
- Type: `node top`.
- Follow its instructions.
  - Once you decide to perform hinting, the results would be in the `out/` directory.