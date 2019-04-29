
function Nes() {

  // ram
  this.ram = new Uint8Array(0x800);
  // cpu
  this.cpu = new Cpu(this);
  // ppu
  this.ppu = new Ppu(this);
  // apu
  this.apu = new Apu(this);
  // mapper / rom
  this.mapper;

  // current controller state, changes externally
  this.currentControl1State = 0;
  this.currentControl2State = 0;

  this.reset = function(hard) {
    if(hard) {
      for(let i = 0; i < this.ram.length; i++) {
        this.ram[i] = 0;
      }
    }
    this.cpu.reset();
    this.ppu.reset();
    this.apu.reset();
    if(this.mapper) {
      this.mapper.reset(hard);
    }

    // cycle timer, to sync cpu/ppu
    this.cycles = 0;

    // oam dma
    this.inDma = false;
    this.dmaTimer = 0;
    this.dmaBase = 0;
    this.dmaValue = 0;

    // controllers
    this.latchedControl1State = 0;
    this.latchedControl2State = 0;
    this.controllerLatched = false;

    // irq sources
    this.mapperIrqWanted = false;
    this.frameIrqWanted = false;
    this.dmcIrqWanted = false;
  }
  this.reset(true);
  this.saveVars = [
    "ram", "cycles", "inDma", "dmaTimer", "dmaBase", "dmaValue",
    "latchedControl1State", "latchedControl2State", "controllerLatched",
    "mapperIrqWanted", "frameIrqWanted", "dmcIrqWanted"
  ];

  this.loadRom = function(rom) {
    if(rom.length < 0x10) {
      log("Invalid rom loaded");
      return false;
    }
    if(
      rom[0] !== 0x4e || rom[1] !== 0x45 ||
      rom[2] !== 0x53 || rom[3] !== 0x1a
    ) {
      log("Invalid rom loaded");
      return false;
    }
    let header = this.parseHeader(rom);
    if(mappers[header.mapper] === undefined) {
      log("Unsupported mapper: " + header.mapper);
      return false;
    } else {
      try {
        this.mapper = new mappers[header.mapper](this, rom, header);
      } catch(e) {
        log("Rom load error: " + e);
        return false;
      }
    }
    log(
      "Loaded " + this.mapper.name + " rom: " + this.mapper.banks +
      " PRG bank(s), " + this.mapper.chrBanks + " CHR bank(s)"
    );
    return true;
  }

  this.parseHeader = function(rom) {
    return {
      banks: rom[4],
      chrBanks: rom[5],
      mapper: (rom[6] >> 4) | (rom[7] & 0xf0),
      verticalMirroring: (rom[6] & 0x01) > 0,
      battery: (rom[6] & 0x02) > 0,
      trainer: (rom[6] & 0x04) > 0,
      fourScreen: (rom[6] & 0x08) > 0,
    };
  }

  this.getPixels = function(data) {
    this.ppu.setFrame(data);
  }

  this.getSamples = function(data) {
    // apu returns 29780 or 29781 samples (0 - 1) for a frame
    // we need 735 values (-1 - 1)
    // get one every 40.5
    let samples = this.apu.getOutput();
    let total = 0;
    let inputPos = 0;
    for(let i = 0; i < 735; i++) {
      let total = 0;
      let avgCount = (i & 1) === 0 ? 40 : 41;
      for(let j = inputPos; j < inputPos + avgCount; j++) {
        total += samples[1][j];
      }
      data[i] = total / avgCount;
      inputPos += avgCount;
    }
  }

  this.cycle = function() {
    if(this.cycles % 3 === 0) {
      // do a cpu and apu cycle every 3 ppu cycles

      // handle controller latch
      if(this.controllerLatched) {
        this.latchedControl1State = this.currentControl1State;
        this.latchedControl2State = this.currentControl2State;
      }

      // handle irq
      if(this.mapperIrqWanted || this.frameIrqWanted || this.dmcIrqWanted) {
        this.cpu.irqWanted = true;
      } else {
        this.cpu.irqWanted = false;
      }

      if(!this.inDma) {
        this.cpu.cycle();
      } else {
        // handle dma
        if(this.dmaTimer > 0) {
          if((this.dmaTimer & 1) === 0) {
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
        if(this.dmaTimer === 513) {
          this.dmaTimer = 0;
          this.inDma = false;
        }
      }

      this.apu.cycle();
    }
    this.ppu.cycle();
    this.cycles++;
  }

  this.runFrame = function() {
    do {
      this.cycle()
    } while(!(this.ppu.line === 240 && this.ppu.dot === 0));
  }

  this.getState = function() {
    let cpuObj = this.getObjState(this.cpu);
    let ppuObj = this.getObjState(this.ppu);
    let apuObj = this.getObjState(this.apu);
    let mapperObj = {};
    if(this.mapper) {
      mapperObj = this.getObjState(this.mapper);
    }
    let final = this.getObjState(this);
    final["cpu"] = cpuObj;
    final["ppu"] = ppuObj;
    final["apu"] = apuObj;
    final["mapper"] = mapperObj;
    return final;
  }

  this.setState = function(obj) {
    this.setObjState(this.cpu, obj.cpu);
    this.setObjState(this.ppu, obj.ppu);
    this.setObjState(this.apu, obj.apu);
    if(this.mapper) {
      this.setObjState(this.mapper, obj.mapper);
    }
    this.setObjState(this, obj);
  }

  this.getObjState = function(obj) {
    let ret = {};
    for(let i = 0; i < obj.saveVars.length; i++) {
      let name = obj.saveVars[i];
      let val = obj[name];
      if(val instanceof Uint8Array || val instanceof Uint16Array) {
        ret[name] = Array.prototype.slice.call(val);
      } else {
        ret[name] = val;
      }
    }
    return ret;
  }

  this.setObjState = function(obj, save) {
    for(let i = 0; i < obj.saveVars.length; i++) {
      let name = obj.saveVars[i];
      let val = obj[name];
      if(val instanceof Uint8Array) {
        obj[name] = new Uint8Array(save[name]);
      } else if(val instanceof Uint16Array) {
        obj[name] = new Uint16Array(save[name]);
      } else {
        obj[name] = save[name];
      }
    }
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
      if(adr === 0x4014) {
        return 0; // not readable
      }
      if(adr === 0x4016) {
        let ret = this.latchedControl1State & 1;
        this.latchedControl1State >>= 1;
        this.latchedControl1State |= 0x80; // set bit 7
        // supposed to be open bus, but is usually the high byte of the address
        // which is 0x4016, so open bus would be 0x40
        return ret | 0x40;
      }
      if(adr === 0x4017) {
        let ret = this.latchedControl2State & 1;
        this.latchedControl2State >>= 1;
        this.latchedControl2State |= 0x80; // set bit 7
        // same as 0x4016
        return ret | 0x40;
      }
      return this.apu.read(adr);
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
      this.apu.write(adr, value);
      return;
    }
    this.mapper.write(adr, value);
  }
}
