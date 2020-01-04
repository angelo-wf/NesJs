
mappers[3] = function(nes, rom, header) {
  this.name = "CNROM";
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

    this.chrBank = 0;
  }
  this.reset(true);
  this.saveVars = [
    "name", "chrRam", "ppuRam", "chrBank"
  ];

  this.getBattery = function() {
    return [];
  }

  this.setBattery = function(data) {
    return true;
  }

  this.getRomAdr = function(adr) {
    if(this.banks === 2) {
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
    let final = this.chrBank * 0x2000 + (adr & 0x1fff);
    return final & this.h.chrAnd;
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
      return; // no mapper registers or prg ram
    }
    this.chrBank = value;
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
