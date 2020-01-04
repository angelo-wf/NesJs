
mappers[2] = function(nes, rom, header) {
  this.name = "UxROM";
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
  }
  this.reset(true);
  this.saveVars = [
    "name", "chrRam", "ppuRam", "prgBank"
  ];

  this.getBattery = function() {
    return [];
  }

  this.setBattery = function(data) {
    return true;
  }

  this.getRomAdr = function(adr) {
    let final = 0;
    if(adr < 0xc000) {
      final = this.prgBank * 0x4000 + (adr & 0x3fff);
    } else {
      final = (this.h.banks - 1) * 0x4000 + (adr & 0x3fff);
    }
    return final & this.h.prgAnd;
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
    if(adr < 0x8000) {
      return 0; // not readable
    }
    return this.rom[this.h.base + this.getRomAdr(adr)];
  }

  this.write = function(adr, value) {
    if(adr < 0x8000) {
      return; // no mapper registers or prg-ram
    }
    this.prgBank = value;
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
