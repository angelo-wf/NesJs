# NesJs

## Notice

I have decided to archive this repository, as I don't see myself working on this emulator any longer. Javascript is simply not a good fit for emulator development, and some personal/mental issues mean that I don't really have the motivation to work on it further (or really, on emulation in general).

## Description

Yet another NES emulator, in javascript for in the browser.

The CPU has almost all instructions emulated, but it is not cycle-accurate (and doesn't emulate the 'unstable' undocumented instructions).
The PPU has full background and sprite rendering, but it is also not cycle-accurate. The APU emulates all 5 channels, but it is again not fully accurate.
There are also some other inaccuracies (with OAM-DMA and such).
Most games however seem to run fine (except the known broken games listed below).

Standard controllers 1 and 2 are emulated.

Supports mapper 0 (NROM), 1 (MMC1), 2 (UxROM), 3 (CNROM), 4 (MMC3) and 7 (AxROM). The MMC3's IRQ emulation is not really accurate though.

There is support for both save states and battery saves.

## Demo

Try the demo online [here](https://angelo-wf.github.io/NesJs/). To run the demo offline:
- Clone this repository.
- Open `index.html` in a browser. Messing around with the browsers autoplay policy might be required.
- The `Debugger` link at the bottom leads to `debug.html`, which contains a basic debugger.
- The `NsfJs` link at the bottom leads to `nsfplayer.html`, which contains an NSF player.

The emulator runs in Firefox, Chrome, Safari, Edge and Internet Explorer 11. IE11 does not have sound, due to lack of the web-audio-API. The debugger does not work in IE11. NsfJs technically works in IE11, but lack of audio means it does not have much use.

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

Save states and battery saves are stored in localStorage and therefore retained between visits/reloads and are shared between the normal and debugger version.

## Debugger

The [debugger](https://angelo-wf.github.io/NesJs/debug.html), accessed by loading `debug.html`, or the `Debugger` link, has basic debugging functionality.

It allows viewing the patterntables & palettes, the nametables, the CPU memory-space and a disassembly of all code that has been executed, with a mark at the current PC. Additionally, the current CPU and PPU state can be seen.

Single instructions or single frames can be executed, and read, write and execute breakpoints can be set within CPU address space. (Note that read and write breakpoint will pause emulation after the opcode that caused the read or write. Execute-breakpoints will pause emulation with the CPU ready to execute that instruction).

Stepping after pausing (or when a breakpoint triggered) might not immediately execute the pointed to opcode, the first step will instead finish the instruction that was running when emulation was paused.

## NSF player

[NsfJs](https://angelo-wf.github.io/NesJs/nsfplayer.html), accessed by loading `nsfplayer.html`, or the `NsfJs` link, is a basic NSF player.

It only supports standard NTSC timings, and only basic 2A03 audio is supported (so none of the expansion chips).

It shows the game/artist/copyright for the loaded NSF file, and bars indicating the volume and pitch for each channel (pulse 1, pulse 2, triangle, noise and DMC from left to right). The volume is based on the volume, envelope and the length counter for the pulse and noise channel, the length counters for the triangle channel and the sample-bytes left for the DMC. The pitch is based on the period-timer for each channel.

## Usage

To include the emulator:

```html
<!-- include this file, followed by the mappers that are needed -->
<script src="nes/mapppers.js"></script>
<script src="mappers/nrom.js"></script>
<script src="mappers/mmc1.js"></script>
<!-- and include the rest -->
<script src="nes/cpu.js"></script>
<script src="nes/pipu.js"></script>
<script src="nes/apu.js"></script>
<script src="nes/nes.js"></script>

<!-- A global function called 'log', taking a string, is also needed, which gets called with status messages
when loading roms, etc -->
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
let nes = new Nes();

// load a rom (rom as an Uint8Array)
if(nes.loadRom(rom)) {
  // after loading, do a hard reset
  nes.reset(true);
  // rom is now loaded
} else {
  // rom load failed
}

// run a frame (should be called 60 times per second)
nes.runFrame();

// get the image output
// data should be an Uint8Array with 256*240*4 values, 4 for each pixel (r, g, b, a),
// as in the data for a canvas-2d-context imageData object
nes.getPixels(data);
// for example:
// once
let ctx = canvas.getContext("2d");
let imgData = ctx.createImageData(256, 240);
// every frame
nes.getPixels(imgData.data);
ctx.putImageData(imgData, 0, 0);

// get the sound output
// audioData should be an Float64Array, and will be filled with the amount of samples specified
// (usually the sample rate divided by 60)
nes.getSamples(audioData, 44100 / 60);
// see js/audio.js for a example on how this can be played.
// the basic idea is to use an ScriptProcessorNode, fill a buffer (audioData above)
// with the samples and write it to a ring-buffer each frame, and have the ScriptProcessorNode's
// callback read from the ring-buffer, making sure that the read-position is always behind the write-position

// set controller state
nes.setButtonPressed(1, nes.INPUT.B); // player 1 is now pressing the B button
nes.setButtonPressed(2, nes.INPUT.SELECT); // player 2 is now pressing the select button
nes.setButtonReleased(1, nes.INPUT.B); // player 1 released B
nes.setButtonReleased(2, nes.INPUT.SELECT); // now no buttons are pressed anymore
// nes.INPUT contains A, B, SELECT, START, UP, DOWN, LEFT and RIGHT


// other functions (only call if a rom is loaded)

nes.reset(); // soft reset (as in the reset button being pressed, ram is retained)
nes.reset(true); // hard reset (as in the NES being turned off and on again, ram is reset)
let state = nes.getState(); // get the full state as an object
if(nes.setState(state)) {
  // the state-object has been loaded
} else {
  // failed to load the state-object
}
let battery = nes.getBattery(); // get the battery-backed ram, or undefined if the loaded rom does not have battery-backed ram
if(nes.setBattery(battery)) {
  // loaded battery data
  // (trying to load battery for a rom without battery-backed ram is also deemed successful)
} else {
  // failed to load battery data
}

nes.cycle(); // run a single PPU cycle (and a CPU cycle every three calls)
nes.peak(0x8000); // peaks a value from the CPU address-space (will have no side effects)
nes.mapper.ppuPeak(0x1204); // peaks a value from the PPU address-space (will have no side effects)
nes.read(0x2007); // reads a value from the CPU address-space (can have side effects)
nes.mapper.ppuRead(0x2690); // reads a value from the PPU address-space (can have side effects)
nes.write(0x0723, 0x12); // writes a value to the CPU address-space
nes.mapper.ppuWrite(0x23c0, 0x34); // Writes a value to the PPU address-space
// note that reading from PPU address-space does not allow reading the palette from 0x3f00-0x3fff
// it will return the nametable-data 'behind' it

// callbacks, these will be called during execution of nes.cycle() or nes.runFrame() when they are assigned a function
nes.onread = (address, value) => {console.log(`read ${value} from ${address}`)};
nes.onwrite = (address, value) => {console.log(`wrote ${value} to ${address}`)};
nes.onexecute = (address, value) => {console.log(`executed from ${address} (opcode byte: ${value})`)};

// more functions and properties are available, just checking the .js files themselves is probably the easiest way to see these
```

## Known broken games

These are games that are known to crash/freeze. Games with only (minor) graphical problems are not listed.
Almost all of those cases (and most of these cases as well) come down to the emulator not being cycle accurate.

- Battletoads
  - Freezes when starting stage 2
- Battletoads and Double Dragon
  - Freezes semi-randomly during stage 1
- Adventure of Lolo 3 (USA)
  - Freezes when entering level 1
- Adventure of Lolo 2 (USA) / Adventure of Lolo (J)
  - Freezes after HAI / copyright-screen
- MS. Pac-Man (Tengen)
  - Freezes on boot (grey screen)
- Bill & Ted's Excellent Adventure
  - Freezes on boot (grey screen)
- Huge Insect
  - Freezes on boot (grey screen)
- Vegas Dream
  - Freezes on boot (screen filled with single repeating tile)
- GI Joe - A Real American Hero
  - Freezes on boot (grey screen)
- GI Joe - The Atlantic Factor
  - Freezes on boot (black screen)


## Credits

Thanks to the resources at [the nesdev wiki](http://wiki.nesdev.com/w/index.php/Nesdev_Wiki) and [the nesdev forums](https://forums.nesdev.com) for the test roms, documentation and some code snippets used for this.

Uses the [zip.js](https://gildas-lormeau.github.io/zip.js/) library for zipped rom loading support.

Licensed under the MIT License. See `LICENSE.txt` for details.
