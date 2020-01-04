
mappers[0] = function(nes, rom, header) {
  this.name = "NROM";
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
  }
  this.reset(true);
  this.saveVars = [
    "name", "chrRam", "prgRam", "ppuRam"
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
    if(this.h.banks === 2) {
      return adr & 0x7fff;
    }
    return adr & 0x3fff;
  }

  this.getMirroringAdr = function(adr) {
    if(this.h.verticalMirroring) {
      return adr & 0x7ff;
    } else {
      // horizontal
      return (adr & 0x3ff) | ((adr & 0x800) >> 1);
    }
  }

  this.getChrAdr = function(adr) {
    return adr;
  }

  this.peak = function(adr) {
    return this.read(adr);
  }

  this.read = function(adr) {
    if(adr < 0x6000) {
      return 0; // not readable
    }
    if(adr < 0x8000) {
      return this.prgRam[adr & 0x1fff];
    }
    return this.rom[this.h.base + this.getRomAdr(adr)];
  }

  this.write = function(adr, value) {
    if(adr < 0x6000 || adr >= 0x8000) {
      return; // no mapper registers
    }
    this.prgRam[adr & 0x1fff] = value;
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
