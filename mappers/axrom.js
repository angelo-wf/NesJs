
mappers[7] = function(nes, rom, header) {
  this.name = "AxROM";
  this.version = 1;

  this.nes = nes;

  this.rom = rom;

  this.h = header;

  this.chrRam = new Uint8Array(0x2000);
  this.ppuRam = new Uint8Array(0x800);

  this.reset = function(hard) {
    if(hard) {
      // clear chr ram
      for(let i = 0; i < this.chrRam.length; i++) {
        this.chrRam[i] = 0;
      }
      // clear ppu ram
      for(let i = 0; i < this.ppuRam.length; i++) {
        this.ppuRam[i] = 0;
      }
    }

    this.prgBank = 0;
    this.mirroring = 0;
  }
  this.reset(true);
  this.saveVars = [
    "name", "chrRam", "ppuRam", "prgBank", "mirroring"
  ];

  this.getBattery = function() {
    return [];
  }

  this.setBattery = function(data) {
    return true;
  }

  this.getRomAdr = function(adr) {
    let final = this.prgBank * 0x8000 + (adr & 0x7fff);
    return final & this.h.prgAnd;
  }

  this.getMirroringAdr = function(adr) {
    if(this.mirroring === 0) {
      // A
      return adr & 0x3ff;
    } else {
      // B
      return 0x400 + (adr & 0x3ff);
    }
  }

  this.getChrAdr = function(adr) {
    return adr;
  }

  this.peak = function(adr) {
    return this.read(adr);
  }

  this.read = function(adr) {
    if(adr < 0x8000) {
      return 0; // not readable
    }
    return this.rom[this.h.base + this.getRomAdr(adr)];
  }

  this.write = function(adr, value) {
    if(adr < 0x8000) {
      return; // no mapper registers or rpg-ram
    }
    this.prgBank = value & 0xf;
    this.mirroring = (value & 0x10) >> 4;
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
