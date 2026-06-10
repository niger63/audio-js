
let sym_rate = 100;

let carrier = 1000;

let is_recording = false;

const audio = new AudioContext();
audio.suspend();

// Load an audio worklet
await audio.audioWorklet.addModule('audio.js');

// Create a player
const player = new AudioWorkletNode(audio, 'player-worklet');

// Connect the player to the audio context
player.connect(audio.destination);


const audio_source = new AudioContext();
audio_source.suspend()
await audio_source.audioWorklet.addModule("process.js");
const processor = new AudioWorkletNode(audio_source, "processor",{numberOfOutputs:2});
const analyser = audio_source.createAnalyser();
const analyser1 = audio_source.createAnalyser();
const analyser2 = audio_source.createAnalyser();

const filter1 = new BiquadFilterNode(audio_source,{type:"lowpass",frequency:carrier/3});
const filter2 = new BiquadFilterNode(audio_source,{type:"lowpass",frequency:carrier/3});




//star diagram
const canvas1 = document.getElementById("stars");
const canvasCtx1 = canvas1.getContext("2d");
//const scale = document.getElementById("vertical");
let dataArray1 = new Float32Array(2048);
let dataArray2 = new Float32Array(2048);
function draw1() {
  //console.log("frame")
  canvas1.width  = canvas1.clientWidth;
  canvas1.height = canvas1.clientHeight;
  const WIDTH = canvas1.width;
  const HEIGHT = canvas1.height;
  const sz = Math.min(WIDTH, HEIGHT);
  const drawVisual = requestAnimationFrame(draw1);
  
  analyser1.getFloatTimeDomainData(dataArray1);
  analyser2.getFloatTimeDomainData(dataArray2);
  //console.log(dataArray);
  // Fill solid color
  canvasCtx1.fillStyle = "rgb(200 200 200)";
  canvasCtx1.fillRect(0, 0, WIDTH, HEIGHT);
  if(!is_recording){
      return;
  }
  //canvasCtx.fillStyle = "rgb(0 0 0)";
  //canvasCtx.fillRect(10, 10, 100, 100);
  // Begin the path
  canvasCtx1.fillStyle = "rgb(0 0 0)";
  
  // Draw each point in the waveform
  let x = 0;
  for (let i = 0; i < dataArray1.length; i++) {
    const v = Math.min(Math.max(dataArray1[i]* vertical.value,-1),1);
    const u = Math.min(Math.max(dataArray2[i]* vertical.value,-1),1);
    
    const x = v * (sz / 2) + WIDTH / 2;
    const y = -u * (sz / 2) + HEIGHT / 2;
    canvasCtx1.fillRect(x, y, 1, 1);
  }

}
draw1();




let bufferLength = analyser.frequencyBinCount;
let dataArray = new Float32Array();
//oscilloscope
const canvas = document.getElementById("oscilloscope");
const canvasCtx = canvas.getContext("2d");
const vertical = document.getElementById("vertical");
const horizontal = document.getElementById("horizontal");
horizontal.max = bufferLength
//canvasCtx.fillRect(10, 10, 100, 100);

function draw() {
  //console.log("frame")
  canvas.width  = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  
  const drawVisual = requestAnimationFrame(draw);
  if(horizontal.value!==dataArray.length){
    dataArray = new Float32Array(horizontal.value);
  }
  analyser.getFloatTimeDomainData(dataArray);
  
  // Fill solid color
  canvasCtx.fillStyle = "rgb(200 200 200)";
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
  if(!is_recording){
      return;
  }
  
  // Begin the path
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = "rgb(0 0 0)";
  canvasCtx.beginPath();
  // Draw each point in the waveform
  const sliceWidth = WIDTH / (dataArray.length-1);
  let x = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const v = Math.min(Math.max(dataArray[i]* vertical.value,-1),1);
    const y = -v * (HEIGHT / 2) + HEIGHT / 2;

    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  // Finish the line
  canvasCtx.stroke();
}
draw();




function tosyms(txt){
    const enc = new TextEncoder();
    const uint8Array = new Uint8Array(txt.length*4);
    const res = enc.encodeInto(txt, uint8Array);
    console.log(uint8Array);
    const a = [];
    for (let i = 0; i < res.written; i++){
        a.push(uint8Array[i] >> 4,uint8Array[i] & 15);
    }
    console.log(a);
    return a;
}





var btn = document.getElementById("play_button")
btn.addEventListener('click', () => {
    var txt = document.getElementById("text_input").value;
    const a = tosyms(txt);
    
    
    player.port.postMessage({
       type: 'play',
       syms: a,
       samp_rate: audio.sampleRate,
       sym_rate: sym_rate,
       carrier:carrier
       
       });
    audio.resume();
});


var btn1 = document.getElementById("stop_button")
btn1.addEventListener('click', () => {
    audio.suspend();
    player.port.postMessage({
       type: 'stop'
       });
});



let stream;
let first_time = true;

const startMicrophoneButton = document.getElementById("record_button")
startMicrophoneButton.addEventListener("click", async () => {
    if(first_time){
        // Prompt the user to use their microphone.
        stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false},
        });
        console.log(stream)
        const source = audio_source.createMediaStreamSource(stream);

        filter1.connect(analyser1);
        filter2.connect(analyser2);
        processor.connect(filter1,0);
        processor.connect(filter2,1);
        
        source.connect(processor);
        source.connect(analyser);
        //processor.connect(filter2);
        audio_source.resume()
        
        
        first_time = false;
        is_recording = true;
    }else{
        //mediaRecorder.resume();
        
        stream.getTracks().forEach(track => track.enabled=true);
        //audio_source.resume()
        is_recording = true;
    }
    console.log("Your microphone audio is being used.");
});

const stopMicrophoneButton = document.getElementById("stop_record_button")
stopMicrophoneButton.addEventListener("click", () => {
    //mediaRecorder.pause();
    //audio_source.suspend()
    // Stop the stream.
    
    stream.getTracks().forEach(track => track.enabled=false);
    //audio_source.suspend();
    
    is_recording = false;
    console.log("Your microphone audio is not used anymore.");
    
    
});
