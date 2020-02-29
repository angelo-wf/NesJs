
function NsfMapper(data, loadAdr, banked, banks) {

  this.banked = banked;
  this.origBanks = banks;
  this.loadAdr = loadAdr;
  this.banks = new Uint8Array(8);
  this.data = data;
  this.romData = undefined; // will be set up when resetting
  this.maxBanks = 1;

  this.prgRam = new Uint8Array(0x2000);

  this.reset = function() {
    for(let i = 0; i < this.prgRam.length; i++) {
      this.prgRam[i] = 0;
    }
    for(let i = 0; i < 8; i++) {
      this.banks[i] = this.origBanks[i];
    }
    if(this.banked) {
      this.loadAdr &= 0xfff;
      let totalData = (this.data.length - 0x80) + this.loadAdr;
      this.maxBanks = Math.ceil(totalData / 0x1000);
      this.romData = new Uint8Array(this.maxBanks * 0x1000);
      // fill the romdata
      for(let i = this.loadAdr; i < this.romData.length; i++) {
        if(0x80 + (i - this.loadAdr) >= this.data.length) {
          // we reached the end of the file
          break;
        }
        this.romData[i] = this.data[0x80 + (i - this.loadAdr)];
      }
    } else {
      this.romData = new Uint8Array(0x8000);
      // fill the romdata
      for(let i = this.loadAdr; i < 0x10000; i++) {
        if(0x80 + (i - this.loadAdr) >= this.data.length) {
          // we reached the end of the file
          break;
        }
        this.romData[i - 0x8000] = this.data[0x80 + (i - this.loadAdr)];
      }
    }
  }
  this.reset();

  this.read = function(adr) {
    if(adr < 0x6000) {
      return 0;
    }
    if(adr < 0x8000) {
      return this.prgRam[adr & 0x1fff];
    }
    if(this.banked) {
      let bankNum = (adr >> 12) - 8;
      return this.romData[this.banks[bankNum] * 0x1000 + (adr & 0xfff)];
    } else {
      return this.romData[adr & 0x7fff];
    }
  }

  this.write = function(adr, val) {
    if(adr < 0x5ff8) {
      return;
    }
    if(adr < 0x6000) {
      this.banks[adr - 0x5ff8] = val % this.maxBanks;
      return;
    }
    if(adr < 0x8000) {
      this.prgRam[adr & 0x1fff] = val;
      return;
    }
    // rom not writable
    return;
  }
}
