
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
  this.emphasis = 0;

  // internal operation
  this.atl = 0;
  this.atr = 0;
  this.tl = 0;
  this.th = 0;

  this.pixelOutput = new Uint16Array(256 * 240); // final pixel output

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
    this.emphasis = 0;
    this.atl = 0;
    this.atr = 0;
    this.tl = 0;
    this.th = 0;
    // pixel output
    for(let i = 0; i < this.pixelOutput.length; i++) {
      this.pixelOutput[i] = 0;
    }
  }

  this.cycle = function() {
    if(this.line < 240) {
      // visible frame

      // TODO: sprites

      if(this.line === 30 && this.dot === 80) {
        // TEMPORARY HACK!!
        this.spriteZero = true;
      }

      if(this.dot === 0) {
        this.generateSliver();
        if(this.bgRendering || this.sprRendering) {
          this.readTileBuffers();
        }
      } else if(this.dot < 256 && (this.dot & 0x7) === 0) {
        // every 8th cycle
        this.generateSliver();
        if(this.bgRendering || this.sprRendering) {
          this.incrementVx();
          this.readTileBuffers();
        }
      } else if(this.dot === 256 && (this.bgRendering || this.sprRendering)) {
        this.incrementVy();
      } else if(this.dot === 257 && (this.bgRendering || this.sprRendering)) {
        // copy x parts from t to v
        this.v &= 0x7be0;
        this.v |= (this.t & 0x41f);
      } else if((this.dot === 321 || this.dot === 329) && (
        this.bgRendering || this.sprRendering
      )) {
        this.readTileBuffers();
        this.incrementVx();
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
      } else if((this.dot === 321 || this.dot === 329) && (
        this.bgRendering || this.sprRendering
      )) {
        this.readTileBuffers();
        this.incrementVx();
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

  this.readTileBuffers = function() {
    let tileNum = this.readInternal(0x2000 + (this.v & 0xfff));

    this.atl = this.atr;
    let attAdr = 0x23c0;
    attAdr |= (this.v & 0x1c) >> 2;
    attAdr |= (this.v & 0x380) >> 4;
    attAdr |= (this.v & 0xc00);
    this.atr = this.readInternal(attAdr);
    if((this.v & 0x40) > 0) {
      // bottom half
      this.atr >>= 4;
    }
    this.atr &= 0xf;
    if((this.v & 0x02) > 0) {
      // right half
      this.atr >>= 2;
    }
    this.atr &= 0x3;

    let fineY = (this.v & 0x7000) >> 12;
    this.tl &= 0xff;
    this.tl <<= 8;
    this.tl |= this.readInternal(this.bgPatternBase + tileNum * 16 + fineY);
    this.th &= 0xff;
    this.th <<= 8;
    this.th |= this.readInternal(
      this.bgPatternBase + tileNum * 16 + fineY + 8
    );
  }

  this.generateSliver = function() {
    for(let i = 0; i < 8; i++) {
      let finalColor;
      if(this.bgRendering) {
        let shiftAmount = 15 - i - this.x;
        let final = (this.tl & (1 << shiftAmount)) >> (shiftAmount);
        final |= ((this.th & (1 << shiftAmount)) >> shiftAmount) << 1;
        let atrOff;
        if(this.x + i > 7) {
          // right tile
          atrOff = this.atr * 4;
        } else {
          atrOff = this.atl * 4;
        }
        if(final === 0) {
          // background color
          finalColor = this.readPalette(0);
        } else {
          finalColor = this.readPalette(atrOff + final);
        }
      } else {
        if((this.v & 0x3fff) >= 0x3f00) {
          finalColor = this.readPalette(this.v & 0x1f);
        } else {
          finalColor = this.readPalette(0);
        }
      }
      this.pixelOutput[
        this.line * 256 + this.dot + i
      ] = (this.emphasis << 6) | (finalColor & 0x3f);
    }
  }

  this.setFrame = function(finalArray) {
    for(let i = 0; i < this.pixelOutput.length; i++) {
      let color = this.pixelOutput[i];
      let r = this.nesPal[color & 0x3f][0];
      let g = this.nesPal[color & 0x3f][1];
      let b = this.nesPal[color & 0x3f][2];
      if((color & 0x40) > 0) {
        // emphasize red
        g = (g * 0.75) & 0xff;
        b = (b * 0.75) & 0xff;
      }
      if((color & 0x80) > 0) {
        // emphasize green
        r = (r * 0.75) & 0xff;
        b = (b * 0.75) & 0xff;
      }
      if((color & 0x100) > 0) {
        // emphasize blue
        g = (g * 0.75) & 0xff;
        r = (r * 0.75) & 0xff;
      }
      finalArray[i * 4] = r;
      finalArray[i * 4 + 1] = g;
      finalArray[i * 4 + 2] = b;
      finalArray[i * 4 + 3] = 255;
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

  this.readInternal = function(adr) {
    let readVal = this.nes.mapper.ppuRead(adr);
    if(readVal[0]) {
      return readVal[1];
    } else {
      return this.ppuRam[readVal[1]];
    }
  }

  this.writeInternal = function(adr, value) {
    let writeVal = this.nes.mapper.ppuWrite(adr, value);
    if(writeVal[0]) {
      return;
    } else {
      this.ppuRam[writeVal[1]] = value;
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
        this.readBuffer = this.readInternal(adr);
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
        this.emphasis = (value & 0xe0) >> 5;
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
        this.writeInternal(adr, value);
        return;
      }
    }
  }

  this.nesPal = [
    [ 117, 117, 117 ], [ 39, 27, 143 ], [ 0, 0, 171 ], [ 71, 0, 159 ],[ 143, 0, 119 ], [ 171, 0, 19 ], [ 167, 0, 0 ], [ 127, 11, 0 ],[ 67, 47, 0 ], [ 0, 71, 0 ], [ 0, 81, 0 ], [ 0, 63, 23 ],[ 27, 63, 95 ], [ 0, 0, 0 ], [ 0, 0, 0 ], [ 0, 0, 0 ],
    [ 188, 188, 188 ], [ 0, 115, 239 ], [ 35, 59, 239 ], [ 131, 0, 243 ],[ 191, 0, 191 ], [ 231, 0, 91 ], [ 219, 43, 0 ], [ 203, 79, 15 ],[ 139, 115, 0 ], [ 0, 151, 0 ], [ 0, 171, 0 ], [ 0, 147, 59 ],[ 0, 131, 139 ], [ 0, 0, 0 ], [ 0, 0, 0 ], [ 0, 0, 0 ],
    [ 255, 255, 255 ], [ 63, 191, 255 ], [ 95, 151, 255 ], [ 167, 139, 253 ],[ 247, 123, 255 ], [ 255, 119, 183 ], [ 255, 119, 99 ], [ 255, 155, 59 ],[ 243, 191, 63 ], [ 131, 211, 19 ], [ 79, 223, 75 ], [ 88, 248, 152 ],[ 0, 235, 219 ], [ 60, 60, 60 ], [ 0, 0, 0 ], [ 0, 0, 0 ],
    [ 255, 255, 255 ], [ 171, 231, 255 ], [ 199, 215, 255 ], [ 215, 203, 255 ],[ 255, 199, 255 ], [ 255, 199, 219 ], [ 255, 191, 179 ], [ 255, 219, 171 ],[ 255, 231, 163 ], [ 227, 255, 163 ], [ 171, 243, 191 ], [ 179, 255, 207 ],[ 159, 255, 243 ], [ 160, 160, 160 ], [ 0, 0, 0 ], [ 0, 0, 0 ]
  ];

}
