
function Nrom(nes, rom) {

  this.nes = nes;

  this.rom = rom;

  this.banks = rom[4];
  this.chrBanks = rom[5];
  this.verticalMirroring = (rom[6] & 1) > 0;

  this.chrRam = new Uint8Array(0x2000);
  this.hasChrRam = false
  if(this.chrBanks === 0) {
    this.hasChrRam = true;
  }

  this.prgRam = new Uint8Array(0x2000);

  this.reset = function() {
    // clear chr ram
    for(let i = 0; i < this.chrRam.length; i++) {
      this.chrRam[i] = 0;
    }
    // clear prg ram
    for(let i = 0; i < this.rpgRam.length; i++) {
      this.rpgRam[i] = 0;
    }
  }

  this.read = function(adr) {
    if(adr < 0x6000) {
      return 0; // not readable
    }
    if(adr < 0x8000) {
      return this.prgRam[adr & 0x1fff];
    }
    if(this.banks === 2) {
      return this.rom[0x10 + (adr & 0x7fff)];
    } else {
      return this.rom[0x10 + (adr & 0x3fff)];
    }
  }

  this.write = function(adr, value) {
    if(adr < 0x6000 || adr >= 0x8000) {
      return; // no mapper registers
    }
    this.prgRam[adr & 0x1fff] = value;
  }

  // return if this read had to come from internal and which address
  // or else the value itself
  this.ppuRead = function(adr) {
    if(adr < 0x2000) {
      if(this.hasChrRam) {
        return [true, this.chrRam[adr]];
      } else {
        return [true, this.rom[0x10 + 0x4000 * this.banks + adr]];
      }
    } else {
      if(this.verticalMirroring) {
        return [false, (adr & 0x7ff)];
      } else {
        // horizontal
        return [false, ((adr & 0x3ff) | ((adr & 0x800) >> 1))];
      }
    }
  }

  // return if this write had to go to internal and which address
  // or else only that the write happened
  this.ppuWrite = function(adr, value) {
    if(adr < 0x2000) {
      if(this.hasChrRam) {
        this.chrRam[adr] = value;
        return [true, 0];
      } else {
        // not writable
        return [true, 0];
      }
    } else {
      if(this.verticalMirroring) {
        return [false, (adr & 0x7ff)];
      } else {
        // horizontal
        return [false, ((adr & 0x3ff) | ((adr & 0x800) >> 1))];
      }
    }
  }

}
