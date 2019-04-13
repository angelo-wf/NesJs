
function Mmc1(nes, rom, header) {
  this.name = "MMC1";

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

  this.prgRam = new Uint8Array(0x2000);

  this.reset = function(hard) {
    if(hard) {
      // clear chr ram
      for(let i = 0; i < this.chrRam.length; i++) {
        this.chrRam[i] = 0;
      }
      // clear prg ram
      for(let i = 0; i < this.prgRam.length; i++) {
        this.prgRam[i] = 0;
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

  this.getRomAdr = function(adr) {
    switch(this.prgMode) {
      case 0:
      case 1: {
        let bank = (this.prgBank & (this.banks - 1)) >> 1;
        return 0x8000 * bank + (adr & 0x7fff);
      }
      case 2: {
        let bank = this.prgBank & (this.banks - 1);
        if(adr < 0xc000) {
          return adr & 0x3fff;
        } else {
          return bank * 0x4000 + (adr & 0x3fff);
        }
      }
      case 3: {
        let bank = this.prgBank & (this.banks - 1);
        if(adr < 0xc000) {
          return bank * 0x4000 + (adr & 0x3fff);
        } else {
          return (this.banks - 1) * 0x4000 + (adr & 0x3fff);
        }
      }
    }
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
    let bankCount = this.chrBanks * 2;
    if(bankCount === 0) {
      bankCount = 2;
    }
    if(this.chrMode === 1) {
      let bank0 = this.chrBank0 & (bankCount - 1);
      let bank1 = this.chrBank1 & (bankCount - 1);
      if(adr < 0x1000) {
        return bank0 * 0x1000 + (adr & 0xfff);
      } else {
        return bank1 * 0x1000 + (adr & 0xfff);
      }
    } else {
      let bank = (this.chrBank0 & (bankCount - 1)) >> 1;
      return bank * 0x2000 + (adr & 0x1fff);
    }
  }

  this.ppuLineEnd = function() {};

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
    return this.rom[this.base + this.getRomAdr(adr)];
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
