
function NsfPlayer() {

  this.cpu = new Cpu(this);
  this.apu = new Apu(this);

  this.ram = new Uint8Array(0x800);

  // internally used
  this.callArea = new Uint8Array(0x10);

  this.totalSongs = 0;
  this.startSong = 0;
  this.tags = {
    name: "",
    artist: "",
    copyright: ""
  }

  this.playReturned = true;

  this.frameIrqWanted = false;
  this.dmcIrqWanted = false;

  // this.mapper = new NsfMapper(this);

  this.loadNsf = function(nsf) {
    if(nsf.length < 0x80) {
      log("Invalid NSF loaded");
      return false;
    }
    if(
      nsf[0] !== 0x4e || nsf[1] !== 0x45 || nsf[2] !== 0x53 ||
      nsf[3] !== 0x4d || nsf[4] !== 0x1a
    ) {
      log("Invalid NSF loaded");
      return false;
    }
    if(nsf[5] !== 1) {
      log("Unknown NSF version: " + nsf[5]);
      return false;
    }
    this.totalSongs = nsf[6];
    this.startSong = nsf[7];
    let loadAdr = nsf[8] | (nsf[9] << 8);
    if(loadAdr < 0x8000) {
      log("Load address less than 0x8000 is not supported");
      return false;
    }
    let initAdr = nsf[0xa] | (nsf[0xb] << 8);
    let playAdr = nsf[0xc] | (nsf[0xd] << 8);
    this.tags = {
      name: "",
      artist: "",
      copyright: ""
    }
    for(let i = 0; i < 32; i++) {
      if(nsf[0xe + i] === 0) {
        break;
      }
      this.tags.name += String.fromCharCode(nsf[0xe + i]);
    }
    for(let i = 0; i < 32; i++) {
      if(nsf[0x2e + i] === 0) {
        break;
      }
      this.tags.artist += String.fromCharCode(nsf[0x2e + i]);
    }
    for(let i = 0; i < 32; i++) {
      if(nsf[0x4e + i] === 0) {
        break;
      }
      this.tags.copyright += String.fromCharCode(nsf[0x4e + i]);
    }
    // TODO: play speed, pal/ntsc, extra chips
    let initBanks = [0, 0, 0, 0, 0, 0, 0, 0];
    let total = 0;
    for(let i = 0; i < 8; i++) {
      initBanks[i] = nsf[0x70 + i];
      total += nsf[0x70 + i];
    }
    banking = total > 0;
    // set up the NSF mapper
    this.mapper = new NsfMapper(nsf, loadAdr, banking, initBanks);
    // set up the call area
    this.callArea[0] = 0x20; // JSR
    this.callArea[1] = initAdr & 0xff;
    this.callArea[2] = initAdr >> 8;
    this.callArea[3] = 0xea // NOP
    this.callArea[4] = 0xea // NOP
    this.callArea[5] = 0xea // NOP
    this.callArea[6] = 0xea // NOP
    this.callArea[7] = 0xea // NOP
    this.callArea[8] = 0x20; // JSR
    this.callArea[9] = playAdr & 0xff;
    this.callArea[0xa] = playAdr >> 8;
    this.callArea[0xb] = 0xea // NOP
    this.callArea[0xc] = 0xea // NOP
    this.callArea[0xd] = 0xea // NOP
    this.callArea[0xe] = 0xea // NOP
    this.callArea[0xf] = 0xea // NOP

    this.playSong(this.startSong);
    log("Loaded NSF file");
    return true;
  }

  this.playSong = function(songNum) {
    // also acts as a reset
    for(let i = 0; i < this.ram.length; i++) {
      this.ram[i] = 0;
    }
    this.playReturned = true;
    this.apu.reset();
    this.cpu.reset();
    this.mapper.reset();
    this.frameIrqWanted = false;
    this.dmcIrqWanted = false;
    for(let i = 0x4000; i <= 0x4013; i++) {
      this.apu.write(i, 0);
    }
    this.apu.write(0x4015, 0);
    this.apu.write(0x4015, 0xf);
    this.apu.write(0x4017, 0x40);

    // run the init routine
    this.cpu.br[0] = 0x3ff0;
    this.cpu.r[0] = songNum - 1;
    this.cpu.r[1] = 0;
    // don't allow init to take more than 10 frames
    let cycleCount = 0;
    let finished = false;
    while(cycleCount < 297800) {
      this.cpu.cycle();
      this.apu.cycle();
      if(this.cpu.br[0] === 0x3ff5) {
        // we are in the nops after the init-routine, it finished
        finished = true;
        break;
      }
      cycleCount++;
    }
    if(!finished) {
      log("Init did not finish within 10 frames");
    }
  }

  this.runFrame = function() {
    // run the cpu until either a frame has passed, or the play-routine returned
    if(this.playReturned) {
      this.cpu.br[0] = 0x3ff8;
    }
    this.playReturned = false;
    let cycleCount = 0;
    while(cycleCount < 29780) {
      this.cpu.irqWanted = this.dmcIrqWanted || this.frameIrqWanted;
      if(!this.playReturned) {
        this.cpu.cycle();
      }
      this.apu.cycle();
      if(this.cpu.br[0] === 0x3ffd) {
        // we are in the nops after the play-routine, it finished
        this.playReturned = true;
      }
      cycleCount++;
    }
  }

  this.getSamples = function(data, count) {
    // apu returns 29780 or 29781 samples (0 - 1) for a frame
    // we need count values (0 - 1)
    let samples = this.apu.getOutput();
    let runAdd = (29780 / count);
    let total = 0;
    let inputPos = 0;
    let running = 0;
    for(let i = 0; i < count; i++) {
      running += runAdd;
      let total = 0;
      let avgCount = running & 0xffff;
      for(let j = inputPos; j < inputPos + avgCount; j++) {
        total += samples[1][j];
      }
      data[i] = total / avgCount;
      inputPos += avgCount;
      running -= avgCount;
    }
  }

  this.read = function(adr) {
    adr &= 0xffff;

    if(adr < 0x2000) {
      // ram
      return this.ram[adr & 0x7ff];
    }
    if(adr < 0x3ff0) {
      // ppu ports, not readable in NSF
      return 0;
    }
    if(adr < 0x4000) {
      // special call area used internally by player
      return this.callArea[adr & 0xf];
    }
    if(adr < 0x4020) {
      // apu/misc ports
      if(adr === 0x4014) {
        return 0; // not readable
      }
      if(adr === 0x4016 || adr === 0x4017) {
        return 0; // not readable in NSF
      }
      return this.apu.read(adr);
    }
    return this.mapper.read(adr);
  }

  this.write = function(adr, value) {
    adr &= 0xffff;

    if(adr < 0x2000) {
      // ram
      this.ram[adr & 0x7ff] = value;
      return;
    }
    if(adr < 0x4000) {
      // ppu ports, not writable in NSF
      return;
    }
    if(adr < 0x4020) {
      // apu/misc ports
      if(adr === 0x4014 || adr === 0x4016) {
        // not writable in NSF
        return;
      }
      this.apu.write(adr, value);
      return;
    }
    this.mapper.write(adr, value);
  }
}
