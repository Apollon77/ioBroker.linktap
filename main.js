  /**
 *      LinkTap adapter
 *
 *      Controls LinkTap Wireless Water Timer via LinkTap Gateway
 *
 *      Copyright 2020 Smart-Gang <gangrulez@gmail.com>,
 *      MIT License
 *
 */
'use strict';

const utils = require('@iobroker/adapter-core');
const LinkTapApiController = require("./lib/linktap_api_controller");


class LinkTap extends utils.Adapter {

    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'linktap',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('objectChange', this.onObjectChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));

        this.connected = null;
        this.dataPollInterval = 60000;        
        this.dataPollTimeout = null;
        this.myApiController = null; 
    }


    /**
     * Gets ids for channels and states
     */    
    getId(gatewayId, taplinkerId, stateKey){
        if(taplinkerId == null && stateKey == null){
            return gatewayId;
        }     
        if(gatewayId != null && taplinkerId != null && stateKey == null){
            return gatewayId+'.'+taplinkerId
        }            
        if(taplinkerId == null) {
            return gatewayId+'.'+stateKey;
        }
        return gatewayId+'.'+taplinkerId+'.'+stateKey;        
    }    


    /**
     * Creates a state
     */
    createNewState(name, value, desc, _write, _unit) {

        if(typeof(desc) === null)
            desc = name;
        if(typeof(_write) === null)
            _write = false;
        if(typeof(_write) !== 'boolean')
            _write = false;

        if(Array.isArray(value))
            value = value.toString();

        if(typeof(_unit) === null) {
            this.setObjectNotExists(name, {
                type: 'state',
                common: {
                    name: name,
                    desc: desc,
                    type: typeof(value),
                    read: true,
                    write: _write
                },
                native: {id: name}
            });
            if(typeof(value) !== null) {
                this.setStateAsync(name, {
                    val: value,
                    ack: true
                });
            }            
        } else {
            this.setObjectNotExists(name, {
                type: 'state',
                common: {
                    name: name,
                    desc: desc,
                    type: typeof(value),
                    read: true,
                    write: _write,
                    unit: _unit
                },
                native: {id: name}
            });
            if(typeof(value) !== null) {
                this.setStateAsync(name, {
                    val: value,
                    ack: true
                });
            }            
        }
    } 


    /**
     * Creates all channels
     */
    createChannels() {
        const fctName = 'createChannels';
        this.log.info(fctName + ' started');

        if(this.myApiController != null ){
            this.myApiController.gateways.forEach((g) => {
                this.setObjectNotExists(this.getId(g.gatewayId), {
                    type: 'channel',
                    role: 'gateway',
                    common: {
                        name: this.getId(g.gatewayId),
                    },
                    native: {}
                }, function(err) {
                    if (err) {
                        this.log.error('Cannot write object: ' + err); 
                    }
                });  
                g.devices.forEach(d => {
                    this.setObjectNotExists(this.getId(g.gatewayId, d.taplinkerId), {
                        type: 'channel',
                        role: 'device',
                        common: {
                            name:  this.getId(g.gatewayId, d.taplinkerId),
                        },
                        native: {}
                    }, function(err) {
                        if (err) {
                            this.log.error('Cannot write object: ' + err); 
                        }
                    });                      
                });              
            });  
        }    
        this.log.info(fctName + ' finished');    
    } 


    /**
     * Creates datapoints
     */    
    createDPs() {

        const fctName = 'createDPs';   
        this.log.info(fctName + ' started');
    
        if(this.myApiController != null ){
            this.myApiController.gateways.forEach((g) => {
                this.createNewState(this.getId(g.gatewayId,null,'gatewayId'), g.gatewayId, "Gateway ID");         
                this.createNewState(this.getId(g.gatewayId,null,'name'), g.name, "Gateway name");
                this.createNewState(this.getId(g.gatewayId,null,'location'), g.location, "Gateway location");
                this.createNewState(this.getId(g.gatewayId,null,'status'), g.status, "Gateway status");
                this.createNewState(this.getId(g.gatewayId,null,'version'), g.version, "Gateway version");
                g.devices.forEach(d => {
                    this.createNewState(this.getId(g.gatewayId,d.taplinkerId,'taplinkerName'), d.taplinkerName, "Device name");
                    this.createNewState(this.getId(g.gatewayId,d.taplinkerId,'location'), d.location, "Device location");
                    this.createNewState(this.getId(g.gatewayId,d.taplinkerId,'taplinkerId'), d.taplinkerId, "Device ID");
                    this.createNewState(this.getId(g.gatewayId,d.taplinkerId,'status'), d.status, "Device status");          
                    this.createNewState(this.getId(g.gatewayId,d.taplinkerId,'version'), d.version, "Device version");
                    this.createNewState(this.getId(g.gatewayId,d.taplinkerId,'signal'), d.signal, "Device signal strength");
                    this.createNewState(this.getId(g.gatewayId,d.taplinkerId,'batteryStatus'), d.batteryStatus, "Device batteryStatus");
                    this.createNewState(this.getId(g.gatewayId,d.taplinkerId,'workMode'), d.workMode, "Device workMode");
                    this.createNewState(this.getId(g.gatewayId,d.taplinkerId,'watering'), d.watering, "Device watering active");
                    this.createNewState(this.getId(g.gatewayId,d.taplinkerId,'vel'), d.vel, "Device flow rate", false, 'ml/min');                    
                    this.createNewState(this.getId(g.gatewayId,d.taplinkerId,'fall'), d.fall, "Device fall");                    
                    this.createNewState(this.getId(g.gatewayId,d.taplinkerId,'valveBroken'), d.valveBroken, "Device valve broken");                    
                    this.createNewState(this.getId(g.gatewayId,d.taplinkerId,'noWater'), d.noWater, "Device no water");                    
                    this.createNewState(this.getId(g.gatewayId,d.taplinkerId,'total'), d.total, "Device total", false, 'min');                    
                    this.createNewState(this.getId(g.gatewayId,d.taplinkerId,'onDuration'), d.onDuration, "Device on duration", false, 'min');                    
                    this.createNewState(this.getId(g.gatewayId,d.taplinkerId,'ecoTotal'), d.ecoTotal, "Device eco Total", false, 'min');                    
                    this.createNewState(this.getId(g.gatewayId,d.taplinkerId,'ecoOn'), d.ecoOn, "Device eco on", false, 'min');  
                    this.createNewState(this.getId(g.gatewayId,d.taplinkerId,'ecoOff'), d.ecoOff, "Device eco off", false, 'min');                      
                });
            });
        }            
        this.log.info(fctName + ' finished');    
    }

    /**
     * Creates data polling schedule
     */
    createStatusScheduler() {
        const fctName = 'createStatusScheduler';
        this.log.info(fctName + ' started');
    
        if(this.dataPollTimeout !== null) {
            clearInterval(this.dataPollTimeout);    
            this.dataPollTimeout = null;    
            this.log.info(fctName + ' scheduler stopped');
        }                        
        this.dataPollTimeout = setTimeout(() =>  {       
            var fctName = 'updateStatus';
            this.log.info(fctName + ' started');
    
            if(this.myApiController != null ){
                this.myApiController.gateways.forEach((g) => {
                    g.devices.forEach(d => {
                        d.queryWateringStatus();
                    });
                });
            }
            this.setStates();
            this.createStatusScheduler();
            this.log.info(fctName + ' finished');
        }, this.dataPollInterval);            
        //this.log.info(fctName + ' scheduler created, start every ' + this.dataPollInterval / 1000 + ' secands');        
        this.log.info(fctName + ' finished');    
    }

    /**
     * Set device states
     */    
    setStates(){
        if(this.myApiController != null ){
            this.myApiController.gateways.forEach((g) => {
                //this.setStateAsync(this.getId(g.gatewayId,null,'name'), { val: g.name, ack: true });
                //this.setStateAsync(this.getId(g.gatewayId,null,'status'), { val: g.status, ack: true });
                //this.setStateAsync(this.getId(g.gatewayId,null,'location'), { val: g.location, ack: true });
                //this.setStateAsync(this.getId(g.gatewayId,null,'version'), { val: g.version, ack: true });
                //this.setStateAsync(this.getId(g.gatewayId,null,'gatewayId'), { val: g.gatewayId, ack: true });
                g.devices.forEach(d => {
                    //this.setStateAsync(this.getId(g.gatewayId,d.taplinkerId,'taplinkerId'), { val: d.taplinkerId, ack: true });
                    //this.setStateAsync(this.getId(g.gatewayId,d.taplinkerId,'taplinkerName'), { val: d.taplinkerName, ack: true });
                    //this.setStateAsync(this.getId(g.gatewayId,d.taplinkerId,'location'), { val: d.location, ack: true });
                    //this.setStateAsync(this.getId(g.gatewayId,d.taplinkerId,'status'), { val: d.status, ack: true });
                    //this.setStateAsync(this.getId(g.gatewayId,d.taplinkerId,'version'), { val: d.version, ack: true });
                    //this.setStateAsync(this.getId(g.gatewayId,d.taplinkerId,'signal'), { val: d.signal, ack: true });
                    //this.setStateAsync(this.getId(g.gatewayId,d.taplinkerId,'batteryStatus'), { val: d.batteryStatus, ack: true });
                    //this.setStateAsync(this.getId(g.gatewayId,d.taplinkerId,'workMode'), { val: d.workMode, ack: true });
                    this.setStateAsync(this.getId(g.gatewayId,d.taplinkerId,'watering'), { val: d.watering, ack: true });
                    this.setStateAsync(this.getId(g.gatewayId,d.taplinkerId,'vel'), { val: d.vel, ack: true });
                    //this.setStateAsync(this.getId(g.gatewayId,d.taplinkerId,'fall'), { val: d.fall, ack: true });
                    //this.setStateAsync(this.getId(g.gatewayId,d.taplinkerId,'valveBroken'), { val: d.valveBroken, ack: true });
                    //this.setStateAsync(this.getId(g.gatewayId,d.taplinkerId,'noWater'), { val: d.noWater, ack: true });
                    this.setStateAsync(this.getId(g.gatewayId,d.taplinkerId,'total'), { val: d.total, ack: true });
                    this.setStateAsync(this.getId(g.gatewayId,d.taplinkerId,'onDuration'), { val: d.onDuration, ack: true });
                    this.setStateAsync(this.getId(g.gatewayId,d.taplinkerId,'ecoTotal'), { val: d.ecoTotal, ack: true });                    
                    this.setStateAsync(this.getId(g.gatewayId,d.taplinkerId,'ecoOn'), { val: d.ecoOn, ack: true });
                    this.setStateAsync(this.getId(g.gatewayId,d.taplinkerId,'ecoOff'), { val: d.ecoOff, ack: true });
                });
            });
        }
    }    

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        await this.setConnected(false);

        this.log.info('User : ' + this.config.txtUsername);

        if (!this.config.txtUsername || !this.config.txtApiKey) {
            this.log.warn('Please open Admin page for this adapter to set the username and the API key.');
            return;
        }         
        
        if(isNaN(this.config.txtPollInterval) || this.config.txtPollInterval === "" || this.config.txtPollInterval === null){
            console.log('No valid poll interval found. Set poll interval to 1 minute.');            
          } else {
            var parsedPollIntervall = parseInt(this.config.txtPollInterval, 10);
            if(parsedPollIntervall < 1) parsedPollIntervall = 1;
            console.log('Set data poll interval to '+parsedPollIntervall);
            this.dataPollInterval = (parsedPollIntervall *60 * 1000)
          }                 

        this.myApiController = new LinkTapApiController({
            logger: this.log,            
            username: this.config.txtUsername,
            apiKey: this.config.txtApiKey
        });    
           
        await this.myApiController.getDevices();
	    this.setConnected(this.myApiController.connected);
        await this.createChannels();
        await this.createDPs();
        this.subscribeStates('*');
        this.main();
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            
            if(this.dataPollTimeout !== null) clearInterval(this.dataPollTimeout);                 
            this.setConnected(false);
            callback();
        } catch (e) {
            callback();
        }
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  * @param {string} id
    //  * @param {ioBroker.Object | null | undefined} obj
    //  */
    // onObjectChange(id, obj) {
    //     if (obj) {
    //         // The object was changed
    //         this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    //     } else {
    //         // The object was deleted
    //         this.log.info(`object ${id} deleted`);
    //     }
    // }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.message" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    // onMessage(obj) {
    //     if (typeof obj === 'object' && obj.message) {
    //         if (obj.command === 'send') {
    //             // e.g. send email or pushover or whatever
    //             this.log.info('send command');

    //             // Send response in callback if required
    //             if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
    //         }
    //     }
    // }


    setConnected(isConnected) {
        if (this.connected !== isConnected) {
            this.connected = isConnected;            
        }
    }
    
    main(){    
       this.createStatusScheduler()                
    }


}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new LinkTap(options);
} else {
    // otherwise start the instance directly
    new LinkTap();
}