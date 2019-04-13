
function Axrom(nes, rom, header) {
  this.name = "AxROM";

  this.nes = nes;

  this.rom = rom;

  this.banks = header.banks;
  this.chrBanks = header.chrBanks;
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
    this.mirroring = 0;
  }
  this.reset(true);

  this.getRomAdr = function(adr) {
    let bank = this.prgBank & ((this.banks / 2) - 1);
    return bank * 0x8000 + (adr & 0x7fff);
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
    this.prgBank = value & 0xf;
    this.mirroring = (value & 0x10) >> 4;
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
      return [false, this.getMirroringAdr(adr)];
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
      return [false, this.getMirroringAdr(adr)];
    }
  }

}
