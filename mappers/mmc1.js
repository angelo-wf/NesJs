
mappers[1] = function(nes, rom, header) {
  this.name = "MMC1";
  this.version = 1;

  this.nes = nes;

  this.rom = rom;

  this.h = header;

  this.chrRam = new Uint8Array(0x2000);
  this.prgRam = new Uint8Array(0x2000);
  this.ppuRam = new Uint8Array(0x800);

  this.reset = function(hard) {
    if(hard) {
      // clear chr ram
      for(let i = 0; i < this.chrRam.length; i++) {
        this.chrRam[i] = 0;
      }
      // clear prg ram, only if not battery backed
      if(!this.h.battery) {
        for(let i = 0; i < this.prgRam.length; i++) {
          this.prgRam[i] = 0;
        }
      }
      // clear ppu ram
      for(let i = 0; i < this.ppuRam.length; i++) {
        this.ppuRam[i] = 0;
      }
    }

    this.shiftReg = 0;
    this.shiftCount = 0;

    this.mirroring = 0;
    this.prgMode = 3;
    this.chrMode = 1;
    this.chrBank0 = 0;
    this.chrBank1 = 0;
    this.prgBank = 0;
    this.ramEnable = 0;
  }
  this.reset(true);
  this.saveVars = [
    "name", "chrRam", "prgRam", "ppuRam", "shiftReg", "shiftCount", "mirroring",
    "prgMode", "chrMode", "chrBank0", "chrBank1", "prgBank", "ramEnable"
  ];

  this.getBattery = function() {
    return Array.prototype.slice.call(this.prgRam);
  }

  this.setBattery = function(data) {
    if(data.length !== 0x2000) {
      return false;
    }
    this.prgRam = new Uint8Array(data);
    return true;
  }

  this.getRomAdr = function(adr) {
    let final = 0;
    switch(this.prgMode) {
      case 0:
      case 1: {
        final = 0x8000 * (this.prgBank >> 1) + (adr & 0x7fff);
        break;
      }
      case 2: {
        if(adr < 0xc000) {
          final = adr & 0x3fff;
        } else {
          final = this.prgBank * 0x4000 + (adr & 0x3fff);
        }
        break;
      }
      case 3: {
        if(adr < 0xc000) {
          final = this.prgBank * 0x4000 + (adr & 0x3fff);
        } else {
          final = (this.h.banks - 1) * 0x4000 + (adr & 0x3fff);
        }
        break;
      }
    }
    return final & this.h.prgAnd;
  }

  this.getMirroringAdr = function(adr) {
    switch(this.mirroring) {
      case 0: {
        // 1-screen A
        return adr & 0x3ff;
      }
      case 1: {
        // 1-screen B
        return 0x400 + (adr & 0x3ff);
      }
      case 2: {
        // vertical
        return adr & 0x7ff;
      }
      case 3: {
        // horizontal
        return (adr & 0x3ff) | ((adr & 0x800) >> 1);
      }
    }
  }

  this.getChrAdr = function(adr) {
    let final = 0;
    if(this.chrMode === 1) {
      if(adr < 0x1000) {
        final = this.chrBank0 * 0x1000 + (adr & 0xfff);
      } else {
        final = this.chrBank1 * 0x1000 + (adr & 0xfff);
      }
    } else {
      final = (this.chrBank0 >> 1) * 0x2000 + (adr & 0x1fff);
    }
    return final & this.h.chrAnd;
  }

  this.peak = function(adr) {
    return this.read(adr);
  }

  this.read = function(adr) {
    if(adr < 0x6000) {
      return 0; // not readable
    }
    if(adr < 0x8000) {
      if(this.ramEnable === 1) {
        return 0; // not enabled
      }
      return this.prgRam[adr & 0x1fff];
    }
    return this.rom[this.h.base + this.getRomAdr(adr)];
  }

  this.write = function(adr, value) {
    if(adr < 0x6000) {
      return; // no mapper registers
    }
    if(adr < 0x8000) {
      if(this.ramEnable === 1) {
        return; // not enabled
      }
      this.prgRam[adr & 0x1fff] = value;
      return;
    }
    if((value & 0x80) > 0) {
      this.shiftCount = 0;
      this.shiftReg = 0;
    } else {
      this.shiftReg |= (value & 0x1) << this.shiftCount;
      this.shiftCount++;
      if(this.shiftCount === 5) {
        switch((adr & 0x6000) >> 13) {
          case 0: {
            this.mirroring = this.shiftReg & 0x3;
            this.prgMode = (this.shiftReg & 0xc) >> 2;
            this.chrMode = (this.shiftReg & 0x10) >> 4;
            break;
          }
          case 1: {
            this.chrBank0 = this.shiftReg;
            break;
          }
          case 2: {
            this.chrBank1 = this.shiftReg;
            break;
          }
          case 3: {
            this.prgBank = this.shiftReg & 0xf;
            this.ramEnable = (this.shiftReg & 0x10) >> 4;
            break;
          }
        }
        this.shiftCount = 0;
        this.shiftReg = 0;
      }
    }
  }

  this.ppuPeak = function(adr) {
    return this.ppuRead(adr);
  }

  // ppu-read
  this.ppuRead = function(adr) {
    if(adr < 0x2000) {
      if(this.h.chrBanks === 0) {
        return this.chrRam[this.getChrAdr(adr)];
      } else {
        return this.rom[this.h.chrBase + this.getChrAdr(adr)];
      }
    } else {
      return this.ppuRam[this.getMirroringAdr(adr)];
    }
  }

  // ppu-write
  this.ppuWrite = function(adr, value) {
    if(adr < 0x2000) {
      if(this.h.chrBanks === 0) {
        this.chrRam[this.getChrAdr(adr)] = value;
        return;
      } else {
        // not writable
        return;
      }
    } else {
      return this.ppuRam[this.getMirroringAdr(adr)] = value;
    }
  }

}
