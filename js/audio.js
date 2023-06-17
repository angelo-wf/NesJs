
function AudioHandler() {

  this.hasAudio = true;
  let Ac = window.AudioContext || window.webkitAudioContext;
  this.sampleBuffer = new Float64Array(735);
  this.samplesPerFrame = 735;

  if(Ac === undefined) {
    log("Audio disabled: no Web Audio API support");
    this.hasAudio = false;
  } else {
    this.actx = new Ac();

    let samples = this.actx.sampleRate / 60;
    this.sampleBuffer = new Float64Array(samples);
    this.samplesPerFrame = samples;

    log("Audio initialized, sample rate: " + samples * 60);

    this.inputBuffer = new Float64Array(4096);
    this.inputBufferPos = 0;
    this.inputReadPos = 0;

    this.scriptNode = undefined;
    this.dummyNode = undefined;
  }

  this.resume = function() {
    // for Chrome autoplay policy
    if(this.hasAudio) {
      this.actx.onstatechange = function() { console.log(this.actx.state) };
      this.actx.resume();
    }
  }

  this.start = function() {
    if(this.hasAudio) {

      this.dummyNode = this.actx.createBufferSource();
      this.dummyNode.buffer = this.actx.createBuffer(1, 44100, 44100);
      this.dummyNode.loop = true;

      this.scriptNode = this.actx.createScriptProcessor(2048, 1, 1);
      let that = this;
      this.scriptNode.onaudioprocess = function(e) {
        that.process(e);
      }

      this.dummyNode.connect(this.scriptNode);
      this.scriptNode.connect(this.actx.destination);
      this.dummyNode.start();

    }
  }

  this.stop = function() {
    if(this.hasAudio) {
      if(this.dummyNode) {
        this.dummyNode.stop();
        this.dummyNode.disconnect();
        this.dummyNode = undefined;
      }
      if(this.scriptNode) {
        this.scriptNode.disconnect();
        this.scriptNode = undefined;
      }
      this.inputBufferPos = 0;
      this.inputReadPos = 0;
    }
  }

  this.process = function(e) {
    if(this.inputReadPos + 2048 > this.inputBufferPos) {
      // we overran the buffer
      //log("Audio buffer overran");
      this.inputReadPos = this.inputBufferPos - 2048;
    }
    if(this.inputReadPos + 4096 < this.inputBufferPos) {
      // we underran the buffer
      //log("Audio buffer underran");
      this.inputReadPos += 2048;
    }
    let output = e.outputBuffer.getChannelData(0);
    for(let i = 0; i < 2048; i++) {
      output[i] = this.inputBuffer[(this.inputReadPos++) & 0xfff];
    }
  }

  this.nextBuffer = function() {
    if(this.hasAudio) {
      for(let i = 0; i < this.samplesPerFrame; i++) {
        let val = this.sampleBuffer[i];
        this.inputBuffer[(this.inputBufferPos++) & 0xfff] = val;
      }
    }
  }
}
