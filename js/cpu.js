
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

  // memory handler
  this.mem = mem;

  this.reset = function() {
    this.r[A] = 0;
    this.r[X] = 0;
    this.r[Y] = 0;
    this.r[SP] = 0xfd;
    if(this.mem.read) {
      this.br[PC] = this.mem.read(0xfffc) | (this.mem.read(0xfffd) << 8);
    } else {
      // if the read function in the mem-handler has not been defined yet
      this.br[PC] = 0;
    }

    // flags
    this.n = false;
    this.v = false;
    this.d = false;
    this.i = true;
    this.z = false;
    this.c = false;

    // interrupt wanted
    this.irqWanted = false;
    this.nmiWanted = false;

    // cycles left
    this.cyclesLeft = 7;
  }
  this.reset();

  // instruction maps

  this.addressingModes = [
    //x0 x1   x2   x3   x4   x5   x6   x7   x8   x9   xa   xb   xc   xd   xe   xf
    IMP, IZX, IMP, IZX, ZP , ZP , ZP , ZP , IMP, IMM, IMP, IMM, ABS, ABS, ABS, ABS, //0x
    REL, IZY, IMP, IZY, ZPX, ZPX, ZPX, ZPX, IMP, ABY, IMP, ABY, ABX, ABX, ABX, ABX, //1x
    ABS, IZX, IMP, IZX, ZP , ZP , ZP , ZP , IMP, IMM, IMP, IMM, ABS, ABS, ABS, ABS, //2x
    REL, IZY, IMP, IZY, ZPX, ZPX, ZPX, ZPX, IMP, ABY, IMP, ABY, ABX, ABX, ABX, ABX, //3x
    IMP, IZX, IMP, IZX, ZP , ZP , ZP , ZP , IMP, IMM, IMP, IMM, ABS, ABS, ABS, ABS, //4x
    REL, IZY, IMP, IZY, ZPX, ZPX, ZPX, ZPX, IMP, ABY, IMP, ABY, ABX, ABX, ABX, ABX, //5x
    IMP, IZX, IMP, IZX, ZP , ZP , ZP , ZP , IMP, IMM, IMP, IMM, IND, ABS, ABS, ABS, //6x
    REL, IZY, IMP, IZY, ZPX, ZPX, ZPX, ZPX, IMP, ABY, IMP, ABY, ABX, ABX, ABX, ABX, //7x
    IMM, IZX, IMM, IZX, ZP , ZP , ZP , ZP , IMP, IMM, IMP, IMM, ABS, ABS, ABS, ABS, //8x
    REL, IZY, IMP, IZY, ZPX, ZPX, ZPY, ZPY, IMP, ABY, IMP, ABY, ABX, ABX, ABY, ABY, //9x
    IMM, IZX, IMM, IZX, ZP , ZP , ZP , ZP , IMP, IMM, IMP, IMM, ABS, ABS, ABS, ABS, //ax
    REL, IZY, IMP, IZY, ZPX, ZPX, ZPY, ZPY, IMP, ABY, IMP, ABY, ABX, ABX, ABY, ABY, //bx
    IMM, IZX, IMM, IZX, ZP , ZP , ZP , ZP , IMP, IMM, IMP, IMM, ABS, ABS, ABS, ABS, //cx
    REL, IZY, IMP, IZY, ZPX, ZPX, ZPX, ZPX, IMP, ABY, IMP, ABY, ABX, ABX, ABX, ABX, //dx
    IMM, IZX, IMM, IZX, ZP , ZP , ZP , ZP , IMP, IMM, IMP, IMM, ABS, ABS, ABS, ABS, //ex
    REL, IZY, IMP, IZY, ZPX, ZPX, ZPX, ZPX, IMP, ABY, IMP, ABY, ABX, ABX, ABX, ABX, //fx
  ];

  this.cycles = [
    //0x1 x2 x3 x4 x5 x6 x7 x8 x9 xa xb xc xd xe xf
    7, 6, 2, 8, 3, 3, 5, 5, 3, 2, 2, 2, 4, 4, 6, 6, //0x
    2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7, //1x
    6, 6, 2, 8, 3, 3, 5, 5, 4, 2, 2, 2, 4, 4, 6, 6, //2x
    2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7, //3x
    6, 6, 2, 8, 3, 3, 5, 5, 3, 2, 2, 2, 3, 4, 6, 6, //4x
    2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7, //5x
    6, 6, 2, 8, 3, 3, 5, 5, 4, 2, 2, 2, 5, 4, 6, 6, //6x
    2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7, //7x
    2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4, //8x
    2, 6, 2, 6, 4, 4, 4, 4, 2, 5, 2, 5, 5, 5, 5, 5, //9x
    2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4, //ax
    2, 5, 2, 5, 4, 4, 4, 4, 2, 4, 2, 4, 4, 4, 4, 4, //bx
    2, 6, 2, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6, //cx
    2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7, //dx
    2, 6, 2, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6, //ex
    2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7, //fx
  ]

  this.canTakeExtra = [
    //x0   x1     x2     x3     x4     x5     x6     x7     x8     x9     xa     xb     xc     xd     xe     xf
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, //0x
    true , true , false, false, false, false, false, false, false, true , false, false, true , true , false, false, //1x
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, //2x
    true , true , false, false, false, false, false, false, false, true , false, false, true , true , false, false, //3x
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, //4x
    true , true , false, false, false, false, false, false, false, true , false, false, true , true , false, false, //5x
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, //6x
    true , true , false, false, false, false, false, false, false, true , false, false, true , true , false, false, //7x
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, //8x
    true , false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, //9x
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, //ax
    true , true , false, true , false, false, false, false, false, true , false, true , true , true , true , true , //bx
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, //cx
    true , true , false, false, false, false, false, false, false, true , false, false, true , true , false, false, //dx
    false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, //ex
    true , true , false, false, false, false, false, false, false, true , false, false, true , true , false, false, //fx
  ];

  // function table is at bottom

  this.cycle = function() {
    if(this.cyclesLeft <= 0) {
      // read the instruction byte and get the info
      let instr = this.mem.read(this.br[PC]++);
      let mode = this.addressingModes[instr];
      let cycles = this.cycles[instr] - 1;
      let canHaveExtra = this.canTakeExtra[instr];
      // test for wanting an interrupt
      if(this.nmiWanted || (this.irqWanted && !this.i)) {
        // we want a interrupt, so push a special instuction type in instr
        this.br[PC]--;
        if(this.nmiWanted) {
          this.nmiWanted = false;
          instr = 0x100; // NMI
        } else {
          instr = 0x101; // IRQ
        }
        mode = IMP;

        cycles = 7 - 1;
        canHaveExtra = false;
      }
      // get the effective address, and execute the instruction
      let eff = this.getAdr(mode);
      let tbr = this.functions[instr].call(this, eff[0], instr);
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

    value |= this.n ? 0x80 : 0;
    value |= this.v ? 0x40 : 0;
    value |= this.d ? 0x08 : 0;
    value |= this.i ? 0x04 : 0;
    value |= this.z ? 0x02 : 0;
    value |= this.c ? 0x01 : 0;
    value |= 0x20; // bit 5 is always set
    value |= bFlag ? 0x10 : 0;

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
    this.z = value === 0;
    this.n = value > 0x7f;
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
        // implied, wont use an address
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
        // absolute, indexed by x
        let adr = this.mem.read(this.br[PC]++);
        adr |= (this.mem.read(this.br[PC]++) << 8);
        let flag = false;
        if((adr >> 8) < ((adr + this.r[X]) >> 8)) {
          flag = true;
        }
        return [(adr + this.r[X]) & 0xffff, flag];
      }
      case ABY: {
        // absolute, indexed by y
        let adr = this.mem.read(this.br[PC]++);
        adr |= (this.mem.read(this.br[PC]++) << 8);
        let flag = false;
        if((adr >> 8) < ((adr + this.r[Y]) >> 8)) {
          flag = true;
        }
        return [(adr + this.r[Y]) & 0xffff, flag];
      }
      case IND: {
        // indirect, doesn't loop pages properly
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
        if((this.br[PC] >> 8) !== ((this.br[PC] + this.getSigned(adr)) >> 8)) {
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
    this.c = result > 0xff;
    this.v = (
      (this.r[A] & 0x80) === (value & 0x80) &&
      (value & 0x80) !== (result & 0x80)
    );
    this.r[A] = result;
    this.setZandN(this.r[A]);
    return false;
  }

  this.sbc = function(adr) {
    // subtracts the value + !C from A, set C, V, Z and N
    let value = mem.read(adr) ^ 0xff;
    let result = this.r[A] + value + (this.c ? 1 : 0);
    this.c = result > 0xff;
    this.v = (
      (this.r[A] & 0x80) === (value & 0x80) &&
      (value & 0x80) !== (result & 0x80)
    );
    this.r[A] = result;
    this.setZandN(this.r[A]);
    return false;
  }

  this.cmp = function(adr) {
    // sets C, Z and N according to what A - value would do
    let value = mem.read(adr) ^ 0xff;
    let result = this.r[A] + value + 1;
    this.c = result > 0xff;
    this.setZandN(result & 0xff);
    return false;
  }

  this.cpx = function(adr) {
    // sets C, Z and N according to what X - value would do
    let value = mem.read(adr) ^ 0xff;
    let result = this.r[X] + value + 1;
    this.c = result > 0xff;
    this.setZandN(result & 0xff);
    return false;
  }

  this.cpy = function(adr) {
    // sets C, Z and N according to what Y - value would do
    let value = mem.read(adr) ^ 0xff;
    let result = this.r[Y] + value + 1;
    this.c = result > 0xff;
    this.setZandN(result & 0xff);
    return false;
  }

  this.dec = function(adr) {
    // decrements a memory location, set Z and N
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
    // increments a memory location, set Z and N
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

  this.asla = function(adr) {
    // shifts A left 1, set C, Z and N
    let result = this.r[A] << 1;
    this.c = result > 0xff;
    this.setZandN(result);
    this.r[A] = result;
    return false;
  }

  this.asl = function(adr) {
    // shifts a memory location left 1, set C, Z and N
    let result = this.mem.read(adr) << 1;
    this.c = result > 0xff;
    this.setZandN(result);
    this.mem.write(adr, result);
    return false;
  }

  this.rola = function(adr) {
    // rolls A left 1, rolls C in, set C, Z and N
    let result = (this.r[A] << 1) | (this.c ? 1 : 0);
    this.c = result > 0xff;
    this.setZandN(result);
    this.r[A] = result;
    return false;
  }

  this.rol = function(adr) {
    // rolls a memory location left 1, rolls C in, set C, Z and N
    let result = (this.mem.read(adr) << 1) | (this.c ? 1 : 0);
    this.c = result > 0xff;
    this.setZandN(result);
    this.mem.write(adr, result);
    return false;
  }

  this.lsra = function(adr) {
    // shifts A right 1, set C, Z and N
    let carry = this.r[A] & 0x1;
    let result = this.r[A] >> 1;
    this.c = carry > 0;
    this.setZandN(result);
    this.r[A] = result;
    return false;
  }

  this.lsr = function(adr) {
    // shifts a memory location right 1, set C, Z and N
    let value = this.mem.read(adr);
    let carry = value & 0x1;
    let result = value >> 1;
    this.c = carry > 0;
    this.setZandN(result);
    this.mem.write(adr, result);
    return false;
  }

  this.rora = function(adr) {
    // rolls A right 1, rolls C in, set C, Z and N
    let carry = this.r[A] & 0x1;
    let result = (this.r[A] >> 1) | ((this.c ? 1 : 0) << 7);
    this.c = carry > 0;
    this.setZandN(result);
    this.r[A] = result;
    return false;
  }

  this.ror = function(adr) {
    // rolls a memory location right 1, rolls C in, set C, Z and N
    let value = this.mem.read(adr);
    let carry = value & 0x1;
    let result = (value >> 1) | ((this.c ? 1 : 0) << 7);
    this.c = carry > 0;
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
    return false;
  }

  this.jsr = function(adr) {
    // jump to subroutine
    let pushPc = (this.br[PC] - 1) & 0xffff;
    this.mem.write(0x100 + this.r[SP]--, pushPc >> 8);
    this.mem.write(0x100 + this.r[SP]--, pushPc & 0xff);
    this.br[PC] = adr;
    return false;
  }

  this.rts = function(adr) {
    // return from subroutine
    let pullPc = this.mem.read(0x100 + ((++this.r[SP]) & 0xff));
    pullPc |= (this.mem.read(0x100 + ((++this.r[SP]) & 0xff)) << 8);
    this.br[PC] = pullPc + 1;
    return false;
  }

  this.jmp = function(adr) {
    // jump to address
    this.br[PC] = adr;
    return false;
  }

  this.bit = function(adr) {
    // bit test A with value, set N to b7, V to b6 and Z to result
    let value = this.mem.read(adr);
    this.n = (value & 0x80) > 0;
    this.v = (value & 0x40) > 0;
    let res = this.r[A] & value;
    this.z = res === 0;
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

  // undocumented opcodes

  this.kil = function(adr) {
    // stopts the cpu
    this.br[PC]--;
    return false;
  }

  this.slo = function(adr) {
    // shifts a memory location left 1, ORs a with the result, sets N, Z and C
    let result = this.mem.read(adr) << 1;
    this.c = result > 0xff;
    this.mem.write(adr, result);
    this.r[A] |= result;
    this.setZandN(this.r[A]);
    return false;
  }

  this.rla = function(adr) {
    // rolls a memory location left 1, ANDs a with the result, sets N, Z and C
    let result = (this.mem.read(adr) << 1) | (this.c ? 1 : 0);
    this.c = result > 0xff;
    this.mem.write(adr, result);
    this.r[A] &= result;
    this.setZandN(this.r[A]);
    return false;
  }

  this.sre = function(adr) {
    // shifts a memory location right 1, XORs A with the result, sets N, Z and C
    let value = this.mem.read(adr);
    let carry = value & 0x1;
    let result = value >> 1;
    this.c = carry > 0;
    this.mem.write(adr, result);
    this.r[A] ^= result;
    this.setZandN(this.r[A]);
    return false;
  }

  this.rra = function(adr) {
    // rolls a memory location right 1, adds the result to A, sets N, Z, C and V
    let value = this.mem.read(adr);
    let carry = value & 0x1;
    let result = (value >> 1) | ((this.c ? 1 : 0) << 7);
    this.c = carry > 0;
    this.mem.write(adr, result);
    let addResult = this.r[A] + result + (this.c ? 1 : 0);
    this.c = addResult > 0xff;
    this.v = (
      (this.r[A] & 0x80) === (result & 0x80) &&
      (result & 0x80) !== (addResult & 0x80)
    );
    this.r[A] = addResult;
    this.setZandN(this.r[A]);
    return false;
  }

  this.sax = function(adr) {
    // stores A ANDed with X to a memory location
    this.mem.write(adr, this.r[A] & this.r[X]);
    return false;
  }

  this.lax = function(adr) {
    // loads A and X with a value
    this.r[A] = this.mem.read(adr);
    this.r[X] = this.r[A];
    this.setZandN(this.r[X]);
    return false;
  }

  this.dcp = function(adr) {
    // decrement a memory location, and sets C, Z and N to what A - result does
    let value = (this.mem.read(adr) - 1) & 0xff;
    this.mem.write(adr, value);
    value ^= 0xff;
    let result = this.r[A] + value + 1;
    this.c = result > 0xff;
    this.setZandN(result & 0xff);
    return false;
  }

  this.isc = function(adr) {
    // increments a memory location, and subtract it+!C from A, sets Z, N, V, C
    let value = (this.mem.read(adr) + 1) & 0xff;
    this.mem.write(adr, value);
    value ^= 0xff;
    let result = this.r[A] + value + (this.c ? 1 : 0);
    this.c = result > 0xff;
    this.v = (
      (this.r[A] & 0x80) === (value & 0x80) &&
      (value & 0x80) !== (result & 0x80)
    );
    this.r[A] = result;
    this.setZandN(this.r[A]);
    return false;
  }

  this.anc = function(adr) {
    // ANDs a with the value, sets Z and N, then sets C to N
    this.r[A] &= this.mem.read(adr);
    this.setZandN(this.r[A]);
    this.c = this.n;
    return false;
  }

  this.alr = function(adr) {
    // ANDs a with the value, then shifts A right 1, sets C, Z and N
    this.r[A] &= this.mem.read(adr);
    let carry = this.r[A] & 0x1;
    let result = this.r[A] >> 1;
    this.c = carry > 0;
    this.setZandN(result);
    this.r[A] = result;
    return false;
  }

  this.arr = function(adr) {
    // ANDs a with the value, then rolls A right 1, sets Z, N, C and V oddly
    this.r[A] &= this.mem.read(adr);
    let result = (this.r[A] >> 1) | ((this.c ? 1 : 0) << 7);
    this.setZandN(result);
    this.c = (result & 0x40) > 0;
    this.v = ((result & 0x40) ^ ((result & 0x20) << 1)) > 0;
    this.r[A] = result;
    return false;
  }

  this.axs = function(adr) {
    // sets X to A ANDed with X minus the value, sets N, Z and C
    let value = mem.read(adr) ^ 0xff;
    let andedA = this.r[A] & this.r[X];
    let result = andedA + value + 1;
    this.c = result > 0xff;
    this.r[X] = result;
    this.setZandN(this.r[X]);
    return false;
  }

  // function table
  this.functions = [
    //x0      x1        x2        x3        x4        x5        x6        x7        x8        x9        xa        xb        xc        xd        xe        xf
    this.brk, this.ora, this.kil, this.slo, this.nop, this.ora, this.asl, this.slo, this.php, this.ora, this.asla,this.anc, this.nop, this.ora, this.asl, this.slo, //0x
    this.bpl, this.ora, this.kil, this.slo, this.nop, this.ora, this.asl, this.slo, this.clc, this.ora, this.nop, this.slo, this.nop, this.ora, this.asl, this.slo, //1x
    this.jsr, this.and, this.kil, this.rla, this.bit, this.and, this.rol, this.rla, this.plp, this.and, this.rola,this.anc, this.bit, this.and, this.rol, this.rla, //2x
    this.bmi, this.and, this.kil, this.rla, this.nop, this.and, this.rol, this.rla, this.sec, this.and, this.nop, this.rla, this.nop, this.and, this.rol, this.rla, //3x
    this.rti, this.eor, this.kil, this.sre, this.nop, this.eor, this.lsr, this.sre, this.pha, this.eor, this.lsra,this.alr, this.jmp, this.eor, this.lsr, this.sre, //4x
    this.bvc, this.eor, this.kil, this.sre, this.nop, this.eor, this.lsr, this.sre, this.cli, this.eor, this.nop, this.sre, this.nop, this.eor, this.lsr, this.sre, //5x
    this.rts, this.adc, this.kil, this.rra, this.nop, this.adc, this.ror, this.rra, this.pla, this.adc, this.rora,this.arr, this.jmp, this.adc, this.ror, this.rra, //6x
    this.bvs, this.adc, this.kil, this.rra, this.nop, this.adc, this.ror, this.rra, this.sei, this.adc, this.nop, this.rra, this.nop, this.adc, this.ror, this.rra, //7x
    this.nop, this.sta, this.nop, this.sax, this.sty, this.sta, this.stx, this.sax, this.dey, this.nop, this.txa, this.uni, this.sty, this.sta, this.stx, this.sax, //8x
    this.bcc, this.sta, this.kil, this.uni, this.sty, this.sta, this.stx, this.sax, this.tya, this.sta, this.txs, this.uni, this.uni, this.sta, this.uni, this.uni, //9x
    this.ldy, this.lda, this.ldx, this.lax, this.ldy, this.lda, this.ldx, this.lax, this.tay, this.lda, this.tax, this.uni, this.ldy, this.lda, this.ldx, this.lax, //ax
    this.bcs, this.lda, this.kil, this.lax, this.ldy, this.lda, this.ldx, this.lax, this.clv, this.lda, this.tsx, this.uni, this.ldy, this.lda, this.ldx, this.lax, //bx
    this.cpy, this.cmp, this.nop, this.dcp, this.cpy, this.cmp, this.dec, this.dcp, this.iny, this.cmp, this.dex, this.axs, this.cpy, this.cmp, this.dec, this.dcp, //cx
    this.bne, this.cmp, this.kil, this.dcp, this.nop, this.cmp, this.dec, this.dcp, this.cld, this.cmp, this.nop, this.dcp, this.nop, this.cmp, this.dec, this.dcp, //dx
    this.cpx, this.sbc, this.nop, this.isc, this.cpx, this.sbc, this.inc, this.isc, this.inx, this.sbc, this.nop, this.sbc, this.cpx, this.sbc, this.inc, this.isc, //ex
    this.beq, this.sbc, this.kil, this.isc, this.nop, this.sbc, this.inc, this.isc, this.sed, this.sbc, this.nop, this.isc, this.nop, this.sbc, this.inc, this.isc, //fx
    this.nmi, this.irq // 0x100: NMI, 0x101: IRQ
  ];

}
