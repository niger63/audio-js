class Processor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.ph=0.0;
        
        
    }
    static get parameterDescriptors() {
        return [
          {
            name: "carrier",
            defaultValue: 1000,
            minValue: 0,
            maxValue: 20000,
            automationRate: "a-rate",
          },
        ];
    }
    process(inputs, outputs,params) {
        //console.log(outputs);
        console.log(inputs);
        const input = inputs[0];
        if(!input.length){
            return true;
        }
        
        const channel = input[0];
        const I = outputs[0][0];
        const Q = outputs[1][0];
        
        for (let i = 0; i < channel.length; ++i) {
            I[i] = 4*channel[i]*Math.cos(this.ph);
            Q[i] = 4*channel[i]*Math.sin(this.ph);
            
            this.ph+=params["carrier"]*2*Math.PI/sampleRate;
            if (this.ph>2*Math.PI){
                this.ph-=2*Math.PI
            }
        }
        
        //console.log(inputs);
        return true;
    }
}

registerProcessor("processor", Processor);