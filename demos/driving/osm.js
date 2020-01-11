/*
	A script to read in an OSM XML file named map.osm and export it to chunks.
	The OSM file is obtained using the export feature for openstreetmap.org
*/

const DOMParser = require('xmldom').DOMParser;
const fs = require('fs');

const input_file = "map.osm";
const output_file = "map.chk";

const nodeType = [
	"zero",
	"element",
	"two",
	"cdata",
	"five",
	"six",
	"processing instruction",
	"comment",
	"document",
	"doctype",
	"document fragment"
];

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const CDATA_SECTION_NODE = 4;
const PROCESSING_INSTRUCTION_NODE = 7;
const COMMENT_NODE = 8;
const DOCUMENT_NODE = 9;
const DOCUMENT_TYPE_NODE = 10;
const DOCUMENT_FRAGMENT_NODE = 11

// read the file synchronously
let xml_string = fs.readFileSync(input_file, "utf8");

let dom = new DOMParser().parseFromString(xml_string);

console.log("osm version = " + dom.documentElement.getAttribute("version"));

let bounds = {};
let points = {};
let paths = {};
let relations = {};
let pathtypes = {};
let restrictions = {};

let point_count = 0;
let path_count = 0;
let relation_count = 0;
let highway_count = 0;

function process () {
	// first get the root osm element
	let osm = dom.documentElement;
	
	let el = osm.firstChild;
	
	while (el) {
		if (el.nodeType === ELEMENT_NODE) {
			let tag = el.tagName;
		
			if (tag === "node") {
				let point = {
					id: el.getAttribute("id"),
					lat: el.getAttribute("lat"),
					lon: el.getAttribute("lon")
				}
				
				let child = el.firstChild;
				
				while (child) {
					if (child.nodeType === ELEMENT_NODE) {
						if (child.tagName ==="tag") {
							point[child.getAttribute("k")] = child.getAttribute("v");
						}
					}
				
					child = child.nextSibling;
				}
			
				points[el.getAttribute("id")] = point;
				++point_count;
			} else if (tag === "way") {
				let path = {
					id: el.getAttribute("id"),
					points: []
				};
			
				let child = el.firstChild;
				
				while (child) {
					if (child.nodeType === ELEMENT_NODE) {
						if (child.tagName ==="nd") {
							path.points.push(child.getAttribute("ref"));
						} else if (child.tagName ==="tag") {
							path[child.getAttribute("k")] = child.getAttribute("v");
						}
					}
				
					child = child.nextSibling;
				}			
			
				paths[el.getAttribute("id")] = path;
				++path_count;
				
				if (path.highway)
					++highway_count;
			} else if (tag === "relation") {
				let relation = {
					id: el.getAttribute("id"),
					paths: [],
					points: []
				};
			
				let child = el.firstChild;
				
				while (child) {
					if (child.nodeType === ELEMENT_NODE) {
						if (child.tagName ==="member") {
							let ref = child.getAttribute("ref");								
							let role = child.getAttribute("role");
							
							if (child.getAttribute("type") === "way") {
								if (role) {
									if (role === "from")
										relation.from = ref;
									else if (role === "to")
										relation.to = ref;
										
									relation.paths.push(ref);
								}
							} else if (child.getAttribute("type") === "node") {								
								if (role) {
									if (role === "via")
										relation.via = ref;
									
									relation.points.push(ref);
								}
							}
						} else if (child.tagName ==="tag") {
							relation[child.getAttribute("k")] = child.getAttribute("v");
						}
					}
				
					child = child.nextSibling;
				}			
			
				relations[el.getAttribute("id")] = relation;
				++relation_count;
			} else if (tag === "bounds") {
				bounds.minlat = el.getAttribute("minlat");
				bounds.maxlat = el.getAttribute("maxlat");
				bounds.minlon = el.getAttribute("minlon");
				bounds.maxlon = el.getAttribute("maxlon");
			} else if (tag === "relation") {
				// ignore for now
			}
		}
		
		el = el.nextSibling;
	}
	
	console.log("map bounds: " + JSON.stringify(bounds));
	console.log("there are " + point_count + " points");
	console.log("there are " + path_count + " paths");
	console.log("there are " + relation_count + " relations");
	console.log("there are " + highway_count + " highways");
	console.log("");
	
	// process relations to back index the paths and points they cite

	for (id in relations) {
		if (relations.hasOwnProperty(id)) {
			let relation = relations[id];
			
			// only deal with relations describing restrictions
			if (!relation.type || relation.type !== "restriction")
				continue;
			
			let refs = relation.paths;
			
			if (refs) {
				for (let i = 0; i < refs.length; ++i) {
					let ref = refs[i];
					let path = paths[ref];

					if (path) {
						if (path.relations === undefined) {
							path.relations = [id];
						} else
							path.relations.push(id);
					} else {
						//console.log("missing path for ref: " + ref);
					}
				}
			}

			refs = relation.points;
			
			if (refs) {
				for (let i = 0; i < refs.length; ++i) {
					let ref = refs[i];
					let point = points[ref];

					if (point) {
						if (point.relations === undefined) {
							point.relations = [id];
						} else
							point.relations.push(id);
					} else {
						//console.log("missing point for ref: " + ref);
					}
				}
			}
				
		}
	}

	// process the paths to back index the nodes
	
	for (id in paths) {
		if (paths.hasOwnProperty(id)) {
			let path = paths[id];
			let refs = path.points;
			
			if (refs === undefined || !path.highway)
				continue;
				
			for (let i = 0; i < refs.length; ++i) {
				let ref = refs[i];
				let point = points[ref];

				if (point) {
					if (point.paths === undefined) {
						point.paths = [id];
					} else {
						point.paths.push(id);
					}
				} else {
					//console.log("missing point for ref: " + ref);
				}
			}
		}
	}
	
	// look out for path "r3295"
	
	// function to find index for point in path
	let findIndex = function (path, point) {
		let points = path.points;
		
		for (let i = 0; i < points.length; ++i) {
			if (points[i] === point)
				return i;
		}
	};
	
	// direction of point q from point p in radians
	let findDirection = function (p, q) {
		return Math.atan2(q.lat - p.lat, q.lon - p.lon) - Math.PI/2;
	};
	
	// estimate road width based upon number of lanes and road type
	let roadWidth = function (path) {
		let lanes = path.lanes ? parseFloat(path.lanes) : 2;
		let width = 3.65;
		
		let type = path.highway;
		
		if (type === "primary" || type === "trunk")
			width *= 1.4;
		else if (type === "secondary")
			width *= 1.2;
		
		return width * lanes;
	};
	
	let summariseJunction = function (point) {
		//console.log('point ' + point.id);
		
		if (point.paths && point.paths.length > 1) {
			console.log("Junction: " + 
				JSON.stringify(point, function (key, value) {
					if (key !== "paths")
						return value;
				}, 2));
			
		
			for (let i = 0; i < point.paths.length; ++i) {
				let id = point.paths[i];
			
				console.log("Path: " + JSON.stringify(paths[id], function (key, value) {
					if (key !== "points")
						return value;
				}, 2));
			}
		}
	};
	
	// process points with multiple paths to infer junctions
	console.log('summarise junctions:')
	
	for (id in points) {
		if (points.hasOwnProperty(id)) {
			let point = points[id];
			let junction, dir, path, paths = point.paths;
			
			if (paths && paths.length > 1) {
				//console.log('point ' + point.id + ' has ' + (paths ? (paths.length + ' paths') : ''));
				summariseJunction(point);
			}
		}
	}
}

let symnum = 0;
let ids = {};
	
function getsym (prefix, identifier) {
	let sym = ids[identifier];
	
	if (!sym) {
		sym = prefix + (++symnum);
		ids[identifier] = sym;
	}
	
	return sym;
}

function generate () {
	let pt = {};
	let data = "";
	let exceptions;
	
	for (id in paths) {
		if (paths.hasOwnProperty(id)) {
			let path = paths[id];
			
			if (path.highway) {
				let refs = path.points;
				for (let i = 0; i < refs.length; ++i) {
					let ref = refs[i];
					pt[ref] = points[ref];
				}
			}
		}
	}
	
	data += "bounds {\n" + properties(bounds) + "}\n";
	
	exceptions = ["id", "source", "relations"];
	
	for (id in pt) {
		if (pt.hasOwnProperty(id)) {
			let point = pt[id];
			data += "point " + getsym("p", id) + " {\n" +
				properties(point, "r", exceptions) +
				"}\n";
		}
	}
	
	exceptions = ["id", "highway", "source", "relations"];

	for (id in paths) {
		if (paths.hasOwnProperty(id)) {
			let path = paths[id];
			
			if (path.highway) {
				let type = path.highway + "_highway";
				pathtypes[type] = "highway";
				let s = type + " " + getsym("r", path.id) + " {\n";
				s += properties(path, "p", exceptions) + "}\n";
				data += s;
			}
		}
	}
	
	for (id in relations) {
		if (relations.hasOwnProperty(id)) {
			let relation = relations[id];
			
			if (!relation.type || relation.type !== "restriction")
				continue;
				
			let type = relation.restriction;
			restrictions[type] = "restriction";
			let s = type + " " + getsym("a", relation.id) + " {\n";
			s += "  from " + getsym("r", relation.from) + "\n";
			s += "  to " + getsym("r", relation.to) + "\n";
			s += "  via " + getsym("p", relation.via) + "\n}\n";
			data += s;
			//console.log(s);
		}
	}
	
	for (type in pathtypes) {
		if (pathtypes.hasOwnProperty(type)) {
			data += type + " kindof " + pathtypes[type] + "\n";
		}
	}
	
	for (type in restrictions) {
		if (restrictions.hasOwnProperty(type)) {
			data += type + " kindof " + restrictions[type] + "\n";
		}
	}
	
	fs.writeFile(output_file, data, (err) => {
  		if (err)
  			console.log(err);
  		else	
  			console.log("Successfully Written to File.");
	});
	
	// debug
	let path = paths["74380678"];
	console.log("lanes is a " + typeof (path.lanes));
}

function clist(name, prefix, list) {
	let s = "  " + name + " " + getsym(prefix, list[0]);
	
	for (let i = 1; i < list.length; ++i)
		s += ", " + getsym(prefix, list[i]);
		
	return s + "\n";
}

function hasSpace(s) {
	return /\s/.test(str)
}

function contains(list, value) {
	for (let i = 0; i < list.length; ++i) {
		if (value === list[i])
			return true;
	}
	
	return false;
}

function properties (obj, prefix, exceptions) {
	let s = "";
	
	for (name in obj) {
		if (exceptions && contains(exceptions, name))
			continue;
			
		if (obj.hasOwnProperty(name)) {
			let value = obj[name];
			
			if (/\s/.test(name))
				name = name.replace(/\s/g, '_');
			
			if (Array.isArray(value)) {
				s += clist(name, prefix, value);
				continue;
			}
			
			if (/\s/.test(value))
				value = " \"" + value + "\"";
			
			s += "  " + name + " " + value + "\n";
		}
	}
	return s;
}

process();

generate();

