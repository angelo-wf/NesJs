
//adressing modes
const IMP = 0; // also accumulator-mode
const IMM = 1;
const ZP = 2;
const ZPX = 3;
const ZPY = 4;
const IZX = 5;
const IZY = 6;
const ABS = 7;
const ABX = 8;
const ABY = 9;
const IND = 11;
const REL = 12;

// register indexes in arrays
const A = 0;
const X = 1;
const Y = 2;
const SP = 3;
const PC = 0;

function Cpu(mem) {
  // registers
  this.r = new Uint8Array(4);
  this.br = new Uint16Array(1);

  // flags
  this.n = false;
  this.v = false;
  this.d = false;
  this.i = false;
  this.z = false;
  this.c = false;

  // memory handler
  this.mem = mem;

  // interrupt wanted
  this.irqWanted = false;
  this.nmiWanted = false;

  // cycles left
  this.cyclesLeft = 0;

  this.hardReset = function() {
    this.r[A] = 0;
    this.r[X] = 0;
    this.r[Y] = 0;
    this.r[SP] = 0xfd;
    this.br[PC] = this.mem.read(0xfffc) | (this.mem.read(0xfffd) << 8);
    this.n = false;
    this.v = false;
    this.d = false;
    this.i = true;
    this.z = false;
    this.c = false;

    this.irqWanted = false;
    this.nmiWanted = false;

    this.cyclesLeft = 7;
  }

  this.reset = function() {
    this.r[SP] -= 3;
    this.br[PC] = this.mem.read(0xfffc) | (this.mem.read(0xfffd) << 8);
    this.i = true;

    this.irqWanted = false;
    this.nmiWanted = false;

    this.cyclesLeft = 7;
  }

  this.getStateRep = function() {
    let str = "A:" + getByteRep(this.r[A]) + " ";
    str += "X:" + getByteRep(this.r[X]) + " ";
    str += "Y:" + getByteRep(this.r[Y]) + " ";
    str += "P:" + getByteRep(this.getP(false)) + " ";
    str += "SP:" + getByteRep(this.r[SP]) + " ";
    return str;
  }

  // instruction maps

  this.addressingModes = [
    //x0 x1   x2   x3   x4   x5   x6   x7   x8   x9   xa   xb   xc   xd   xe   xf
    IMP, IZX, IMP, IMP, IMP, ZP , ZP , IMP, IMP, IMM, IMP, IMP, IMP, ABS, ABS, IMP, //0x
    REL, IZY, IMP, IMP, IMP, ZPX, ZPX, IMP, IMP, ABY, IMP, IMP, IMP, ABX, ABX, IMP, //1x
    ABS, IZX, IMP, IMP, ZP , ZP , ZP , IMP, IMP, IMM, IMP, IMP, ABS, ABS, ABS, IMP, //2x
    REL, IZY, IMP, IMP, IMP, ZPX, ZPX, IMP, IMP, ABY, IMP, IMP, IMP, ABX, ABX, IMP, //3x
    IMP, IZX, IMP, IMP, IMP, ZP , ZP , IMP, IMP, IMM, IMP, IMP, ABS, ABS, ABS, IMP, //4x
    REL, IZY, IMP, IMP, IMP, ZPX, ZPX, IMP, IMP, ABY, IMP, IMP, IMP, ABX, ABX, IMP, //5x
    IMP, IZX, IMP, IMP, IMP, ZP , ZP , IMP, IMP, IMM, IMP, IMP, IND, ABS, ABS, IMP, //6x
    REL, IZY, IMP, IMP, IMP, ZPX, ZPX, IMP, IMP, ABY, IMP, IMP, IMP, ABX, ABX, IMP, //7x
    IMP, IZX, IMP, IMP, ZP , ZP , ZP , IMP, IMP, IMP, IMP, IMP, ABS, ABS, ABS, IMP, //8x
    REL, IZY, IMP, IMP, ZPX, ZPX, ZPY, IMP, IMP, ABY, IMP, IMP, IMP, ABX, IMP, IMP, //9x
    IMM, IZX, IMM, IMP, ZP , ZP , ZP , IMP, IMP, IMM, IMP, IMP, ABS, ABS, ABS, IMP, //ax
    REL, IZY, IMP, IMP, ZPX, ZPX, ZPY, IMP, IMP, ABY, IMP, IMP, ABX, ABX, ABY, IMP, //bx
    IMM, IZX, IMP, IMP, ZP , ZP , ZP , IMP, IMP, IMM, IMP, IMP, ABS, ABS, ABS, IMP, //cx
    REL, IZY, IMP, IMP, IMP, ZPX, ZPX, IMP, IMP, ABY, IMP, IMP, IMP, ABX, ABX, IMP, //dx
    IMM, IZX, IMP, IMP, ZP , ZP , ZP , IMP, IMP, IMM, IMP, IMP, ABS, ABS, ABS, IMP, //ex
    REL, IZY, IMP, IMP, IMP, ZPX, ZPX, IMP, IMP, ABY, IMP, IMP, IMP, ABX, ABX, IMP, //fx
  ];

  this.cycles = [
    //0x1 x2 x3 x4 x5 x6 x7 x8 x9 xa xb xc xd xe xf
    7, 6, 0, 0, 0, 3, 5, 0, 3, 2, 2, 0, 0, 4, 6, 0, //0x
    2, 5, 0, 0, 0, 4, 6, 0, 2, 4, 0, 0, 0, 4, 7, 0, //1x
    6, 6, 0, 0, 3, 3, 5, 0, 4, 2, 2, 0, 4, 4, 6, 0, //2x
    2, 5, 0, 0, 0, 4, 6, 0, 2, 4, 0, 0, 0, 4, 7, 0, //3x
    6, 6, 0, 0, 0, 3, 5, 0, 3, 2, 2, 0, 3, 4, 6, 0, //4x
    2, 5, 0, 0, 0, 4, 6, 0, 2, 4, 0, 0, 0, 4, 7, 0, //5x
    6, 6, 0, 0, 0, 3, 5, 0, 4, 2, 2, 0, 5, 4, 6, 0, //6x
    2, 5, 0, 0, 0, 4, 6, 0, 2, 4, 0, 0, 0, 4, 7, 0, //7x
    0, 6, 0, 0, 3, 3, 3, 0, 2, 0, 2, 0, 4, 4, 4, 0, //8x
    2, 6, 0, 0, 4, 4, 4, 0, 2, 5, 2, 0, 0, 5, 0, 0, //9x
    2, 6, 2, 0, 3, 3, 3, 0, 2, 2, 2, 0, 4, 4, 4, 0, //ax
    2, 5, 0, 0, 4, 4, 4, 0, 2, 4, 2, 0, 4, 4, 4, 0, //bx
    2, 6, 0, 0, 3, 3, 5, 0, 2, 2, 2, 0, 4, 4, 6, 0, //cx
    2, 5, 0, 0, 0, 4, 6, 0, 2, 4, 0, 0, 0, 4, 7, 0, //dx
    2, 6, 0, 0, 3, 3, 5, 0, 2, 2, 2, 0, 4, 4, 6, 0, //ex
    2, 5, 0, 0, 0, 4, 6, 0, 2, 4, 0, 0, 0, 4, 7, 0, //fx
  ]

  this.canTakeExtra = [
    //x0   x1     x2     x3     x4     x5     x6     x7     x8     x9     xa     xb     xc     xd     xe     xf
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, //0x
    true , true , false, false, false, false, false, false, false, true , false, false, false, true , false, false, //1x
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, //2x
    true , true , false, false, false, false, false, false, false, true , false, false, false, true , false, false, //3x
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, //4x
    true , true , false, false, false, false, false, false, false, true , false, false, false, true , false, false, //5x
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, //6x
    true , true , false, false, false, false, false, false, false, true , false, false, false, true , false, false, //7x
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, //8x
    true , false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, //9x
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, //ax
    true , true , false, false, false, false, false, false, false, true , false, false, true , true , true , false, //bx
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, //cx
    true , true , false, false, false, false, false, false, false, true , false, false, false, true , false, false, //dx
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, //ex
    true , true , false, false, false, false, false, false, false, true , false, false, false, true , false, false, //fx
  ];

  // function table is at bottom

  this.cycle = function() {
    if(this.cyclesLeft <= 0) {
      // read the instruction byte
      let instr = this.mem.read(this.br[PC]++);
      // get the addressing mode
      let mode = this.addressingModes[instr];
      // get the cycle count
      let cycles = this.cycles[instr] - 1;
      // get if the instructing can have extra cycles
      let canHaveExtra = this.canTakeExtra[instr];
      // test for wanting an interrupt
      if(this.nmiWanted || (this.irqWanted && !this.i)) {
        // we want a interrupt, so push a special instuction type in instr
        this.br[PC]--;
        if(this.nmiWanted) {
          this.nmiWanted = false;
          instr = 0x100; // NMI
        } else {
          this.irqWanted = false;
          instr = 0x101; // IRQ
        }
        mode = IMP;

        cycles = 7 - 1;
        canHaveExtra = false;
      }
      // get the effective address
      let eff = this.getAdr(mode);
      // execute the instruction
      let tbr;
      try {
        tbr = this.functions[instr].call(this, eff[0], instr);
      } catch(e) {
        console.log("FUNCTION ERROR: " + getWordRep(instr));
        tbr = false;
        throw e;
      }
      // set possible extra cycles
      if(tbr) {
        // taken branch: 1 extra cycle
        cycles++;
      }
      if(canHaveExtra && eff[1] && (mode !== REL || tbr)) {
        // if instruction can take extra and page crossed
        // and it is either not a branch instruction or a
        // taken branch: 1 extra cycle
        cycles++;
      }
      this.cyclesLeft = cycles;
    } else {
      this.cyclesLeft--;
    }
  }

  // create a P value from the flags
  this.getP = function(bFlag) {
    let value = 0;
    if(this.n) {
      value |= 0x80;
    }
    if(this.v) {
      value |= 0x40;
    }
    if(this.d) {
      value |= 0x08;
    }
    if(this.i) {
      value |= 0x04;
    }
    if(this.z) {
      value |= 0x02;
    }
    if(this.c) {
      value |= 0x01;
    }
    value |= 0x20; // bit 5 is always set
    if(bFlag) {
      value |= 0x10;
    }
    return value;
  }

  // set the flags according to a P value
  this.setP = function(value) {
    this.n = (value & 0x80) > 0;
    this.v = (value & 0x40) > 0;
    this.d = (value & 0x08) > 0;
    this.i = (value & 0x04) > 0;
    this.z = (value & 0x02) > 0;
    this.c = (value & 0x01) > 0;
  }

  // set Z (zero flag) and N (overflow flag) according to the value
  this.setZandN = function(value) {
    value &= 0xff;
    if(value === 0) {
      this.z = true;
    } else {
      this.z = false;
    }
    if(value > 0x7f) {
      this.n = true;
    } else {
      this.n = false;
    }
  }

  // get a singed value (-128 - 127) out of a unsigned one (0 - 255)
  this.getSigned = function(value) {
    if(value > 127) {
      return -(256 - value);
    }
    return value;
  }

  // after fetching the instruction byte, this gets the address to affect
  // and if it crossed a page boundary
  // pc is pointing to byte after instruction byte
  this.getAdr = function(mode) {
    switch(mode) {
      case IMP: {
        // implied, wont use a address
        return [0, false];
      }
      case IMM: {
        // immediate
        return [this.br[PC]++, false];
      }
      case ZP: {
        // zero page
        return [this.mem.read(this.br[PC]++), false];
      }
      case ZPX: {
        // zero page, indexed by x
        let adr = this.mem.read(this.br[PC]++);
        return [(adr + this.r[X]) & 0xff, false];
      }
      case ZPY: {
        // zero page, indexed by y
        let adr = this.mem.read(this.br[PC]++);
        return [(adr + this.r[Y]) & 0xff, false];
      }
      case IZX: {
        // zero page, indexed indirect by x
        let adr = (this.mem.read(this.br[PC]++) + this.r[X]) & 0xff;
        return [
          this.mem.read(adr) | (this.mem.read((adr + 1) & 0xff) << 8),
          false
        ];
      }
      case IZY: {
        // zero page, indirect indexed by y
        let adr = this.mem.read(this.br[PC]++);
        let radr = this.mem.read(adr) | (this.mem.read((adr + 1) & 0xff) << 8);
        let flag = false;
        if((radr >> 8) < ((radr + this.r[Y]) >> 8)) {
          flag = true;
        }
        return [(radr + this.r[Y]) & 0xffff, flag];
      }
      case ABS: {
        // absolute
        let adr = this.mem.read(this.br[PC]++);
        adr |= (this.mem.read(this.br[PC]++) << 8);
        return [adr, false];
      }
      case ABX: {
        // abcolute, indexed by x
        let adr = this.mem.read(this.br[PC]++);
        adr |= (this.mem.read(this.br[PC]++) << 8);
        let flag = false;
        if((adr >> 8) < ((adr + this.r[X]) >> 8)) {
          flag = true;
        }
        return [(adr + this.r[X]) & 0xffff, flag];
      }
      case ABY: {
        // abcolute, indexed by y
        let adr = this.mem.read(this.br[PC]++);
        adr |= (this.mem.read(this.br[PC]++) << 8);
        let flag = false;
        if((adr >> 8) < ((adr + this.r[Y]) >> 8)) {
          flag = true;
        }
        return [(adr + this.r[Y]) & 0xffff, flag];
      }
      case IND: {
        // indexed, doesn't loop pages properly
        let adrl = this.mem.read(this.br[PC]++);
        let adrh = this.mem.read(this.br[PC]++);
        let radr = this.mem.read(adrl | (adrh << 8));
        radr |= (this.mem.read(((adrl + 1) & 0xff) | (adrh << 8))) << 8;
        return [radr, false];
      }
      case REL: {
        // relative to PC, for branches
        let adr = this.mem.read(this.br[PC]++);
        let flag = false;
        if((this.br[PC] >> 8) < (this.br[PC] + this.getSigned(adr) >> 8)) {
          flag = true;
        }
        return [(this.br[PC] + this.getSigned(adr)) & 0xffff, flag];
      }
    }
  }

  // instruction functions
  // return true if a extra cycle is to be added for taking branches

  this.uni = function(adr, num) {
    // unimplemented instruction
    log("unimplemented instruction " + getByteRep(num));
    return false;
  }

  this.ora = function(adr) {
    // ORs A with the value, set Z and N
    this.r[A] |= this.mem.read(adr);
    this.setZandN(this.r[A]);
    return false;
  }

  this.and = function(adr) {
    // ANDs A with the value, set Z and N
    this.r[A] &= this.mem.read(adr);
    this.setZandN(this.r[A]);
    return false;
  }

  this.eor = function(adr) {
    // XORs A with the value, set Z and N
    this.r[A] ^= this.mem.read(adr);
    this.setZandN(this.r[A]);
    return false;
  }

  this.adc = function(adr) {
    // adds the value + C to A, set C, V, Z and N
    let value = mem.read(adr);
    let result = this.r[A] + value + (this.c ? 1 : 0);
    if(result > 0xff) {
      this.c = true;
    } else {
      this.c = false;
    }
    if(
      (this.r[A] & 0x80) === (value & 0x80) &&
      (value & 0x80) !== (result & 0x80)
    ) {
      this.v = true;
    } else {
      this.v = false;
    }
    this.r[A] = result;
    this.setZandN(this.r[A]);
    return false;
  }

  this.sbc = function(adr) {
    // subtracts the value + !C from A, set C, V, Z and N
    let value = mem.read(adr) ^ 0xff;
    let result = this.r[A] + value + (this.c ? 1 : 0);
    if(result > 0xff) {
      this.c = true;
    } else {
      this.c = false;
    }
    if(
      (this.r[A] & 0x80) === (value & 0x80) &&
      (value & 0x80) !== (result & 0x80)
    ) {
      this.v = true;
    } else {
      this.v = false;
    }
    this.r[A] = result;
    this.setZandN(this.r[A]);
    return false;
  }

  this.cmp = function(adr) {
    // sets C, Z and N according to what A - value would do
    let value = mem.read(adr) ^ 0xff;
    let result = this.r[A] + value + 1;
    if(result > 0xff) {
      this.c = true;
    } else {
      this.c = false;
    }
    this.setZandN(result & 0xff);
    return false;
  }

  this.cpx = function(adr) {
    // sets C, Z and N according to what X - value would do
    let value = mem.read(adr) ^ 0xff;
    let result = this.r[X] + value + 1;
    if(result > 0xff) {
      this.c = true;
    } else {
      this.c = false;
    }
    this.setZandN(result & 0xff);
    return false;
  }

  this.cpy = function(adr) {
    // sets C, Z and N according to what Y - value would do
    let value = mem.read(adr) ^ 0xff;
    let result = this.r[Y] + value + 1;
    if(result > 0xff) {
      this.c = true;
    } else {
      this.c = false;
    }
    this.setZandN(result & 0xff);
    return false;
  }

  this.dec = function(adr) {
    // decrements the address, set Z and N
    let result = (this.mem.read(adr) - 1) & 0xff;
    this.setZandN(result);
    this.mem.write(adr, result);
    return false;
  }

  this.dex = function(adr) {
    // decrements X, set Z and N
    this.r[X]--;
    this.setZandN(this.r[X]);
    return false;
  }

  this.dey = function(adr) {
    // decrements Y, set Z and N
    this.r[Y]--;
    this.setZandN(this.r[Y]);
    return false;
  }

  this.inc = function(adr) {
    // increments the address, set Z and N
    let result = (this.mem.read(adr) + 1) & 0xff;
    this.setZandN(result);
    this.mem.write(adr, result);
    return false;
  }

  this.inx = function(adr) {
    // increments X, set Z and N
    this.r[X]++;
    this.setZandN(this.r[X]);
    return false;
  }

  this.iny = function(adr) {
    // increments Y, set Z and N
    this.r[Y]++;
    this.setZandN(this.r[Y]);
    return false;
  }

  this.sla = function(adr) {
    // shifts A left 1, set C, Z and N
    let result = this.r[A] << 1;
    if(result > 0xff) {
      this.c = true;
    } else {
      this.c = false;
    }
    this.setZandN(result);
    this.r[A] = result;
    return false;
  }

  this.asl = function(adr) {
    // shifts a memory location left 1, set C, Z and N
    let result = this.mem.read(adr) << 1;
    if(result > 0xff) {
      this.c = true;
    } else {
      this.c = false;
    }
    this.setZandN(result);
    this.mem.write(adr, result);
    return false;
  }

  this.rla = function(adr) {
    // rolls A left 1, rolls C in, set C, Z and N
    let result = (this.r[A] << 1) | (this.c ? 1 : 0);
    if(result > 0xff) {
      this.c = true;
    } else {
      this.c = false;
    }
    this.setZandN(result);
    this.r[A] = result;
    return false;
  }

  this.rol = function(adr) {
    // rolls a memory location left 1, rolls C in, set C, Z and N
    let result = (this.mem.read(adr) << 1) | (this.c ? 1 : 0);
    if(result > 0xff) {
      this.c = true;
    } else {
      this.c = false;
    }
    this.setZandN(result);
    this.mem.write(adr, result);
    return false;
  }

  this.sra = function(adr) {
    // shifts A right 1, set C, Z and N
    let carry = this.r[A] & 0x1;
    let result = this.r[A] >> 1;
    if(carry) {
      this.c = true;
    } else {
      this.c = false;
    }
    this.setZandN(result);
    this.r[A] = result;
  }

  this.lsr = function(adr) {
    // shifts a memory location right 1, set C, Z and N
    let value = this.mem.read(adr);
    let carry = value & 0x1;
    let result = value >> 1;
    if(carry) {
      this.c = true;
    } else {
      this.c = false;
    }
    this.setZandN(result);
    this.mem.write(adr, result);
    return false;
  }

  this.rra = function(adr) {
    // rolls A right 1, rolls C in, set C, Z and N
    let carry = this.r[A] & 0x1;
    let result = (this.r[A] >> 1) | ((this.c ? 1 : 0) << 7);
    if(carry) {
      this.c = true;
    } else {
      this.c = false;
    }
    this.setZandN(result);
    this.r[A] = result;
    return false;
  }

  this.ror = function(adr) {
    // rolls a memory location right 1, rolls C in, set C, Z and N
    let value = this.mem.read(adr);
    let carry = value & 0x1;
    let result = (value >> 1) | ((this.c ? 1 : 0) << 7);
    if(carry) {
      this.c = true;
    } else {
      this.c = false;
    }
    this.setZandN(result);
    this.mem.write(adr, result);
    return false;
  }

  this.lda = function(adr) {
    // loads a value in a, sets Z and N
    this.r[A] = this.mem.read(adr);
    this.setZandN(this.r[A]);
    return false;
  }

  this.sta = function(adr) {
    // stores a to a memory location
    this.mem.write(adr, this.r[A]);
    return false;
  }

  this.ldx = function(adr) {
    // loads x value in a, sets Z and N
    this.r[X] = this.mem.read(adr);
    this.setZandN(this.r[X]);
    return false;
  }

  this.stx = function(adr) {
    // stores x to a memory location
    this.mem.write(adr, this.r[X]);
    return false;
  }

  this.ldy = function(adr) {
    // loads a value in y, sets Z and N
    this.r[Y] = this.mem.read(adr);
    this.setZandN(this.r[Y]);
    return false;
  }

  this.sty = function(adr) {
    // stores y to a memory location
    this.mem.write(adr, this.r[Y]);
    return false;
  }

  this.tax = function(adr) {
    // transfers a to x, sets Z and N
    this.r[X] = this.r[A];
    this.setZandN(this.r[X]);
    return false;
  }

  this.txa = function(adr) {
    // transfers x to a, sets Z and N
    this.r[A] = this.r[X];
    this.setZandN(this.r[A]);
    return false;
  }

  this.tay = function(adr) {
    // transfers a to y, sets Z and N
    this.r[Y] = this.r[A];
    this.setZandN(this.r[Y]);
    return false;
  }

  this.tya = function(adr) {
    // transfers y to a, sets Z and N
    this.r[A] = this.r[Y];
    this.setZandN(this.r[A]);
    return false;
  }

  this.tsx = function(adr) {
    // transfers the stack pointer to x, sets Z and N
    this.r[X] = this.r[SP];
    this.setZandN(this.r[X]);
    return false;
  }

  this.txs = function(adr) {
    // transfers x to the stack pointer
    this.r[SP] = this.r[X];
    return false;
  }

  this.pla = function(adr) {
    // pulls a from the stack, sets Z and N
    this.r[A] = this.mem.read(0x100 + ((++this.r[SP]) & 0xff));
    this.setZandN(this.r[A]);
    return false;
  }

  this.pha = function(adr) {
    // pushes a to the stack
    this.mem.write(0x100 + this.r[SP]--, this.r[A]);
    return false
  }

  this.plp = function(adr) {
    // pulls the flags from the stack
    this.setP(this.mem.read(0x100 + ((++this.r[SP]) & 0xff)));
    return false;
  }

  this.php = function(adr) {
    // pushes the flags to the stack
    this.mem.write(0x100 + this.r[SP]--, this.getP(true));
    return false;
  }

  this.bpl = function(adr) {
    // branches if N is 0
    if(!this.n) {
      this.br[PC] = adr;
      return true;
    }
    return false;
  }

  this.bmi = function(adr) {
    // branches if N is 1
    if(this.n) {
      this.br[PC] = adr;
      return true;
    }
    return false;
  }

  this.bvc = function(adr) {
    // branches if V is 0
    if(!this.v) {
      this.br[PC] = adr;
      return true;
    }
    return false;
  }

  this.bvs = function(adr) {
    // branches if V is 1
    if(this.v) {
      this.br[PC] = adr;
      return true;
    }
    return false;
  }

  this.bcc = function(adr) {
    // branches if C is 0
    if(!this.c) {
      this.br[PC] = adr;
      return true;
    }
    return false;
  }

  this.bcs = function(adr) {
    // branches if C is 1
    if(this.c) {
      this.br[PC] = adr;
      return true;
    }
    return false;
  }

  this.bne = function(adr) {
    // branches if Z is 0
    if(!this.z) {
      this.br[PC] = adr;
      return true;
    }
    return false;
  }

  this.beq = function(adr) {
    // branches if Z is 1
    if(this.z) {
      this.br[PC] = adr;
      return true;
    }
    return false;
  }

  this.brk = function(adr) {
    // break to irq handler
    let pushPc = (this.br[PC] + 1) & 0xffff;
    this.mem.write(0x100 + this.r[SP]--, pushPc >> 8);
    this.mem.write(0x100 + this.r[SP]--, pushPc & 0xff);
    this.mem.write(0x100 + this.r[SP]--, this.getP(true));
    this.i = true;
    this.br[PC] = this.mem.read(0xfffe) | (this.mem.read(0xffff) << 8);
    return false;
  }

  this.rti = function(adr) {
    // return from interrupt
    this.setP(this.mem.read(0x100 + ((++this.r[SP]) & 0xff)));
    let pullPc = this.mem.read(0x100 + ((++this.r[SP]) & 0xff));
    pullPc |= (this.mem.read(0x100 + ((++this.r[SP]) & 0xff)) << 8);
    this.br[PC] = pullPc;
  }

  this.jsr = function(adr) {
    // jump to subroutine
    let pushPc = (this.br[PC] - 1) & 0xffff;
    this.mem.write(0x100 + this.r[SP]--, pushPc >> 8);
    this.mem.write(0x100 + this.r[SP]--, pushPc & 0xff);
    this.br[PC] = adr;
  }

  this.rts = function(adr) {
    // return from subroutine
    let pullPc = this.mem.read(0x100 + ((++this.r[SP]) & 0xff));
    pullPc |= (this.mem.read(0x100 + ((++this.r[SP]) & 0xff)) << 8);
    this.br[PC] = pullPc + 1;
  }

  this.jmp = function(adr) {
    // jump to address
    this.br[PC] = adr;
  }

  this.bit = function(adr) {
    // bit test A with value, set N to b7, V to b6 and Z to result
    let value = this.mem.read(adr);
    if((value & 0x80) > 0) {
      this.n = true;
    } else {
      this.n = false;
    }
    if((value & 0x40) > 0) {
      this.v = true;
    } else {
      this.v = false;
    }
    let res = this.r[A] & value;
    if(res === 0) {
      this.z = true;
    } else {
      this.z = false;
    }
    return false;
  }

  this.clc = function(adr) {
    // clear carry flag
    this.c = false;
    return false;
  }

  this.sec = function(adr) {
    // set carry flag
    this.c = true;
    return false;
  }

  this.cld = function(adr) {
    // clear decimal flag
    this.d = false;
    return false;
  }

  this.sed = function(adr) {
    // set decimal flag
    this.d = true;
    return false;
  }

  this.cli = function(adr) {
    // clear interrupt flag
    this.i = false;
    return false;
  }

  this.sei = function(adr) {
    // set interrupt flag
    this.i = true;
    return false;
  }

  this.clv = function(adr) {
    // clear overflow flag
    this.v = false;
    return false;
  }

  this.nop = function(adr) {
    // no operation
    return false;
  }

  this.irq = function(adr) {
    // handle irq interrupt
    let pushPc = this.br[PC];
    this.mem.write(0x100 + this.r[SP]--, pushPc >> 8);
    this.mem.write(0x100 + this.r[SP]--, pushPc & 0xff);
    this.mem.write(0x100 + this.r[SP]--, this.getP(false));
    this.i = true;
    this.br[PC] = this.mem.read(0xfffe) | (this.mem.read(0xffff) << 8);
    return false;
  }

  this.nmi = function(adr) {
    // handle nmi interrupt
    let pushPc = this.br[PC];
    this.mem.write(0x100 + this.r[SP]--, pushPc >> 8);
    this.mem.write(0x100 + this.r[SP]--, pushPc & 0xff);
    this.mem.write(0x100 + this.r[SP]--, this.getP(false));
    this.i = true;
    this.br[PC] = this.mem.read(0xfffa) | (this.mem.read(0xfffb) << 8);
    return false;
  }

  this.functions = [
    //x0      x1        x2        x3        x4        x5        x6        x7        x8        x9        xa        xb        xc        xd        xe        xf
    this.brk, this.ora, this.uni, this.uni, this.uni, this.ora, this.asl, this.uni, this.php, this.ora, this.sla, this.uni, this.uni, this.ora, this.asl, this.uni, //0x
    this.bpl, this.ora, this.uni, this.uni, this.uni, this.ora, this.asl, this.uni, this.clc, this.ora, this.uni, this.uni, this.uni, this.ora, this.asl, this.uni, //1x
    this.jsr, this.and, this.uni, this.uni, this.bit, this.and, this.rol, this.uni, this.plp, this.and, this.rla, this.uni, this.bit, this.and, this.rol, this.uni, //2x
    this.bmi, this.and, this.uni, this.uni, this.uni, this.and, this.rol, this.uni, this.sec, this.and, this.uni, this.uni, this.uni, this.and, this.rol, this.uni, //3x
    this.rti, this.eor, this.uni, this.uni, this.uni, this.eor, this.lsr, this.uni, this.pha, this.eor, this.sra, this.uni, this.jmp, this.eor, this.lsr, this.uni, //4x
    this.bvc, this.eor, this.uni, this.uni, this.uni, this.eor, this.lsr, this.uni, this.cli, this.eor, this.uni, this.uni, this.uni, this.eor, this.lsr, this.uni, //5x
    this.rts, this.adc, this.uni, this.uni, this.uni, this.adc, this.ror, this.uni, this.pla, this.adc, this.rra, this.uni, this.jmp, this.adc, this.ror, this.uni, //6x
    this.bvs, this.adc, this.uni, this.uni, this.uni, this.adc, this.ror, this.uni, this.sei, this.adc, this.uni, this.uni, this.uni, this.adc, this.ror, this.uni, //7x
    this.uni, this.sta, this.uni, this.uni, this.sty, this.sta, this.stx, this.uni, this.dey, this.uni, this.txa, this.uni, this.sty, this.sta, this.stx, this.uni, //8x
    this.bcc, this.sta, this.uni, this.uni, this.sty, this.sta, this.stx, this.uni, this.tya, this.sta, this.txs, this.uni, this.uni, this.sta, this.uni, this.uni, //9x
    this.ldy, this.lda, this.ldx, this.uni, this.ldy, this.lda, this.ldx, this.uni, this.tay, this.lda, this.tax, this.uni, this.ldy, this.lda, this.ldx, this.uni, //ax
    this.bcs, this.lda, this.uni, this.uni, this.ldy, this.lda, this.ldx, this.uni, this.clv, this.lda, this.tsx, this.uni, this.ldy, this.lda, this.ldx, this.uni, //bx
    this.cpy, this.cmp, this.uni, this.uni, this.cpy, this.cmp, this.dec, this.uni, this.iny, this.cmp, this.dex, this.uni, this.cpy, this.cmp, this.dec, this.uni, //cx
    this.bne, this.cmp, this.uni, this.uni, this.uni, this.cmp, this.dec, this.uni, this.cld, this.cmp, this.uni, this.uni, this.uni, this.cmp, this.dec, this.uni, //dx
    this.cpx, this.sbc, this.uni, this.uni, this.cpx, this.sbc, this.inc, this.uni, this.inx, this.sbc, this.nop, this.uni, this.cpx, this.sbc, this.inc, this.uni, //ex
    this.beq, this.sbc, this.uni, this.uni, this.uni, this.sbc, this.inc, this.uni, this.sed, this.sbc, this.uni, this.uni, this.uni, this.sbc, this.inc, this.uni, //fx
    this.nmi, this.irq // 0x100: NMI, 0x101: IRQ
  ];

}
