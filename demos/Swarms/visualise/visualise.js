/*
	script for factory monitoring and control
	(c) 2025 Dave Raggett
	Open source: MIT License
*/

// orthographic rendering with discrete orientations
const orientations = 8;  // at 45 degree increments
const right_angle = 2;   // =  2 * 45 degrees
const opposite = 4;      // = 4 * 45 degrees

window.addEventListener("load", function () {

	const canvas = document.getElementById('scene');
	const ctx = canvas.getContext('2d');
    const logElement = document.getElementById('log');
	const clearLog = document.getElementById("clear");	

	const cx = 73;		// forklift tile offset x in pixels
	const cy = 78;		// forklift tile offset y in pixels
	const fx = 126;		// floor tile offset x in pixels
	const fy = 90;		// floor tile offset y in pixels
	const fz = 1.6;	    // floor level in metres
	const ts = 0.5;		// tile rendering scale
	const tw = 300;		// tile width in pixels
	const th = 300;		// tile height in pixels
	
	const forklift_cu = 142;  // offset u in pixels for forklift and related tiles 
	const forklift_cv = 192;  // offset v in pixels for forklift and related tiles 

	// accelerated charging/discharging for sake of animation
	const battery_charge_time = 60;  // full charge in seconds
	const battery_discharge_time = 120; // whilst in motion (in seconds)
	const GOOD_BATTERY_LEVEL = 80;  // full charge is 100
	const BAD_BATTERY_LEVEL = 22;   // threshold for charging

	const scale = 10;  // pixels to meters
	
	let width = canvas.width;
	let height = canvas.height;
		
	let tickCount = 0;
	let dock_count = 0;
	let truck_count = 0;
	let forklift_count = 0;
	let pallet_count = 0;
	let ready = null;
	let scrolled = false;
	let debug = false;
	let ortho_tile, ortho_rows, factGraph, ruleGraph, lastTime, startTime;
			
	let tiles_forklift, tiles_forks, tiles_boxes, tiles_pallet_upper, tiles_pallet_lower,
		tiles_rack_riser, tiles_rack_shelves, tiles_rack_middle, tiles_rack_upper, 
		tiles_bay, tiles_corner_bayA, tiles_corner_bayB, tiles_corner, tiles_wall, tile_pile,
		tiles_lorry, tiles_truck, tiles_floor, tile_charger, tiles_baymask, banner, tiles_walker;
		
	let icon_play, icon_pause, icon_maximize, icon_minimize;
	
	function log (message) {
		let atBottom = logElement.scrollHeight - 
			logElement.clientHeight <= logElement.scrollTop + 1;
			
		logElement.innerText += message + '\n';
		
		if (logElement.innerText.length > 100000)
			// discard old data to avoid memory overflow
			logElement.innerText =
				logElement.innerText.substr(logElement.innerText.length - 50000);
		
		if (atBottom)
			logElement.scrollTop = logElement.scrollHeight;
	}
	
	function clear () {
		logElement.innerText = "";
	}
	
	clearLog.addEventListener("click", () =>  {
		clear();
	});
	
	function loadResources(next) {
		let promises = [];
				
    	let loadImage = function(path) {
    		let image = new Image();
			promises.push(
				new Promise((resolve, reject) => {
					image.addEventListener("load", () => {
						resolve(true);
					});
					image.src = path;
				})
			);
			return image;
    	}
    	
    	// revise as needed for your graphic resources
    	icon_play = loadImage("art/buttons/play.png");
    	icon_pause = loadImage("art/buttons/pause.png");
    	icon_maximize = loadImage("art/buttons/maximize.png");
    	icon_minimize = loadImage("art/buttons/minimize.png");
    	ortho_tile = loadImage("art/ortho.png");
    	tiles_forklift = loadImage("art/forklift/forklift.png");
    	tiles_forks = loadImage("art/forklift/forks.png");
    	tiles_boxes = loadImage("art/boxes/boxes.png");
    	tile_pile = loadImage("art/boxes/pile.png");
    	tiles_pallet_upper = loadImage("art/pallet/pallet-upper.png");
    	tiles_pallet_lower = loadImage("art/pallet/pallet-lower.png");
    	tiles_lorry = loadImage("art/vehicles/open-lorry.png");
    	tiles_truck = loadImage("art/vehicles/open-truck.png");
    	tiles_rack_riser = loadImage("art/racks/rack-riser.png");
    	tiles_rack_shelves = loadImage("art/racks/rack-shelves.png");
    	tiles_rack_middle = loadImage("art/racks/rack-middle.png");
    	tiles_rack_upper = loadImage("art/racks/rack-upper.png");  	
    	tiles_floor = loadImage("art/warehouse/floor.png");
    	tiles_baymask = loadImage("art/warehouse/bay-mask.png");
    	tiles_bay = loadImage("art/warehouse/bay.png");
    	tiles_corner_bayA = loadImage("art/warehouse/corner-bayA.png");
    	tiles_corner_bayB = loadImage("art/warehouse/corner-bayB.png");
    	tiles_corner = loadImage("art/warehouse/corner.png");
    	tiles_wall = loadImage("art/warehouse/wall.png");
    	tile_charger = loadImage("art/warehouse/charger.png");
    	tiles_walker = loadImage("art/walker/walker.png");
    	banner = loadImage("art/factory.jpg");
    	     	    	
		Promise.all(promises).then((results) => {
			console.log("loaded graphic assets");			
			ready();			
		});
		
		return new Promise(resolve => {
			ready = resolve;
		});
	};
	
	let last_x, last_y;  // used for mouse pointer tracking
	
	function quicksort(array, smaller) {
	  if (array.length <= 1) {
		return array;
	  }

	  let pivot = array[0];
  
	  let left = []; 
	  let right = [];

	  for (let i = 1; i < array.length; i++) {
		smaller(array[i], pivot) ? left.push(array[i]) : right.push(array[i]);
	  }

	  return quicksort(left, smaller).concat(pivot, quicksort(right, smaller));
	};

	//let sorted = quicksort([23, 45, 16, 37, 3, 99, 22], (a, b)=>{return a < b});
	//console.log('Sorted array ', sorted);
	
	// sort list of components by rendering order
	function rendering_order (components) {
		// used for determining component rendering order
		// where a, b and c are points with x and y values
		function between (a, b, c) {
			if (a.x <= c.x && c.x <= b.x) {
				return Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
			}
		
			return 0;
		}
	
		function above (component1, component2) {
			return component1.x + component1.y <= component2.x + component2.y;
		}
		
		function compare (component1, component2) {
			let orientation, x, y, hw, hh;
			const corners1 = component1.corners, corners2 = component2.corners; 
			
			const a = corners2[0]; // leftmost
			const b = corners2[3]; // rightmost
			const c = corners1[0]; // leftmost
			const d = corners1[3]; // rightmost
			
			return (between(a, b, c) === -1 || between(a, b, d) === -1 ||
					between(c, d, a) === 1 || between(c, d, b) === 1);
		}
		
		for (let i = 0; i < components.length; ++i) {
			components[i].update_corners();
		}

		return quicksort(components, compare);
	}
	
	// square building with origin at top-left corner as seen by viewer
	// along with 4 loading/unloading bays on each side
	
	class Building {
		constructor () {
			let building = this;
			building.components = {};  // maps name to component
			building.wx = building.wy = 80;
			
			// return true if (x,y) are inside the Building, allowing for walls
			building.inside = function (x, y) {
			    return (x > 1 && y > 1 && x < building.wx - 1 && y < building.wy - 1);
			};
			
			function render(ctx, tiles, index, x, y) {				
				// convert to canvas coordinates
				// origin set to rear floor corner
				const x1 = scale*(y - x) + width/2 - fx + scene.u;
				const y1 = scale*0.5*(x + y) - fy + scene.v;
				const zoom = scene.zoom;
				const ts = 0.85;
				ctx.drawImage(tiles, index*tw, 0, tw, th,
					zoom*(x1-width/2)+width/2, zoom*(y1-height/2)+height/2, ts*zoom*tw, ts*zoom*th);
			}
			
			function renderCharger(ctx, x, y) {
				const cw = 94;
				const ch = 54;
				//const x1 = scale*(y - x) + width/2 - 13 + scene.u;
				//const y1 = scale*0.5*(x + y) - 8 + scene.v;
				const x1 = scale*(y - x) + width/2 - 15 + scene.u;
				const y1 = scale*0.5*(x + y) + 9 + scene.v;
				const zoom = scene.zoom;
				const ts = 0.3;
				ctx.drawImage(tile_charger, 0, 0, cw, ch,
					zoom*(x1-width/2)+width/2, zoom*(y1-height/2)+height/2, ts*zoom*cw, ts*zoom*ch);				
			}
			
			building.clearMask = function (ctx2, x, y) {
				const x1 = scale*(y - x) + width/2 - fx + scene.u;
				const y1 = scale*0.5*(x + y) - fy + scene.v;
				const zoom = scene.zoom;
				const ts = 0.85;
				const mu = zoom*(x1-width/2)+width/2
				const mv = zoom*(y1-height/2)+height/2;
				const mw = ts*zoom*tw;
				const mh = ts*zoom*th;
				ctx2.globalCompositeOperation = "source-over"; 
				ctx2.clearRect(mu, mv, mw, mh);
			};
			
			// the bay mask image has tiles
			// index 0 orientation 2
			// index 1 orientation 3
			// index 2 orientation 4
			// index 3 orientation 5
			// index 4 orientation 6
			// index 5 orientation 7
			// index 6 orientation 0
			// index 7 orientation 1
			//  i.e. index = (orientation + 6) % 8
			
			building.applyMask = function (ctx1, ctx2, orientation, x, y) {
				const x1 = scale*(y - x) + width/2 - fx + scene.u;
				const y1 = scale*0.5*(x + y) - fy + scene.v;
				const zoom = scene.zoom;
				const ts = 0.85;
				const mu = zoom*(x1-width/2)+width/2
				const mv = zoom*(y1-height/2)+height/2;
				const mw = ts*zoom*tw;
				const mh = ts*zoom*th;
				const index = (orientation + 6) % 8;
				ctx2.globalCompositeOperation = "destination-in";
				ctx2.drawImage(tiles_baymask, index*tw, 0, tw, th,
					zoom*(x1-width/2)+width/2, zoom*(y1-height/2)+height/2, ts*zoom*tw, ts*zoom*th);
				ctx1.drawImage(offscreen, mu, mv, mw, mh, mu, mv, mw, mh);
			};
			
			building.renderFloor = function (ctx) {
				// 2D array of floor tiles
				for (let i = 0; i <= 70; i+=10) {
					for (let j = 0; j <= 70; j+=10) {
						render(ctx, tiles_floor, 0, i,  j);
					}
				}
			}
			
			building.renderRearWalls = function (ctx) {	
				render(ctx, tiles_corner, 2, 0.1,  0.2);
				render(ctx, tiles_wall, 2, 0, 10);
				render(ctx, tiles_bay, 2, 0, 20);
				render(ctx, tiles_bay, 2, 0, 30);
				render(ctx, tiles_bay, 2, 0, 40);
				render(ctx, tiles_bay, 2, 0, 50);
				render(ctx, tiles_wall, 2, 0, 60);
				render(ctx, tiles_wall, 2, 0, 70);

				//render(tiles_wall, 4, 0, 0);
				render(ctx, tiles_wall, 4, 10, 0);
				render(ctx, tiles_bay, 4, 20, 0);
				render(ctx, tiles_bay, 4, 30, 0);
				render(ctx, tiles_bay, 4, 40, 0);
				render(ctx, tiles_bay, 4, 50, 0);
				render(ctx, tiles_wall, 4, 60, 0);
				render(ctx, tiles_wall, 4, 70, 0);
			};
			
			
			building.renderFrontWalls = function (ctx) {
				render(ctx, tiles_wall, 0, 0, 70);
				render(ctx, tiles_wall, 0, 10, 70);
				render(ctx, tiles_bay, 0, 20, 70);
				render(ctx, tiles_bay, 0, 30, 70);
				render(ctx, tiles_bay, 0, 40, 70);
				render(ctx, tiles_bay, 0, 50, 70);
				render(ctx, tiles_wall, 0, 60, 70);
				render(ctx, tiles_wall, 0, 70, 70);

				render(ctx, tiles_wall, 6, 70,  0);
				render(ctx, tiles_wall, 6, 70, 10);
				render(ctx, tiles_bay, 6, 70, 20);
				render(ctx, tiles_bay, 6, 70, 30);
				render(ctx, tiles_bay, 6, 70, 40);
				render(ctx, tiles_bay, 6, 70, 50);
				render(ctx, tiles_wall, 6, 70, 60);
				render(ctx, tiles_wall, 6, 70, 70);
			};
			
			building.addDock = function (orientiation, x, y) {
				let dock = new Dock(orientiation, x, y);
				dock.building = building;
				building.docks[dock.name] = dock;
				return dock;
			};
			
			building.addRack = function (orientation, x, y, bays) {
				let rack = new Rack(orientation, x, y, bays);
				scene.add(rack);
				building.racks[rack.name] = rack;
				rack.building = building;
				return rack;
			};
			
			building.addForklift = function (name, orientiation, x, y, z, speed, palletID) {
                let forklift = new Forklift (name, x, y, orientiation);
                forklift.z = z ? z : 0;
                forklift.speed = speed ? speed : 0;
                forklift.held = false;
                
                if (palletID) {
                    let pallet = building.components[palletID];
                    
                    if (!pallet)
                        pallet = building.addPallet(palletID, orientiation, x, y, true);
                    
                    forklift.held = true;
                    forklift.addPallet(pallet);
                }
                
                building.components[name] = forklift;
				scene.add(forklift);
				return forklift;
			};
			
			building.addPallet = function (name, orientiation, x, y, loaded) {
			    let payload = loaded ? tiles_boxes : undefined;
			    let pallet = new Pallet(name, x, y, orientiation, payload);
			    building.components[name] = pallet;
				scene.add(pallet);
				return pallet;
			};
						
			building.addObstacle = function (name, x, y) {
			    let obstacle = new Obstacle(name, x, y);
			    building.obstacles.push(obstacle);
			    building.components[name] = obstacle;
			    scene.add(obstacle);
			};
			
			building.addWalker = function (name, orientation, x, y) {
			    building.walker = new Walker(name, orientation, x, y);
			    building.components[name] = building.walker;
			    scene.add(building.walker);
			};
			
			building.updateThing = function (thing) {
			    if (thing.loadForklift) {
			        // drive forklift to pickup position facing pallet
			        // lower forks then drive into the pallet and stop
			        // this transfers the pallet to the forklift, we
			        // could optionally raise the pallet with the forks
			        let forklift = building.components[thing.loadForklift];
			        let pallet = building.components[thing.pallet];
			    } else if (thing.unloadForklift) {
			        // stop forklift and lower forks then
			        // reverse away from pallet and stop
			        // transferring the pallet to the floor
			        let forklift = building.components[thing.loadForklift];
			        let pallet = forklift.pallet;
			    } else {
                    let component = building.components[thing.name];
                
                    if (component) {
                        // existing component
                        switch (thing.type) {
                            case "obstacle":
                                let obstacle = component;
                                obstacle.x = thing.x;
                                obstacle.y = thing.y;
                                break;
                        
                            case "human":
                                let human = component;
                                human.x = thing.x;
                                human.y = thing.y;
                                human.orientation = thing.orientation;
                                human.speed = thing.speed;
                                break;
                            
                            case "pallet":
                                let pallet = component;
                                pallet.x = thing.x;
                                pallet.y = thing.y;
                                pallet.orientation = thing.orientation;
                                pallet.loaded = thing.loaded;
                                break;
                            
                            case "forklift":
                                let forklift = component;
                                forklift.x = thing.x;
                                forklift.y = thing.y;
                                forklift.z = thing.z;
                                forklift.orientation = thing.orientation;
                                forklift.speed = thing.speed;
                                
                                if (thing.pallet) {
                                    let pallet = building.components[thing.pallet];
                                    
                                    if (pallet && pallet instanceof Pallet) {
                                        forklift.held = thing.held ? true : false;
                                        forklift.addPallet(pallet);
                                    }
                                } else if (forklift.pallet) {
                                    forklift.dropPallet();
                                }
                                break;
                        }
                    } else {
                        // new thing
                        building.addThing(thing);
                    }
			    }
			};
			
			building.addThing = function (thing) {
			    if (debug)
			        log("adding " + thing.name);

			    switch (thing.type) {
			        case "obstacle":
			            building.addObstacle(thing.name, thing.x, thing.y);
			            break;
			        case "human":
			            building.addWalker(thing.name, thing.orientation, thing.x, thing.y);
			            break;
			        case "pallet":
			            building.addPallet(thing.name, thing.orientation, thing.x, thing.y, thing.loaded);
			            break;
			        case "forklift":
			            building.addForklift(thing.name, thing.orientation, thing.x, thing.y, thing.z, thing.speed, thing.pallet);
			            break;
			    } 
			};
			
			scene.building = building;
			building.docks = {};    // map of dock name to dock object
			building.lorries = [];
			building.trucks = [];
			building.obstacles = [];
			building.index = new SpatialIndex();
			
			// initialise the docks and docked vehicles
			// indirectly register vehicle requests and offers
			
			building.addDock(4, 0, 20).addTruck();
			building.addDock(4, 0, 30).addTruck();
			building.addDock(4, 0, 40).addTruck();
			building.addDock(4, 0, 50).addTruck();
		}
	}

	// spatial index within a building
	class SpatialIndex {
		constructor () {
			let index = this;
			
			const cell_size = 8; // i.e. 8 metres across
			const offset = 2;
			// allow for negative x with offset of 4 * 5 = 20m
			const xmax = 80 + offset;  // size of building along x axis
			const ymax = 80 + offset;  // size of building along y axis
			const xcells = Math.ceil(xmax/cell_size);
			const ycells = Math.ceil(ymax/cell_size);
			
			let cells = new Array(xcells);
			
			for (let i = 0; i < xcells; ++i) {
				let row = cells[i] = new Array(ycells);
				
				for (let j = 0; j < ycells; ++j) {
					row[j] = new Array(0);
				}
			}
			
			function cell (x, y) {
				const i = offset + Math.floor(x/cell_size);
				const j = offset + Math.floor(y/cell_size);
				return cells[i][j];
			}
			
			function find_agent_index (agent, cell) {
				for (let i = 0; i < cell.length; ++i) {
					let entry = cell[i];
					
					if (entry.agent === agent)
						return i;
				}
			}
			
			function remove_agent (agent, cell) {
				if (cell) {
					for (let i = 0; i < cell.length; ++i) {
						let entry = cell[i];
					
						if (entry === agent) {
							cell.splice(i, 1);
							break;
						}
					}
				}
			}
			
			function insert_agent (agent, cell) {
				if (cell) {
					for (let i = 0; i < cell.length; ++i) {
						let entry = cell[i];
					
						if (entry === agent) {
							return;
						}
					}
					
					cell.push(agent);
				}
			}
			
			index.update = function (agent, prev_x, prev_y) {
				let prev_cell = cell(prev_x, prev_y);
				let new_cell = cell(agent.x, agent.y);
				
				if (prev_cell !== new_cell) {
					remove_agent(agent, prev_cell);
					insert_agent(agent, new_cell);
				}
				
				return new_cell;
			};
			
		}
	}
	
	// this is the base class for different scene components
	class Component {
		// each component occupies a rotated rectangle on the floor
		// x and y are the rectangle's center in scene coordinates,
		// orientation is angle as 0 to 3 in 45 degree steps,
		// w and h are rectangle's width and height before rotation
		constructor (name, orientation, x, y, w, h) {
			this.name = name;
			this.owner = undefined;
			this.orientation = orientation;
			this.x = x;
			this.y = y;
			this.w = w;
			this.h = h;
			this.ox = 0;
			this.oy = 0;
			
			this.toString = function () {
				return "" + this.name;
			};
			this.log = function () {
				console.log(name + " orientation=" + this.orientation +
					" x=" + this.x + " y=" + this.y +
					" h=" + this.h + " w=" + this.w);
			};
			
			// override this to render component's tiles
			this.render = function () {
			};
			
			// override this if component has behavior
			// t is the current time in milliseconds
			this.update = function (t, dt) {
			};
			
			// when this component obtains ownership of a component
			this.acquire = function(component) {
			}
			
			// when this component releases ownership of a component
			this.transfer = function(component) {
			}
			
			this.setOwner = function (owner) {
				if (this.owner) {
					if (owner == this.owner)
						return;
						
					this.owner.transfer(this);
				}
				
				this.owner = owner;
				owner.acquire(this);
			};
			
			// update rectangle's corners in screen coordinates by increasing x
			this.update_corners = function () {
				// orientation in range 0 to 3 for 45 degree steps
				const radians = Math.PI * this.orientation * 45 / 180.0;
				const c = Math.cos(radians);
				const s = Math.sin(radians);
				const ox = this.ox, oy = this.oy;
				const x = this.x + ox*c-oy*s;
				const y = this.y + ox*s+oy*c;
				const hw = this.w/2, hh = this.h/2;
				let corners = [{}, {}, {}, {}];
		
				let setCorner =  function(corner, x1, y1) {
					// rotate around rectangle's origin
					x1 -= x; y1 -= y;
					let x2 = x1*c-y1*s + x; let y2 = x1*s+y1*c + y;
			
					// convert from scene to canvas coordinates
					corner.x = scale*(y2 - x2) + width/2;
					corner.y = scale*0.5*(x2 + y2);
				};
		
				setCorner(corners[0], x - hw, y - hh);
				setCorner(corners[1], x + hw, y - hh);
				setCorner(corners[2], x + hw, y + hh);
				setCorner(corners[3], x - hw, y + hh);
		
				this.corners = quicksort(corners, (p, q)=>{return p.x < q.x});
			}

			this.boundary = function () {
				let u, v;
				const corner = this.corners;
				const zoom = scene.zoom;
				
				let dot = function (u, v, color) {
					u += scene.u;
					v += scene.v + scale*fz;
					ctx.fillStyle = color;
					ctx.fillRect(zoom*(u-width/2)+width/2 - 1, zoom*(v-height/2)+height/2 - 1, 3, 3);
				}
				
				let point = function (i) {
					u = corner[i].x; v = corner[i].y + scale*fz;
					u = zoom*(u+scene.u-width/2) + width/2;
					v = zoom*(v+scene.v-height/2) + height/2;
				}
				
				ctx.save();
				ctx.fillStyle = "#bada55";
				ctx.beginPath();
				point(0); ctx.moveTo(u, v);
				point(2); ctx.lineTo(u, v);
				point(3); ctx.lineTo(u, v);
				point(1); ctx.lineTo(u, v);
				ctx.closePath();
				ctx.fill();
				dot(corner[0].x, corner[0].y, "red");
				dot(corner[2].x, corner[2].y, "yellow");
				dot(corner[3].x, corner[3].y, "purple");
				dot(corner[1].x, corner[1].y, "blue");
				ctx.restore();
			};
		}
	}
	

	class Truck {
		constructor (orientation, x, y) {
			let truck = this;
			const ts = 0.6;
			const tx = 300;
			const ty = 300;
			const tw = 300;
			const th = 300;
			
			truck.name = "truck" + (++truck_count);
			scene.things[truck.name] = truck;
			
			truck.orientation = orientation;
			truck.x = x; // geometry centre
			truck.y = y; // geometry centre
			truck.width = 2.8; // interior
			truck.depth = 8.5; // interior
			truck.back = 2.3; // back from centre
			
			// image tiles in "vehicles/open-truck#.png" where # is 0 to 7
			// # 0 has orientation 2
			// # 1 has orientation 3
			// # 2 has orientation 4
			// # 3 has orientation 5
			// # 4 has orientation 6
			// # 5 has orientation 7
			// # 6 has orientation 0
			// # 7 has orientation 1
			// thus # is (orientation + 6) % 8
			
			truck.render = function () {
				const orientation = truck.orientation;
				const x = truck.x;
				const y = truck.y + fz; // ???
				const zoom = scene.zoom;
				const cu = 150; // tile offset u in pixels
				const cv = 211; // tile offset v in pixels
				const ts = 0.8;
				const index = (orientation + 6) % 8;

				const x1 = scale*(y - x) + width/2 - ts*cu + scene.u;
				const y1 = scale*0.5*(x + y) + scale*fz - ts*cv + scene.v;
				
				ctx.drawImage(tiles_truck, index*tw, 0, tw, th,
					zoom*(x1-width/2)+width/2, zoom*(y1-height/2)+height/2, zoom*ts*tw, zoom*ts*th);
			};
		}
	}

	class Dock {
		// x and y are upper left scene coords
		constructor (orientation, x, y) {
			const dock = this;
			dock.name = "dock" + (++dock_count);
			scene.things[dock.name] = dock;
			
			const truck_d = 6;
			const lorry_d = 3.5;
			
			dock.orientation = orientation;
			dock.x = x;
			dock.y = y;
			
			dock.addTruck = function () {
				let x = dock.x;
				let y = dock.y;
				
				if (dock.orientation === 4) {
					x = -truck_d;
					y += 5;  // centred on dock opening
				} else if (dock.orientation === 6) {
					x += 5;
					y = -truck_d;
				}
				
				dock.vehicle = new Truck(orientation, x, y);
				dock.vehicle.dock = dock;
				
				scene.building.trucks.push(dock.vehicle);
			};
		}
	}

	class Obstacle extends Component {
		constructor (name, x, y) {
			super(name, 0, x, y, 2.2, 2.2);
			
			let obstacle = this;
			obstacle.x = x;
			obstacle.y = y;
			obstacle.ox = 1;
			obstacle.oy = 1.5;
			
			obstacle.render = function (ctx) {
				const cw = 100;
				const ch = 100;
				const x1 = scale*(y - x) + width/2 - 15 + scene.u;
				const y1 = scale*0.5*(x + y) + 9 + scene.v;
				const zoom = scene.zoom;
				const ts = 0.4;
				ctx.drawImage(tile_pile, 100, 100, cw, ch,
					zoom*(x1-width/2)+width/2, zoom*(y1-height/2)+height/2, ts*zoom*cw, ts*zoom*ch);				
			}
		}
	}
	
	class Walker extends Component {
		constructor (name, orientation, x, y) {
			const walking_speed = 1.3; // metres/second
			super(name, orientation, x, y, 1, 1);
			let walker = this;
			scene.things[walker.name] = walker;
			walker.x = x;
			walker.y = y;
			walker.orientation = orientation;
			walker.gait = 0;
			walker.speed = walking_speed;
			walker.size = 4; // collision radius in metres
			scene.add(walker);
			
			walker.tooNear = function (agent) {
				const x = agent.x;
				const y = agent.y;
				const theta = Math.PI * walker.orientation/4.0;
				
				const side = 2;
				const back = 2;
				const forward = walker.speed ? 3*walker.speed : back;
				const c = Math.cos(theta);  // 1
				const s = Math.sin(theta);  // 0
				
				let px = walker.x - back * c;
				let py = walker.y - back * s;
				
				let ax = px - side * s;
				let ay = py - side * c;
				
				let bx = px + side * s;
				let by = py + side * c;
				
				let dx = bx + (back+forward) * c;
				let dy = by + (back+forward) * s;
				
				const bax = bx - ax;
				const bay = by - ay;
				const dax = dx - ax;
				const day = dy - ay;

				if ((x - ax) * bax + (y - ay) * bay < 0) return false;
				if ((x - bx) * bax + (y - by) * bay > 0) return false;
				if ((x - ax) * dax + (y - ay) * day < 0) return false;
				if ((x - dx) * dax + (y - dy) * day > 0) return false;
				
				return true;				
			};
					
					
			const STEP_LENGTH = 0.8; // distance each foot moves per step
			// noting that the walker is shown larger than lifesize!!!
			
			walker.update = function (time, dt) {
				if (walker.speed) {
				    const gait_time = 2.0 * STEP_LENGTH / walker.speed;
					const r = dt * walker.speed;
					const theta = 2 * Math.PI * walker.orientation/orientations;
					
					const prev_x = walker.x;
					const prev_y = walker.y;

					walker.x += r * Math.cos(theta);
					walker.y += r * Math.sin(theta);
					
					// update spatial index of components on the floor
					scene.building.index.update(walker, prev_x, prev_y);
					
					if (walker.speed > 0)
					    walker.gait = walker.gait + dt / gait_time;
					    
					//walker.gait = walker.gait % gait_time;
					
					// walker reverses on reaching building wall
					// however, that won't happen if the walker
					// has a set of reasonable move instructions
					if (!scene.building.inside(walker.x, walker.y)) {
					    walker.orientation = (walker.orientation + 4) % 8;
					    walker.x -= r * Math.cos(theta);
					    walker.y -= r * Math.sin(theta);
					}
				} else {
					walker.gait = 0;
				}
			};
			
			// "walker.png" has rows for walking in given orientations:
			//
			// row 0 for orientation 1
			// row 1 for orientation 0
			// row 2 for orientation 7
			// row 3 for orientation 6
			// row 4 for orientation 5
			// row 5 for orientation 4
			// row 6 for orientation 3
			// row 7 for orientation 2
			//
			// i.e. row = (9 - orientation) % 8
			
			// walker is 
			walker.render = function (ctx) {
				const x = walker.x;
				const y = walker.y;
				const tw = 112, th = 157, fx = 17, fy = 24;
				const x1 = scale*(y - x) + width/2 - fx + scene.u;
				const y1 = scale*0.5*(x + y) - fy + scene.v;
				const zoom = scene.zoom;
				const ts = 0.3;
				const col = Math.floor(6 * walker.gait) % 6;
				const row = (9 - walker.orientation) % 8;
				ctx.drawImage(tiles_walker, col*tw, row*th, tw, th,
					zoom*(x1-width/2)+width/2, zoom*(y1-height/2)+height/2, ts*zoom*tw, ts*zoom*th);
			};
		}
	}

	class Forklift extends Component {
		constructor (name, x, y, orientation, pallet) {
			super(name, orientation, x, y, 1.3, 1.1);
			
			let forklift = this;
			scene.things[name] = pallet;
			
			forklift.x = x;
			forklift.y = y;
			forklift.z = 0;
			forklift.ox = -1.2;
			forklift.oy = 0;
			forklift.orientation = orientation;
			forklift.speed = 0;
			forklift.pallet = pallet;
			forklift.pause = undefined;
			forklift.repeat = false;
			forklift.delegatePallet = false;
			forklift.delegateForks = false;
			
			const building = scene.building;
			
			function alignPallet () {
				if (forklift.pallet) {
					let pallet = forklift.pallet;
					
					if (forklift.held) {
					    pallet.orientation = forklift.orientation;
                        pallet.x = forklift.x;
                        pallet.y = forklift.y;
                        pallet.z = forklift.z;
					}
				}
			}
			
			forklift.acquire = function (pallet) {
				forklift.pallet = pallet;
				pallet.renderForks = forklift.renderForks;
				scene.transfer(pallet);
			};
			
			forklift.transfer = function (pallet) {
			};
			
			forklift.addPallet = function (pallet) {
                forklift.acquire(pallet);
                alignPallet();
			};
			
			forklift.dropPallet = function () {
			    pallet = forklift.pallet;
			    pallet.renderForks = undefined;
			    forklift.delegatePallet = false;
			    forklift.pallet = undefined;
			    forklift.held = false;
			    scene.acquire(pallet);
			};
						
			forklift.update = function (time, dt) {
			    // update position based upon speed
			};
			
			forklift.renderForks = function (ctx) {
				const zoom = scene.zoom;
				const orientation = forklift.orientation;
				const cu = forklift_cu; // forklift tile offset u in pixels
				const cv = forklift_cv; // forklift tile offset v in pixels
				const ts = 0.3;
				const x = forklift.x;
				const y = forklift.y;
				const z = forklift.z - fz;

				const x1 = scale*(y - x) + width/2 - ts*cu + scene.u;
				const y1 = scale*0.5*(x + y) - scale*z - ts*cv + scene.v;
				const index = (orientation + 4) % 8;

				ctx.drawImage(tiles_forks, index*tw, 0, tw, th,
					zoom*(x1-width/2)+width/2, zoom*(y1-height/2)+height/2, zoom*ts*tw, zoom*ts*th);
			};
			
			// image tiles in "forklift/forliftk#.png" where # is 0 to 7
			// # 0 has orientation 4
			// # 1 has orientation 5
			// # 2 has orientation 6
			// # 3 has orientation 7
			// # 4 has orientation 0
			// # 5 has orientation 1
			// # 6 has orientation 2
			// # 7 has orientation 3
			// thus # is (orientation + 4) % 8
		
			forklift.render = function (ctx) {
				const zoom = scene.zoom;
				const orientation = forklift.orientation;
				const cu = forklift_cu; // forklift tile offset u in pixels
				const cv = forklift_cv; // forklift tile offset v in pixels
				const ts = 0.3; // tile scale
 				const x = forklift.x;
				const y = forklift.y;
				const z = forklift.z - fz;

				const x1 = scale*(y - x) + width/2 - ts*cu + scene.u;
				const y1 = scale*0.5*(x + y) + scale*fz - ts*cv + scene.v;
				
				const index = (orientation + 4) % 8;
		
				if (orientation >= 4) {
					if (forklift.pallet && !forklift.delegatePallet)
						forklift.pallet.render(ctx);
					else if (!forklift.delegateForks)
						forklift.renderForks(ctx);
						
					ctx.drawImage(tiles_forklift, index*tw, 0, tw, th,
						zoom*(x1-width/2)+width/2, zoom*(y1-height/2)+height/2, zoom*ts*tw, zoom*ts*th);
				} else {
					ctx.drawImage(tiles_forklift, index*tw, 0, tw, th,
						zoom*(x1-width/2)+width/2, zoom*(y1-height/2)+height/2, zoom*ts*tw, zoom*ts*th);
						
					if (forklift.pallet && !forklift.delegatePallet)
						forklift.pallet.render(ctx);
					else if (!forklift.delegateForks)
						forklift.renderForks(ctx);
				}
				
				if (debug)
					dot(x, y, "red");
			}
		}
	}

	class Pallet extends Component {
		constructor (name, x, y, orientation, payload) {			
			// name, orientation, x, y, w, h
			super(name, orientation, x, y, 0.92, 1.4);
			
			let pallet = this;
			scene.things[name] = pallet;

			pallet.x = x;
			pallet.y = y;
			pallet.z = 0;
			pallet.orientation = orientation;
			pallet.payload = payload;
			pallet.renderForks = undefined;
			
			pallet.render = function (ctx) {
				const zoom = scene.zoom;
				const orientation = pallet.orientation;
				const cx = forklift_cu;		// pallet tile offset u in pixels
				const cy = forklift_cv;		// pallet tile offset v in pixels
				const ts = 0.3;
				const x = pallet.x;
				const y = pallet.y;
				const z = pallet.z - fz;
				
				const z1 = scale*z;  // z is height above floor in metres
				const x1 = scale*(y - x) + width/2 - ts*cx + scene.u;
				const y1 = scale*0.5*(x + y) - z1 - ts*cy + scene.v;
				
				//if (pallet.owner instanceof Manifest) {
				//	ctx.save();
				//}
				
				const index = (pallet.orientation + 4) % 8;
				
				ctx.drawImage(tiles_pallet_lower, index*tw, 0, tw, th,
					zoom*(x1-width/2)+width/2, zoom*(y1-height/2)+height/2, zoom*ts*tw, zoom*ts*th);
				
				if (pallet.renderForks)
					pallet.renderForks(ctx);
				
				ctx.drawImage(tiles_pallet_upper, index*tw, 0, tw, th,
					zoom*(x1-width/2)+width/2, zoom*(y1-height/2)+height/2, zoom*ts*tw, zoom*ts*th);
				
				if (pallet.payload) {
					const index = (orientation + 4) % 8;
					ctx.drawImage(pallet.payload, index*tw, 0, tw, th,
						zoom*(x1-width/2)+width/2, zoom*(y1-height/2)+height/2, zoom*ts*tw, zoom*ts*th);
				}
						
				//if (pallet.owner instanceof Manifest) {
				//	ctx.restore();
				//}
			}
		}
	}

	// isometric projection
	let scene_height = height/2 + 50;		
	
	function dot (x, y, color) {
		ctx.save();
		ctx.fillStyle = color;
		const zoom = scene.zoom;
		const u = scale*(y - x) + width/2 + scene.u;
		const v = scale*0.5*(x + y)  + scale*fz + scene.v;
		ctx.fillStyle = color;
		ctx.fillRect(zoom*(u-width/2)+width/2 - 1, zoom*(v-height/2)+height/2 - 1, 3, 3);
		ctx.restore();
	}
	
	function init_mouse () {
		// note that deltas for 2 finger touch differ from mouse wheel
		// so we look and x and y for the biggest, and use its sign
		// we may get many events too quickly in succession, sigh!
		// if that's a problem, check if frame is already requested
		canvas.onwheel = (ev) => {
			if (ev.shiftKey) {
				ev.preventDefault();
				const zoom_in = 1.1;
				const zoom_out = 1.0/1.1;
				let zoom;
				
				if  (Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) {
					zoom = ev.deltaX > 0 ? zoom_in : (ev.deltaX < 0 ? zoom_out : 1);
				} else {
					zoom = ev.deltaY > 0 ? zoom_in : (ev.deltaY < 0 ? zoom_out : 1);
				}
				scene.zoom *= zoom;
				
				if (!scene.running)
					window.requestAnimationFrame(() => {scene.refresh(lastTime)});
			}
		};
			
		canvas.onmousedown = (ev) => {
			last_x = ev.clientX;
			last_y = ev.clientY;
		};
		
		canvas.onmousemove = (ev) => {
			if (ev.shiftKey && ev.buttons === 1) {
				const x = ev.clientX;
				const y = ev.clientY;
				const zoom = scene.zoom;
				const su = canvas.width/window.screen.width;			
				const sv = canvas.height/window.screen.height;			
				
				scene.u += su*(x - last_x)/zoom;
				scene.v += sv*(y - last_y)/zoom;
				
				last_x = x;
				last_y = y;
				
				if (!scene.running)
					window.requestAnimationFrame(() => {scene.refresh(lastTime)});
			} else if (scene.running) {
				scene.locate(ev.clientX - canvas.offsetLeft, ev.clientY - canvas.offsetTop);
			} else {
			    // scene is paused
				scene.locate(ev.clientX - canvas.offsetLeft, ev.clientY - canvas.offsetTop);
				window.requestAnimationFrame(() => {scene.pane.update()});
			}
		};
		
		canvas.onclick = (ev) => {
			scene.click(ev.pageX - ev.target.offsetLeft, ev.pageY - ev.target.offsetTop);
		};
	}
	
	// touch events are only available on mobile devices
	// sadly the following code isn't yet working, no idea why!
	function init_touch () {
		let dprev, prev_touch;
		
		let touchStart = function (ev) {
			dprev = prev_touch = undefined;
			
			if (ev.changedTouches.length === 1)
				prev_touch = ev.changedTouches[0];
		};
		
		let touchMove = function (ev) {
			if (ev.changedTouches.length === 2) {
				const p1 = ev.changedTouches[0];
				const p2 = ev.changedTouches[1];
				const dx = p2.clientX - p1.clientX;
				const dy = p2.clientY - p1.clientY;
				const d = dx*dx + dy*dy;  // square of finger separation
				
				if (dprev === undefined)
					dprev = d;
					
				const zoom = scene.zoom;

				if (Math.abs(d - dprev) > 10) {
					if (d < dprev) {
						scene.zoom *= 1.05;
						
						if (!scene.running)
							window.requestAnimationFrame(() => {scene.refresh(lastTime)});
					} else if (d > dprev) {
						scene.zoom *= 0.95;
						
						if (!scene.running)
							window.requestAnimationFrame(() => {scene.refresh(lastTime)});
					}
				}

				dprev = d;
				prev_touch = undefined;
			} else if (ev.changedTouches.length === 1) {
				const zoom = scene.zoom;				
				const touch = ev.changedTouches[0];
				const su = canvas.width/window.screen.width;			
				const sv = canvas.height/window.screen.height;			

				
				if (prev_touch === undefined)
					prev_touch = touch;
					
				if (touch.identifier === prev_touch.identifier) {
					scene.u += su*(touch.clientX - prev_touch.clientX)/zoom;
					scene.v += sv*(touch.clientY - prev_touch.clientY)/zoom;
				
					if (!scene.running)
						window.requestAnimationFrame(() => {scene.refresh(lastTime)});
				}				
				
				prev_touch = touch;
				dprev = undefined;
				console.log("scene u="+scene.u+", v="+scene.v);
			} else {
				dprev = prev_touch = undefined;
			}
    	};
		
		let touchEnd = function (ev) {
			dprev = prev_touch = undefined;
		};
		
		canvas.ontouchstart = touchStart;
		canvas.ontouchend = touchEnd;
		canvas.ontouchcancel = touchEnd;
		canvas.ontouchmove = touchMove;
	}
	
	class InfoPane {
		constructor () {
			let pane = this;
			let px = 0;
			let py = 0;
			pane.extra = {};
			
			pane.setForklift = function (forklift) {
				if (forklift !== pane.forklift) {
					console.log("selected " + forklift.name);
					pane.forklift = forklift;
					const angle = 2*Math.PI*forklift.orientation/orientations;
					const x = forklift.x + forklift.ox*Math.cos(angle);
					const y = forklift.y + forklift.oy*Math.sin(angle);
					const zoom = scene.zoom;
					let u = scale*(y - x) + width/2 + scene.u;
					let v = scale*0.5*(x + y)  + scale*fz + scene.v;
					px = zoom*(u-width/2)+width/2 - 80;
					py = zoom*(v-height/2)+height/2 + 10;
					pane.requestExtra(forklift.name);
					pane.update();
				}
			};
			
			pane.resetForklift = function () {
				if (pane.forklift) {
					console.log("unselected " + pane.forklift.name);
					pane.forklift = undefined;
					pane.info = "";
					pane.hide();
				}
			};
			
			pane.requestExtra = function (name) {
			    const request = {info:name};
			    scene.socket.send(JSON.stringify(request));
			}
			
			pane.setExtra = function (extra) {
			    // extra is an object where info names the component
			    // the additional properties are used in pane.update()
			    pane.extra = extra;
			    pane.update();
			}
			
			pane.render = function (ctx) {
			    if (pane.forklift && pane.info) {
			        pane.update();
                    const forklift = pane.forklift;
                    const x = pane.forklift.x;
                    const y = pane.forklift.y;
                    const zoom = scene.zoom;
                    const u = scale*(y - x) + width/2 + scene.u;
                    const v = scale*0.5*(x + y)  + scale*fz + scene.v;
                    
                    let pane_width = 150;
                    let pane_height = 80;
                    let pane_left = zoom*(u-width/2)+width/2 - pane_width/2;
                    let pane_top = zoom*(v-height/2)+height/2 + 10;
                                    
                    const info = pane.info.split('\n');
                    const metrics = ctx.measureText("Test");
                    const lineHeight = metrics.actualBoundingBoxAscent +
                        metrics.actualBoundingBoxDescent + 4;
                    const textHeight = info.length * lineHeight;
                    
                    if (pane_height < textHeight + 5)
                        pane_height = textHeight + 5;
                    
                    if (top + textHeight > height)
                        pane_top = height - top + textHeight;

                    // draw pane
                    ctx.save();
                    ctx.strokeStyle = 'black';
                    ctx.fillStyle = 'rgba(0.5,0.5,0.5,0.5)';
                    ctx.strokeStyle = 'white';
                    ctx.fillRect(pane_left, pane_top, pane_width, pane_height);
                    ctx.stroke();
                    ctx.restore();

                    // draw info
                    ctx.save();
                    ctx.fillStyle = 'white';
                    ctx.font = "12px serif";
                    ctx.textBaseline = "top";
                    
                    for (let i = 0; i < info.length; ++i) {
                        const x = pane_left + 2;
                        const y = pane_top + 3 + i * lineHeight;
                        ctx.fillText(info[i], x, y); 
                    }
                    
                    ctx.restore();
                }
			};
			
			pane.hide = function () {
			    pane.forklift = undefined;
				pane.info = "";
			};
			
			pane.update = function () {				
				if (pane.forklift) {
				    const forklift = pane.forklift;
					pane.info = forklift.name + ":\n\n" +
						" payload: " + (forklift.held? forklift.pallet.name : "none") + "\n" +
						" speed: " + (forklift.speed? forklift.speed.toFixed(2) : "0") + "\n" +
						" orientation: " + forklift.orientation + "\n" + 
						" x: " + forklift.x.toFixed(2) + "\n" +
						" y: " + forklift.y.toFixed(2) + "\n" +
						" fork height: " + forklift.z.toFixed(2);
						
					// append extra info properties server sent us
				    for (let name in pane.extra) {
				        if (name !== "info") {
				            pane.info += "\n " + name +  ": " + pane.extra[name];
				        }
				    }
				}
			}
		}
	}
		
	// scene is the object that handles the components in the scene
	let scene = {
		name: "scene",
				
		// a faster environment will come later, for now
		// stick with simple list updated with quicksort
		
		find: function (name) {
			if (name) {
				for (let i = 0; i < scene.environment.length; ++i) {
					if (scene.environment[i].name === name)
						return scene.environment[i];
				}
			}
		},
		
		// convenience function which invokes acquire()
		add: function (component) {
			component.setOwner(scene);
			return component;
		},
		
		acquire: function (component) {
			// ensure it can't be added twice
			for (let i = 0; i < scene.environment.length; ++i) {
				if (scene.environment[i] === component)
					return component;
			}
			
			scene.environment.push(component);
			return component;
		},
		
		transfer: function (component) {
			for (let i = 0; i < scene.environment.length; ++i) {
				if (scene.environment[i] === component) {
					scene.environment.splice(i, 1);
					break;
				}
			}
		},
		
		pane: new InfoPane(),
		
		sort: function () {
			scene.environment = rendering_order(scene.environment);
		},
		
		compare: function (component1, component2) {
		},
		
		run: function () {
			let step = function (time) {
				scene.refresh(time);

				if (scene.running)
					window.requestAnimationFrame(step);
			};
			
			window.requestAnimationFrame(step);
		},
		
		gamepad: function () {
		    const gamepads = navigator.getGamepads();
		    
            if (!gamepads || !scene.running || !gamepads[0])
                return;

            const buttons = gamepads[0].buttons;
            const axes = gamepads[0].axes;
            
            // assuming the standard game pad as defined
            // at https://w3c.github.io/gamepad/#remapping
            const up = buttons[12];
            const down = buttons[13];
            const left = buttons[14];
            const right = buttons[15];
            const x = buttons[3];
            const y = buttons[2];
            
            // some gamepads treat the directional buttons as sticks
            // so we test for the axes as well as the standard buttons 
            if (up.pressed || axes[0] < -0.5)
                scene.u -= 1;
            
            if (down.pressed || axes[0] > 0.5)
                scene.u += 1;
            
            if (left.pressed || axes[1] < -0.5)
                scene.v -= 1;
            
            if (right.pressed || axes[1] > 0.5)
                scene.v += 1;
                            
            if (x.pressed)
                scene.zoom *= 1.02; // zoom in
            
            if (y.pressed)
                scene.zoom *= 0.98; // zoom out
		},
		
		locate: function (u, v) {
			// compute scene coordinates under mouse pointer at floor level
			// n.b. offsets for mouse tip vary from one computer to another
			const zoom = scene.zoom;
			let su = scene.u;
			let sv = scene.v;
			
			if (document.fullscreenElement || document.webkitFullscreenElement) {
				u *= canvas.width/window.screen.width;
				v *= canvas.height/window.screen.height;
			}
			
			const x1 = (u - width/2)/zoom + width/2;
			const y1 = (v - height/2)/zoom + height/2;
			
			scene.px = 0.5*(2*y1 - 2*sv - x1 + width/2 + su)/scale - 1.8 // 0.15;
			scene.py = 0.5*(x1 - width/2 - su + 2*y1 - 2*sv)/scale - 1.8 // 0.39;
			
            let forklift = undefined;
            let d2min = Number.POSITIVE_INFINITY;
            
            // is there a forklift under the mouse pointer
            for (let i = 0; i < scene.environment.length; ++i) {
                const component = scene.environment[i];
                if (component instanceof Forklift) {
                    const orientation = component.orientation;
                    const angle = 2 * Math.PI * orientation / orientations;
                    const dx = component.x + component.ox*Math.cos(angle) - scene.px;
                    const dy = component.y + component.oy*Math.sin(angle) - scene.py;
                    const d2 = dx*dx + dy*dy;
                    
                    if (d2 < d2min && d2 < 3) {
                        forklift = component;
                        d2min = d2;
                    }
                }
            }

            if (forklift) {
                scene.pane.setForklift(forklift);
            } else if (scene.pane.forklift) {
                scene.pane.resetForklift();
            }
		},
		
		click: function (x, y) {
			// tap mobile screen to enter full screen as the buttons are too
			// small to tap individually when screen is in portrait mode
			
			// no reliable way to detect a mobile device like Android and iOS
			// so instead use portrait screen as a rule of thumb
				
			if (window.screen.height > window.screen.width) {
				scene.aspect_ratio = window.screen.height/window.screen.width;
				if (canvas.requestFullscreen) {
  					canvas.requestFullscreen();
				} else if (canvas.webkitRequestFullscreen) {
					canvas.webkitRequestFullscreen();
				}
				return;
			}

			// scale to units used for drawing to the canvas
			// measuring from the bottom right of the canvas
			x = width - x * width/canvas.clientWidth;
			y = height - y * height/canvas.clientHeight;

			const h = 40;
			const d = 6;
			const bz = h+d;
			
			if (y < bz)	{
				if (x < bz) {
					if (document.fullscreenElement) {
						document.exitFullscreen();
					} else if (document.webkitFullscreenElement) {
						document.webkitExitFullscreen();
					} else if (canvas.requestFullscreen) {
						scene.aspect_ratio = window.screen.width/window.screen.height;
  						canvas.requestFullscreen();
					} else if (canvas.webkitRequestFullscreen) {
 						scene.aspect_ratio = window.screen.width/window.screen.height;
						canvas.webkitRequestFullscreen();
					} else {
						log("unable to enter full screen");
					}
				} else if (x < 2*bz) {
					if (scene.running) {
						log("pause animation");
						console.log("scene: " + scene.environment);
						scene.running = false;
						scene.disconnect();
					} else {
						if (scene.started)
							log("resume animation");
							
						scene.connect();  // open web socket connection for data
						scene.running = true;
						scene.started = true;
						lastTime = undefined;
						scene.run();
					}
				}
			}		
		},
		
		renderDiamonds: function(ctx) {
			ctx.save();
			ctx.fillStyle = "white";
			ctx.fillRect(0, 0, width, height);
			ctx.scale(0.5, 0.5);
			
			const fw = ortho_tile.width;
			const fh = ortho_tile.height;
			const su = 0;  // scene.u
			const sv = 0;  // scene.v
			
			let ox = width - 64 + 2*su;
			let oy = 2*sv;
			
			while (oy > -64) {
				while (ox < 2*width) {
					ctx.drawImage(ortho_tile, ox, oy, fw, fh);
					ox += 128;
				}
			
				ox = width - 64 + 2*su - 128;
				while (ox > -128) {
					ctx.drawImage(ortho_tile, ox, oy, fw, fh);
					ox -= 128;
				}
				
				oy -= 64;
			}
			
			oy = 2*sv;
			
			while (oy < 2*height) {
				while (ox < 2*width) {
					ctx.drawImage(ortho_tile, ox, oy, fw, fh);
					ox += 128;
				}
			
				ox = width - 64 + 2*su - 128;
				while (ox > -128) {
					ctx.drawImage(ortho_tile, ox, oy, fw, fh);
					ox -= 128;
				}
				
				oy += 64;
			}
			
			ctx.fillStyle = "blue";
			ctx.fillRect(width + 2*su - 2, 2*sv, 2, 2);
			ctx.restore();
		},
		
		renderButtons: function (ctx) {
			const size = 225;
			const h = 40;
			const d = 6;
			let play_pause = scene.running ? icon_pause: icon_play;
			let max_min = (document.fullscreenElement || document.webkitFullscreenElement)
				? icon_minimize: icon_maximize;

			ctx.drawImage(max_min, 0, 0, size, size, width-h-d, height-h-d, h, h);
			ctx.drawImage(play_pause, 0, 0, size, size, width-2*(h+d), height-h-d, h, h);
		},
		
		renderPointer: function (ctx) {
			if (scene.px !== undefined) {
				ctx.save();
				ctx.fillStyle = "black";
				ctx.font = "12px serif";
  				ctx.fillText((scene.px).toFixed(2) + "m, " + (scene.py).toFixed(2) + 
  					"m 🔍" + (scene.zoom).toFixed(2), width-300, height-14);
  				ctx.restore();
			}
		},
		
		// only when simulation is paused
		renderPane: function (ctx) {
			if (scene.pane.forklift) {
			    scene.pane.render(ctx);
			}
		},
		
		// server has sent us details for a thing
		update: function (thing) {
		    scene.building.updateThing(thing);
		},
		
		// opening credits and animation
		opening: function (time) {
			if (startTime === undefined)
				startTime = time;
			
			const dt = time - startTime;
			const duration = 2000; // 2 seconds
			const zoom0 = 0.1;
			const zoom1 = 2;
			const panu = -200;
			const panv = 50;
			
			//scene.zoom = zoom1;  // hack to debug Safari
			
			if (dt <= duration) {
				scene.zoom = zoom0 + (zoom1-zoom0)*dt/duration;
				scene.u = panu*dt/duration;
				scene.v = panv*dt/duration;
			}
		},

		refresh: function (time) {
			let x, y;
			let h = height - width/2;
			let orientation = 0
			let environment = scene.environment;
			let building = scene.building;
			
			scene.gamepad();  // update pan/zoom params
			
			tickCount += 1;
			
			if (lastTime === undefined)
				lastTime = time;
				
			let dt = (time - lastTime)/1000.0;  // seconds since last refresh
			
            // time warp needed after returning to this
            // browser tab after a length interval away
			if (dt > 1) {
			    lastTime = time;
			    scene.running = false;
			    scene.disconnect();
			    scene.renderButtons(ctx);
			    return;
			}
			
			width = canvas.width;
			height = canvas.height;
			ctx.imageSmoothingEnabled = true;
			
			if (scene.started === false) {
				const h = banner.height;
				const w = h * scene.aspect_ratio;
				ctx.drawImage(banner, 0, 0, banner.width, banner.height, 0, 0, width, height);
				scene.renderButtons(ctx);
				return;
			}
			
			ctx.fillStyle = "white";
			ctx.fillRect(0, 0, width, height);
			
			// opening animation
			scene.opening(time, dt);

			// ground plane pattern
			scene.renderDiamonds(ctx);

			// components with fixed rendering order
			
			for (let name in building.docks) {
				building.docks[name].vehicle.render(ctx);
			}
				
			building.renderFloor(ctx);
			building.renderRearWalls(ctx);
			building.renderFrontWalls(ctx);
			
			// update forklifts inside the vehicle docks
			//for (let name in building.docks) {
			//	building.docks[name].vehicle.manifest.update(time, dt);
			//}
						
			// update moving objects on the warehouse floor
            for (let i = 0; i < environment.length; ++i) {
                object = environment[i];
            
                if (object.owner === scene)
                    object.update(time, dt);
            }

			scene.sort(); // orthographic rendering sequence
			
			if (debug) {	
				for (let i = 0; i < environment.length; ++i) {
					environment[i].boundary();
				}
			}
            /*
			for (let name in building.docks) {
				building.docks[name].vehicle.manifest.render(ctx);
			}
            */
			for (let i = 0; i < environment.length; ++i) {
				object = environment[i];
				ctx.save();
				object.render(ctx);
				ctx.restore();
			}

			scene.renderPointer(ctx);
			scene.renderButtons(ctx);
			scene.renderPane(ctx);
			
			lastTime = time;
		},
		
		find: function (name) {
			return scene.things[name];
		},
		
		disconnect: function () {
		    console.log("disconnect from server");
		    
		    if (scene.socket) {
		        scene.socket.close(1000, "paused");
		        scene.socket = undefined;
		    }
		},
		
		connect: function () {
		    console.log("reconnecting to server");
		    if (!scene.socket) {
		        const wsURL = (window.location + "").replace(/[a-z]+:/, "ws:");
                scene.socket = new WebSocket(wsURL);
            
                scene.socket.addEventListener('message', function (e) {
                    log("received: " + e.data);
                    try {
                        let info = JSON.parse(e.data);
                        
                        if (info.info) {
                            scene.pane.setExtra(info);
                        } else {
                            scene.update(info);
                        }
                    } catch (e) {
                        log("bad update: " + e)
                    }
                });
                scene.socket.addEventListener('open', function (e) {
                    log("opened socket to server");
                    //scene.socket.send("hello server");
                });
                scene.socket.addEventListener('close', function (e) {
                    log("server closed the socket");
                    scene.socket = undefined;
					scene.running = false;
                });
            }
		},

		init: function () {
			init_mouse();
			init_touch();
			
			scene.started = false;
			scene.running = false;
			scene.zoom = 0.8;
			scene.u = scene.v = 0;  // canvas offsets for panning
			scene.environment = [];
			scene.things = {}; // dictionary: name --> object
			
			scene.aspect_ratio = window.screen.width/window.screen.height;
			scene.isMac = /Macintosh/i.test(navigator.userAgent);
			
			if (scene.aspect_ratio < 1)
				scene.aspect_ratio = 800.0/500.0;
						
			canvas.height = offscreen.height = 500;
			canvas.width = offscreen.width = canvas.height * scene.aspect_ratio;	
			
			document.onfullscreenchange = document.onwebkitfullscreenchange = (ev) => {
				let aspect_ratio = scene.aspect_ratio;
				
				if (document.fullscreenElement || document.webkitFullscreenElement) {
					screen.orientation.lock("landscape").catch((error) => {
						scene.aspect_ratio = 800.0/500.0;
						
						if (debug)
							log("unable to switch to landscape mode");
					});

					// Mac's reserve black area at top of full screen for internal display
					// the following is a fudge in the absence of a better test
					if (scene.isMac && (1.53 < aspect_ratio && aspect_ratio < 1.61)) {
						aspect_ratio = 1.6;
						
						if (debug)
							log("setting aspect ratio to 1.6 for MacBook internal display");
					}
				}
				
				canvas.height = offscreen.height = 500;
				canvas.width = offscreen.width = canvas.height * aspect_ratio;
				if (debug)
					log("full screen change: canvas is " + canvas.width + ", " + canvas.height +
						", screen is " + window.screen.width + ", " + window.screen.height);

				if (!scene.running) {
					window.requestAnimationFrame(() => {scene.refresh(lastTime)});
				}
			};
			
			ortho_rows = 2*height/ortho_tile.height;  // why the need for 2 here??
						
			scene.building = new Building();
						
			scene.connect();  // open web socket connection for data
		}
	};

	loadResources().then(() => {
	    log('starting up, click play button to run');
		scene.init();
		scene.run();
	});
}, false);
