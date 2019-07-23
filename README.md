# NesJs

Yet another NES emulator, in javascript for in the browser.

The CPU has almost all instructions emulated, but it is not cycle-accurate (and doesn't emulate the 'unstable' undocumented instructions).
The PPU has full background and sprite rendering, but it is also not cycle-accurate. The APU emulates all 5 channels, but it is again not fully accurate.
There are also some other inaccuracies (with OAM-DMA and such).
Most games however seem to run fine.

Standard controllers 1 and 2 are emulated.

Supports mapper 0 (NROM), 1 (MMC1), 2 (UxROM), 3 (CNROM), 4 (MMC3) and 7 (AxROM). The MMC3's IRQ emulation is not really accurate though.

There is no special handling for games with battery-saves.

## Demo

Try the demo online [here](https://elzo-d.github.io/NesJs/). To run the demo offline:
- Clone this repository.
- Open `index.html` in a browser. Messing around with the browsers autoplay policy might be required.

The emulator runs in Firefox, Chrome, Safari, Edge and Internet Explorer 11. IE11 does not have sound, due to lack of the web-audio-API.

Controllers 1 and 2 are emulated, with the following mapping:

| Button | Controller 1    | Controller 2 |
| ------ | --------------- | ------------ |
| Left   | Left arrow key  | J            |
| Right  | Right arrow key | L            |
| Up     | Up arrow key    | I            |
| Down   | Down arrow key  | K            |
| Start  | Enter           | P            |
| Select | Shift           | O            |
| B      | A               | T            |
| A      | Z               | G            |

Pressing M will make a save state, and pressing N will load it.

Roms can be loaded from zip-files as well, which will load the first file with a .nes extension it can find.

## Usage

To include the emulator:

```html
<!-- first include this file, followed by the mappers that are needed -->
<script src="nes/mapppers.js"></script>
<script src="mappers/nrom.js"></script>
<script src="mappers/mmc1.js"></script>
<!-- then include the rest -->
<script src="nes/cpu.js"></script>
<script src="nes/pipu.js"></script>
<script src="nes/apu.js"></script>
<script src="nes/nes.js"></script>

<!-- A global function called 'log', taking a string, is also needed, which gets called with status messages when loading roms, etc -->
<script>
  function log(str) {
    console.log(str)
    // or log to somewhere else, like a textarea-element
  }
</script>
```

Then, to use it:

```javascript
// create a nes object
let nes = new Nes()

// load a rom (rom as an Uint8Array)
if(nes.loadRom(rom)) {
  // after loading, do a hard reset
  nes.reset(true)
  // rom is now loaded
} else {
  // rom load failed
}

// run a frame (should be called 60 times per second)
nes.runFrame()

// get the image output
// data should be an Uint8Array with 256*240*4 values, 4 for each pixel (r, g, b, a), as in the data for a canvas-2d-context imageData object
nes.getPixels(data)

// get the sound output
// audioData should be an Float64Array with 735 values, as in the amount of samples per frame needed for 44.1 KHz (mono) audio
nes.getSamples(audioData)

// set controller state
nes.setButtonPressed(1, nes.INPUT.B) // player 1 is now pressing the B button
nes.setButtonPressed(2, nes.INPUT.SELECT) // player 2 is now pressing the select button
nes.setButtonReleased(1, nes.INPUT.B) // player 1 released B
nes.setButtonReleased(2, nes.INPUT.SELECT) // now no buttons are pressed anymore
// nes.INPUT contains A, B, SELECT, START, UP, DOWN, LEFT and RIGHT

// other functions
nes.reset() // soft reset (as in the reset button being pressed)
nes.reset(true) // hard reset (as in the NES being turned off and on again)
let state = nes.getState() // get the full state as an object
if(nes.setState(state)) {
  // the state-object has been loaded
} else {
  // failed to load the state-object
}
```

## Credits

Thanks to the resources at [the nesdev wiki](http://wiki.nesdev.com/w/index.php/Nesdev_Wiki) and [the nesdev forums](https://forums.nesdev.com) for the test roms, documentation and some code snippets used for this.

Uses the [zip.js](https://gildas-lormeau.github.io/zip.js/) library for zipped rom loading support.

Licensed under the MIT License. See `LICENSE.txt` for details.
