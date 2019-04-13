
function Cnrom(nes, rom, header) {
  this.name = "CNROM";

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

    this.chrBank = 0;
  }
  this.reset(true);

  this.getChrAdr = function(adr) {
    let bankCount = this.chrBanks;
    if(bankCount === 0) {
      bankCount = 1;
    }
    let bank = this.chrBank & (bankCount - 1);
    return bank * 0x2000 + (adr & 0x1fff);
  }

  this.ppuLineEnd = function() {};

  this.read = function(adr) {
    if(adr < 0x8000) {
      return 0; // not readable
    }
    if(this.banks === 2) {
      return this.rom[this.base + (adr & 0x7fff)];
    } else {
      return this.rom[this.base + (adr & 0x3fff)];
    }
  }

  this.write = function(adr, value) {
    if(adr < 0x8000) {
      return; // no mapper registers or prg ram
    }
    this.chrBank = value;
  }

  // return if this read had to come from internal and which address
  // or else the value itself
  this.ppuRead = function(adr) {
    if(adr < 0x2000) {
      if(this.chrBanks === 0) {
        return [true, this.chrRam[this.getChrAdr(adr)]];
      } else {
        return [true, this.rom[
          this.base + 0x4000 * this.banks + this.getChrAdr(adr)
        ]];
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
        this.chrRam[this.getChrAdr(adr)] = value;
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
