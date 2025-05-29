import WebServer from './server.mjs';
let server = new WebServer();

// new client
server.on('new', (reply) => {
    console.log("client has joined");
    sendScene(reply);
});

// client has sent us some data
server.on('data', (data, reply) => {
    console.log("client sent '" + data + "'");
    
    //try {
            let request = JSON.parse(data);
            
            if (request.info) {
                let component = scene[request.info];
                
                if (component) {
                    component.respond(reply);
                }
            }
    //} catch (e) {
    //    console.log("error handling client request: " + data + ", " + e);
    //}
});

// broadcast message to all clients after every 10 seconds
//setInterval(() => {
//   server.broadcast("boing");
//}, 10000);

let scene = {};  // map names to components

function sendScene (send) {
    if (!send)
        send = server.broadcast

    for (let name in scene) {           
        scene[name].sync(send);
    }
}

function sendObject (object, send) {
    const message = JSON.stringify(object);
    
    if (send)
        send(message);
    else
        server.broadcast(message);
}

const ORIENTATIONS = 8;  // at 45 degree increments
const TURN_TIME = 0.1;   // time to turn 45 degrees
const FORKLIFT_DISTANCE = 2.5;  // distance to reverse to release pallet
const FORKLIFT_MOVE_HEIGHT = 0.5;  // fork height when moving pallet

// 2.5D sprites are imaged from a camera every 45 degrees
// compute sprite orientation from the bearing in radians
// bearing is in range -PI to +PI thanks to Math.atan2()
function orientationFromBearing (bearing) {
    // adjust bearing to be in range 0 to 2PI
    bearing = bearing % (2.0 * Math.PI);
    
    if (bearing < 0)
        bearing += 2.0 * Math.PI;
        
    const TwoPI = 2 * Math.PI
        
    // round the calculation to find nearest orientation
    return Math.floor(0.5 + ORIENTATIONS * bearing / TwoPI);
}

function degreesFromBearing (bearing) {
    bearing = bearing % (2.0 * Math.PI);
    
    if (bearing < 0)
        bearing += 2.0 * Math.PI;
        
    return 180 * bearing / Math.PI;
}

function oppositeOrientation (orientation) {
    return (orientation + 4) % ORIENTATIONS;
}

// compute bearing in radians from orientation
function bearingFromOrientation (orientation) {
    return 2.0 * orientation * Math.PI / ORIENTATIONS;
}

// time specified as time:time or min:time, max:time
function pickTime(step) {
    if (step.time)
        return step.time;
        
    let min = step.min === undefined ? 0 : step.min;
    let max = step.max === undefined ? 0 : step.max;
    
    if (max <= min)
        return min;
        
    return min + Math.random() * (max - min);
}

class Component {
    constructor (params) {
        this.type = this.constructor.name.toLowerCase();

        for (let param in params) {
            this[param] = params[param]
        }
        
        this.subtask = []; // list of dynamically generated steps
        this.acts = {}; //registry of actions
        scene[this.name] = this;
        
        // wait for a time in min to max range
        this.registerAct("wait", 
            function (now, step, thing) { // initialise
                step.timer = now + pickTime(step);
                step.speed = thing.speed;
                thing.speed = 0;
            },
            function (now, step, thing) { // progress
                if (now >= step.timer) {
                    thing.speed = step.speed;
                    thing.nextStep(step);
                }
            }
        );
        
        this.registerAct("next", 
            (now, step, thing) => { // initialise
                thing.chooseStep(step.step);
            },
            (now, step, thing) => { // progress
                thing.debug = true;  // debug only
            }
        );
        
        // stepped turn through 45 degree increments
        this.registerAct("turn", 
            (now, step, thing) => { // initialise
                // is turn clockwise or anticlockwise?
                let change = (step.orientation - thing.orientation) % ORIENTATIONS;
            
                if (change > ORIENTATIONS/2.0) {
                    change = change - ORIENTATIONS;
                } else if (change < -ORIENTATIONS/2.0) {
                    change = ORIENTATIONS + change;
                }
            
                step.delta = change;
                step.timer = now + TURN_TIME;
                step.speed = thing.speed;
                thing.speed = 0;
                console.log("preparing to turn to orientation " + step.orientation);
            },
            (now, step, thing) => { // progress
                // have we completed the turn?
                if (step.orientation != thing.orientation) {
                    // rotate sprite by 45 degree intervals
                    // preceded by a pause of 200mS (TURN_TIME)
                
                    if (now < step.timer)
                        return;
                    
                    step.timer = now + TURN_TIME;

                    let change = step.delta;
                                                            
                    if (change <= -1) {
                        if (--thing.orientation < 0)
                            thing.orientation = ORIENTATIONS - 1 
                    } else if (change >= 1) {
                        if (++thing.orientation >= ORIENTATIONS)
                            thing.orientation = 0;
                    }
                    
                    console.log("turned to orientation " + thing.orientation);
                } else {
                    thing.speed = step.speed;
                    thing.nextStep(step);
                }
            }
        );

        // move to given location, turning to the new orientation
        // as computed from the bearing to the given location
        this.registerAct("move", 
            (now, step, thing) => { // initialise
                const d1 = step.x - thing.x;
                const d2 = step.y - thing.y
                step.distance = Math.sqrt(d1*d1 + d2*d2);
                step.bearing = Math.atan2(d2, d1);
                step.orientation = orientationFromBearing(step.bearing);
                step.startX = thing.x;
                step.startY = thing.y;
                step.startTime = undefined;
                
                console.log("move to (" + step.x + ", " + step.y + "), orientation " + step.orientation)
                
                if (step.orientation !== thing.orientation) {
                    console.log("turn needed from orientation " + thing.orientation + " to orientation " + step.orientation);
                    thing.prependStep({act:"turn", orientation:step.orientation});
                }
            },
            (now, step, thing) => { // progress
                if (step.startTime === undefined) {
                    step.startTime = now;
                }
            
                // update location
                const d = thing.speed * (now - step.startTime);
                thing.x = step.startX + d * Math.cos(step.bearing);
                thing.y = step.startY + d * Math.sin(step.bearing);
                
                if (d >= step.distance) {
                    // correct for positional error
                    thing.x = step.x;
                    thing.y = step.y;
                    thing.nextStep(step);
                }
            }
        );
           
        this.sync(); // broadcast to current clients
    }
    
    registerAct (act, init, progress) {
        this.acts[act] = {
            init: init,
            progress: progress
        };
    }
    
    setTask (task) {
        this.subtask = [];
        this.task = task;
        this.taskIndex = 0;
    }
    
    // return the current step
    getStep () {
        if (this.subtask.length)
            return this.subtask[0];
        
        if (this.task && this.taskIndex < this.task.length)
            return this.task[this.taskIndex];
    }
    
    // add step to end of subtask queue
    appendStep (step) {
        this.subtask.push(step); // append to list
        console.log("appending step " + JSON.stringify(step) +
            ", substeps are now: " + this.listSubTasks ());
    }
    
    // add step to start of subtask queue
    prependStep (step) {
        this.subtask.unshift(step); // prepend to list
        console.log("prepending step " + JSON.stringify(step) +
            ", substeps are now: " + this.listSubTasks ());
    }
    
    listSubTasks () {
        let list = "";
        for (let i = 0; i < this.subtask.length; ++ i) {
            let sep = (i === this.subtask.length - 1) ? "" : ", ";
            list += this.subtask[i].act + sep;
        }
            
        return list;
    }
    
    // advance to next step 
    nextStep (step) {
        step.running = false;
        console.log("advance to next step");
          
        if (this.subtask.length) {
            this.subtask.shift(); // pop front of list
            console.log(this.subtask.length + " subtasks remaining: " + this.listSubTasks());
            let next = this.getStep();
            if (next.running)
                console.log("resuming " + JSON.stringify(next));
            else
                console.log("next substep is " + JSON.stringify(next));
        } else {
            ++this.taskIndex;
            
            if (this.taskIndex >= this.task.length)
                console.log("finished task");
            else {
                let next = this.getStep();
                next.running = false;
                console.log("next step is " + JSON.stringify(next));
            }
        }
    }
    
    // random choice when given list of named steps
    chooseStep (steps) {
        this.subtask = [];  // clear subtask if any
        this.taskIndex = 0; // default to first step
        
        if (steps) {
            var name;
            
            if (typeof steps == "string") {
                name = steps;
            } else if (Array.isArray(steps)) {
                // step is either a name or a list of names
                name = steps[Math.floor(Math.random()*steps.length)];
            }
            
            // search task to find index of named step;
            if (name) {
                let task = this.task;
        
                for (let i = 0; i < task.length; ++i) {
                    if (task[i].name === name) {
                        this.taskIndex = i;
                        break;
                    }
                }
            }
        }
        
        this.task[this.taskIndex].running = false;
    }
    
    update (now) {
        let step = this.getStep();
        
        if (step) {
            let action = this.acts[step.act];
            
            if (action) {
                if (step.running) {
                    // action is already running
                    action.progress(now, step, this)
                    this.updateChildren();
                    this.sync();
                    
                } else {
                    // need to initialise and start the action
                    let queue_size = this.subtask.length;
                    console.log("step: " + JSON.stringify(step));
                    action.init(now, step, this);
                    step.running = true;
/*                    
                    // safe to progress task if no steps were injected
                    if (this.subtask.length === queue_size) {
                        action.progress(now, step, this)
                        this.updateChildren();
                        this.sync();
                    }
*/
                }
            } else {
                throw this.constructor.name + " lacks handler for " + step.step;
            }
        }
    }
    
    updateChildren () {
        // overridden by derived classes
    }
    
    sync (send) {
        // overridden by derived classes
    }
    
    // client sent us message {info:"name"}
    // as request for info on named component
    // so reply with properties in this.info
    // with info:name to identify component
    respond (send) {
        console.log("client asked for extra info on " + this.name);
        const extra = this.extra;
        
        if (extra) {
            let response = {};
        
            for (let name in extra) {
                response[name] = extra[name];
            }
        
            response["info"] = this.name;
            console.log("responding to " + this.name);
            console.log("response is " + JSON.stringify(response));
            send(JSON.stringify(response));
        }
    }
}

export class Obstacle extends Component {
    constructor (params) {
		super(params);
    }
    
    sync (send) {
        sendObject ({
            name: this.name,
            type: this.type,
            x: this.x,
            y: this.y,
        }, send);
    }
}

export class Pallet extends Component {
    constructor (params) {
		super(params);
    }
    
    sync (send) {
        sendObject ({
            name: this.name,
            type: this.type,
            x: this.x,
            y: this.y,
            orientation: this.orientation,
            loaded: this.loaded,
            forklift: this.forklift
        }, send);
    }
}

export class Forklift extends Component {
    constructor (params) {
		super(params);
		let forklift = this;
		forklift.held = false;
		
		if (forklift.pallet) {
		    
		    let pallet = new Pallet ({
		        name: forklift.pallet,
                x: forklift.x,
                y: forklift.y,
                z: forklift.z,
                orientation: forklift.orientation,
                loaded: true,
                forklift: forklift.name,
		    });
		    
		    forklift.held = true;  
		}
		
		// lower or raise forks
        this.registerAct("forks", 
            (now, step, forklift) => { // initialise
                step.startZ = forklift.z;
                step.deltaZ = step.z - forklift.z;
                step.startTime = now;
            },
            (now, step, forklift) => { // progress
                const d = forklift.forkspeed * (now - step.startTime);
        
                if (step.deltaZ > 0) {
                    forklift.z = step.startZ + d;
                    
                    if (forklift.z >= step.z) {
                        forklift.z = step.z;
                        forklift.nextStep(step);
                    }
                } else {
                    forklift.z = step.startZ - d;
                    
                    if (forklift.z <= step.z) {
                        forklift.z = step.z;
                        forklift.nextStep(step);
                    }
                }
            }
        );

        
        this.registerAct("grab",
            (now, step, forklift) => { // initialise
                if (forklift.pallet) {
                    // nothing to do
                    forklift.nextStep(step);
                } else {
                    // determine where to grab from, and
                    // compute orientation to face pallet
                    forklift.grabPosition(step);
                    
                    console.log("grab with forklift starting from (" + forklift.x + ", " + forklift.y + "), held = " + forklift.held);
                    console.log("grab position is (" + step.x + ", " + step.y + "), orientation = " + step.orientation);
                    
                    // move there
                    forklift.appendStep({act:"move", x:step.x, y:step.y});     
                    
                    // and lower the forks
                    forklift.appendStep({act:"forks", z:0});
                    
                    // turn to face pallet
                    console.log("face pallet with orientation = " + step.orientation);
                    forklift.appendStep({act:"turn", orientation:step.orientation});

                    // prepare to move forks into the
                    // pallet base from the grab position
                    step.startX = step.x;
                    step.startY = step.y;
                    
                    let pallet = scene[step.pallet];
                    forklift.pallet = pallet.name;
                    forklift.held = false;
                    console.log("pallet at (" + pallet.x + ", " + pallet.y + "), held = " + forklift.held);
                    console.log("forklift to (" + step.x + ", " + step.y + ")");
                    step.x = pallet.x;
                    step.y = pallet.y
                    const d1 = step.x - step.startX;
                    const d2 = step.y - step.startY;
                    step.distance = Math.sqrt(d1*d1 + d2*d2);
                    step.bearing = bearingFromOrientation(step.orientation);
                    step.startTime = undefined;
                    console.log("move d = " + step.distance + " in orientation " + step.orientation);
                    console.log("with (1) forklift at (" + forklift.x + ", " + forklift.y + ")");
                }
            },  
            (now, step, forklift) => { // progress
                if (forklift.pallet) {
                    if (step.startTime === undefined) {
                        step.startTime = now;
                        forklift.held = false;
                        console.log("moving forks into pallet, held = " + forklift.held + 
                            ", orientation = " + step.orientation);
                        console.log("with (2) forklift at (" + forklift.x + ", " + forklift.y + ")");
                    }
                    
                    if (forklift.held) {
                        forklift.nextStep(step);
                    } else {
                        // update location
                        const d = forklift.speed * (now - step.startTime);
                        forklift.x = step.startX + d * Math.cos(step.bearing);
                        forklift.y = step.startY + d * Math.sin(step.bearing);

                        if (d >= step.distance) {
                            // correct for positional error
                            forklift.x = step.x;
                            forklift.y = step.y;
                        
                            let pallet = scene[forklift.pallet];
                            pallet.forklift = forklift.name;
                            forklift.held = true;
                            forklift.updateChildren();
                        
                            console.log("grabbed " + pallet.name);
                        
                            // raise forks before moving pallet
                            forklift.prependStep({act:"forks", z:FORKLIFT_MOVE_HEIGHT});
                        }               
                    }
                }
            }
        );
           
        this.registerAct("release",
            (now, step, forklift) => { // initialise
                // check we're carrying a pallet
                if (forklift.pallet) {                                   
                    // ensure forks are lowered before release
                    forklift.prependStep({act:"forks", z:0});
                    
                    // prepare to reverse out from the pallet
                    const d = FORKLIFT_DISTANCE;
                    step.orientation = oppositeOrientation(forklift.orientation);
                    step.bearing = bearingFromOrientation(step.orientation);
                    step.startX = forklift.x;
                    step.startY = forklift.y;
                    step.x = step.startX + d * Math.cos(step.bearing);
                    step.y = step.startY + d * Math.sin(step.bearing);
                    step.distance = d;
                    step.startTime = undefined;
                    console.log("reverse to (" + step.x + ", " + step.y + ")");
                }
                else {
                    // nothing to do
                    forklift.nextStep(step);
                }
            },  
            (now, step, forklift) => { // progress
                if (forklift.pallet) {
                    if (step.startTime === undefined) {
                        step.startTime = now;
                        forklift.held = false;
                    }
            
                    // update location
                    const d = forklift.speed * (now - step.startTime);
                    forklift.x = step.startX + d * Math.cos(step.bearing);
                    forklift.y = step.startY + d * Math.sin(step.bearing);

                    if (d >= step.distance) {
                        // correct for positional error
                        forklift.x = step.x;
                        forklift.y = step.y;
                        
                        let pallet = scene[forklift.pallet];
                        pallet.forklift = undefined;
                        forklift.pallet = undefined;
                        forklift.nextStep(step);
                    }
                } else {
                    forklift.nextStep(step);
                }
            }
        );
    }
    
    // compute position and orientation to grab a pallet
    grabPosition(step) {
        let pallet = scene[step.pallet];
        let d = FORKLIFT_DISTANCE;
        
        let bearing1 = bearingFromOrientation(pallet.orientation);
        let dx = d * Math.cos(bearing1);
        let dy = d * Math.sin(bearing1);
        let x1 = pallet.x + dx;
        let y1 = pallet.y + dy;
        
        dx = x1 - this.x;
        dy = y1 - this.y;
        let d1 = dx*dx + dy*dy;
        
        console.log("grab position1 is (" + x1 + ", " + y1 + "), d1 = " + d1 + 
            ", heading = " + degreesFromBearing (bearing1));
        
        let bearing2 = bearing1 + Math.PI;
        dx = d * Math.cos(bearing2);
        dy = d * Math.sin(bearing2);
        let x2 = pallet.x + dx;
        let y2 = pallet.y + dy;

        dx = x2 - this.x;
        dy = y2 - this.y;
        let d2 = dx*dx + dy*dy;
        
        console.log("grab position2 is (" + x2 + ", " + y2 + "), d2 = " + d2 + 
            ", heading = " + degreesFromBearing (bearing2));
        
        // allow random choice when d1 and d2 are very similar
        
        //const DELTA = 0.5;
        //let delta = Math.abs(d2 - d1);
        //let first = delta < DELTA ? (Math.random() < 0.5) : (d1 < d2);
        
        // forklift orientation is opposite to the direction of
        // the grab point from the point of view of the pallet

        if (d1 < d2) {
            step.x = x1;
            step.y = y1;
            step.orientation = orientationFromBearing(bearing1 + Math.PI);
            console.log("selecting grab position 1, orientation = " + step.orientation);
        } else {
            step.x = x2;
            step.y = y2;
            step.orientation = orientationFromBearing(bearing2 + Math.PI);
            console.log("selecting grab position 2, orientation = " + step.orientation);
        }
        console.log("grab pallet using orientation " + step.orientation);
    }
    
    // used to update pallet position when forklift is moving a pallet
    updateChildren () {
        if (this.pallet && this.held) {
            let pallet = scene[this.pallet];
            pallet.x = this.x;
            pallet.y = this.y;
            pallet.z = this.z;
            pallet.orientation = this.orientation;
        }
    }
    
    sync (send) {
        let forklift = this;
        
        if (forklift.pallet && forklift.held) {
            let pallet = scene[forklift.pallet];
            
            sendObject ({
                name: forklift.pallet,
                type: pallet.type,
                x: pallet.x,
                y: pallet.y,
                z: pallet.z,
                orientation: pallet.orientation,
                loaded: pallet.loaded,
                forklift: forklift.name
            }, send);
        }
        
        sendObject ({
            name: forklift.name,
            type: forklift.type,
            x: forklift.x,
            y: forklift.y,
            z: forklift.z,
            orientation: forklift.orientation,
            speed: forklift.speed,
            pallet: forklift.pallet,
            held: forklift.held
        }, send);
    }
}

// relies on actions registered for Component class
export class Human extends Component {
    constructor (params) {
		super(params);
		
    }
    
    sync (send) {
        sendObject ({
            name: this.name,
            type: this.type,
            x: this.x,
            y: this.y,
            orientation: this.orientation,
            speed: this.speed
        }, send);
    }
}

const INTERVAL = 40;  // update time in milliseconds
let tick = 0;

setInterval(function () {
    let now = tick * INTERVAL / 1000.0;
    
    for (let name in scene) {
        let component = scene[name];
        component.update(now);
    }
    
    ++tick; 
}, INTERVAL);