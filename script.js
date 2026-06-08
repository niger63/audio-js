
let sym_rate = 100;

let carrier = 1000;



const audio = new AudioContext();


let analyser;
let bufferLength;
let dataArray;


const canvas = document.getElementById("canvas");
const canvasCtx = canvas.getContext("2d");

//canvasCtx.fillRect(10, 10, 100, 100);

function draw() {
  //console.log("frame")
  canvas.width  = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  
  const drawVisual = requestAnimationFrame(draw);
  analyser.getByteTimeDomainData(dataArray);
  //console.log(dataArray);
  // Fill solid color
  canvasCtx.fillStyle = "rgb(200 200 200)";
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
  //canvasCtx.fillStyle = "rgb(0 0 0)";
  //canvasCtx.fillRect(10, 10, 100, 100);
  // Begin the path
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = "rgb(0 0 0)";
  canvasCtx.beginPath();
  // Draw each point in the waveform
  const sliceWidth = WIDTH / bufferLength;
  let x = 0;
  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = v * (HEIGHT / 2);

    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  // Finish the line
  canvasCtx.lineTo(WIDTH, HEIGHT / 2);
  canvasCtx.stroke();
}



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


// Load an audio worklet
await audio.audioWorklet.addModule('audio.js');

// Create a player
const player = new AudioWorkletNode(audio, 'player-worklet');

// Connect the player to the audio context
audio.suspend();
player.connect(audio.destination);



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
let mic_on = false;
let first_time = true;
let audio_source
const startMicrophoneButton = document.getElementById("record_button")
startMicrophoneButton.addEventListener("click", async () => {
    if(first_time){
        audio_source = new AudioContext();
        // Prompt the user to use their microphone.
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        console.log(stream)
        const source = audio_source.createMediaStreamSource(stream);

        // Load and execute the module script.
        await audio_source.audioWorklet.addModule("process.js");
        // Create an AudioWorkletNode. The name of the processor is the
        // one passed to registerProcessor() in the module script.
        const processor = new AudioWorkletNode(audio_source, "processor");
        
        
        analyser = audio_source.createAnalyser();
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        source.connect(processor);
        source.connect(analyser);
        draw();
        first_time = false;
    }else{
        //mediaRecorder.resume();
        
        stream.getTracks().forEach(track => track.enabled=true);
    }
    console.log("Your microphone audio is being used.");
});

const stopMicrophoneButton = document.getElementById("stop_record_button")
stopMicrophoneButton.addEventListener("click", () => {
    //mediaRecorder.pause();
    //audio_source.suspend()
    // Stop the stream.
    stream.getTracks().forEach(track => track.enabled=false);
    console.log("Your microphone audio is not used anymore.");
    
    
});
