function cmul(a,b){
    return [a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
}
function conj(a){
    return [a[0],-a[1]];
}
class Decoder extends AudioWorkletProcessor {
    constructor() {
        super();
        this.inited=false;
        this.ph=0.0;
        this.bufI=Array(1024);
        this.bufQ=Array(1024);
        this.buf_id = 0;
        this.detection_processed = 0;
        this.sync_processed = 0;
        
        this.detection_avg_Q = 0;
        this.detection_avg_I = 0;
        this.state = 0;//detection
        this.mn = 999999;
        this.pos = [0,0];
        this.norm_processed = 0;
        this.mn_sync_processed = 0;
        this.last_sym = -1;
        this.syms = [];
        this.skipped = 0;
    }
    static get parameterDescriptors() {
        return [
          {
            name: "sym_rate",
            defaultValue: 100,
            minValue: 0,
            maxValue: 10000,
            automationRate: "k-rate",
          },
        ];
    }
    process(inputs, outputs,params) {
        //console.log(inputs);
        if(!this.inited){
            this.inited = true;
            this.sym_rate =  params["sym_rate"];
        
            this.sym_len = Math.floor(sampleRate/this.sym_rate);
            this.sym_len_hf = Math.floor(sampleRate/this.sym_rate*0.7);
            this.sym_len_hs = Math.floor(sampleRate/this.sym_rate/2);
            this.sym_len_st = Math.floor(sampleRate/this.sym_rate/10);
            
            
            
        }
        
        if(!inputs[0].length || inputs[0][0][0]===0){
            return true;
        }
        
        
        const I = inputs[0][0];
        const Q = inputs[1][0];
        //console.log(inputs[0][0][0]*10000, inputs[0][0]);
        for (let i = 0; i < I.length; ++i) {
            //this.log.push([I[i],Q[i]])
            //let s = "";
            //if(this.log.length === 100000){
            //    for(let y = 0; y < this.log.length; y++){
            //        s+=";"+this.log[y];
            //    }
            //    console.log(s);
            //    
            //}
            this.bufI[this.buf_id] = I[i];
            this.bufQ[this.buf_id] = Q[i];
            
            //console.log(inputs,this.sym_len_hf,this.detection_processed)
            
            if(this.state === 0){
                this.detection_avg_I+=I[i];
                this.detection_avg_Q+=Q[i];
                this.detection_processed += 1;
                
                if(this.detection_processed === this.sym_len_hf){
                    this.detection_avg_I/= this.sym_len_hf;
                    this.detection_avg_Q/= this.sym_len_hf;
                    let good = 0;
                    let to_comp = [this.detection_avg_I,-this.detection_avg_Q];
                    for (let s = 0; s < this.sym_len_hf; ++s) {
                        let res = cmul(to_comp,[this.bufI[(this.buf_id - s)&((1 << 10)-1)],this.bufQ[(this.buf_id - s)&((1 << 10)-1)]]);
                        let ang = Math.atan2(res[1],res[0]);
                        if (ang < 0.2 && ang > -0.2){
                            good+=1;
                        }
                        
                    }
                    if(good > 0.95*this.sym_len_hf){
                        this.state = 1;
                        this.mn = 999999;
                        console.log("detected!");
                    }
                    
                    this.detection_avg_I = 0;
                    this.detection_avg_Q = 0;
                    this.detection_processed = 0;
                }
                
                
            }else if(this.state === 1){
                //console.log(inputs,this.sym_len_hf,this.detection_processed)
                //
                
                if(this.sync_processed%this.sym_len_st === 0){
                    let avgPh = 0;
                    //let avgQ = 0;
                    
                    for (let s = 0; s < this.sym_len_hs; ++s) {
                        let smp = [this.bufI[(this.buf_id - s)&((1 << 10)-1)],this.bufQ[(this.buf_id - s)&((1 << 10)-1)]];
                        let old_smp_conj = [this.bufI[(this.buf_id - this.sym_len - s)&((1 << 10)-1)],-this.bufQ[(this.buf_id - this.sym_len - s)&((1 << 10)-1)]];
                        
                        let res1 = cmul(smp,old_smp_conj);
                        
                        avgPh += Math.atan2(res1[1],res1[0]);
                        
                        
                    }
                    avgPh /= this.sym_len_hs;
                    
                    
                    
                    let stdev = 0;
                    for (let s = 0; s < this.sym_len_hs; ++s) {
                        let smp = [this.bufI[(this.buf_id - s)&((1 << 10)-1)],this.bufQ[(this.buf_id - s)&((1 << 10)-1)]];
                        let old_smp_conj = [this.bufI[(this.buf_id - this.sym_len - s)&((1 << 10)-1)],-this.bufQ[(this.buf_id - this.sym_len - s)&((1 << 10)-1)]];
                        //console.log(smp,old_smp_conj);
                        let res1 = cmul(smp,old_smp_conj);
                        
                        stdev += (Math.atan2(res1[1],res1[0]) - avgPh )**2;
                    }
                    stdev/= this.sym_len_hs;
                    stdev = Math.sqrt(stdev);
                    console.log(avgPh,stdev);
                    if(avgPh > Math.PI/2 - 0.5 && avgPh < Math.PI/2 + 0.5 && stdev < this.mn){
                        this.mn = stdev;
                        let avg1 = 0;
                        let avg2 = 0;
                        
                        for (let s = 0; s < this.sym_len_hs; ++s) {
                            avg1 += this.bufI[(this.buf_id - this.sym_len - s)&((1 << 10)-1)];
                            avg2 += this.bufQ[(this.buf_id - this.sym_len - s)&((1 << 10)-1)];
                        }
                        avg1 /= this.sym_len_hs;
                        avg2 /= this.sym_len_hs;
                        
                        this.pos = [(avg2-avg1)/2,(avg1+avg2)/2];
                        this.ds = this.sync_processed;
                        
                    }
                    
                    
                    
                }
                
                this.sync_processed += 1
                
                if(this.sync_processed > 3 * this.sym_len){
                    //console.log(this.mndata,this.mn);
                    if(this.mn !== 999999){
                        this.state = 2;
                        this.norm_processed = (this.sync_processed - this.ds)-this.sym_len;
                        console.log("syncronyzed",this.pos);
                    }else{
                        this.state = 0;
                    }
                    this.mn = 0;
                    this.sync_processed = 0;
                    
                    
                }
                
                
            }else if(this.state === 2){
                if(this.norm_processed == this.sym_len){
                    let avg1 = 0;
                    let avg2 = 0;
                    for (let s = 0; s < this.sym_len_hs; ++s) {
                        avg1 += this.bufI[(this.buf_id - s)&((1 << 10)-1)];
                        avg2 += this.bufQ[(this.buf_id - s)&((1 << 10)-1)];
                    }
                    avg1 /= this.sym_len_hs;
                    avg2 /= this.sym_len_hs;
                    let rs = cmul([avg1,avg2],this.pos);
                    let norm = this.pos[0]**2 + this.pos[1]**2
                    rs[0] /= norm;
                    rs[1] /= norm;
                    console.log(rs[0], rs[1]);
                    let hfI = 0;
                    if(rs[0] > 2/3){
                        hfI = 3;
                    }else if(rs[0] > 0){
                        hfI = 2;
                    }else if(rs[0] > -2/3){
                        hfI = 1;
                    }else{
                        hfI = 0;
                    }
                    let hfQ = 0;
                    if(rs[1] > 2/3){
                        hfQ = 3;
                        
                    }else if(rs[1] > 0){
                        hfQ = 2;
                    }else if(rs[1] > -2/3){
                        hfQ = 1;
                    }else{
                        hfQ = 0;
                    }
                    
                    let sym = (hfI<<2)|hfQ;
                    console.log(sym);
                    this.syms.push(sym);
                    if(sym === 0 && this.last_sym == 0 && this.syms.length%2==0){
                        this.state = 3;
                        this.last_sym = -1;
                        this.syms.length = this.syms.length - 2;
                        console.log(this.syms);
                        this.port.postMessage(this.syms);
                        this.syms.length = 0;
                    }else{
                        this.last_sym = sym;
                    }
                    
                    
                    this.norm_processed = 0;
                    
                }
                this.norm_processed+=1;
            }else if(this.state === 3){
                this.skipped += 1;
                if(this.skipped === 5*this.sym_len){
                    this.skipped = 0;
                    this.state = 0;
                }
                
                
            }
            
            
            
            
            
            this.buf_id+=1;
            this.buf_id&=(1 << 10)-1;
        }
        
        
        return true;
    }
}

registerProcessor("decoder", Decoder);