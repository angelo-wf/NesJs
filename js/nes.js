
function Nes() {

  // ram
  this.ram = new Uint8Array(0x800);
  // cpu
  this.cpu = new Cpu(this);
  // ppu
  this.ppu = new Ppu(this);
  // mapper / rom
  this.mapper;

  // cycle timer, to sync cpu/ppu
  this.cycles = 0;

  // oam dma
  this.inDma = false;
  this.dmaTimer = 0;
  this.dmaBase = 0;
  this.dmaValue = 0;

  // controller
  this.currentControlState = 0;
  this.latchedControlState = 0;
  this.controllerLatched = false;

  this.loadRom = function(rom) {
    if(
      rom[0] !== 0x4e || rom[1] !== 0x45 ||
      rom[2] !== 0x53 || rom[3] !== 0x1a
    ) {
      log("Invalid rom loaded");
      return false;
    }
    let mapper = (rom[6] >> 4) | (rom[7] & 0xf0);
    if(mapper !== 0) {
      log("Unsupported mapper: " + mapper);
      return false;
    }
    this.mapper = new Nrom(this, rom);
    log(
      "Loaded NROM rom: " + this.mapper.banks + " PRG bank(s), " +
      this.mapper.chrBanks + " CHR bank(s)"
    );
    return true;
  }

  this.getPixels = function(data) {
    this.ppu.setFrame(data);
  }

  this.hardReset = function() {
    // initialize ram to zeroes
    for(let i = 0; i < this.ram.length; i++) {
      this.ram[i] = 0;
    }
    // reset everything else
    this.reset();
  }

  this.reset = function() {
    this.cpu.reset();
    this.ppu.reset();
    this.mapper.reset();
    this.cycles = 0;
    this.inDma = false;
    this.dmaTimer = 0;
    this.dmaBase = 0;
    this.dmaValue = 0;
    this.latchedControlState = 0;
    this.controllerLatched = false;
  }

  this.cycle = function() {
    if(this.cycles % 3 === 0) {
      // do a cpu cycle every 3 ppu cycles

      // handle controller latch
      if(this.controllerLatched) {
        this.latchedControlState = this.currentControlState;
      }

      if(!this.inDma) {
        this.cpu.cycle();
      } else {
        // handle dma
        if(this.dmaTimer > 0) {
          if((this.dmaTimer & 1) == 0) {
            // even cycles are write to ppu
            this.ppu.write(4, this.dmaValue);
          } else {
            // odd cycles are read for value
            this.dmaValue = this.read(
              this.dmaBase + ((this.dmaTimer / 2) & 0xff)
            );
          }
        }
        this.dmaTimer++;
        if(this.dmaTimer == 514) {
          this.dmaTimer = 0;
          this.inDma = false;
        }
      }
    }
    this.ppu.cycle();
    this.cycles++;
  }

  this.runFrame = function() {
    do {
      this.cycle()
    } while(!(this.ppu.line === 0 && this.ppu.dot === 0));
  }

  // cpu read
  this.read = function(adr) {
    adr &= 0xffff;
    if(adr < 0x2000) {
      // ram
      return this.ram[adr & 0x7ff];
    }
    if(adr < 0x4000) {
      // ppu ports
      return this.ppu.read(adr & 0x7);
    }
    if(adr < 0x4020) {
      // apu/misc ports
      // TODO: apu
      if(adr === 0x4014) {
        return 0; // not readable
      }
      if(adr === 0x4016) {
        let ret = this.latchedControlState & 1;
        this.latchedControlState >>= 1;
        this.latchedControlState |= 0x80; // set bit 7
        return ret;
      }
      return 0; //not inplemented yet
    }
    return this.mapper.read(adr);
  }

  // cpu write
  this.write = function(adr, value) {
    adr &= 0xffff;
    if(adr < 0x2000) {
      // ram
      this.ram[adr & 0x7ff] = value;
      return;
    }
    if(adr < 0x4000) {
      // ppu ports
      this.ppu.write(adr & 0x7, value);
      return;
    }
    if(adr < 0x4020) {
      // apu/misc ports
      // TODO: apu
      if(adr === 0x4014) {
        this.inDma = true;
        this.dmaBase = value << 8;
        return;
      }
      if(adr === 0x4016) {
        if((value & 0x01) > 0) {
          this.controllerLatched = true;
        } else {
          this.controllerLatched = false;
        }
        return;
      }
      return; // not inplemented yet
    }
    this.mapper.write(adr, value);
  }
}
