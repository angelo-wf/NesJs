
mappers[4] = function(nes, rom, header) {
  this.name = "MMC3";

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

  this.bankRegs = new Uint8Array(8);

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
    for(let i = 0; i < this.bankRegs.length; i++) {
      this.bankRegs[i] = 0;
    }

    this.mirroring = 0;
    this.prgMode = 1;
    this.chrMode = 1;
    this.regSelect = 0;

    this.reloadIrq = false;
    this.irqLatch = 0;
    this.irqEnabled = false;
    this.irqCounter = 0;

    this.lastRead = 0;
  }
  this.reset(true);
  this.saveVars = [
    "name", "chrRam", "prgRam", "bankRegs", "mirroring", "prgMode", "chrMode",
    "regSelect", "reloadIrq", "irqLatch", "irqEnabled", "irqCounter",
    "lastRead"
  ];

  this.getRomAdr = function(adr) {
    let bank0 = this.bankRegs[6] & ((this.banks * 2) - 1);
    let bank1 = this.bankRegs[7] & ((this.banks * 2) - 1);
    if(this.prgMode === 1) {
      if(adr < 0xa000) {
        return ((this.banks * 2) - 2) * 0x2000 + (adr & 0x1fff);
      } else if(adr < 0xc000) {
        return bank1 * 0x2000 + (adr & 0x1fff);
      } else if(adr < 0xe000) {
        return bank0 * 0x2000 + (adr & 0x1fff);
      } else {
        return ((this.banks * 2) - 1) * 0x2000 + (adr & 0x1fff);
      }
    } else {
      if(adr < 0xa000) {
        return bank0 * 0x2000 + (adr & 0x1fff);
      } else if(adr < 0xc000) {
        return bank1 * 0x2000 + (adr & 0x1fff);
      } else if(adr < 0xe000) {
        return ((this.banks * 2) - 2) * 0x2000 + (adr & 0x1fff);
      } else {
        return ((this.banks * 2) - 1) * 0x2000 + (adr & 0x1fff);
      }
    }
  }

  this.getMirroringAdr = function(adr) {
    if(this.mirroring === 0) {
      // vertical
      return adr & 0x7ff;
    } else {
      // horizontal
      return (adr & 0x3ff) | ((adr & 0x800) >> 1);
    }
  }

  this.getChrAdr = function(adr) {
    let bankCount = this.chrBanks * 8;
    if(bankCount === 0) {
      bankCount = 8;
    }
    if(this.chrMode === 1) {
      adr ^= 0x1000;
    }
    let bank0 = (this.bankRegs[0] & (bankCount - 1)) >> 1;
    let bank1 = (this.bankRegs[1] & (bankCount - 1)) >> 1;
    let bank2 = this.bankRegs[2] & (bankCount - 1);
    let bank3 = this.bankRegs[3] & (bankCount - 1);
    let bank4 = this.bankRegs[4] & (bankCount - 1);
    let bank5 = this.bankRegs[5] & (bankCount - 1);
    if(adr < 0x800) {
      return bank0 * 0x800 + (adr & 0x7ff);
    } else if(adr < 0x1000) {
      return bank1 * 0x800 + (adr & 0x7ff);
    } else if(adr < 0x1400) {
      return bank2 * 0x400 + (adr & 0x3ff);
    } else if(adr < 0x1800) {
      return bank3 * 0x400 + (adr & 0x3ff);
    } else if(adr < 0x1c00) {
      return bank4 * 0x400 + (adr & 0x3ff);
    } else {
      return bank5 * 0x400 + (adr & 0x3ff);
    }
  }

  this.clockIrq = function() {
    if(this.irqCounter === 0 || this.reloadIrq) {
      this.irqCounter = this.irqLatch;
      this.reloadIrq = false;
    } else {
      this.irqCounter--;
      this.irqCounter &= 0xff;
    }
    if(this.irqCounter === 0 && this.irqEnabled) {
      this.nes.mapperIrqWanted = true;
    }
  }

  this.read = function(adr) {
    if(adr < 0x6000) {
      return 0; // not readable
    }
    if(adr < 0x8000) {
      return this.prgRam[adr & 0x1fff];
    }
    return this.rom[this.base + this.getRomAdr(adr)];
  }

  this.write = function(adr, value) {
    if(adr < 0x6000) {
      return; // no mapper registers
    }
    if(adr < 0x8000) {
      this.prgRam[adr & 0x1fff] = value;
      return;
    }
    switch(adr & 0x6001) {
      case 0x0000: {
        this.regSelect = value & 0x7;
        this.prgMode = (value & 0x40) >> 6;
        this.chrMode = (value & 0x80) >> 7;
        break;
      }
      case 0x0001: {
        this.bankRegs[this.regSelect] = value;
        break;
      }
      case 0x2000: {
        this.mirroring = value & 0x1;
        break;
      }
      case 0x2001: {
        // ram protection not implemented
        break;
      }
      case 0x4000: {
        this.irqLatch = value;
        break;
      }
      case 0x4001: {
        this.reloadIrq = true;
        break;
      }
      case 0x6000: {
        this.irqEnabled = false;
        this.nes.mapperIrqWanted = false;
        break;
      }
      case 0x6001: {
        this.irqEnabled = true;
        break;
      }
    }
  }

  // return if this read had to come from internal and which address
  // or else the value itself
  this.ppuRead = function(adr) {
    if(adr < 0x2000) {
      // clocking irq only happens for chr-fetches?
      // otherwise Mega Man 3's in-level menu breaks
      if((this.lastRead & 0x1000) === 0 && (adr & 0x1000) > 0) {
        // A12 went high, clock irq
        this.clockIrq();
      }
      this.lastRead = adr;
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
