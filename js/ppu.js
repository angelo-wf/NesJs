
function Ppu(nes) {

  // memory handler
  this.nes = nes;

  // nametable memory
  this.ppuRam = new Uint8Array(0x800);

  // palette memory
  this.paletteRam = new Uint8Array(0x20);

  // oam memory
  this.oamRam = new Uint8Array(0x100);

  // internal registers

  // scrolling / vram address
  this.t = 0; // temporary vram address
  this.v = 0; // vram address
  this.w = 0; // write flag
  this.x = 0; // fine x scroll

  // dot position
  this.line = 0;
  this.dot = 0;
  this.evenFrame = true;

  // rest
  this.oamAddress = 0; // oam address
  this.readBuffer = 0; // 2007 buffer;

  // for PPUSTAUS
  this.spriteZero = false;
  this.spriteOverflow = false;
  this.inVblank = false;

  // for PPUCTRL
  this.vramIncrement = 1;
  this.spritePatternBase = 0;
  this.bgPatternBase = 0;
  this.sprite16 = false;
  this.slave = false;
  this.generateNmi = false;

  // for PPUMASK
  this.greyScale = false;
  this.bgInLeft = false;
  this.sprInLeft = false;
  this.bgRendering = false;
  this.sprRendering = false;
  this.redEmphasis = false;
  this.greenEmphasis = false;
  this.blueEmphasis = false;

  // internal operation

  this.reset = function() {
    // ppu ram initialized to zeroes
    for(let i = 0; i < this.ppuRam.length; i++) {
      this.ppuRam[i] = 0;
    }
    // palette ram as well
    for(let i = 0; i < this.paletteRam.length; i++) {
      this.paletteRam[i] = 0;
    }
    // same for oam
    for(let i = 0; i < this.oamRam.length; i++) {
      this.oamRam[i] = 0;
    }
    // other registers
    this.t = 0; // temporary vram address
    this.v = 0; // vram address
    this.w = 0; // write flag
    this.x = 0; // fine x scroll
    this.line = 0;
    this.dot = 0;
    this.evenFrame = true;
    this.oamAddress = 0;
    this.readBuffer = 0;
    this.spriteZero = false;
    this.spriteOverflow = false;
    this.inVblank = false;
    this.vramIncrement = 1;
    this.spritePatternBase = 0;
    this.bgPatternBase = 0;
    this.sprite16 = false;
    this.slave = false;
    this.generateNmi = false;
    this.greyScale = false;
    this.bgInLeft = false;
    this.sprInLeft = false;
    this.bgRendering = false;
    this.sprRendering = false;
    this.redEmphasis = false;
    this.greenEmphasis = false;
    this.blueEmphasis = false;
  }

  this.cycle = function() {
    if(this.line < 240) {
      // visible frame
      // TODO
      if(this.line === 20 && this.dot === 40) {
        // TEMPORARY HACK!!
        this.spriteZero = true;
      }
      if(this.dot === 256 && (this.bgRendering || this.sprRendering)) {
        this.incrementVy();
      } else if(this.dot === 257 && (this.bgRendering || this.sprRendering)) {
        // copy x parts from t to v
        this.v &= 0x7be0;
        this.v |= (this.t & 0x41f);
      }
    } else if(this.line === 241) {
      if(this.dot === 1) {
        this.inVblank = true;
        if(this.generateNmi) {
          this.nes.cpu.nmiWanted = true;
        }
        if(this.bgRendering || this.sprRendering) {
          this.evenFrame = !this.evenFrame; // flip frame state
        }
      }
    } else if(this.line === 261) {
      // pre render line
      if(this.dot === 1) {
        this.inVblank = false;
        this.spriteZero = false;
        this.spriteOverflow = false;
      } else if(this.dot === 257 && (this.bgRendering || this.sprRendering)) {
        // copy x parts from t to v
        this.v &= 0x7be0;
        this.v |= (this.t & 0x41f);
      } else if(this.dot === 280 && (this.bgRendering || this.sprRendering)) {
        // copy y parts from t to v
        this.v &= 0x41f;
        this.v |= (this.t & 0x7be0);
      }
    }

    this.dot++;
    if(this.dot === 341 || (
      this.dot === 340 && this.line === 261 && !this.evenFrame
    )) {
      // if we loop (1 early on odd frames on line 261)
      this.dot = 0;
      this.line++;
      if(this.line === 262) {
        this.line = 0;
      }
    }
  }

  this.incrementVx = function() {
    if((this.v & 0x1f) === 0x1f) {
      this.v &= 0x7fe0;
      this.v ^= 0x400;
    } else {
      this.v++;
    }
  }

  this.incrementVy = function() {
    if((this.v & 0x7000) !== 0x7000) {
      this.v += 0x1000;
    } else {
      this.v &= 0xfff;
      let coarseY = (this.v & 0x3e0) >> 5;
      if(coarseY === 29) {
        coarseY = 0;
        this.v ^= 0x800;
      } else if(coarseY === 31) {
        coarseY = 0;
      } else {
        coarseY++;
      }
      this.v &= 0x7c1f;
      this.v |= (coarseY << 5);
    }
  }

  this.readPalette = function(adr) {
    let ret = this.paletteRam[adr & 0x1f];
    if(this.greyScale) {
      ret &= 0x30;
    }
    return ret;
  }

  this.writePalette = function(adr, value) {
    let palAdr = adr & 0x1f;
    if(palAdr >= 0x10 && (palAdr & 0x3) === 0) {
      // 0x10, 0x14, 0x18 and 0x1c are mirrored to 0, 4, 8 and 0xc
      palAdr -= 0x10;
    }
    this.paletteRam[palAdr] = value;
  }

  this.read = function(adr) {
    switch(adr) {
      case 0: {
        // PPUCTRL
        return 0; // not readable
      }
      case 1: {
        // PPUMASK
        return 0; // not readable
      }
      case 2: {
        // PPUSTATUS
        this.w = 0;
        let ret = 0;
        if(this.inVblank) {
          ret |= 0x80;
          this.inVblank = false;
        }
        if(this.spriteZero) {
          ret |= 0x40;
        }
        if(this.spriteOverflow) {
          ret |= 0x20;
        }
        return ret;
      }
      case 3: {
        // OAMADDR
        return 0; // not readable
      }
      case 4: {
        // OAMDATA
        return this.oamRam[this.oamAddress];
      }
      case 5: {
        // PPUSCROLL
        return 0; // not readable
      }
      case 6: {
        // PPUADDR
        return 0; // not readable
      }
      case 7: {
        // PPUDATA
        let adr = this.v & 0x3fff;
        this.v += this.vramIncrement;
        this.v &= 0x7fff;
        let temp = this.readBuffer;
        if(adr >= 0x3f00) {
          // read palette in temp
          temp = this.readPalette(adr);
        }
        let readVal = this.nes.mapper.ppuRead(adr);
        if(readVal[0]) {
          this.readBuffer = readVal[1];
        } else {
          this.readBuffer = this.ppuRam[readVal[1]];
        }
        return temp;
      }
    }
  }

  this.write = function(adr, value) {
    switch(adr) {
      case 0: {
        // PPUCTRL
        this.t &= 0x73ff;
        this.t |= (value & 0x3) << 10;

        if((value & 0x04) > 0) {
          this.vramIncrement = 32;
        } else {
          this.vramIncrement = 1;
        }
        if((value & 0x08) > 0) {
          this.spritePatternBase = 0x1000;
        } else {
          this.spritePatternBase = 0;
        }
        if((value & 0x10) > 0) {
          this.bgPatternBase = 0x1000;
        } else {
          this.bgPatternBase = 0;
        }
        this.sprite16 = (value & 0x20) > 0;
        this.slave = (value & 0x40) > 0;
        this.generateNmi = (value & 0x80) > 0;
        return;
      }
      case 1: {
        // PPUMASK
        this.greyScale = (value & 0x01) > 0;
        this.bgInLeft = (value & 0x02) > 0;
        this.sprInLeft = (value & 0x04) > 0;
        this.bgRendering = (value & 0x08) > 0;
        this.sprRendering = (value & 0x10) > 0;
        this.redEmphasis = (value & 0x20) > 0;
        this.greenEmphasis = (value & 0x40) > 0;
        this.blueEmphasis = (value & 0x80) > 0;
        return;
      }
      case 2: {
        // PPUSTATUS
        return; // not writable
      }
      case 3: {
        // OAMADDR
        this.oamAddress = value;
        return;
      }
      case 4: {
        // OAMDATA
        this.oamRam[this.oamAddress++] = value;
        this.oamAddress &= 0xff;
        return;
      }
      case 5: {
        // PPUSCROLL
        if(this.w === 0) {
          this.t &= 0x7fe0;
          this.t |= (value & 0xf8) >> 3;
          this.x = value & 0x7;
          this.w = 1;
        } else {
          this.t &= 0x0c1f;
          this.t |= (value & 0x7) << 12;
          this.t |= (value & 0xf8) << 2;
          this.w = 0;
        }
        return;
      }
      case 6: {
        // PPUADDR
        if(this.w === 0) {
          this.t &= 0xff;
          this.t |= (value & 0x3f) << 8;
          this.w = 1;
        } else {
          this.t &= 0x7f00;
          this.t |= value;
          this.v = this.t;
          this.w = 0;
        }
        return;
      }
      case 7: {
        // PPUDATA
        let adr = this.v & 0x3fff;
        this.v += this.vramIncrement;
        this.v &= 0x7fff;
        if(adr >= 0x3f00) {
          // write palette
          this.writePalette(adr, value);
          return;
        }
        let writeVal = this.nes.mapper.ppuWrite(adr, value);
        if(writeVal[0]) {
          return;
        } else {
          this.ppuRam[writeVal[1]] = value;
        }
        return;
      }
    }
  }

}
