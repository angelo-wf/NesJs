
mappers[3] = function(nes, rom, header) {
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
  this.saveVars = [
    "name", "chrRam", "chrBank"
  ];

  this.getRomAdr = function(adr) {
    if(this.banks === 2) {
      return adr & 0x7fff;
    }
    return adr & 0x3fff;
  }

  this.getMirroringAdr = function(adr) {
    if(this.verticalMirroring) {
      return adr & 0x7ff;
    } else {
      // horizontal
      return (adr & 0x3ff) | ((adr & 0x800) >> 1);
    }
  }

  this.getChrAdr = function(adr) {
    let bankCount = this.chrBanks;
    if(bankCount === 0) {
      bankCount = 1;
    }
    let bank = this.chrBank & (bankCount - 1);
    return bank * 0x2000 + (adr & 0x1fff);
  }

  this.read = function(adr) {
    if(adr < 0x8000) {
      return 0; // not readable
    }
    return this.rom[this.base + this.getRomAdr(adr)];
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
      return [false, this.getMirroringAdr(adr)];
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
      return [false, this.getMirroringAdr(adr)];
    }
  }

}
