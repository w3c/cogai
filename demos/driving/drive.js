/*
	Decision tree demo for Chunks rule language
*/

window.addEventListener("load", function () { test.init(); }, false);

let test = {
    init: function () {
    	test.imageNames = ["red-car.png", "red-car-left.png", "red-car-right.png", "pin.png"];
    	test.images = {};
    	let promises = [];
    	for (let i = 0; i < test.imageNames.length; ++i) {
    		promises.push(
    			new Promise((resolve, reject) => {
    				let name = test.imageNames[i];
    				test.images[name] = new Image();
    				test.images[name].src = name;
    				test.images[name].onload = function () {
    					resolve(true);
    				};
    			})
    		);
    			
    	}
    	
    	promises.push(
    		new Promise((resolve, reject) => {
				fetch("map.chk")
				.then((response) => response.text())
				.then(function (source) {
						test.map = new ChunkGraph(source);
						resolve(true);
				});
			})
    	);
    
    	Promise.all(promises).then(result => {
			log_element = document.getElementById("log");  // for smart logging
			log.write("successfully loaded map as " + test.map.count + " chunks");
			test.clip = new Clip(test.map);
			test.root = test.index(test.clip);
			log.write("finished spatially indexing the paths");
			test.start();
    	})
    },
	start: function () {
		const canvas = document.getElementById('road');
		const ctx = canvas.getContext('2d');
		const laneWidth = 3.65;
		
		// round number to 2 decimal places
		let num = function (x) {
			return "" + x.toFixed(2);
		}
		
		let angle = function (theta) {
			let angle = theta * 180 / Math.PI;
			angle = angle % 360;
			return angle;
		};

		// find another path intersecting the given point
		// that either has the same name or the same ref
		// this is used to continue along a given road
		
		let nextPath = function (path, point) {
			let paths = point.properties.paths;
			
			if (paths === undefined || !Array.isArray(paths))
				return;
				
			for (let i = 0; i < paths.length; ++i ) {
				let p = test.map.chunks[paths[i]];
				
				if (p !== path) {
					// common case: paths have same name, e.g. Oakfield Road
					if (p.properties.name === path.properties.name)
						return p;
					// some roads change their names, so check "ref", e.g. "A362"
					if (path.properties.ref && (p.properties.ref === path.properties.ref))
						return p;
				}
			}
		};
		
		// convert location lat,lon to x,y in metres
		let map2metres = function (lat, lon) {
			return {x: test.dlat*(lat-test.lat), y: test.dlon*(lon-test.lon)};
		};
				
		let metres2map = function (x, y) {
			return {lat: test.lat + x/test.dlat, lon: test.lon + y/test.dlon};
		};
		
		// test if point c is colinear with points a and b, and lies between them
		let inbetween = function (a, b, c) {
			let cmp = function (x, y) {
				return (x > y ? 1 : (x < y ? -1 : 0));
			};
			
			return ((b.x - a.x) * (c.y - a.y) == (c.x - a.x) * (b.y - a.y) && 
				Math.abs(cmp(a.x, c.x) + cmp(b.x, c.x)) <= 1 &&
				Math.abs(cmp(a.y, c.y) + cmp(b.y, c.y)) <= 1);
		};
		
		// true if points a, b and c are on same straight line to some given accuracy
		let collinear = function (a, b, c) {
			return Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) < 0.01;
		};
		
		// test if point c is colinear with points a and b, and lies between them
		// taken as true in the degenerate case where the three points are coincident
		let isBetween = function (a, b, c) {
			// true iff q is between p and r (inclusive)
			let within = function (p, q, r) {
				let e = 0.2;
				return ((p <= q) && (q <= r)) || ((r <= q) && (q <= p));
			};
			
			return (collinear(a, b, c) && (a.x != b.x ?
					within(a.x, c.x, b.x) : within(a.y, c.y, b.y)));
		};
		
		let dotProduct = function (a, b) {
			return a.x * b.x + a.y * b.y;
		};
		
		// get point on line defined by a->b that is nearest to point c
		let point2line = function (a, b, c) {
			let e1 = {x: b.x - a.x, y: b.y - a.y};
			let e2 = {x: c.x - a.x, y: c.y - a.y};
			let dp = dotProduct(e1, e2);
			let len2 = e1.x*e1.x + e1.y*e1.y;
			return {x: a.x + dp*e1.x/len2, y: a.y + dp*e1.y/len2};
		};
		
		// test if point c is to the left or right of vector a->b
		// +1 if to the left, -1 if to the right, 0 if collinear
		let side = function (a, b, c) {
			return Math.sign((b.x - a.x)*(c.y - a.y) - (b.y - a.y)*(c.x - a.x))
		};
		
		let beforeStart = function (a, b, p) {
			return (a.x < b.x && p.x < a.x) ||
				(a.x > b.x && p.x < b.x) ||
				(a.y < b.y && p.y < a.y) ||
				(a.y > b.y && p.y < b.y);
		};
		
		let beforeEnd = function (a, b, p) {
			return (a.x < b.x && p.x < b.x) ||
				(a.x > b.x && p.x > b.x) ||
				(a.y < b.y && p.y < b.y) ||
				(a.y > b.y && p.y > b.y);
		};
		
		let afterEnd = function (a, b, p) {
			return (a.x < b.x && p.x > b.x) ||
				(a.x > b.x && p.x < b.x) ||
				(a.y < b.y && p.y > b.y) ||
				(a.y > b.y && p.y < b.y);
		};
		
		let findDestination = function (lat, lon) {
			// find point on road nearest to clicked location
			// searching within a box 40m x 40m
			let dlat = 20/test.dlat;
			let dlon = 20/test.dlon;
		
			let bounds = {
				minlat: lat - dlat,
				maxlat: lat + dlat,
				minlon: lon - dlon,
				maxlon: lon + dlon
			};
		
			let graph = test.map;
			let target = map2metres(lat, lon);
			let distance = 1000;  // nearest road (initialised to > 50m)
			let nearestPath, nearestPoint, location, newPoint;
		
			// When a road has a corner and the location clicked is beyond
			// the convex edge, then the nearest point on the sequence of
			// lines may be outside of the preceding or following segment.
			// we thus scan each path for the nearest path segment.
					
			let searchPath = function (id, path, points) {
				let p1 = test.map.chunks[points[0]];
				let a = map2metres(p1.properties.lat, p1.properties.lon);
				for (let i = 1; i < points.length; ++i) {
					let p2 = graph.chunks[points[i]];
					let b = map2metres(p2.properties.lat, p2.properties.lon);
					// how far is target from segment p1->p2?
					let p = point2line(a, b, target);
					
					// p1 has an index 1 before p2
				
					// compute distance from projected point to target
					let dx = target.x - p.x;
					let dy = target.y - p.y;
					let d = Math.sqrt(dx*dx + dy*dy);

					if (d < distance) {
						if (isBetween(a, b, p)) {
							// between p1 and p2
							console.log("is between " + p1.id + " and " + p2.id + ", d = " + d);
							distance = d;
							nearestPath = path;
							nearestPoint = p1;
							newPoint = new Chunk("point");
							newPoint.properties = metres2map(p.x, p.y);
							location = metres2map(p.x, p.y);
						} else 	if (beforeStart(a, b, p)) {
							// before p1
							dx = p.x - a.x;
							dy = p.y - a.y;
							let D = Math.sqrt(dx*dx + dy*dy);
						
							if (D < distance) {
								console.log("before " + p1.id + ", d = " + d)
								distance = d;
								nearestPath = path;
								nearestPoint = p1;
								newPoint = undefined;
								location = p1.properties;
							}
						} else if (afterEnd(a, b, p)) {
							// after p2
							dx = p.x - b.x;
							dy = p.y - b.y;
							let D = Math.sqrt(dx*dx + dy*dy);
						
							if (D < distance) {
								console.log("after " + p2.id + ", d = " + d)
								distance = d;
								nearestPath = path;
								nearestPoint = p2;
								newPoint = undefined;
								location = p2.properties;
							}
						}
					}
				
					p1 = p2;  // continue to next segment
					a = b;
				}
			};
		
			// assumes quad is a leaf node and not the root!
			let searchQuad = function (quad) {
				let subpaths = quad.properties.subpaths;
			
				if (subpaths !== undefined) {
					if (!Array.isArray(subpaths))
						subpaths = [subpaths];
				
					for (let i = 0; i < subpaths.length; ++i) {
						let subpath = graph.chunks[subpaths[i]];
						let path = graph.chunks[subpath.properties.path]
						searchPath(subpath.id, path, subpath.properties.points);
					}
				}			
			};
		
			let scan = function (bounds, quad) {
				if (quad) {
					quad = graph.chunks[quad];
					let qbox = quad.properties;
					let overlap = clip.overlap(qbox, bounds);
					
					if (overlap >= 0) {
						if (!(qbox.nw || qbox.ne || qbox.sw || qbox.sw)) {
							searchQuad(quad); // leaf quad node
						} else {
							scan(bounds, qbox.nw);
							scan(bounds, qbox.ne);
							scan(bounds, qbox.sw);
							scan(bounds, qbox.se);
						}
					}
				}
			};
		
			scan(bounds, test.root);
			
			if (location) {
				let point = newPoint
				
				// if appropriate add new point to nearest path
				
				if (newPoint) {
					test.destination = newPoint;
					test.map.add(newPoint); // add it to the graph
					
					// find out where it needs to be inserted
					let points = nearestPath.properties.points;
					
					for (let i = 0; i < points.length; ++i) {
						if (nearestPoint === points[i]) {
							points.splice(i+1, 0, newPoint);
							break;
						}
					}
				} else
					test.destination = nearestPoint;
				
				console.log("nearest path is " + nearestPath.type + " " + nearestPath.properties.name + " " + nearestPath.id);
			} else
				test.destination = undefined;
		};
		
		// start and finish are id's for points on map's graph
		// use A* to search for the best route between them
		
		let findRoute = function (start, finish) {
			let visited = {};  // points visited during search
			let queue = [];    // queue of points to explore
			let count = 0;     // number of points explored
			let chunks = test.map.chunks;
			let dest = chunks[finish];
			const maxcount = 1000;
			
			// test for a junction - a point with at least 2 paths
			let isJunction = function (point) {
				let paths = point.properties.paths;
				return (Array.isArray(paths) && paths.length > 1);
			};
			
			// geometric separation of points p and q
			let distance = function (p, q) {
				const dx = test.dlon * (p.properties.lon - q.properties.lon);
				const dy = test.dlat * (p.properties.lat - q.properties.lat);
				
				if (dx === 0 && dy === 0)
					return 0;
					
				return Math.sqrt(dx*dx + dy*dy)
			};
			
			// compute change in bearing here ***
			// based on entry.prevPoint, entry.point, and
			// following junction to determine following point
			// and then using atan2 to compute delta bearing
			
			let computeTurn = function (chunks, entry, followingEntry) {					
				let precedingEntry = entry.prevEntry;
				
				if (precedingEntry && followingEntry)
				{
					let p1 = precedingEntry.point;
					let p2 = entry.point;
					let p3 = followingEntry.point;
					let sense;
				
					// find p1 from p1 and entry1
				
					let points = entry.path.properties.points;
					let i, j, k;
				
					for (i = 0; i < points.length; ++i) {
						let id = points[i];
					
						if (id === p1.id)
							k = i;
						else if (id === p2.id)
							j = i;
					}
				
					if (k < j)
						p1 = chunks[points[j-1]];
					else
						p1 = chunks[points[j+1]];
					
					// find p3 from p2 and entry2
					points = followingEntry.path.properties.points;
				
					for (i = 0; i < points.length; ++i) {
						let id = points[i];
					
						if (id === p2.id)
							j = i;
						else if (id === p3.id)
							k = i;
					}
				
					if (k > j) {
						sense = +1;
						p3 = chunks[points[j+1]];
					} else {
						sense = -1;
						p3 = chunks[points[j-1]];
					}
					
					let a = map2metres(p1.properties.lat, p1.properties.lon);
					let b = map2metres(p2.properties.lat, p2.properties.lon);
					let c = map2metres(p3.properties.lat, p3.properties.lon);

					let b1 = Math.atan2(b.y - a.y, b.x - a.x);
					let b2 = Math.atan2(c.y - b.y, c.x - b.x);
			
					return b2 - b1;
				}
			};
			
			// experimental code to generate turns to console.log
			let generate_turns = function (entry, chunks) {
				//console.log('found finish at ' + entry.dstart + " metres");
			
				let name = function (entry) {
					let path = entry.path;
					if (path.properties.name)
						return path.properties.name;
					
					return path.type;
				};
				
				let steer = function (delta) {
					let angle = delta * 180 / Math.PI;
						
					if (angle < -180)
						angle += 360;
					else if (angle > 180)
						angle -= 360;
						
					return angle;
				};
				
				let findPointIndex = function(point, path) {
					let points = path.properties.points;
					for (let i = 0; i < points.length; ++i) {
						if(points[i] === point.id)
							return i;
					}
				};
			
				// highway is the same if has same name or same ref
				let same_highway = function (path1, path2) {
					if (path1.properties.name === path2.properties.name)
						return true;
						
					if (path1.properties.ref !== undefined &&
						path2.properties.ref !== undefined &&
						path1.properties.ref === path2.properties.ref)
						return true;
						
					return false;
				};
					
				let index = findPointIndex(entry.point, entry.path);
				let turn = {
					name: name(entry),
						path: entry.path,
						point: entry.point,
						index: index,
						sense: entry.index > index ? +1 : -1,
						dturn: 0,
						delta: 0,
						stop: true
				};
				let turns = [turn];
				let distance = entry.dstart;
				
				while (entry.prevEntry) {
					let point = entry.prevEntry.point;
					let prevPath = entry.prevEntry.path;

					index = findPointIndex(point, entry.path);
					sense = entry.index > index ? +1 : -1;
					
					turn = {
						name: name(entry),
						path: entry.path,
						point: point,
						index: index,
						sense: entry.index > index ? +1 : -1,
						dturn: entry.dstart - entry.prevEntry.dstart,
						delta: computeTurn(chunks, entry.prevEntry, entry)	
					};
					
					// classify turn
					
					// find strongest rank for paths intersecting this point
					// strongest highway rank is zero, weaker ranks are positive
					
					let paths = point.properties.paths;
					let rank = test.highways["steps_highway"]; // weakest rank
					
					for (let i = 0; i < paths.length; ++i) {
						let path = chunks[paths[i]];
						if (!same_highway(path, prevPath)) {
							let r = test.highways[path.type];
							if (r < rank)
								rank = r;
						}
					}
					
					// need to stop unless current road has priority over other roads
					turn.stop = (test.highways[prevPath.type] < rank ? false : true);
					
					// do we need to signal before turning?
					let ta = steer(turn.delta);
					turn.signal = (ta < -30 ? -1 : (ta > 30 ? +1 : undefined));
					
					turns.unshift(turn);
					entry = entry.prevEntry
				}
			
				turn = turns[0];
				turn.distance = distance; // save distance to destination
			
				console.log("Start at " + turn.point.id +
						" on "  + turn.name + 
						" " + turn.path.id +
						", index " + turn.index +
						", sense " + turn.sense +
						", turn in " + num(turn.dturn) + " metres" +
						", destination " + num(distance) + " metres");
					
				let prevPathId = turn.path.id;
				let dt = 0;
			
				for (let i = 1; i < turns.length - 1; ++i) {
					turn = turns[i];
					dt += turn.dturn;
					console.log("At " + turn.point.id +
						(prevPathId === turn.path.id ?
							" continue on " : " turn onto ") + turn.name +
							" " + turn.path.id +
							", index " + turn.index +
							", sense " + turn.sense +
							", turn in " + num(turn.dturn) + " metres" +
							", steer " + num(steer(turn.delta)) + "°" +
							(turn.stop ? ", stop " : "" ) +
							(turn.signal !== undefined ? ", signal " + 
								(turn.signal < 0 ? "left" : "right") : ""));
						
					prevPathId = turn.path.id;
				}
			
				turn = turns[turns.length - 1];
				console.log("Finish at " + turn.point.id +
						" on "  + turn.name + 
						" " + turn.path.id +
						", index " + turn.index +
						", sense " + turn.sense);
					
				console.log("sum of dturn over turns is " + num(dt));
				return  turns;
			};
		
			// create entry and insert in order of distance of getting from
			// start to point + estimated distance from point to destination
			//    prev is previous entry
			//    point is current point
			//    path is current path
			//    dstart is distance from start
			let insert = function (prevEntry, point, path, index, dstart) {
				// avoid inserting same point more than once
				if (visited[point.id])
					return;
					
				// path and prev arguments are null for first entry
				// pick first path for the given point (why?)
				if (!path) {
					let id = point.properties.paths;
					
					if (Array.isArray(id))
						id = id[0];
						
					path = chunks[id];
					let points = path.properties.points;
					index = undefined;
					
					for (let i = 0; i < points.length; ++i) {
						if (points[i] === point.id)
							index = i;
					}
				}
					
				// estimate distance to finish from geometric separation
				// 1.5 is just a guess around idea that route won't be straight
				let dfinish = 1.5 * distance(dest, point);
				let d = dstart + dfinish;
				
				let entry = {
					point: point,
					path: path,
					index: index,
					prevEntry: prevEntry,
					dstart: dstart,
					dfinish: dfinish
				};
				
				console.log('queuing junction ' + point.id + ' at ' + dstart + ' metres');
				
				// search queue for where to insert
				for (let i = 0; i < queue.length; ++i) {
					let e = queue[i];
					if (d <= e.dstart + e.dfinish) {
						// insert at index i
						queue.splice(i, 0, entry);
						return;
					}
				}
				
				// otherwise append to end of queue
				queue.push(entry);
			};
			
			insert(null, chunks[start], null, null, 0);  // push starting point
			
			// search until we've found best route or have run out of time
			while (queue.length > 0 && ++count < maxcount) {
			
				let entry = queue.shift();  // pop first item in queue
				
				// have we got to the finish?
				
				if (entry.point.id === finish) {
					console.log('found finish at ' + entry.dstart + " metres")
					return generate_turns(entry, chunks); // experimental
				}
				
				// not yet at destination, so keep looking
				
				let point = entry.point;
				let paths = point.properties.paths;  // id or array of ids
				let from = null;  // id of path we just came from
				visited[point.id] = point;
				
				// when there is just one path
				if (!Array.isArray(paths))
					paths = [paths];
				
				for (let i = 0; i < paths.length; ++i) {
					let id = paths[i];
					
					if (id === from)
						continue;
						
					let path = chunks[id];
					let name = path.properties.name;
					if (name === undefined)
						name = path.type;
						
					console.log('searching road: ' + path.id + ' ' + name + ' from point ' + point.id);
						
					// find path index for this point
					
					let index;
					let points = path.properties.points
					
					for (index = 0; index < points.length; ++index) {
						if (points[index] === point.id)
							break;
					}
					
					if (index >= points.length)
						index = undefined;  // should never happen
						
					// find next junction in both directions along path
					// computing cost of traversing the path in doing so
					
					// first search path via decreasing index
					
					let prev = point;
					let j = index;
					let d = 0;
					
					while (j > 0) {
						id = points[--j]
						let p = chunks[id];
						let dd = distance(p, prev);
						d += dd;
						console.log(p.id + ' to ' + prev.id + ', dd = ' + num(dd) +  ' sum = ' + num(d));
						
						if (id === finish || isJunction(p)) {
							insert(entry, p, path, j, d + entry.dstart);
							break;
						}
						
						prev = p;
					}
					
					// second search path via increasing index
					
					prev = point;
					j = index;
					d = 0;
					
					while (++j < points.length) {
						id = points[j]
						let p = chunks[id];
						d += distance(p, prev);

						if (id === finish || isJunction(p)) {
							insert(entry, p, path, j, d + entry.dstart);
							break;
						}
						
						prev = p;
					}
				}
			}
			
			// return deliberately undefined on timeout
			console.log('unable to find route to destination');
		};
			
		// p is the car's position projected to the centre of the road
		// D is the distance the gaze point is ahead of the car
		let gazePosition = function (car, p, D) {		
			let path = car.path;
			let index = car.index;
			let sense = car.sense;
			let points = path.properties.points;
			let smax = 4*D;
			car.gazePoint = undefined;
			
			// first compute distance from car's location to end of this segment
			let p1 = test.map.chunks[points[index]];
			let p2 = test.map.chunks[points[index + sense]];
			
			let a = map2metres(p1.properties.lat, p1.properties.lon);
			let b = map2metres(p2.properties.lat, p2.properties.lon);
			
			// measure distance from p to p2
			let dx = b.x - p.x, dy = b.y - p.y;
			let d = Math.sqrt(dx*dx + dy*dy);
			
			//console.log('distance to next point ' + d + ', delta = ' + (d-D));
			
			let gaze = function (p) {
				const w = laneWidth/2.0;
				let f = D/d;
				let theta = Math.atan2(b.y - p.y, b.x - p.x) - Math.PI/2;
				//console.log('gaze heading: ' + num(angle(theta + Math.PI/2)));
				
				let gaze = {x: p.x + f*(b.x-p.x) + w * Math.cos(theta),
						 y: p.y + f*(b.y-p.y) + w * Math.sin(theta),
						 heading: theta + Math.PI/2};
						 
				car.gazePoint = metres2map(gaze.x, gaze.y);
				//console.log('gaze point: ' + JSON.stringify(car.gazePoint));
				return gaze;
			};

			// gaze point is within this segment if distance to
			// end of this segment is greater than gaze distance
			
			//console.log('checking distance to next point: ' + (d-D));
			
			if (d >= D)
				return gaze(p);
				
			//console.log('looking after ' + p2.id + ', index+sense ' + (index+sense));

			D -= d;

			for (;;) {
				index = index + sense;
				
				// is p2 a turning point in car's route?
				// i.e. the next turn or one very soon after
				
				let turn;
				
				for (let i = car.nextTurnIndex, s= 0; i < car.route.length; ++i) {
					if (car.route[i].point === p2) {
						turn = car.route[i];
						break;
					}
					
					// limit how far we search
					s += car.route[i].dturn; // distance to next turn
					
					if (s > smax)
						break;
				}
				
				if (turn) {
					if (turn.stop)
						D += laneWidth/2.0;

					path = turn.path;
					index = turn.index;
					sense = turn.sense;
					points = path.properties.points;
				} else {
					// Do we need to look for next path in road?
					// this needs to take planned turns into account
					// and update the index sense to match next path
					if (index+sense < 0) {
						if ((path = nextPath(path, p2))) {
							points = path.properties.points;
							index = points.length - 1;
						}
					} else if (index+sense >= points.length) {
						if ((path = nextPath(path, p2))) {
							points = path.properties.points;
							index = 0;
						}
					} else {
						//console.log("continuing on path: " + path.id + ", index "+ index);
					}					
				}
				
				//if(!path)
				//	break;
				
				p1 = p2;
				p2 = test.map.chunks[points[index + sense]];
				a = map2metres(p1.properties.lat, p1.properties.lon);
				b = map2metres(p2.properties.lat, p2.properties.lon);
			
				// measure segment length
				dx = b.x - a.x, dy = b.y - a.y;
				d = Math.sqrt(dx*dx + dy*dy);
				
				// is it in this segment?
				
				if (d >= D)
					return gaze(a);

				// so continue to next segment
				
				D -= d;
			}
			
			// return undefined on end of road
			console.log('unable to find gaze point');
		};
		
		let steer = function (car) {			
			// traverse road until we find the path segment nearest to lat,lon
			// note that the sense could be positive (+1) or negative (-1)
			// assumes that paths forming a road have the same sense
			// returns undefined or point {x, y} in metres
			
			let path = car.path;
			let index = car.index;
			let sense = car.sense;
			let points = path.properties.points;
			
			// return difference in angle in range -PI to +PI
			// given two angles specified in radians
			let diff = function (theta1, theta2) {
				const TwoPI = 2.0 * Math.PI;
				let delta = (theta1 - theta2) % TwoPI;
				
				if (delta < - Math.PI)
					delta += TwoPI;
				else if (delta >= Math.PI)
					delta -= TwoPI;
					
				return delta;
			};

			do {
				let p1 = test.map.chunks[points[index]];
				let p2 = test.map.chunks[points[index + sense]];
				
				// now find projection of (lat, lon) onto vector p1->p2
				
				let a = map2metres(p1.properties.lat, p1.properties.lon);
				let b = map2metres(p2.properties.lat, p2.properties.lon);
				let c = map2metres(car.lat, car.lon);
				let p = point2line(a, b, c);
				
				// is projected point before the end of this segment?
				
				if (beforeEnd(a, b, p)) {
					// update car's current path, index					
					car.path = path;
					car.index = index;
					car.sense = sense;
					
					// set the gaze point to 10m ahead of car
					// also computes road direction at gaze point
					// taking any turn or path junctions as needed
					
					let gaze = gazePosition(car, p, 6);
					
					// direction of road at point p
					let roadHeading = Math.atan2(b.y - a.y, b.x - a.x);
					let errorHeading = (gaze ? gaze.heading : roadHeading) - car.heading;

					// and now compute points on lane centre corresponding to p and b
					
					const w = laneWidth/2.0;
					let theta = roadHeading - Math.PI/2; // perpendicular to road's heading
					let lane1 = {x: p.x + w * Math.cos(theta), y: p.y + w * Math.sin(theta)};
					let lane2 = {x: b.x + w * Math.cos(theta), y: b.y + w * Math.sin(theta)};
					
					// compute car's deviation from lane centre
					let dx = lane1.x - c.x, dy = lane1.y - c.y;
					let sign = -side(lane1, lane2, c);
					let errorLane = Math.sqrt(dx*dx + dy*dy);
					
					// and set steering angle as blend of errors for position and direction
					// considering both the road direction right now and at the gaze point
					
					car.phi = 0.3 * sign * errorLane +  0.5 * diff(roadHeading, car.heading);
					
					if (gaze)
						car.phi +=  0.5 * diff(gaze.heading, car.heading);
											
					if (Math.abs(car.phi) < 0.05)
						car.radius = sign * 1000;
					else
						car.radius = 2.5/Math.sin(car.phi);
/*
					console.log("deviation " + num(sign*errorLane) + ", phi " + num(car.phi) +
						", radius " + num(car.radius) + ", road " + num(angle(roadHeading)) +
						", gaze " + num(angle(gaze.heading)) +
						", car " + num(angle(car.heading)) +
						", travelled " + num(car.travelled));
*/					
					return true;
				}
					
				// no, so try next segment
			
				index = index + sense;
				
				// this could be for a junction between paths, or for a turn
				
				// is p2 a turning point in car's route?
				let turn = (car.route && car.nextTurnIndex < car.route.length) ? car.route[car.nextTurnIndex] : false;
				
				if (turn && p2 === turn.point) {
					path = turn.path;
					index = turn.index;
					sense = turn.sense;
					points = path.properties.points;
					console.log('turning onto ' + turn.name + ', next turn in ' + turn.dturn);
					car.toStop = car.nextStop(car.nextTurnIndex); //car.travelled + turn.dturn;
					car.nextTurnIndex++;
					
					if (car.nextTurnIndex === car.route.length)
						path = undefined;  
				} else {
					// do we need to look for next path in road?
				
					if (index + sense < 0) {
						//console.log("look for next path, point " + p2.id);
						if ((path = nextPath(path, p2))) {
							console.log("path = " + path.id);
							points = path.properties.points;
							index = points.length - 1;
						}
					} else if (index + sense >= points.length) {
						//console.log("look for next path, point " + p2.id);
						if ((path = nextPath(path, p2))) {
							console.log("path = " + path.id);
							points = path.properties.points;
							index = 0;
						}
					}
				}
			} while (path);
			car.arrived = true;
			console.log("end of route");
			let t1 = car.route[0], t2 = car.route[car.route.length-1];
			test.paused = true;
			
			return false;
		};
				
		// initialise car
		test.car = {
			image: test.images["red-car.png"],
			speed: 13.4122,  // 30 MPH in m/s
			radius: 10000,  // turning circle in metres
			nextStop: function (i) {
				let turns = this.route;
				let d = 0;
				
				for (let j = i; j < turns.length; ++j) {
					let turn = turns[j];
					
					if (turn.stop && j > i) {
						console.log('next stop at ' + turn.point.id);
						
						// adjust stop from lane centre
						// allowing for car's length
						if (++j !== turns.length)
							d -= (laneWidth + 2);
							
						return this.travelled + d;
					}

					d += turn.dturn;
				}
				return this.travelled + d;
			},
			setRoute: function (p1, p2) {
				this.route = findRoute(p1, p2);
				this.path = this.route[0].path;
				let points = this.path.properties.points;
				let junction = this.route[0].point;
				this.nextTurnIndex = 1;
				this.index = this.route[0].index;
				this.sense = this.route[0].sense;
				this.travelled = 0;
				this.toStop = this.nextStop(0); //this.route[0].dturn;
				this.arrived = false;
								
				p1 = test.map.chunks[points[this.index]].properties;
				p2 = test.map.chunks[points[this.index + this.sense]].properties;
				this.heading = Math.atan2(test.dlon * (p2.lon - p1.lon), test.dlat * (p2.lat - p1.lat));
				let a = this.heading * 180/Math.PI;
				let w = 2; // 2 m
				let h = this.heading - Math.PI/2;
				this.lat = p1.lat + w * Math.cos(h)/test.dlat;
				this.lon = p1.lon + w * Math.sin(h)/test.dlon;
				steer(this);				
			},
			track: function () {
				steer(this);
			}
		};
		
		// measure distance along a set of paths
		
		let measurePath = function (id, i, j) {
			let d = 0;
			let points = test.map.chunks[id].properties.points;
			
			let distance = function (p, q) {
				const dx = test.dlon * (p.properties.lon - q.properties.lon);
				const dy = test.dlat * (p.properties.lat - q.properties.lat);
				
				if (dx === 0 && dy === 0)
					return 0;
					
				return Math.sqrt(dx*dx + dy*dy)
			};
			
			let k = j;

			if (j > i) {
				while (j  > i) {
					let p1 = test.map.chunks[points[j]];
					let p2 = test.map.chunks[points[j-1]];
					d += distance(p1, p2);
					--j;
				}
			} else {
				while (j  < i) {
					let p1 = test.map.chunks[points[j]];
					let p2 = test.map.chunks[points[j+1]];
					d += distance(p1, p2);
					++j;
				}
			}
			
			console.log('distance along ' + id + ' (' + i + ':' + k + ') = ' + num(d));
		};
		
		measurePath('r760', 6, 0);
		measurePath('r347', 2, 0);
		
		let startButton = document.getElementById("start");
		let zoomInButton = document.getElementById("in");
		let zoomOutButton = document.getElementById("out");
		let centerButton = document.getElementById("centre");
		let clip = test.clip;

		test.pause = undefined;
		test.center = false;

		let scale = 50000;
		let carscale = 20 * scale;
		let lat = 51.23004;
		let lon = -2.324205;
		
		//findRoute('p5809', 'p2187');  //testing
		//findRoute('p5809', 'p3527');  //testing
		//findRoute('p1352', 'p7673');  //testing
		
		//test.car.setRoute('p1352', 'p6587');
		test.car.setRoute('p1355', 'p6587');
		
		let render = function () {
			setTimeout(function () {
				test.render(clip, lat, lon, scale);
				log.flush();
			}, 0);
		};
		
		// promise to zoom in and centre on car
		let centre = function () {
			return new Promise ((resolve, reject) => {
				let t0 = performance.now();
				let step = function (t) {
					let f = (t-t0)/1500;
				
					if (f > 1.0)
						f = 1.0;
					
					let s = scale + (carscale - scale) * f;
					let lt = lat + (test.car.lat - lat) * f;
					let ln = lon + (test.car.lon - lon) * f;
					test.render(clip, lt, ln, s);
				
					if (f < 1.0)
						window.requestAnimationFrame(step);
					else {
						lat = lt;
						lon = ln;
						scale = s;
						resolve(f);
					}
				};
			
				window.requestAnimationFrame(step);			
			});
		};
		
		zoomInButton.onclick = function () {
			scale *= 2;
			render();
		};
		
		zoomOutButton.onclick = function () {
			scale /= 2;
			render();
		};
		
		let play = function () {
			test.paused = false;
			test.center = true;
			test.car.now = performance.now();
		
			// then start car moving
			let step = function (t) {
				test.update(test.car, t);
			
				// recenter on car
				if (test.center) {
					lat = test.car.lat;
					lon = test.car.lon;
				}
			
				test.render(clip, lat, lon, scale);
			
				if (!test.paused)
					window.requestAnimationFrame(step);
			};
		
			window.requestAnimationFrame(step);
		};
		
		startButton.onclick = function () {
			if (test.paused === undefined) {
				centre().then(function () {
					play();
				})
			} else if (test.paused){
				play();
			} else {
				test.paused = true;
			}
		}
		
		centerButton.onclick = function () {
			test.center = true;
			centre().then();
		};
		
		canvas.onclick = function () {
			if (!dragged) {
				let sx = scale * test.dlon / test.dlat;
				let sy = scale;
			
				let dlon = canvas.width/sx;
				let dlat = canvas.height/sy;
			
				let minlon = lon - dlon/2.0;
				let maxlat = lat + dlat/2.0;
		
				let x = event.pageX - canvas.offsetLeft;
				let y = event.pageY - canvas.offsetTop;
			
				findDestination(maxlat - y/sy, minlon + x/sx);
				
				render();
				console.log("lat: " + (maxlat - y/sy) + ", lon: " + (minlon + x/sx));
			}
		};
		
		let dragging = false;
		let dragged = false;
		let dragOrigin;
		let dragStartLocation;
		let delta;  // in pixels since mouse down
		
		let getCanvasCoordinates = function (event) {
			let x = event.clientX - canvas.getBoundingClientRect().left,
				y = event.clientY - canvas.getBoundingClientRect().top;

			return {x: x, y: y};
		};

		let dragStart = function (event) {
			test.center = false;
			dragging = true;
			dragged = false
			dragOrigin = {lat: lat, lon: lon};
			dragStartLocation = getCanvasCoordinates(event);
		};

		let drag = function (event) {
			if (dragging === true) {
				dragged = true;
				delta = getCanvasCoordinates(event);
				delta.x -= dragStartLocation.x;
				delta.y -= dragStartLocation.y;
				lat = dragOrigin.lat + delta.y/scale;
				lon = dragOrigin.lon - delta.x/(scale * test.dlon / test.dlat);
				render();
			}
		}

		let dragStop = function (event) {
			if (dragging) {
				dragging = false;
				delta = getCanvasCoordinates(event);
				delta.x -= dragStartLocation.x;
				delta.y -= dragStartLocation.y;
				lat = dragOrigin.lat + delta.y/scale;
				lon = dragOrigin.lon - delta.x/(scale * test.dlon / test.dlat);
				render();
			}
		};
		
		canvas.addEventListener('mousedown', dragStart, false);
		canvas.addEventListener('mousemove', drag, false);
		canvas.addEventListener('mouseup', dragStop, false);
		canvas.addEventListener('mouseout', dragStop, false);
		
		render();
	},
	update: function (car, now) {
		// update car's position and direction
		// assuming circular path with given radius
		
		// first compute the origin of the 
		
		let delta = now - car.now; // in milliseconds
		car.now = now;
		let speed = car.speed/1000;  // i.e. metres per millisecond
		
		if (Math.abs(car.radius) >= 1000.0) {
			// for large radii treat as straight line
			let dist = delta * speed;
			car.lat += dist * Math.cos(car.heading) / test.dlat;
			car.lon += dist * Math.sin(car.heading) / test.dlon;
			car.travelled += dist;
		} else {
			// compute path along circular track described by steering angle
			let theta = car.heading + (car.radius <= 0 ? Math.PI/2 : -Math.PI/2);
			let r = Math.abs(car.radius);
			let lat = car.lat - Math.cos(theta) * r/test.dlat;
			let lon = car.lon - Math.sin(theta) * r/test.dlon;
			let dtheta = delta*speed/car.radius;
			car.travelled += car.radius * dtheta;
			car.heading += dtheta;
			theta += dtheta;
			car.lat = lat + Math.cos(theta) * r/test.dlat;
			car.lon = lon + Math.sin(theta) * r/test.dlon;
		}
				
		car.track();
	},
	index: function (clip) {
		// construct spatial index as quad tree where
		// the root holds all paths whilst its children
		// hold the paths that are clipped to their bounds
		// we thus need quad chunks and quadpath chunks
		let graph = test.map;
		let bounds = graph.recall("bounds"); 
		
		// note location of the map's centre
		test.lat = (bounds.properties.minlat + bounds.properties.maxlat)/2.0;
		test.lon = (bounds.properties.minlon + bounds.properties.maxlon)/2.0;
		
		let s = scalefactor(bounds); // based upon map's centre 
		test.dlat = s.dlat;  // how many metres is one degree latitude 
		test.dlon = s.dlon;  // how many metres is one degree longitude
		
		// initialise root quad
		let root = new Chunk("quad");
		graph.add(root);
		root.properties.minlat = bounds.properties.minlat;
		root.properties.maxlat = bounds.properties.maxlat;
		root.properties.minlon = bounds.properties.minlon;
		root.properties.maxlon = bounds.properties.maxlon;
		let paths = [];

		// gather list of all chunks that are a kind of highway
		test.map.forall("highway", function (chunk) {
			paths.push(chunk.id);
		});
		
		test.highways = {
			trunk_highway: 0,
			primary_highway: 1,
			primary_link_highway: 1,
			secondary_highway: 2,
			tertiary_highway: 3,
			unclassified_highway: 4,
			residential_highway: 5,
			living_street_highway: 6,
			service_highway: 7,
			cycleway_highway: 8,
			pedestrian_highway: 9,
			footway_highway: 9,
			steps_highway: 9
		};
		
		// unclassified highways and above have 2 lanes by default
		// but only 1 lane by default if they are oneway:yes
		
		let roadWidth = function (path) {
			let rank = test.highways[path.type];
			
			if (rank > 7)
				return 2.0;
				
			if (rank <= 4 && path.properties.lanes === undefined)
				path.properties.lanes = 2;
			
			let lanes = 2;
			
			if (path.properties.oneway === "yes")
				lanes = 1;
			
			//if (path.properties.lanes)
			//	lanes = path.properties.lanes;
				
			let width = 3.65 * lanes;
			
			if (rank < 2)
				width *= 1.5;
				
			return width;
		};
		
		let roadColour = function (path) {
			let rank = test.highways[path.type];
			
			if (rank < 8)
				return "#606060";
				
			if (rank === 8) // cycle way
				return "#006000";
				
			return "#FFFFFF";
		};
		
		for (let i = 0; i < paths.length; ++i) {
			let path = test.map.chunks[paths[i]];
			path.properties.width = roadWidth(path);
			path.properties.colour = roadColour(path);
		}
		
		quicksort(paths, 0, paths.length - 1, function (p1, p2) {
			p1 = test.map.chunks[p1];
			p2 = test.map.chunks[p2];
			return test.highways[p1.type] <= test.highways[p2.type];
		});
		
		root.addValue("paths", paths);
		
		// OSM models roads as straight lines which creates
		// jerky motions for the car moving through a bend -
		// fit quadratic splines to smooth bends in the road
		
		// p1 and p2 are chunks denoting points
		let curvepoint = function (p1, p2) {
			// compute distance in metres from p1 to p2
			let dlat = test.dlat * (p2.properties.lat - p1.properties.lat);
			let dlon = test.dlon  * (p2.properties.lon - p1.properties.lon);
			let D = Math.sqrt(dlat*dlat + dlon*dlon);
			let d = 6.0;  // distance from bend
			
			if (d <= 0.5 * D) {
				let point = new Chunk("point");
				point.properties.lat = p1.properties.lat + (d * dlat) / (D * test.dlat);
				point.properties.lon = p1.properties.lon + (d * dlon) / (D * test.dlon);
				test.map.add(point);
				return point;
			}
		};
		
		for (let i = 0; i < paths.length; ++i) {
			let path = test.map.chunks[paths[i]];
			
			let points = path.properties.points;
			
			if (!Array.isArray(points))
				continue;
				
			// find which points mark bends in the road
			// 
			for (let j = 1; j < points.length - 1; ++j) {
				// check for points which are bends in the road:
				// points with only one path, and not first or last
				let point = test.map.chunks[points[j]];
				
				if (Array.isArray(point.properties.paths))
					continue;
				
				// treat the join between adjacent straight lines
				// as the control point for a quadratic bezier curve
				// and place end points at a fixed distance away on
				// both of the adjacent straight lines
				let curve1 = test.map.chunks[points[j-1]];
				let curve2 = test.map.chunks[points[j+1]];
				point.properties.curve1 = curvepoint(point, curve1);
				point.properties.curve2 = curvepoint(point, curve2);
			}
		}
		
		// we're now ready to recursively index the paths
		// limited to 'depth' number of levels
		let subdivide = function (quad, depth) {
			if (depth > 0) {
				let index = function (name, parentquad, box) {
					let paths = parentquad.properties.paths;
					let subpaths = parentquad.properties.subpaths;
					
					if (subpaths !== undefined) {
						// must be a non-root quad
						if (!Array.isArray(subpaths))
							subpaths = [subpaths];
							
						let sp = [];
							
						for (let i = 0; i < subpaths.length; ++i) {
							let subpath = graph.chunks[subpaths[i]];
							let path = graph.chunks[subpath.properties.path];
							sp = sp.concat(clip.line(path, subpath.properties.points, box));
						}
						
						subpaths = sp;
					} else if (paths != undefined) {
						// must be the root quad
						if (!Array.isArray(paths))
							paths = [paths];
							
						let sp = [];
						
						for (let i = 0; i < paths.length; ++i) {
							let path = graph.chunks[paths[i]];
							sp = sp.concat(clip.line(path, path.properties.points, box));
						}
						
						subpaths = sp;
					} else
						subpaths = [];
					
					if (subpaths.length) {
						let childquad = new Chunk("quad");
						graph.add(childquad);
						childquad.addValue("subpaths", subpaths)
						childquad.properties.minlat = box.minlat;
						childquad.properties.maxlat = box.maxlat;
						childquad.properties.minlon = box.minlon;
						childquad.properties.maxlon = box.maxlon;
						parentquad.properties[name] = childquad.id;
						subdivide(childquad, depth-1);
					}
				};

				// subdivide rectangle into 4 equal rectangles
				let box = {};
			
				box.minlat = quad.properties.minlat;
				box.maxlat = quad.properties.minlat + (quad.properties.maxlat-quad.properties.minlat)/2.0;
				box.minlon = quad.properties.minlon + (quad.properties.maxlon-quad.properties.minlon)/2.0;
				box.maxlon = quad.properties.maxlon;
				index ("nw", quad, box);
			
				box.minlat = quad.properties.minlat + (quad.properties.maxlat-quad.properties.minlat)/2.0;
				box.maxlat = quad.properties.maxlat;
				box.minlon = quad.properties.minlon + (quad.properties.maxlon-quad.properties.minlon)/2.0;
				box.maxlon = quad.properties.maxlon;
				index ("ne", quad, box);
			
				box.minlat = quad.properties.minlat;
				box.maxlat = quad.properties.minlat + (quad.properties.maxlat-quad.properties.minlat)/2.0;
				box.minlon = quad.properties.minlon;
				box.maxlon = quad.properties.minlon + (quad.properties.maxlon-quad.properties.minlon)/2.0;
				index ("sw", quad, box);
			
				box.minlat = quad.properties.minlat + (quad.properties.maxlat-quad.properties.minlat)/2.0;
				box.maxlat = quad.properties.maxlat;
				box.minlon = quad.properties.minlon;
				box.maxlon = quad.properties.minlon + (quad.properties.maxlon-quad.properties.minlon)/2.0;
				index ("se", quad, box);
			}
		};
		
		log.write("root has " + root.properties.paths.length + " paths");
		subdivide(root, 6);
		
		log.write("root is " + root);
		let first = root.properties.paths[0];
		log.write(test.map.chunks[first]);
		log.write(test.map.chunks["_:1299"]);
		log.write(test.map.chunks["_:1083"]);
		log.write(test.map.chunks["_:106"]);
		log.write(test.map.chunks["p564"]);
		return root.id;
	},
	// clip is used for overlap of two rectangles
	// lat and lon specify the centre of the viewport
	// scale is number of pixels for one degree latitude
	render: function (clip, lat, lon, scale) {	
		const canvas = document.getElementById('road');
		const ctx = canvas.getContext('2d');
		let graph = test.map;
		
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		// ensure 1km appears same length north and east
		// using earlier calculation with map centre
		let sx = scale * test.dlon / test.dlat;
		let sy = scale;

		// project canvas to map coordinates
		let dlon = canvas.width/sx;
		let dlat = canvas.height/sy;
		
		/*
		log.write("scale = " + scale);
		log.write("longitudeAdjustment = " + test.longitudeAdjustment);
		log.write("delta lat = " + dlat + ", delta lon = " + dlon);
		log.write("yscale * dlat = " + (sy*dlat) + ", xscale * dlon = " + (sx*dlon));
		*/
			
		let box = {
			minlat: lat - dlat/2.0,
			minlon: lon - dlon/2.0,
			maxlat: lat + dlat/2.0,
			maxlon: lon + dlon/2.0
		};
				
		//log.write("\nview " + JSON.stringify(box));
		
		let cw = canvas.width;
		let ch = canvas.height;
		
		// transform point from map to canvas
		let m2s = function (p) {
			return {
				x: sx * (p.lon - box.minlon),
				y: sy * (box.maxlat - p.lat)
			};
		};
		
		// transform point from canvas to map
		let s2m = function (x, y) {
			return {
				lon: box.minlon + x/sx,
				lat: box.maxlat - y/sy
			};
		};
		
		/*
		// test scaling
		let p = {lat: box.minlat, lon: box.minlon};
		let q = m2s(p);
		log.write("bottom left: " + JSON.stringify(q));
		p = {lat: box.maxlat, lon: box.maxlon};
		q = m2s(p);
		log.write("top right: " + JSON.stringify(q));
		*/
		let inbox = function (p) {
			return (box.minlat <= p.lat && box.minlon <= p.lon &&
					p.lat < box.maxlat && p.lon < box.maxlon);
		};
		
		let renderCurvePoint = function (r, color) {
			let pos = m2s(r.properties);
			ctx.beginPath();
			ctx.fillStyle = color;
			ctx.arc(pos.x, pos.y, 3, 0, 2 * Math.PI);
			ctx.fill();
		};
				
		let renderPath = function (spid, path, points) {
			let p = graph.chunks[points[0]].properties;
			ctx.strokeStyle = path.properties.colour;
			//ctx.fillStyle = 'red';
			ctx.lineCap = "round";
			ctx.setLineDash([]);
			ctx.lineWidth = path.properties.width * scale / 100000;
			let q = m2s(p);
			let r;
			
			// render the road and path surfaces
			
			ctx.beginPath();
			ctx.moveTo(q.x, q.y);

			for (let i = 1; i < points.length; ++i) {
				p = graph.chunks[points[i]].properties;
				q = m2s(p);
				
				if (scale > 100000 &&  p.curve1 && p.curve2) {
					// render with curve to smooth bends
					r = m2s(p.curve1.properties);
					ctx.lineTo(r.x, r.y); // start of curve
					r = m2s(p.curve2.properties);
					// q is taken as the control point
					ctx.quadraticCurveTo(q.x, q.y, r.x, r.y);
				} else {
					// render with straight line
					ctx.lineTo(q.x, q.y);
				}
				//ctx.stroke();
			}

			ctx.stroke();
/*
			//if (scale > 100000) {
				for (let i = 1; i < points.length; ++i) {
					p = graph.chunks[points[i]];
					renderCurvePoint(p, 'green');
					
					if (p.properties.curve1 && p.properties.curve2) {
						renderCurvePoint(p.properties.curve1, 'red');
						renderCurvePoint(p.properties.curve2, 'blue');
					}
				}
			//}
*/			

			// render dashed white line for roads with multiple lanes
			
			if (scale > 100000 && path.properties.lanes > 1) {
				ctx.beginPath();
				ctx.strokeStyle = 'white';
				ctx.lineWidth = 2;
				ctx.setLineDash([15,8]);
				ctx.lineDashOffset = 0;
				p = graph.chunks[points[0]].properties;
				q = m2s(p);
				ctx.beginPath();
				ctx.moveTo(q.x, q.y);			
				for (let i = 1; i < points.length; ++i) {
					p = graph.chunks[points[i]].properties;
					q = m2s(p)
					if (p.curve1 && p.curve2) {
						// render with curve to smooth bends
						ctx.strokeStyle = 'blue';
						r = m2s(p.curve1.properties);
						ctx.lineTo(r.x, r.y);
						r = m2s(p.curve2.properties);
						ctx.quadraticCurveTo(q.x, q.y, r.x, r.y);
					
					} else {
						// render with straight line
						ctx.strokeStyle = 'white';
						ctx.lineTo(q.x, q.y);
					}
				}		

				ctx.stroke();
			}
			/*
			// render intersection codes
			for (let i = 1; i < points.length; ++i) {
				p = graph.chunks[points[i]].properties;
				if (p.paths && Array.isArray(p.paths)) {
					q = m2s(p)
					ctx.fillStyle = '#AAF';
					ctx.font = '8px sans-serif';
					ctx.fillText("" + p.paths.length, q.x - 2, q.y + 2);
				}
			}
			*/
		};
		
		let quadBorders = function (quad) {
			let q = quad.properties;
			let nw = m2s({lat: q.minlat, lon: q.minlon});
			let se = m2s({lat: q.maxlat, lon: q.maxlon});
			ctx.lineWidth = 1;
			ctx.setLineDash([]);
			ctx.strokeStyle = 'LightGray';
			ctx.beginPath();
			ctx.moveTo(nw.x, nw.y);
			ctx.lineTo(nw.x, se.y);
			ctx.lineTo(se.x, se.y);
			ctx.lineTo(se.x, nw.y);
			ctx.lineTo(nw.x, nw.y);
			ctx.stroke();
			ctx.fillStyle = 'Gray';
			ctx.font = '8px sans-serif';
			ctx.fillText(quad.id, nw.x, se.y + 10);
		};
		
		let renderQuad = function (quad) {
			let subpaths = quad.properties.subpaths;
			
			if (subpaths !== undefined) {
				// non-root quads with subpaths
				if (!Array.isArray(subpaths))
					subpaths = [subpaths];
				
				//if (subpaths.length > 0)
				//	quadBorders(quad);

				for (let i = 0; i < subpaths.length; ++i) {
					let subpath = graph.chunks[subpaths[i]];
					let path = graph.chunks[subpath.properties.path]
					renderPath(subpath.id, path, subpath.properties.points);
				}
			} else {
				// root quad with paths
				paths = quad.properties.paths;
				
				if (paths === undefined)
					return;
				
				if (!Array.isArray(paths))
					paths = [paths];
					
				//if (paths.length > 0)
				//	quadBorders(quad);
					
				for (let i = 0; i < paths.length; ++i) {
					let id = paths[i];
					
					let path = graph.chunks[id]
					renderPath(null, path, path.properties.points);
				}
			}		
		};
		
		// for rendering, search quad tree from the root
		// if box is outside of quad, nothing to do
		// if box completely contains quad, render quad
		// if quad has no children render quad
		// otherwise recurse with quad's children
		
		
		// scan quad tree for overlapping bounding boxes
		let scan = function (bounds, quad) {
			if (quad) {
				quad = graph.chunks[quad];
				let qbox = quad.properties;
				let overlap = clip.overlap(qbox, bounds);
				if (overlap >= 0) {
					if (overlap === 0) {
						// quad completely within bounds
						renderQuad(quad);
					} else if (!(qbox.nw || qbox.ne || qbox.sw || qbox.sw)) {
						renderQuad(quad); // leaf quad node
					} else {
						scan(bounds, qbox.nw);
						scan(bounds, qbox.ne);
						scan(bounds, qbox.sw);
						scan(bounds, qbox.se);
					}
				}
			}
		};
		
		let drawImage = function (image, x, y, angle, s) {
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(angle);
			ctx.scale(s, s);
			ctx.translate(-x, -y);
			ctx.drawImage(image, x-image.width/2, y-image.height/2)
			ctx.restore();
		};
		
		let renderCar = function (car) {
			let pos = m2s(car);
			let sf = 3000000; // where this is number come from?
			drawImage(car.image, pos.x, pos.y, car.heading, scale/sf);
			
			if (car.gazePoint && scale > 300000) {
				pos = m2s(car.gazePoint);
			
				ctx.beginPath();
				ctx.fillStyle = 'cyan';
				ctx.arc(pos.x, pos.y, 10, 0, 2 * Math.PI);
				ctx.fill();
			}
		};
		
		// destination is a point on the map
		let renderDestination = function (destination) {
			if (destination) {
				let image = test.images["pin.png"];
				let w = image.naturalWidth;
				let h = image.naturalHeight;
				let pos = m2s(destination.properties);
				let sf = 8;
				drawImage(image, pos.x, pos.y-h/sf/2, 0, 1/sf);
			}
		};
		
		let renderRoute = function (route) {
			if (route !== undefined && scale > 300000) {
				for (let i = 0; i < route.length; ++i) {
					let turn = route[i];
					let pos = m2s(turn.point.properties);
					ctx.beginPath();
					ctx.fillStyle = turn.stop ? 'red' : 'purple';
					ctx.arc(pos.x, pos.y, 10, 0, 2 * Math.PI);
					ctx.fill();
				}			
			}
		};
		
		let renderDashboard = function (car) {
			let dashHeight = 32;
			let textLine = canvas.height-8;
			// render translucent rectangle over bottom of canvas
			ctx.resetTransform();
			ctx.fillStyle =  'rgba(160, 100, 230, 0.95)';
			ctx.fillRect(0, canvas.height-dashHeight, canvas.width, canvas.height);
			ctx.font = '20px sans-serif';
			ctx.fillStyle = 'white';
			//ctx.fillText('Dashboard', 10, canvas.height-8);
			ctx.fillText((2.23694*car.speed).toFixed(0) +  ' mph', 10, textLine);
			
			let theta = (2 * 180 / (car.radius * Math.PI)).toFixed(0);
			
			if (theta === "-0")
				theta = "0";
				
			ctx.fillText('steering: ' + theta + '°', 80, textLine);
			
			let road = car.path.properties.name ? car.path.properties.name : car.path.properties.ref;
			ctx.fillText(road, 240, textLine);
			
			if (car.arrived)
				ctx.fillText("you have arrived", 400, textLine);
			else // show distance to next stop
				ctx.fillText("next stop in " + (car.toStop - car.travelled).toFixed(0) + " m", 400, textLine);
		};

		//log.write("starting rendering ...");
		quadBorders(graph.chunks[test.root]);
		//let start = Date.now();
		//scan(box, test.root);
		let root = graph.chunks[test.root];
		scan(box, root.properties.nw);
		scan(box, root.properties.ne);
		scan(box, root.properties.sw);
		scan(box, root.properties.se);
		renderRoute(test.car.route);
		renderCar(test.car);
		renderDestination(test.destination);
		renderDashboard(test.car);
		//let done = Date.now();
		//log.write("rendering took " + (done-start)/1000.0 + " seconds");
	}
};

let log_element;  // <pre> on web page for log of messages

// buffer messages to avoid slowing down browser as
// experience shows that the slowdown can be massive
// recommend calling flush as late as possible

let log = {
	buffer: "",
	clear: function () {
		log.buffer = "";
		
		if (log_element)
			log_element.innerText = "";
	},
	write: function (msg) {
		if (log_element)
			log.buffer += msg + "\n";
		else
			console.log(msg);
	},
	flush: function () {
		if (log_element) {
			log_element.innerText = log.buffer;
		}
	}
};

// used to sort paths by their type so that we can ensure
// that major roads will be rendered after minor roads

function quicksort (array, left, right, later) {
	let partition = function (array, left, right) {
		let pivot = right;
		let i = left - 1, j = left, tmp;
		while (j < pivot) {
			if (later(array[j], array[pivot])) {
				++j;
			} else {
				++i;
				tmp = array[j];
				array[j] = array[i];
				array[i] = tmp;
				++j;
			}
		}
		
		++i;
		tmp = array[i];
		array[i] = array[j];
		array[j] = tmp;
		return i;
	};
	
	if (left < right) {
		let pivot = partition(array, left, right);
		quicksort(array, left, pivot - 1, later);
		quicksort(array, pivot + 1, right, later);
	}
}


// calculate how much to expand longitude scale to account for
// how far north we are based on center of the map's bounds

function scalefactor(bounds) {
	let degrees2radians = function(deg) {
		return Math.PI * deg / 180;
	};
	
	let b = bounds.properties;
	let lat = (b.maxlat + b.minlat)/2.0;
	let lon = (b.maxlon + b.minlon)/2.0;

	// estimate Earth's radius at map's centre, it varies from
	// 6,357 km at the poles to 6,378 km at the equator
	let R = 6357 + (6378 - 6357) * Math.abs(lat)/90.0;
	log.write("Taking radius of the Earth as " + R + " km");
	
	let lat1, lon1, lat2, lon2;
	
	let dist = function () {
		
		let a = Math.sin((lat2-lat1)/2.0) * Math.sin((lat2-lat1)/2.0) +
			Math.cos(lat1) * Math.cos(lat2) *
			Math.sin((lon2-lon1)/2.0) * Math.sin((lon2-lon1)/2.0);

		let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

		return R * c;
	}
	
	lat1 = lat2 = degrees2radians(lat);
	lon1 = degrees2radians(lon-0.5);
	lon2 = degrees2radians(lon+0.5);
	
	let dlon = dist();
	
	lat1 = degrees2radians(lat-0.5);
	lat2 = degrees2radians(lat+0.5);
	lon1 = lon2 = degrees2radians(lon);
	
	let dlat = dist();

	log.write("At location " + lat + " lat, " + lon + " lon");
	log.write("one degree longitude is " + dlon + " km");
	log.write("one degree latitude is " + dlat + " km");
	log.write("ratio dlon/dlat is " + (dlon/dlat));
	log.write("ratio dlat/dlon is " + (dlat/dlon));
	
	return { dlon: dlon*1000, dlat: dlat*1000};
}

// geometric algorithms e.g. for clipping paths to rectangles

function Clip (graph) {
	const INSIDE = 0; // 0000
	const LEFT = 1;   // 0001
	const RIGHT = 2;  // 0010
	const BOTTOM = 4; // 0100
	const TOP = 8;    // 1000
	
	let outCode = function (point, box) {
		let code = INSIDE;
		
		if (point === undefined || point.properties === undefined)
			code = INSIDE;

		if (point.properties.lat < box.minlat)
			code |= LEFT;
		else if (point.properties.lat > box.maxlat)
			code |= RIGHT;
		if (point.properties.lon < box.minlon)
			code |= BOTTOM;
		else if (point.properties.lon > box.maxlon)
			code |= TOP;

		return code;
	};

	let intersect = function (a, b, edge, box) {
		let point = function (lat, lon) {
			let point = new Chunk("point");
			graph.add(point);
			point.properties.lat = lat;
			point.properties.lon = lon;
			return point;
		};
		return edge & TOP ? point(a.properties.lat +
				(b.properties.lat - a.properties.lat) * (box.maxlon - a.properties.lon) /
				(b.properties.lon - a.properties.lon), box.maxlon) :
			edge & BOTTOM ? point(a.properties.lat +
				(b.properties.lat - a.properties.lat) * (box.minlon - a.properties.lon) /
				(b.properties.lon - a.properties.lon), box.minlon) :
			edge & RIGHT ? point(box.maxlat, a.properties.lon +
				(b.properties.lon - a.properties.lon) * (box.maxlat - a.properties.lat) /
				(b.properties.lat - a.properties.lat)) :
			edge & LEFT ? point(box.minlat, a.properties.lon +
				(b.properties.lon - a.properties.lon) * (box.minlat - a.properties.lat) /
				(b.properties.lat - a.properties.lat)) : null;
	};
	
	// Algorithm for intersection of two rectangles A and B
	// Returns -1 if A and B don't overlap at all
	// Returns 0 if A is the same as B or fits completely within B
	// Returns 1 if A partially or fully overlaps B
	this.overlap = function (a, b) {
		if (a.minlat >= b.maxlat || a.maxlat < b.minlat ||
			a.minlon >= b.maxlon || a.maxlon < b.minlon)
			return -1; // no overlap at all
			
		if (b.minlat <= a.minlat && a.maxlat <= b.maxlat &&
			b.minlon <= a.minlon && a.maxlon <= b.maxlon)
			return 0;
			
		return 1;
	}
	
	// Cohen–Sutherland line clipping algorithm, returning a list
	// of ids for path chunks with points that are within bounding box
	// where each point is a chunk with lat and lon properties
	// new points are created when the line crosses the box edges
	this.line = function (path, points, box) {
		let result = [];  // the list of lists of points
		let part = []; // a list of points within the box
		let codeA = outCode(graph.chunks[points[0]], box), codeB, lastCode;
		let len = points.length;

		for (let i = 1; i < len; ++i) {
			let a = graph.chunks[points[i-1]];
			let b = graph.chunks[points[i]];
	
			codeB = lastCode = outCode(b, box);
	
			while (true) {
				if (!(codeA|codeB)) {
					part.push(a.id);
		
					if (codeB !== lastCode) {
						part.push(b.id);
		
						if (i < len - 1) {
							let subpath = new Chunk("subpath");
							graph.add(subpath);
							subpath.properties.path = path.id;
							subpath.addValue("points", part);
							result.push(subpath.id);
							part = [];
						}
					} else if (i === len - 1) {
						part.push(b.id);
					}
					break;
				} else if (codeA & codeB) {
					break;
				} else if (codeA) {
					a = intersect(a, b, codeA, box);
					codeA = outCode(a, box);
				} else {
					b = intersect(a, b, codeB, box);
					codeB = outCode(b, box);
				}
			}
	
			codeA = lastCode;
		}

		if (part.length) {
			let subpath = new Chunk("subpath");
			graph.add(subpath);
			subpath.properties.path = path.id;
			subpath.addValue("points", part);
			result.push(subpath.id);
		}
	
		return result;
	}

	// Sutherland-Hodgeman polygon clipping algorithm
	// returning a list of points as chunks
	this.polygon = function (points, box) {
		for (let edge = 1; edge <= 8; edge *= 2) {
			let result = [];
			let prev = graph.chunks[points[points.length - 1]];
			let prevInside = !(outCode(prev, box) & edge);

			for (let i = 0; i < points.length; i++) {
				let p = graph.chunks[points[i]];
				let inside = !(outCode(p, box) & edge);

				if (inside !== prevInside) {
					let q = intersect(prev, p, edge, box);
					result.push(q.id);
				}

				if (inside) {
					result.push(p.id);
				}

				prev = p;
				prevInside = inside;
			}

			points = result;

			if (!points.length)
				break;
		}

		return result;
	}
}
