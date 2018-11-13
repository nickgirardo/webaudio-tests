
const canvas = document.getElementById('oscilloscope');
const canvasCtx = canvas.getContext('2d');

const audioCtx = new AudioContext();
const channelCount = 4;
const oscs = [];
const gainNodes = [];
let lowPass;
let analyser;
let analyserBuffer;

// All equal tempered note frequencies in octave 0
const baseFreqs = {
  'a': 27.50000,
  'a#': 29.13524,
  'bb': 29.13524,
  'b': 30.86771,
  'c': 16.35160,
  'c#': 17.32391,
  'db': 17.32391,
  'd': 18.35405,
  'd#': 19.44544,
  'eb': 19.44544,
  'e': 20.60172,
  'f': 21.82676,
  'f#': 23.12465,
  'gb': 23.12465,
  'g': 24.49971,
  'g#': 25.95654,
  'ab': 25.95654,
};

function draw() {
  analyser.getByteTimeDomainData(analyserBuffer);

  canvasCtx.fillStyle = '#ccc';
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = 'black';

  canvasCtx.beginPath();

  var sliceWidth = canvas.width * 1.0 / analyser.frequencyBinCount;
  var x = 0;

  for (var i = 0; i < analyser.frequencyBinCount; i++) {

    var v = analyserBuffer[i] / 128.0;
    var y = v * canvas.height / 2;

    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  canvasCtx.lineTo(canvas.width, canvas.height / 2);
  canvasCtx.stroke();

  window.requestAnimationFrame(draw);
}

function frequencyFromNoteName(n) {
  const note = 'abcdefg'.includes(n[0]) ? n[0] : '';
  const accidental = '#b'.includes(n[1]) ? n[1] : '';
  const noteName = note + accidental;
  if(!baseFreqs[noteName]) {
    // Note name not good
    return undefined;
  }
  const octave = n.substring(noteName.length);
  if(isNaN(octave)) {
    // Octave not a number
    return undefined;
  }
  return baseFreqs[noteName] * (2 ** octave);
}
window.setFreq = function(chId) {
  const value = document.getElementById('freq-ch' + chId).value.trim().toLowerCase();

  // Interpret as frequency or note name?
  if(['a','b','c','d','e','f','g'].some(letter=>value.includes(letter))) {
    // Maybe a note name
    const freq = frequencyFromNoteName(value);
    if(!freq) {
      console.error(`Unable to parse value for channel ${chId}`);
      return;
    }
    oscs[chId].frequency.setValueAtTime(freq, audioCtx.currentTime);
  } else if (!isNaN(value)) {
    // A frequency
    oscs[chId].frequency.setValueAtTime(value, audioCtx.currentTime);
  } else {
    console.error(`Unable to parse value for channel ${chId}`);
  }
}

window.setLpFreq = function() {
  const sliderValue = document.getElementById('lp-freq-slider').value;
  freq = sliderValue * 20;
  lowPass.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.015);
}

window.setLpQ = function() {
  const sliderValue = document.getElementById('lp-q-slider').value;
  q = sliderValue;
  lowPass.Q.setTargetAtTime(q, audioCtx.currentTime, 0.015);
}

window.setWaveShape = function() {
  const waveShape = document.getElementById('wave-shape-select').value;

  oscs.forEach(osc => osc.type = waveShape);
}

window.setGain = function() {
  const sliderValue = document.getElementById('gain-slider').value;
  gain = sliderValue / 100;
  gainNodes.forEach(gainNode => gainNode.gain.setTargetAtTime(gain, audioCtx.currentTime, 0.015));
}

window.play = function() {
  gainNodes.forEach(gainNode => gainNode.gain.setTargetAtTime(gain, audioCtx.currentTime, 0.015));
}

window.stop = function() {
  gainNodes.forEach(gainNode => gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.015));
}

function init() {
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;

  analyserBuffer = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(analyserBuffer);


  lowPass = audioCtx.createBiquadFilter();
  lowPass.type = 'lowpass';
  window.setLpFreq();
  window.setLpQ();

  for(let i=0; i<channelCount; i++) {
    oscs[i] = audioCtx.createOscillator();
    window.setFreq(i);
    oscs[i].start();
    
    gainNodes[i] = audioCtx.createGain();
    gainNodes[i].gain.value = 0;

    oscs[i].connect(gainNodes[i]);
    gainNodes[i].connect(lowPass);
  }

  window.setGain();
  window.setWaveShape();

  lowPass.connect(analyser);

  analyser.connect(audioCtx.destination);

  draw();
}

init();
