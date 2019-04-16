
function AudioHandler() {

  this.hasAudio = true;
  let Ac = window.AudioContext || window.webkitAudioContext;
  this.sampleBuffer = new Float64Array(735);

  if(Ac === undefined) {
    log("Audio disabled: no Web Audio API support");
    this.hasAudio = false;
  } else {
    this.actx = new Ac();
    log("Audio initialized, sample rate: " + this.actx.sampleRate);

    this.inputBuffer = new Float64Array(4096);
    this.inputBufferPos = 0;
    this.inputReadPos = 0;

    this.scriptNode = undefined;
  }

  this.resume = function() {
    // for Chrome autoplay policy
    if(this.hasAudio) {
      this.actx.resume();
    }
  }

  this.start = function() {
    if(this.hasAudio) {

      this.scriptNode = this.actx.createScriptProcessor(2048, 1, 1);
      let that = this;
      this.scriptNode.onaudioprocess = function(e) {
        that.process(e);
      }

      this.scriptNode.connect(this.actx.destination);

    }
  }

  this.stop = function() {
    if(this.hasAudio) {
      if(this.scriptNode) {
        this.scriptNode.disconnect();
        this.scriptNode = undefined;
      }
      this.inputBufferPos = 0;
      this.inputReadPos = 0;
    }
  }

  this.process = function(e) {
    let output = e.outputBuffer.getChannelData(0);
    for(let i = 0; i < 2048; i++) {
      output[i] = this.inputBuffer[(this.inputReadPos++) & 0xfff];
    }
    if(this.inputReadPos > this.inputBufferPos) {
      // we overran the buffer, sync values
      this.inputBufferPos = this.inputReadPos;
      log("Audio buffer overran");
    }
    if(this.inputReadPos + 2048 < this.inputBufferPos) {
      // we underran the buffer, sync values
      this.inputBufferPos = this.inputReadPos;
      log("Audio buffer underran");
    }
  }

  this.nextBuffer = function() {
    if(this.hasAudio) {
      for(let i = 0; i < 735; i++) {
        let val = this.sampleBuffer[i];
        this.inputBuffer[(this.inputBufferPos++) & 0xfff] = val;
      }
    }
  }
}
