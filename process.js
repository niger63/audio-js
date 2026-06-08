class Processor extends AudioWorkletProcessor {
    process(inputs, outputs) {
        
        const input = inputs[0];
        // Copy inputs to outputs.
        console.log(input);
        return true;
    }
}

registerProcessor("processor", Processor);