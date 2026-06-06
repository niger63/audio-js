
alert(0)
// Create the audio context
const audio = new AudioContext();

// Load an audio worklet
await audio.audioWorklet.addModule('audio.js');

// Create a player
const player = new AudioWorkletNode(audio, 'player-worklet');

// Connect the player to the audio context
player.connect(audio.destination);

// Start the player when the user clicks
window.addEventListener('click', () => {
    audio.resume();
    player.port.postMessage({
        type: 'play'
    });
});