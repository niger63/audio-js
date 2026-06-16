class PlayerWorklet extends AudioWorkletProcessor {
    constructor() {
        super();
        this.port.onmessage = this.onmessage.bind(this);
        this.ph=0.0;
        this.samps = 0;
        this.playing = false;
    }

    onmessage(e) {
        if (e.data.type === 'play') {
            // Toggle between playing and silence
            this.carrier = e.data.carrier;
            this.sym_rate = e.data.sym_rate;
            this.syms = e.data.syms;
            this.ph=0.0;
            this.samps = 0;
            console.log(e.data);
            this.playing = true;
            
            
        }else if (e.data.type === 'stop') {
            // Toggle between playing and silence
            this.playing = false;
            
        }
    }

    process(inputs, outputs) {
        
        const output = outputs[0];
        const channel = output[0];
        let I,Q,sym;
        //let res = true;
        for (let i = 0; i < channel.length; ++i) {
            let symn = Math.floor(this.samps*this.sym_rate / sampleRate);
            if ( symn < this.syms.length){
                sym = this.syms[symn];
                /*if(sym < 0){
                    if(sym === -1){
                        I = 1.4;
                        Q = 0;
                    }else{
                        I = 0;
                        Q = 1.4;
                    }
                    
                }else{*/
                I = -1+(sym >> 2)/3*2;
                Q = -1+(sym & 3)/3*2;
                
                
                
                channel[i] = (I*Math.cos(this.ph) + Q * Math.sin(this.ph))/1.42;
                this.ph+=this.carrier*2*Math.PI/sampleRate;
                if (this.ph>2*Math.PI){
                    this.ph-=2*Math.PI
                }
                this.samps+=1;
            }else{
                channel[i] = 0.0;
                break;
                //res = false;
            }
            
            
        }
        //console.log(outputs);
        return true;
    }
}

registerProcessor('player-worklet', PlayerWorklet);