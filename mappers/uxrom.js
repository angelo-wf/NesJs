
function Uxrom(nes, rom, header) {
  this.name = "UxROM";

  this.nes = nes;

  this.rom = rom;

  this.banks = header.banks;
  this.chrBanks = header.chrBanks;
  this.verticalMirroring = header.verticalMirroring;
  this.base = 0x10 + (header.trainer ? 512 : 0);

  let neededLength = this.base + 0x4000 * this.banks + 0x2000 * this.chrBanks;
  if(this.rom.length < neededLength) {
    throw new Error("rom is not complete");
  }

  this.chrRam = new Uint8Array(0x2000);

  this.reset = function(hard) {
    if(hard) {
      // clear chr ram
      for(let i = 0; i < this.chrRam.length; i++) {
        this.chrRam[i] = 0;
      }
    }

    this.prgBank = 0;
  }
  this.reset(true);

  this.getRomAdr = function(adr) {
    let bank = this.prgBank & (this.banks - 1);
    if(adr < 0xc000) {
      return bank * 0x4000 + (adr & 0x3fff);
    } else {
      return (this.banks - 1) * 0x4000 + (adr & 0x3fff);
    }
  }

  this.ppuLineEnd = function() {};

  this.read = function(adr) {
    if(adr < 0x8000) {
      return 0; // not readable
    }
    return this.rom[this.base + this.getRomAdr(adr)];
  }

  this.write = function(adr, value) {
    if(adr < 0x8000) {
      return; // no mapper registers or rpg-ram
    }
    this.prgBank = value;
  }

  // return if this read had to come from internal and which address
  // or else the value itself
  this.ppuRead = function(adr) {
    if(adr < 0x2000) {
      if(this.chrBanks === 0) {
        return [true, this.chrRam[adr]];
      } else {
        return [true, this.rom[this.base + 0x4000 * this.banks + adr]];
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
      if(this.chrBanks === 0) {
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
