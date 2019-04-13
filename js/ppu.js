
function Ppu(nes) {

  // memory handler
  this.nes = nes;

  // nametable memory
  this.ppuRam = new Uint8Array(0x800);

  // palette memory
  this.paletteRam = new Uint8Array(0x20);

  // oam memory
  this.oamRam = new Uint8Array(0x100);

  // sprite buffers
  this.secondaryOam = new Uint8Array(0x20);
  this.spriteTiles = new Uint8Array(0x10);

  // final pixel output
  this.pixelOutput = new Uint16Array(256 * 240);

  this.reset = function() {
    for(let i = 0; i < this.ppuRam.length; i++) {
      this.ppuRam[i] = 0;
    }
    for(let i = 0; i < this.paletteRam.length; i++) {
      this.paletteRam[i] = 0;
    }
    for(let i = 0; i < this.oamRam.length; i++) {
      this.oamRam[i] = 0;
    }
    for(let i = 0; i < this.secondaryOam.length; i++) {
      this.secondaryOam[i] = 0;
    }
    for(let i = 0; i < this.spriteTiles.length; i++) {
      this.spriteTiles[i] = 0;
    }
    for(let i = 0; i < this.pixelOutput.length; i++) {
      this.pixelOutput[i] = 0;
    }

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
    this.spriteHeight = 8;
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
    this.spriteZeroIn = false;
    this.spriteCount = 0;
  }
  this.reset();

  this.cycle = function() {
    if(this.line < 240) {
      // visible frame
      if(this.dot < 256) {
        this.generateDot();
        if(((this.dot + 1) & 0x7) === 0) {
          // dot 7, 15, 23, 31 etc
          if(this.bgRendering || this.sprRendering) {
            this.readTileBuffers();
            this.incrementVx();
          }
        }
      } else if(this.dot === 256) {
        if(this.bgRendering || this.sprRendering) {
          this.incrementVy();
        }
      } else if(this.dot === 257) {
        if(this.bgRendering || this.sprRendering) {
          // copy x parts from t to v
          this.v &= 0x7be0;
          this.v |= (this.t & 0x41f);
        }
      } else if(this.dot === 270) {
        // clear sprite buffers
        this.spriteZeroIn = false;
        this.spriteCount = 0;
        if(this.bgRendering || this.sprRendering) {
          // notify mapper that we're at the end of the line
          // TODO: inaccurate timing
          this.nes.mapper.ppuLineEnd();
          // do sprite evaluation and sprite tile fetching
          this.evaluateSprites();
        }
      } else if(this.dot === 321 || this.dot === 329) {
        if (this.bgRendering || this.sprRendering) {
          this.readTileBuffers();
          this.incrementVx();
        }
      }
    } else if(this.line === 241) {
      if(this.dot === 1) {
        this.inVblank = true;
        if(this.generateNmi) {
          this.nes.cpu.nmiWanted = true;
        }
        if(this.bgRendering || this.sprRendering) {
          this.evenFrame = !this.evenFrame; // flip frame state
        } else {
          this.evenFrame = true; // not in rendering, all frames are even
        }
      }
    } else if(this.line === 261) {
      // pre render line
      if(this.dot === 1) {
        this.inVblank = false;
        this.spriteZero = false;
        this.spriteOverflow = false;
      } else if(this.dot === 257) {
        if(this.bgRendering || this.sprRendering) {
          // copy x parts from t to v
          this.v &= 0x7be0;
          this.v |= (this.t & 0x41f);
        }
      } else if(this.dot === 270) {
        // clear sprite buffers from sprites evaluated on line 239
        this.spriteZeroIn = false;
        this.spriteCount = 0;
        if(this.bgRendering || this.sprRendering) {
          // notify mapper that we're at the end of the line
          // TODO: inaccurate timing
          this.nes.mapper.ppuLineEnd();
        }
      } else if(this.dot === 280) {
        if(this.bgRendering || this.sprRendering) {
          // copy y parts from t to v
          this.v &= 0x41f;
          this.v |= (this.t & 0x7be0);
        }
      } else if(this.dot === 321 || this.dot === 329) {
        if(this.bgRendering || this.sprRendering) {
          this.readTileBuffers();
          this.incrementVx();
        }
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

  this.evaluateSprites = function() {
    for(let i = 0; i < 256; i += 4) {
      let sprY = this.oamRam[i];
      let sprRow = this.line - sprY;
      if(sprRow >= 0 && sprRow < this.spriteHeight) {
        // sprite is on this scanline
        if(this.spriteCount === 8) {
          // secondary oam is full
          this.spriteOverflow = true;
          break;
        } else {
          // place in secondary oam
          if(i === 0) {
            // sprite zero
            this.spriteZeroIn = true;
          }
          this.secondaryOam[this.spriteCount * 4] = this.oamRam[i];
          this.secondaryOam[this.spriteCount * 4 + 1] = this.oamRam[i + 1];
          this.secondaryOam[this.spriteCount * 4 + 2] = this.oamRam[i + 2];
          this.secondaryOam[this.spriteCount * 4 + 3] = this.oamRam[i + 3];
          // fetch the tiles
          if((this.oamRam[i + 2] & 0x80) > 0) {
            sprRow = this.spriteHeight - 1 - sprRow;
          }
          let base = this.spritePatternBase;
          let tileNum = this.oamRam[i + 1];
          if(this.spriteHeight === 16) {
            base = (tileNum & 0x1) * 0x1000;
            tileNum = (tileNum & 0xfe);
            tileNum += (sprRow & 0x8) >> 3;
            sprRow &= 0x7;
          }
          this.spriteTiles[this.spriteCount] = this.readInternal(
            base + tileNum * 16 + sprRow
          );
          this.spriteTiles[this.spriteCount + 8] = this.readInternal(
            base + tileNum * 16 + sprRow + 8
          );
          this.spriteCount++;
        }
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

  this.generateDot = function() {
    let i = this.dot & 0x7;
    let bgPixel = 0;
    let sprPixel = 0;
    let sprNum = -1;
    let sprPriority = 0;
    let finalColor;

    if(this.sprRendering && (this.dot > 7 || this.sprInLeft)) {
      // if sprite rendering is on, and either not the left 8 pixels
      // or sprite rendering in left 8 pixels is on
      // search through all sprites in secondary oam to find ones
      // on this dot, and pick the first non-0 pixel
      for(let j = 0; j < this.spriteCount; j++) {
        let xPos = this.secondaryOam[j * 4 + 3];
        let xCol = this.dot - xPos;
        if(xCol >= 0 && xCol < 8) {
          // sprite is in range
          if((this.secondaryOam[j * 4 + 2] & 0x40) > 0) {
            xCol = 7 - xCol;
          }
          let shift = 7 - xCol;
          let pixel = (this.spriteTiles[j] >> shift) & 1;
          pixel |= ((this.spriteTiles[j + 8] >> shift) & 1) << 1;
          if(pixel > 0) {
            // set the pixel, priority, and number
            sprPixel = pixel | ((this.secondaryOam[j * 4 + 2] & 0x3) << 2);
            sprPriority = (this.secondaryOam[j * 4 + 2] & 0x20) >> 5;
            sprNum = j;
            break;
          }
        }
      }
    }

    if(this.bgRendering && (this.dot > 7 || this.bgInLeft)) {
      // if bg rendering is on, and either not the left 8 pixels
      // or bg rendering in left 8 columns is on
      let shiftAmount = 15 - i - this.x;
      bgPixel = (this.tl >> shiftAmount) & 1;
      bgPixel |= ((this.th >> shiftAmount) & 1) << 1;
      let atrOff;
      if(this.x + i > 7) {
        // right tile
        atrOff = this.atr * 4;
      } else {
        atrOff = this.atl * 4;
      }
      if(bgPixel > 0) {
        bgPixel += atrOff;
      }
    }

    if(!this.bgRendering && !this.sprRendering) {
      // display color 0, or color at vram address if pointing to palette
      if((this.v & 0x3fff) >= 0x3f00) {
        finalColor = this.readPalette(this.v & 0x1f);
      } else {
        finalColor = this.readPalette(0);
      }
    } else {
      // if bg pixel is 0, render sprite pixel
      if(bgPixel === 0) {
        if(sprPixel > 0) {
          finalColor = this.readPalette(sprPixel + 0x10);
        } else {
          finalColor = this.readPalette(0);
        }
      } else {
        // render sprite pixel if not 0 and it has priority
        if(sprPixel > 0) {
          // check for sprite zero
          if(sprNum === 0 && this.spriteZeroIn && this.dot !== 255) {
            this.spriteZero = true;
          }
        }
        if(sprPixel > 0 && sprPriority === 0) {
          finalColor = this.readPalette(sprPixel + 0x10);
        } else {
          finalColor = this.readPalette(bgPixel);
        }
      }
    }

    this.pixelOutput[
      this.line * 256 + this.dot
    ] = (this.emphasis << 6) | (finalColor & 0x3f);
  }

  this.setFrame = function(finalArray) {
    for(let i = 0; i < this.pixelOutput.length; i++) {
      let color = this.pixelOutput[i];
      let r = this.nesPal[color & 0x3f][0];
      let g = this.nesPal[color & 0x3f][1];
      let b = this.nesPal[color & 0x3f][2];
      // from https://forums.nesdev.com/viewtopic.php?f=3&t=18416#p233708
      if((color & 0x40) > 0) {
        // emphasize red
        r = r * 1.1;
        g = g * 0.9;
        b = b * 0.9;
      }
      if((color & 0x80) > 0) {
        // emphasize green
        r = r * 0.9;
        g = g * 1.1;
        b = b * 0.9;
      }
      if((color & 0x100) > 0) {
        // emphasize blue
        r = r * 0.9;
        g = g * 0.9;
        b = b * 1.1;
      }
      r = (r > 255 ? 255 : r) & 0xff;
      g = (g > 255 ? 255 : g) & 0xff;
      b = (b > 255 ? 255 : b) & 0xff;
      finalArray[i * 4] = r;
      finalArray[i * 4 + 1] = g;
      finalArray[i * 4 + 2] = b;
      finalArray[i * 4 + 3] = 255;
    }
  }

  // from https://wiki.nesdev.com/w/index.php/PPU_scrolling
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
    adr &= 0x3fff;
    let readVal = this.nes.mapper.ppuRead(adr);
    if(readVal[0]) {
      return readVal[1];
    } else {
      return this.ppuRam[readVal[1]];
    }
  }

  this.writeInternal = function(adr, value) {
    adr &= 0x3fff;
    let writeVal = this.nes.mapper.ppuWrite(adr, value);
    if(writeVal[0]) {
      return;
    } else {
      this.ppuRam[writeVal[1]] = value;
    }
  }

  this.readPalette = function(adr) {
    let palAdr = adr & 0x1f;
    if(palAdr >= 0x10 && (palAdr & 0x3) === 0) {
      // 0x10, 0x14, 0x18 and 0x1c are mirrored to 0, 4, 8 and 0xc
      palAdr -= 0x10;
    }
    let ret = this.paletteRam[palAdr];
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
        if(
          (this.bgRendering || this.sprRendering) &&
          (this.line < 240 || this.line === 261)
        ) {
          // while rendering, vram is incremented strangely
          this.incrementVy();
          this.incrementVx();
        } else {
          this.v += this.vramIncrement;
          this.v &= 0x7fff;
        }
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
        if((value & 0x20) > 0) {
          this.spriteHeight = 16;
        } else {
          this.spriteHeight = 8;
        }
        let oldNmi = this.generateNmi;
        this.slave = (value & 0x40) > 0;
        this.generateNmi = (value & 0x80) > 0;

        if(this.generateNmi && !oldNmi && this.inVblank) {
          // immediate nmi if enabled during vblank
          this.nes.cpu.nmiWanted = true;
        }
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
        if(
          (this.bgRendering || this.sprRendering) &&
          (this.line < 240 || this.line === 261)
        ) {
          // while rendering, vram is incremented strangely
          this.incrementVy();
          this.incrementVx();
        } else {
          this.v += this.vramIncrement;
          this.v &= 0x7fff;
        }
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

  // from https://wiki.nesdev.com/w/index.php/PPU_palettes (savtool palette)
  this.nesPal = [
    [0x65, 0x65, 0x65], [0x00, 0x26, 0x6d], [0x1e, 0x00, 0x84], [0x45, 0x00, 0x81], [0x6a, 0x00, 0x65], [0x7d, 0x00, 0x34], [0x7a, 0x00, 0x00], [0x61, 0x13, 0x00], [0x35, 0x29, 0x00], [0x00, 0x37, 0x00], [0x00, 0x40, 0x00], [0x00, 0x40, 0x0a], [0x00, 0x39, 0x42], [0x00, 0x00, 0x00], [0x00, 0x00, 0x00], [0x00, 0x00, 0x00],
    [0xae, 0xae, 0xae], [0x00, 0x5c, 0xb9], [0x49, 0x3b, 0xd8], [0x85, 0x11, 0xd3], [0xb6, 0x00, 0xad], [0xcf, 0x02, 0x6e], [0xcb, 0x2a, 0x19], [0xa9, 0x45, 0x00], [0x6f, 0x5e, 0x00], [0x18, 0x73, 0x00], [0x00, 0x7e, 0x00], [0x00, 0x7f, 0x39], [0x00, 0x74, 0x80], [0x00, 0x00, 0x00], [0x00, 0x00, 0x00], [0x00, 0x00, 0x00],
    [0xfe, 0xfe, 0xff], [0x48, 0xaf, 0xff], [0x91, 0x98, 0xff], [0xd5, 0x7f, 0xff], [0xff, 0x6b, 0xff], [0xff, 0x71, 0xc0], [0xff, 0x82, 0x75], [0xfa, 0x98, 0x28], [0xbe, 0xb0, 0x00], [0x71, 0xc4, 0x00], [0x00, 0xd0, 0x45], [0x00, 0xd1, 0x8a], [0x00, 0xc5, 0xd1], [0x4e, 0x4e, 0x4e], [0x00, 0x00, 0x00], [0x00, 0x00, 0x00],
    [0xfe, 0xfe, 0xff], [0xb6, 0xde, 0xff], [0xd1, 0xd5, 0xff], [0xee, 0xcc, 0xff], [0xff, 0xc6, 0xff], [0xff, 0xc7, 0xe5], [0xff, 0xcd, 0xc7], [0xfd, 0xd5, 0xaf], [0xe4, 0xdf, 0xa1], [0xc5, 0xe8, 0xa3], [0xac, 0xed, 0xb5], [0x9e, 0xec, 0xd0], [0xa2, 0xe7, 0xec], [0xb6, 0xb6, 0xb6], [0x00, 0x00, 0x00], [0x00, 0x00, 0x00]
  ]

}
