
function Ppu(nes) {

  // memory handler
  this.nes = nes;

  // nametable memory stored in mapper to simplify code

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
  this.saveVars = [
    "paletteRam", "oamRam", "secondaryOam", "spriteTiles", "t", "v",
    "w", "x", "line", "dot", "evenFrame", "oamAddress", "readBuffer",
    "spriteZero", "spriteOverflow", "inVblank", "vramIncrement",
    "spritePatternBase", "bgPatternBase", "spriteHeight", "slave",
    "generateNmi", "greyScale", "bgInLeft", "sprInLeft", "bgRendering",
    "sprRendering", "emphasis", "atl", "atr", "tl", "th", "spriteZeroIn",
    "spriteCount"
  ];

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
          // garbage sprite fetch
          let base = this.spriteHeight === 16 ? 0x1000 : this.spritePatternBase;
          this.readInternal(base + 0xfff);
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
    if(this.spriteCount < 8) {
      // garbage fetch if not all slots were filled
      let base = this.spriteHeight === 16 ? 0x1000 : this.spritePatternBase;
      this.readInternal(base + 0xfff);
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
    return this.nes.mapper.ppuRead(adr);
  }

  this.writeInternal = function(adr, value) {
    adr &= 0x3fff;
    this.nes.mapper.ppuWrite(adr, value);
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

  this.peak = function(adr) {
    switch(adr) {
      case 0:
      case 1: {
        // PPUCTRL, PPUMASK
        return 0; // not readable
      }
      case 2: {
        // PPUSTATUS
        let ret = 0;
        if(this.inVblank) {
          ret |= 0x80;
        }
        ret |= this.spriteZero ? 0x40 : 0;
        ret |= this.spriteOverflow ? 0x20 : 0;
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
      case 5:
      case 6: {
        // PPUSCROLL, PPUADDR
        return 0; // not readable
      }
      case 7: {
        // PPUDATA
        let adr = this.v & 0x3fff;
        let temp = this.readBuffer;
        if(adr >= 0x3f00) {
          // read palette in temp
          temp = this.readPalette(adr);
        }
        return temp;
      }
    }
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
        ret |= this.spriteZero ? 0x40 : 0;
        ret |= this.spriteOverflow ? 0x20 : 0;
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

        this.vramIncrement = (value & 0x04) > 0 ? 32 : 1;
        this.spritePatternBase = (value & 0x08) > 0 ? 0x1000 : 0;
        this.bgPatternBase = (value & 0x10) > 0 ? 0x1000 : 0;
        this.spriteHeight = (value & 0x20) > 0 ? 16 : 8;
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
    [101,101,101],[0,45,105],[19,31,127],[60,19,124],[96,11,98],[115,10,55],[113,15,7],[90,26,0],[52,40,0],[11,52,0],[0,60,0],[0,61,16],[0,56,64],[0,0,0],[0,0,0],[0,0,0],
    [174,174,174],[15,99,179],[64,81,208],[120,65,204],[167,54,169],[192,52,112],[189,60,48],[159,74,0],[109,92,0],[54,109,0],[7,119,4],[0,121,61],[0,114,125],[0,0,0],[0,0,0],[0,0,0],
    [254,254,255],[93,179,255],[143,161,255],[200,144,255],[247,133,250],[255,131,192],[255,139,127],[239,154,73],[189,172,44],[133,188,47],[85,199,83],[60,201,140],[62,194,205],[78,78,78],[0,0,0],[0,0,0],
    [254,254,255],[188,223,255],[209,216,255],[232,209,255],[251,205,253],[255,204,229],[255,207,202],[248,213,180],[228,220,168],[204,227,169],[185,232,184],[174,232,208],[175,229,234],[182,182,182],[0,0,0],[0,0,0]
  ]

}
