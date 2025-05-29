import {Obstacle, Pallet, Forklift, Human} from './factory.mjs'

// ### TO DO - please fix me!!!
// ### add a service for click for info
// ### control of pallets for rendering

// to send object's state to web clients call `object.sync()`

let obstacle1 = new Obstacle({
    name:"obstacle1",
    x:13,
    y:25,
    orientation:0
});

let obstacle2 = new Obstacle({
    name:"obstacle2",
    x:15,
    y:20,
    orientation:3,
    loaded:true
});

let pallet1 = new Pallet({
    name:"pallet1",
    x:20,
    y:30,
    orientation:0,
    loaded:true
});
    
let pallet2 = new Pallet({
    name:"pallet2",
    x:10,
    y:40,
    orientation:3,
    loaded:false
});

let forklift1 = new Forklift({
    name:"forklift1",
    x:10,
    y:30,
    z:0,
    orientation:0,
    speed:1,
    forkspeed:0.5
});

// additional info for this component
// with one or more properties, as
// obtained from factory records
forklift1.extra = {misc:"service required"};

let human1 = new Human({
    name:"human1",
    x:3,
    y:20,
    orientation:1,
    speed:1.3
});

// simulation as a sequence of steps
// sends state updates to web pages

human1.setTask([
    {act:"move", x:8, y:20},
    {act:"move", x:8, y:30},
    {act:"move", x:3, y:30},
    {act:"move", x:3, y:20},
    {act:"next"}
]);


forklift1.setTask([
    {act:"wait", time:4},
    {act:"grab", pallet:"pallet1"},
    {act:"move", x:10, y:30},
    {act:"release"},
    {act:"move", x:20, y:30},
    {act:"grab", pallet:"pallet1"},
    {act:"move", x:20, y:30},
    {act:"release"},
    {act:"move", x:10, y:30},
    {act:"next"}
    
/*
    {act:"turn", orientation:6},
    {act:"forks", z: 1},
    {act:"wait", min:1, max:2},
    {act:"move", x:10, y:10},
    {act:"move", x:10, y:20},
    {act:"forks", z: 0},
    {act:"release"},
    {act:"move", x:10, y:15},
    {act:"grab", pallet:"pallet3"},
    {act:"next"}
*/
]);

