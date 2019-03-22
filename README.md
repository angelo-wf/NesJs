# NesJs

Yet another NES emulator, in javascript.

In development.

The CPU emulation seems to be mostly functional, although none of the undocumented opcodes are implemented (yet). The PPU emulation also seems to be mostly functional, except for 8*16 sprite mode. There is no APU emulation (yet?).

Currently only supports mapper 0 (NROM).

Controller 1 is emulated, using the arrow keys for the d-pad, enter for Start, shift for Select, the A key for B and the Z key for A.

Roms can be loaded from zip-files as well, which will load the first file with a .nes extension it can find.

# Usage

- Clone this repository.
- Download [zip.js](https://gildas-lormeau.github.io/zip.js/).
- Create a `lib` folder and copy `WebContent/zip.js` and `WebContent/inflate.js` from zip.js into it.
- Open `index.html` in a browser.

Including `js/testing.js` instead of `js/main.js`, and uncommenting the `js/nestest.nes.js` and `js/nestest.log.js` scripts runs a simple test comparing this emulator running nestest with a 'golden' nestest log. Currently runs equally until it starts using undocumented opcodes.

# Credits

Thanks to the resources at [the nesdev wiki](http://wiki.nesdev.com/w/index.php/Nesdev_Wiki) for the test roms, documentation and some code snippets used for this.

Uses the [zip.js](https://gildas-lormeau.github.io/zip.js/) library for zipped rom loading support.
