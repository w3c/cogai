/*
	Chunk Graph library with support for Chunk import/export
	========================================================

	Dave Raggett <dsr@w3.org>
	
	Released under the MIT open source software license.
	Copyright (c) 2019 - 2021

	This is a library module for graphs of chunks, and inspired by ACT-R.
	A chunk is a collection of properties whose values are either literals
	or references to other chunks. Literals include booleans, numbers and
	strings. Properties may have multiple values.  A special case is for
	variables used within rules.
	
	Chunks and relationships are serialised as follows:
	
	type id {
		name1 value1
		name2 value2
		name3 value, value, value
		...
	}
	subject relation object.
	
	where id is optional and is scoped to the chunks in the same file.
	line break is a separator to reduce likelihood of syntax errors
	
	booleans are true and false
	numbers as per JavaScript
	strings are enclosed in double quote marks
	names are composed of letters and digits
	variables are names that start with either ? or with !
	undefined is reserved for unbound variables
	
	tokens:
		name: /^\w[\w|\d|_|-]+$/
		punctuation: /[.;,{}|\?]/
		boolean: /^true|false$/
		number: /^[-+]?[0-9]+\.?[0-9]*([eE][-+]?[0-9]+)?$/
		
	Chunks are indexed primarily by their type and secondarily by their id
*/

class Chunk {
	constructor (type, id) {
		//const decay = 1.6045E-6;  // half-life of 5 days
		const decay = 2.6742E-6; 	// half-life 3 days
		//const decay = 4.0113E-6;  // half-life of 2 days
		//const decay = 8.0335E-6;  // half-life of 1 day

		let chunk = this;
		chunk.type = type;
		chunk.properties = {};
		chunk.strength = undefined;
		chunk.lastAccessed = undefined;
		chunk.usage = undefined;
		
		if (id !== undefined)
			chunk.id = id;
			
		// return copy of self which is not in a graph
		chunk.clone = function (skipAtNames) {
			let chunk = new Chunk(this.type, this.id);
			let props = this.properties;
			for (let name in props) {
				if (props.hasOwnProperty(name)) {
					if (skipAtNames && name[0] === '@')
						continue;
						
					let value = props[name];
					
					if (Array.isArray(value)) {
						let list = [];
						for (let i = 0; i < value.length; ++i)
							list[i] = value[i];
						chunk.properties[name] = list;
					} else {
						chunk.properties[name] = value;
					}
				}
			}
			return chunk;
		};
		
		// returns true if this chunk has the given chunk ID
		// as one of its property values or as its type
		// this is used to help with graph indexing for
		// spreading strength in both directions
		chunk.cited = function (id) {
			if (chunk.type === id)
				return true;
				
			let props = chunk.properties;
			for (let name in props) {
				if (props.hasOwnProperty) {
					let value = props[name];
					
					if (Array.isArray(value)) {
						for (let i = 0; i < value.length; ++i) {
							if (value[i] === id)
								return true;
						}
					} else if (value === id) {
							return true;
					}
				}
			}
				
			return false;
		};
		
		// this provides a means for changing a chunk's type
		// that ensures that the graph's indexes are in step
		
		chunk.setType = function (type) {
			if (chunk.graph)
				chunk.graph.updateType(chunk, type);
			else
				chunk.type = type;
		};
		
		// return the current strength level which decays
		// exponentially over time unless boosted in some way
		// where delay = log(0.5)/tau) for tau in seconds
		chunk.getStrength = function (now) {
			return chunk.strength * Math.exp(decay * (chunk.lastAccessed - now) / chunk.usage);
		};
		
		chunk.setStrength = function (strength, now) {
			chunk.strength = strength * Math.exp(decay * (now - chunk.lastAccessed) / chunk.usage);
		};
		
		chunk.updateStrength = function (now, worth) {
			chunk.strength = chunk.getStrength(now);
			chunk.lastAccessed = now;
			chunk.usage += worth;
		};
		
		let forgetValue = function (value) {
			if (chunk.graph) {
				if (Array.isArray(value)) {
					for (let i = 0; i < value.length; ++i) {
						chunk.graph.forgetLink(chunk, value[i]);
					}
				} else {
					chunk.graph.forgetLink(chunk, value);
				}
			}
		};
		
		let rememberValue = function (value) {
			if (chunk.graph) {
				if (Array.isArray(value)) {
					for (let i = 0; i < value.length; ++i) {
						chunk.graph.rememberLink(chunk, value[i]);
					}
				} else {
					chunk.graph.rememberLink(chunk, value);
				}
			}
		};
				
		// clean house keeping for lists of values
		// used to avoid lists with just one item
		// and to avoid bad values (undefined, null, [])
		
		// overrides property's existing value(s)
		chunk.setValue = function (name, value) {
			let old = chunk.properties[name];
			if (value === undefined || value === null ||
				(Array.isArray(value) && value.length === 0)) {
				if (chunk.properties[name] !== undefined) {
					forgetValue(old);
					delete chunk.properties[name];
				}
			} else if (old !== value) {
				forgetValue(old);
				chunk.properties[name] = value;
				rememberValue(value);
			}
		};
		
		// supplement's property's existing values
		chunk.addValue = function (name, value) {
			if (value === undefined)
				return;
				
			if (Array.isArray(value)) {
				if (value.length === 0)
					return;

				if (value.length === 1)
					value = value[0];
			}
				
			let old = chunk.properties[name];
			if (old === undefined)
				chunk.properties[name] = value;
			else if (Array.isArray(old)) {
				if (Array.isArray(value))
					chunk.properties[name] = old.concat(value);
				else
					old.push(value);
			} else if (Array.isArray(value)) {
				if (value.length )
				chunk.properties[name] = [old].concat(value);
			} else
				chunk.properties[name] = [old, value];
				
			rememberValue(value);
		};
		
		// remove value from list of values
		chunk.removeValue = function (name, value) {
			let old = chunk.properties[name];
			if (old === value) {
				delete chunk.properties[name];
			} else {
				if (Array.isArray(old)) {
					for (let i = 0; i < old.length; ++i) {
						if (old[i] === value) {
							old.splice(i, 1);
							
							if (old.length === 0)
								delete chunk.properties[name];
								
							if (old.length === 1)
								chunk.properties[name] = old[0];

							break;
						}
					}
				}
			}
			
			forgetValue(value);
		};
		
		chunk.hasValue = function (name, value) {
			let current = chunk.properties[name];
			
			if (current === undefined)
				return false;
			
			if (current === value)
				return true;
				
			if (Array.isArray(current)) {
				for (let i = 0; i < current.length; ++i) {
					if (current[i] === value)
						return true;
				}
			}
			
			return false;
		};
	
		chunk.toString = function (options) {
			let now = chunk.graph ? chunk.graph.now : undefined;
			if (options === undefined)
				options = {};
			
			if (options.concise) {					
				let s= chunk.type + ' ';
				if (chunk.id && !options.rule)
					s += chunk.id + ' ';
				s += '{'
				
				// sub-symbolic parameters
				
				if (!options.rule && now !== undefined && chunk.strength !== undefined) {
					s += '@strength ' +  chunk.strength + '; ';
					s += '@ago ' +  (now - chunk.lastAccessed) + '; ';
					s += '@use ' + chunk.usage + '; ';
				}
				
				// regular properties
				
				let props = chunk.properties;
				for (let name in props) {
						if (props.hasOwnProperty(name)) {
							s += name + ' ';
							let value = props[name];
						
							if (Array.isArray(value)) {
								for (let i = 0; i < value.length; ++i) {
									s += value[i];
								
									if (i < value.length - 1)
										s += ', '; 
								}
								s += '; ';
							} else
								s += value + '; ';
						}
				}
				
				if (s[s.length-2] === ';')
					s = s.substr(0, s.length-2);
					
				s += '}'
				return s;
			}
			
			// verbose syntax
			
			let s = chunk.type + (chunk.id ? ' ' + chunk.id : '') + ' {\n';
			
			// sub-symbolic parameters
			
			if (now !== undefined && chunk.strength !== undefined) {
				s += '   @strength ' +  chunk.strength + '\n';
				s += '   @ago ' +  (now - chunk.lastAccessed) + '\n';
				s += '   @use ' +  chunk.usage + '\n';
			}
			
			// regular properties
			
			let props = chunk.properties;
			for (let name in props) {
					if (props.hasOwnProperty(name)) {
						s += '   ' + name + ' ';
						let value = props[name];
						
						if (Array.isArray(value)) {
							for (let i = 0; i < value.length; ++i) {
								s += value[i];
								
								if (i < value.length - 1)
									s += ', '; 
							}
							s += '\n';
						} else
							s += value + '\n';
					}
			}
			s += '}\n'
			return s;
		}
	}
};

class Link extends Chunk  {
	constructor(subject, predicate, object) {
		super(predicate);
		this.properties = {
			"@subject": subject,
			"@object":object
		};
		this.toString = function (options) {
			return this.properties["@subject"] + 
				' ' + this.type +
				' ' + this.properties["@object"] +
			 	'\n';
		};
	}
}

// used to model negated condition chunks or their values
class Negate {
	constructor(value) {
		this.negate = value;
		this.toString = function (options) {
			if (this.negate === undefined)
				return '!';
				
			return '!' + this.negate.toString(options);
		};
	}
}

function ChunkGraph (source) {
	let graph = this;
	
	const minimum_strength = 0.02;
	const tau = 24*60*60;  // arbitrarily set to 24 hours
	
	const CONCISE = {concise:true};

	const re_number = /^[-+]?[0-9]+\.?[0-9]*([eE][-+]?[0-9]+)?$/;
	const re_name = /^(\*|(@)?[\w|\.|\-|\:]+)$/;
	const re_value = /^([\w|\.|\-|]*|\!\?[\w|\.|\-|]+|\?[\w|\.|\-|]+)$/;
	const re_uri = /(http:\/\/|https:\/\/|www\.)([^ '"]*)/;
	const re_iso8601 = /^\d{4}(-\d\d(-\d\d(T\d\d:\d\d(:\d\d)?(\.\d+)?(([+-]\d\d:\d\d)|Z)?)?)?)?$/;

	graph.chunks = {};   // map chunk id to chunk with that id
	graph.types = {};    // map chunk type to list of chunks
	graph.cited = {};    // map type and property values to chunk's id
	graph.contexts = {}  // map chunk context to object mapping chunk id's to chunks
	graph.count = 0;     // count of chunks created
	graph.now = Date.now()/1000.0;  // timestamp in seconds since epoch
	
	let gensym_count = 0;
	
 	graph.gensym = function () {
		return "_:" + (++gensym_count);
	};
	
	let forall = function (obj, handler) {
		if (typeof obj === "object") {
			if (obj.length) {
				for (let i = 0; i < obj.length; ++i)
					handler(obj[i]);
			} else {
				for (let name in obj) {
					if (obj.hasOwnProperty(name))
						handler(name);
				}
			}
		}
	};
	
	let list2set = function (list, set) {
		if (set === undefined)
			set = {};
			
		for (let i = 0; i < list.length; ++i)
			set[list[i]] = null;
			
		return set;
	};
	
	let size_of_set = function (set) {
		let size = 0;
		if (typeof set === "object") {
			if (set.length)
				return set.length;

			for (let node in set) {
				if (set.hasOwnProperty(node))
					++size;
			}
		}
		return size;
	};
	
	let find = function (list, item) {
		if (!list)
			return -1;
		
		for (let i = 0; i < list.length; ++i) {
			if (list[i] === item)
				return i;
		}
	
		return -1;
	};
	
	// check that a and b are the same
	// ignoring ordering of array items
	let same = function (a, b) {
		if (Array.isArray(a) && Array.isArray(b)) {
			// does b contain a
			for (let i = 0; i < a.length; ++i) {
				if (find(b, a[i]) < 0)
					return false;
			}
			// does a contain b
			for (let i = 0; i < b.length; ++i) {
				if (find(a, b[i]) < 0)
					return false;
			}
		} else if  (a !== b)
			return false;

		return true;
	};
		
	let isLink = function (value) {
		return (typeof (value) === "string" && value[0] !== '"')
	};
	
	let randomIntFromInterval = function (min, max) {
  		return Math.floor(Math.random() * (max - min + 1)) + min;
	};
	
	// called after deleting or updating a property
	// this first checks if the old value is
	// cited and then removes it from the index
	// this needs to be called for type and all
	// properties when removing a chunk from the graph
	graph.forgetLink = function (chunk, id) {
		if (isLink(id) && chunk.graph === graph && chunk.cited(id)) {
			let list = graph.cited[id];
			if (list) {
				list.splice(find(list, chunk.id), 1);
				if (list.length === 0)
					delete graph.cited[id];
			}
		}
	};
	
	// called when setting type or property value
	// and for type and all properties when adding
	// a chunk to the graph 
	graph.rememberLink = function (chunk, id) {
		if (isLink(id)) {
			if (!graph.cited[id])
				graph.cited[id] = []
			
			let i = find(graph.cited[id], chunk.id);
		
			if (i < 0)
				graph.cited[id].push(chunk.id);
		}
	};

	// To mimic human learning and forgetting, the strength
	// of a chunk is modelled as a leaky capacitor where charge
	// is injected each time the chunk is recalled or updated,
	// and then decays over time. Related chunks are primed with
	// a fraction of the injected charge being divided across
	// linked chunks in a wave of spreading strength until a
	// cut-off threshold is reached. Links are followed in both
	// directions, for chunk types and properties.
	
	// ???? should activation spread via a shared ID when
	// that ID is missing from graph.chunks[ID] ????
	
	graph.activate = function (chunk) {
		// parameters for spreading strength
		// to be adjusted from experience
		const base = 1.0;
		const fraction = 0.5;
		const cutoff = 0.01;
		
		// The spacing effect is that massed presentations have
		// reduced novelty, and are less effective for learning.
		// The logistic function is used to mimic the effect,
		// mapping the time interval since the chunk was last
		// recalled or updated to the boost in its strength,
		// see: https://en.wikipedia.org/wiki/Logistic_function
		function logistic (x) {
			return (1 + Math.tanh(x/2))/2;
		};
		
		function prime(chunk, boost) {
			let strength = chunk.getStrength(graph.now) + boost;
			//console.log('boosting: ' + chunk.id + ' by ' + boost + ' to ' + strength);
			chunk.setStrength(strength, graph.now);
			
			// spread strength through linked chunks
			if (boost > cutoff) {
				// reduce boost to guarantee decaying wave
				boost = boost*fraction;
				
				// which chunks does this chunk link to?
				let chunks = [];
				
				if (graph.chunks[chunk.type])
					chunks.push(graph.chunks[chunk.type])
				
				let props = chunk.properties;
				for (let name in props) {
					if (props.hasOwnProperty(name)) {
						let id = props[name];
						if (Array.isArray(id)) {
							let list = id;
							for (let i = 0; i < list.length; ++i) {
								id = list[i];
								if (typeof (id) === "string" && id[0] !== '"') {
									let c = graph.chunks[id];
									if (c)
										chunks.push(c);
								}
							}
						} else 	if (typeof (id) === "string" && id[0] !== '"') {
							let c = graph.chunks[id];
							if (c)
								chunks.push(c)
						}
					}
				}
				
				// which chunks cite this chunk?
				let cited = [], ids = graph.cited[chunk.id];
				
				if (ids && ids.length > 0) {
					for (let i = 0; i < ids.length; ++i) {
						cited.push(graph.chunks[ids[i]]);
					}
				}
				
				if (boost > cutoff * (chunks.length + cited.length)) {
					if (cited.length > 0)
						chunks = chunks.concat(cited);
			
					// prime the linked chunks
					if (chunks.length) {
						boost = boost*fraction/chunks.length;
			
						for (let i = 0; i < chunks.length; ++i) {
							prime(chunks[i], boost);
						}
					}
				}
			}
		};
		
		if (chunk) {
			let now = graph.now; // updated by application
			let boost = base;
			let worth = 0;
		
			if (now > chunk.lastAccessed) {
				worth = logistic(Math.log((now - chunk.lastAccessed)/tau));
				boost *= worth;
			}
			
			// apply forgetting curve to update chunk strength
			chunk.updateStrength(now, worth);
			console.log('** activating ' + chunk.id + ' ' + chunk.strength);
			prime(chunk, boost);
		}
		return chunk;
	};
	
	// Used as part of stochastic recall of chunks where
	// where stronger chunks are more likely to be selected.
	// This implementation uses the Box–Muller algorithm.
	// Multiply the strength level by e^x where x is the
	// value returned by this function. The standard deviation
	// determines how much variability is injected.
	graph.gaussian = function (stdev) {
		const epsilon = 1E-20;
		const TwoPI = 2 * Math.PI;
		let u1, u2;
		do {
			u1 = Math.random();
			u2 = Math.random();
		} while (u1 < epsilon);
		return stdev*Math.sqrt(-2*Math.log(u1))*Math.cos(TwoPI*u2);
	};
	
	// apply noise from the normal distribution to chunk strength
	// but reduce standard deviation for small time intervals
	graph.noise = function (chunk) {
		let delta = graph.now - chunk.lastAccessed;
		
		if (delta <= 10)
			return 1.0;
			
		const stdev = delta >= tau ? 2.0 : 2.0*delta/tau;

		return chunk.getStrength(graph.now) * Math.exp(graph.gaussian(stdev));
	};
		
	// value is a name or a list of names
	// bindings maps variable names to values
	// map to a list of names, substituting variables
	// return undefined if we find an unbound variable
	let get_value_list = function (value, bindings) {
		let list = [];
		if (Array.isArray(value)) {
			for (let i = 0; i < value.length; ++i) {
				if (value[i][0] === '?') {
					list[i] = bindings[value[i].substr(1)];
					
					if (list[i] === undefined)
						return undefined;
				} else
					list[i] = value[i];
			}
			return list;
		}
		
		if (value[0] === '?') {
			value = bindings[value.substr(1)];
			
			if (value === undefined)
				return undefined;
		}
			
		return [value];
	};
	
	// used for both chunk recall and for matching rule conditions
	// where the given chunk is matched with the condition chunk
	// using the given set of variable bindings that have been
	// bound in a previous iteration through the rule's conditions
	
	// test that all of the properties in the condition
	// match the corresponding properties in the buffer
	// using the variable bindings and any @ constraints
	
	graph.test_constraints = function (chunk, condition, bindings, engine) {
		if (chunk.type !== condition.type && condition.type !== '*')
			return false;
	
		// these are not matched as normal properties
		const skip = {
			"@module": true,
			"@do" : true,
			"@for" : true,
			"@from" : true,
			"@to" : true,
			"@push" : true,
			"@pop" : true,
			"@shift" : true,
			"@unshift" : true,
			"@clear" : true
		};
		
		// these are matched like normal properties
		const normal = {
			"@subject": true,
			"@object": true,
			"@task": true,
			"@context": true,
			"@more": true,
			"@index": true
		};
		
		let properties = condition.properties;
		
		for (let name in properties) {
			let negate = false;
			
			// apply @ constraint
			if (name[0] === '@' && !normal[name]) {
					
				if (skip[name])
					continue;

				let args = get_value_list(properties[name], bindings);
				
				// undefined if a variable is still unbound
				if (!args)
					return false;
				
				switch (name) {
					case '@id': {
						// passed one or more IDs
						// check that the chunk ID is one of these
						let found = false;
						for (let i = 0; i < args.length; ++i) {
							if (args[i] === chunk.id) {
								found = true;
								break;
							}
						}
						if (!found)
							return false;
					}
					break;
					
					case '@type': {
						// passed one or more types
						// check that the chunk type is one of these
						let found = false;
						for (let i = 0; i < args.length; ++i) {
							if (args[i] === chunk.type) {
								found = true;
								break;
							}
						}
						if (!found)
							return false;
					}
					break;
					
					case '@status': {
						// passed true or false
						if (args.length !== 1) 
							return false;

						if (typeof args[0] !== "string")
							return false;
							
						let module = engine.getModule(condition);
						
						if (module && args[0] != module.getStatus())
							return false;
					}
					break;
					
					case '@count': {
						// passed true or false
						if (args.length !== 1) 
							return false;

						if (typeof args[0] !== "number")
							return false;
							
						if (args[0] !== chunk.properties["@count"])
							return false;
					}
					break;
					
					case '@more': {
						// passed true or false
						if (args.length !== 1) 
							return false;

						if (typeof args[0] !== "boolean")
							return false;
							
						if (args[0] !== chunk.properties["@more"])
							return false;
					}
					break;
					
					case '@gt': {
						// expects 2 numeric values and requires first to be > second
						if (args.length !== 2)
							return false;
							
						if (typeof args[0] !== "number")
							return false;
							
							
						if (typeof args[1] !== "number")
							return false;
							
						if (args[1] >= args[0])
							return false;	
					}
					break;
					
					case '@lteq': {
						// expects 2 numeric values and requires first to be <= second
						if (args.length !== 2)
							return false;
							
						if (typeof args[0] !== "number")
							return false;
							
							
						if (typeof args[1] !== "number")
							return false;
							
						if (args[1] < args[0])
							return false;	
					}
					break;
					
					case '@subject':
					case '@object': 
					case '@context': {
						
					}
					break;
					
					case '@name': {
						// args are values which must be names
						for (let i = 0; i < args.length; ++i) {
							let name = args[i];
							
							if (typeof name !== "string")
								return false;
								
							if (!re_name.test(name))
								return false;
						}
					}
					break;
					
					case '@number': {
						// args are values which must be numbers
						for (let i = 0; i < args.length; ++i) {
							if (typeof args[i] !== "number")
								return false;
						}
					}
					break;
					
					case '@boolean': {
						// args are values which must be booleans
						for (let i = 0; i < args.length; ++i) {
							let value = args[i];
							
							if (!(value === true || value === false))
								return false;
						}
					}
					break;
					
					case '@date': {
						// args are values which must be dates
						for (let i = 0; i < args.length; ++i) {
							if (!re_date.test(args[i]))
								return false;
						}
					}
					break;
					
					case '@string': {
						// args are values which must be quoted strings
						for (let i = 0; i < args.length; ++i) {
							let value = args[i];
							
							if (typeof value !== "string")
								return false;
								
							if (value[0] !== '"' || value[value.length-1] !== '"')
								return false;
						}
					}
					break;
					
					default: {
						throw(new Error(name + " isn't recognised"));	
					}
				}
			
				continue;
			}
				
			// properties that don't start with @
			// except for @subject, @object and @task
			if (properties.hasOwnProperty(name)) {
				let cond = properties[name];
				let negate = false
				
				if (cond === '*')
					return true;
				
				if (cond instanceof Negate) {
					negate = true;
					cond = cond.negate;
					
					if (cond === undefined) {
						return chunk.properties[name] === undefined;
					}
				}
				
				if (cond[0] === "?")
					cond = bindings[cond.substr(1)];
					
				if (cond === undefined)
					return negate; //continue;
												
				let target = chunk.properties[name];
				
				if (target === undefined) {
					if (name !== "@task")
						return negate;
						
					let module = engine.getModule(condition);
						
					if (module.tasks[cond])
						target = cond;
				}
									
				// for lists we compare each item
				if (Array.isArray(target)) {
					if (Array.isArray(cond)) {
						if (cond.length !== target.length)
							return negate;
							
						for (let i = 0; i < cond.length; ++i) {
							let c = cond[i];
							
							if (c instanceof Negate) {
								c = c.negate;

								if (c[0] === "?")
									c = bindings[c.substr(1)];
								
								if (c === undefined)
									return !negate;

								if (c === target[i])
									return !negate;
							} else {
								if (c === '*')
									continue;
								
								if (c[0] === "?")
									c = bindings[c.substr(1)];
									
								if (c === undefined)
									return negate;

								if (c !== target[i])
									return negate;
							}						
						}
						return !negate;
					}
					return negate;
				} else if (Array.isArray(cond)) {
					return negate;
				} else if (negate) {
				 	if (cond === target)
						return false;
				} else if (cond !== target)
					return false;
			}
		}
		
		// fail if chunk defines @context, but the condition doesn't
		if (!properties.hasOwnProperty("@context") && chunk.properties.hasOwnProperty("@context"))
			return false;
		
		return true;		
	};
	
	// return list of chunks with given property values
	let matching_values = function (chunks, values) {
		let matched = [];
		
		if (chunks === undefined)
			return matched;
			
		if (values === undefined)
			return chunks.slice();
		
		for (let i = 0; i < chunks.length; ++i) {
			let chunk = chunks[i];
			let properties = chunk.properties;
			let pass = true
			
			for (let name in values) {
				if (name[0] === '@')
					continue;
					
				if (values.hasOwnProperty(name)) {
					let value = values[name];
					let target = properties[name];
					
					if (target === undefined) {
						pass = false;
					} else {
						if (Array.isArray(value)) {
							if (Array.isArray(target)) {
								if (value.length === target.length) {
									for (let i = 0; i < value.length; ++i) {
										if (value[i] !== target[i]) {
											pass = false;
											break
										}
									}
								} else {
									pass = false;
								}
							}
						} else {
							if (Array.isArray(target))
								pass = false;
							else if (target !== value)
								pass = false;
						}
					}
				}
			}
			
			if (pass)
				matched.push(chunk);
		}
		
		return matched;
	};

	// recall best chunk with given type and given property values
	// previously defined as graph.get = function (type, values, id, all)
	graph.get = function (args) {
		let type, values, id, all = false;
		
		if (typeof args === "string") {
			type = args;
			value = {};
		}
		else {
			type = args.type;
			values = args.values ? args.values : {};
			id = args.id;
			all = args.all;
		}
			
		if (id) {
			return graph.activate(graph.chunks[id]);
		}
		
		let ids, chunks, matched;
		let length = Number.POSITIVE_INFINITY;
			
		if (type && this.types[type])
			chunks = this.types[type];
			
		// search given values for references to chunks
		// then find the set of chunks that cite those chunks
		// and set ids to the shortest such set
		for (let name in values) {
			let value = values[name];
			
			if (typeof value === "string" && value[0] !== '"') {
				let list = graph.cited[value];
				if (list.length < length)
					ids = list;
			}
		}
		
		// if type isn't given or has a larger set of chunks
		// we use the chunk set identified from the values
		if (ids && (!chunks || chunks.length > ids.length)) {
			chunks = [];
	
			for (let i = 0; i < ids.length; ++i) {
				let chunk = graph.chunks[ids[i]];
				if (chunk)
					chunks.push(chunk);
			}
		}
		
		// filter to find set of matching chunks
		if (chunks && chunks.length > 0)
			matched = matching_values(chunks, values);

		if (matched && matched.length > 0) {
			if (all) {
				// forward pass
				let found = [], weak = [], now = graph.now;
				for (let i = 0; i < matched.length; ++i) {
					let chunk = matched[i];
					let strength = graph.noise(chunk);
					if (strength >= minimum_strength) {
						graph.activate(chunk);
						found.push(chunk);
					} else {
						weak.push(chunk);
					}
				}
				
				// backward pass
				for (let i = weak.length - 1; i >= 0; --i) {
					let chunk = weak[i];
					let strength = graph.noise(chunk);
					if (strength >= minimum_strength) {
						console.log("lifted: " + chunk.id);
						graph.activate(chunk);
						//found.unshift(chunk);
						found.push(chunk);
					}
				}
				
				return found;
			}
				
			// pick best match based on prior knowledge & past experience
			// along with a serendipitous sprinkling of gaussian noise
			let best, strength;
			for (let i = 0; i < matched.length; ++i) {
				let chunk = matched[i];
				if (best) {
					let chunkStrength = graph.noise(chunk);
					if (strength < chunkStrength) {
						best = chunk;
						strength = chunkStrength;
					}
				} else {
					best = chunk;
					strength = graph.noise(chunk);
				}
			}
			
			if (strength >= minimum_strength) {
				graph.activate(best);
				return best;
			}
		}
	};
	
	graph.delete = function (type, values, id) {
	// *** fix me to work if the type is undefined
	// but no type and no values would clear entire graph
		if (id) {
			let chunk = graph.chunks[id];
			if (chunk)
				graph.remove(chunk);
		} else if (type) {
			let chunks = graph.types[type];
			let matched = matching_values(chunks, values);
		
			for (let i = 0; i < matched.length; ++i) {
				graph.remove(matched[i]);
			}
		} else
			console.assert(type, "graph.delete with undefined type");
	};

	// create a new chunk with given type and values
	// unless there is an existing matching chunk
	graph.put = function (type, values, id) {
		// type and values must be defined, id can be undefined
		let chunk = id !== undefined ? graph.chunks[id] : graph.get(type, values);
		
		if (chunk === undefined) {
			chunk = new Chunk(type, id);
			
			for (let name in values) {
				chunk.properties[name] = values[name];
			}
			
			graph.add(chunk);
		} else {
			for (let name in values) {
				chunk.properties[name] = values[name];
			}
			
			graph.activate(chunk);		
		}
		
		return chunk;
	}
	
	// used for @do get using same matching algorithm as for rule conditions
	graph.doGet = function (action, bindings, engine, doNext) {
		console.log("doGet with: " + action.type + " " + JSON.stringify(bindings));
		if (action.type === "word")
			debug = true;
		let id = action.properties["@id"];
		
		if (id) {
			if (id[0] === "?")
				id = bindings[id.substr(1)];
				
			if (re_iso8601.test(id)) {
				let chunk = new Chunk('iso8601', id);
				chunk.properties.year = parseInt(id);
				chunk.properties.month = parseInt(id.substr(6));
				chunk.properties.day = parseInt(id.substr(8));
				return chunk;
			} 
				
			// should this be stochastic and sometimes fail?
			return graph.activate(graph.chunks[id]);
		}
		
		let type = action.properties["@type"];
		
		if (type) {
			if (type[0] === '?')
				type = bindings[type.substr(1)];
		} else 
			type = action.type;
			
		let chunks = this.types[type];
		
		if (chunks) {
			let matched = [];
		
			for (let i = 0; i < chunks.length; ++i) {
				let chunk = chunks[i];
				if (graph.test_constraints(chunk, action, bindings, engine))
					matched.push(chunk);
			}
			
			if (doNext) {
				// forward pass
				let found = [], weak = [], now = graph.now;
				for (let i = 0; i < matched.length; ++i) {
					let chunk = matched[i];
					let strength = graph.noise(chunk);
					if (strength >= minimum_strength) {
						graph.activate(chunk);
						found.push(chunk);
					} else {
						weak.push(chunk);
					}
				}
				
				// backward pass
				for (let i = weak.length - 1; i >= 0; --i) {
					let chunk = weak[i];
					let strength = graph.noise(chunk);
					if (strength >= minimum_strength) {
						console.log("lifted: " + chunk.id);
						graph.activate(chunk);
						found.unshift(chunk);
					} else {
						console.log("*** unable to recall " + 
							action.type + " " + JSON.stringify(bindings) +
							" strength: " + strength +
							" ("+ chunk.strength +")");
					}
				}

				return found;
			}

			if (matched && matched.length > 0) {
				// pick best match based on prior knowledge & past experience
				// along with a serendipitous sprinkling of gaussian noise
				let best, strength;
				for (let i = 0; i < matched.length; ++i) {
					let chunk = matched[i];
					if (best) {
						let level = graph.noise(chunk);
						if (strength < level) {
							best = chunk;
							strength = level;
						}
					} else {
						best = chunk;
						strength = graph.noise(chunk);
					}
				}
			
				if (strength >= minimum_strength) {
					graph.activate(best);
					console.log("doGet returning: " + best.toString(CONCISE));
					return best;
				} else {
					console.log("*** unable to recall " + 
						action.type + " " + JSON.stringify(bindings) +
						" strength: " + strength +
						" ("+ chunk.strength +")");
				}
			}
		}
	};
	
	// used for @do forget using same matching algorithm as for rule conditions
	graph.doDelete = function (action, bindings, engine) {
		let id = action.properties["@id"];
		
		if (id) {
			if (id[0] === '?')
				id = bindings[id.substr(1)];
				
			let chunk = graph.chunks[id];
			
			if (chunk)
				graph.remove(chunk);
		} else {
			let type = action.properties["@type"];
		
			if (type) {
				if (type[0] === '?')
					type = bindings[type.substr(1)];
			} else
				type = action.type;
			
			let chunks = this.types[action.type];
		
			if (chunks) {
				let matched = [];
		
				for (let i = 0; i < chunks.length; ++i) {
					let chunk = chunks[i];
					if (graph.test_constraints(chunk, action, bindings, engine))
						matched.push(chunk);
				}
		
				for (let i = 0; i < matched.length; ++i) {
					graph.remove(matched[i]);
				}
			}
		}
	};
		
	// used for @do remember using same matching algorithm as for rule conditions
	// if the ID is left unspecified we search for a matching chunk to update
	// using a stochastic selection from amongst matching chunks 
	graph.doPut = function (action, bindings, engine) {
		let buffer = engine.getModule(action).readBuffer();
		if (buffer) console.log("doPut with buffer: " + buffer.toString(CONCISE));
		let update = function (chunk) {
			// copy over properties from module buffer
			if (buffer && buffer.properties) {
				for (let name in buffer.properties) {
					if (name[0] === '@') {
						if (name !== "@subject" && name !== "@object")
							continue;
					}
					
					if (buffer.properties.hasOwnProperty(name)) {
						let value = buffer.properties[name];
				
						if (Array.isArray(value)) {
							let list = [];
					
							for (let i = 0; i < value.length; ++i)
								list[i] = value[i];
						
							chunk.properties[name] = list;
						} else
							chunk.properties[name] = value;	
					}
				
				}
			}
			
			// copy over properties from action chunk
			for (let name in action.properties) {
				if (name[0] === '@')
					continue;
					
				if (action.properties.hasOwnProperty(name)) {
					let value = action.properties[name];
				
					if (value[0] === '?')
						value = bindings[value.substr(1)];
				
					if (Array.isArray(value)) {
						let list = [];
					
						for (let i = 0; i < value.length; ++i)
							list[i] = value[i];
						
						chunk.properties[name] = list;
					} else
						chunk.properties[name] = value;	
				}
			}
			console.log("doPut with: " + chunk.toString(CONCISE));
		};
		
		// is the chunk to be updated named with @id ?
		
		let id = action.properties['@id'];
		let chunk;
		
		if (id) {
			if (id[0] === '?') {
				id = bindings[id.substr(1)];
			}
			
			if (id && graph.chunks[id])
				chunk = graph.chunks[id];
		} else {
			// otherwise find best matching chunk for action
			chunk = graph.doGet(action, bindings, engine);
		}
		
		if (!chunk) {
			let type = action.properties["@type"];
		
			if (type) {
				if (type[0] === '?')
					type = bindings[type.substr(1)];
			} else
				type = action.type;

			chunk = new Chunk(type);
			graph.add(chunk);
		}
		
		update(chunk);
		console.log("*** putting: " + chunk.toString({concise:true}));
	};
	
	// return copy of next matching chunk in an implementation dependent order
	graph.next = function (action, bindings) {
		throw new Error("@do next isn't yet implemented");
	};

	// apply handler(this, chunk, context) to all chunks
	// that are an instance of a type which is declared
	// as a kindof the chunk identified by 'kind'
	graph.forall = function (kind, handler, context) {
		let children = this.types['kindof'];
		
		for (let i = 0; i < children.length; ++i) {
			let child = children[i];
			if (child.properties["@object"] === kind) {
				let type = child.properties["@subject"];
				this.forall(type, handler, context);
				let chunks = this.types[type];
				for (let j = 0; j < chunks.length; ++j)
					handler(chunks[j], context);
			}
		}
	};
	
	graph.hasLink = function (subject, label, object) {
		let chunks = this.types[label];
		
		if (chunks) {
			for (let i = 0; i < chunks.length; ++i) {
				let props = chunks[i].properties;
			
				if (props.subject === subject && props.object === object)
					return true;
			}
		}
				
		return false;
	};
	
	graph.updateType = function (chunk, newType) {
		if (chunk.type !== newType) {
			let oldType = chunk.type;
			chunk.type = newType;
			
			if (!this.types[newType])
				this.types[newType] = [];

			this.types[newType].push(chunk);
			this.rememberLink(chunk, newType);
			
			let list = this.types[oldType];
			let i = find(list, chunk);
			list.splice(i, 1);
		
			this.forgetLink(chunk, oldType);			
		}
	};
	
	graph.add = function (chunk) {
		if (chunk === undefined) {
			throw new Error("trying to add undefined chunk");
		}
		
		// if it belongs to another graph we need to
		// remove it before adding it to this graph
		if (chunk.graph !== undefined) {
			if (chunk.graph === graph && chunk === graph.chunks[chunk.id]) {
				graph.activate(chunk);
				return; // already in this graph
			}
		
			chunk.graph.remove(chunk);
		}
		
		chunk.graph = graph;
		
		// overwriting an existing chunk with same id?
		
		if (chunk.id !== undefined) {
			let old = graph.chunks[chunk.id];
			if (old) {
				graph.remove(old);
			}
		} else {
			chunk.id = graph.gensym();
		}

		graph.chunks[chunk.id] = chunk;
		
		if (!graph.types[chunk.type])
			graph.types[chunk.type] = [];

		graph.types[chunk.type].push(chunk);
		
		graph.rememberLink(chunk, chunk.type);
		let props = chunk.properties;
		
		for (let name in props) {
			if (props.hasOwnProperty(name)) {
				value = props[name];
				if (Array.isArray(value)) {
					for (let i = 0; i < value.length; ++i) {
						graph.rememberLink(chunk, value[i]);
					}
				} else {
					graph.rememberLink(chunk, value);
				}
			}
		}

		let context = chunk.properties["@context"];
		
		if (context) {
			let map = graph.contexts[context];
			
			if (map === undefined)
				map = graph.contexts[context] = {};
				
			map[chunk.id] = chunk;
		}
			
		if (chunk.strength === undefined)
			chunk.strength = 1;
			
		if (chunk.lastAccessed === undefined)
			chunk.lastAccessed = graph.now;
			
		if (chunk.usage === undefined)
			chunk.usage = 1.0;
			
		this.lastAdded = chunk;
		this.count++;
		return chunk;
	};
	
	graph.remove = function (chunk) {
		if (chunk === undefined) {
			throw new Error("trying to remove undefined chunk");
		}
		
		if (chunk.type === "word")
			debug = true;
						
		this.forgetLink(chunk, chunk.type);
		let props = chunk.properties;
		
		for (let name in props) {
			if (props.hasOwnProperty(name)) {
				value = props[name];
				if (Array.isArray(value)) {
					for (let i = 0; i < value.length; ++i) {
						this.forgetLink(chunk, value[i]);
					}
				} else {
					this.forgetLink(chunk, value);
				}
			}
		}
		
		let context = chunk.properties["@context"];
		
		if (context) {
			let map = this.contexts[context];
			
			if (map) {
				delete map[chunk.id];
				
				let count = 0;
				
				for (let id in map) {
					if (map.hasOwnProperty(id)) {
						++count;
						break;
					}
				}
				
				if (count === 0)
					delete this.contexts[context];
			}
		}
		
		this.count--;
		delete this.chunks[chunk.id];
		let list = this.types[chunk.type];
		let i = find(list, chunk);
		list.splice(i, 1);

		chunk.id = undefined;
		chunk.graph = undefined;
		chunk.strength = undefined;
		chunk.lastAccessed = undefined;
		chunk.usage = undefined;
	};
	
	graph.addToContext = function (chunk, context) {
		if (chunk.graph) {
			chunk.graph.remove(chunk);
		}
		
		chunk.properties["@context"] = context;
		return graph.add(chunk);
	};
			
	graph.removeContext = function (context) {
		context = graph.contexts[context];
		if (context) {
			for (let id in context) {
				if (context.hasOwnProperty(id)) {
					graph.remove(context[id]);
					delete context[id];
				}
			}
		}
	};
	
	graph.chunkCount = function () {
		return graph.count;
	};
	
	graph.typeCount = function (type) {
		let list = graph.types[type];
		
		return list ? list.length : 0;
	};
	
	const PARSE_ALL = 0;
	const PARSE_CHUNK = 1;
	
	graph.parseChunk = function (source) {
		return graph.parse(source, PARSE_CHUNK);
	};
	
	graph.parse = function (source, mode) {
		if (source === undefined || source === "")
			return;
			
		if (mode === undefined)
			mode = PARSE_ALL;
	
		const END_OF_INPUT = 0;
		const WHITE_SPACE = 1;
		const PUNCTUATION = 2;
		const NAME = 3;
		const VALUE = 4;
		const ISO8601 = 5;
		const STRING = 6;
		const NUMBER = 7;
		const BOOLEAN = 8;
		const NULL = 9;
				
		let map = {};  // map from source code ids to graph ids
		
		let add_chunk = function (chunk) {
			if (chunk.properties["@strength"] !== undefined) {
				chunk.strength = chunk.properties["@strength"];
				delete chunk.properties["@strength"];
			}
			
			chunk.lastAccessed = graph.now;

			if (chunk.properties["@ago"] !== undefined) {
				let ago = chunk.properties["@ago"];
				
				if (typeof ago === "number")
					chunk.lastAccessed -= ago;
					
				delete chunk.properties["@ago"];
			}
			
			if (chunk.properties["@use"] !== undefined) {
				let usage = chunk.properties["@use"];
				
				if (typeof usage === "number")
					chunk.usage = usage;
					
				delete chunk.properties["@use"];
			}
			
			
			graph.add(chunk);
		};

		let skip_white = function(lexer) {
			while (lexer.here < lexer.length) {
				let c = lexer.source[lexer.here];
				
				if (c === '\r' && !lexer.source[++lexer.here] === '\n') {
					lexer.line_start = lexer.here;
					lexer.line++;
				}
				
				if (! /\s/.test(c))
					return c;
					
				if (c === '\n') {
					lexer.line_start = lexer.here + 1;
					lexer.line++;
				}
					
				lexer.here++;
			}
			
			return null;
		};
		
		let skip_line = function (lexer) {
			while (lexer.here < lexer.length) {
				let c = lexer.source[lexer.here];
				
				if (c === '\r' && !lexer.source[++lexer.here]) {
					lexer.line_start = lexer.here;
					lexer.line++;
				}
				
				if (c === '\n') {
					lexer.line_start = ++lexer.here;
					lexer.line++;
					break;
				}
					
				lexer.here++;
			}
			
			return;
		};
		
		let missing_value = function (lexer) {
			let line = lexer.line;
			skip_white(lexer);
			
			// new line
			if (lexer.line !== line)
				return true;
			
			let c = lexer.source[lexer.here];
			
			// punctuation
			if (/[.;,{}=!]/.test(c))
				return true;
			
			return false;
		};
		
		let report_where = function (lexer) {
			return " on line " + lexer.line + ", column " + (1 + lexer.start - lexer.line_start);
		};
		
		let find_end_of_token = function (lexer) {
			let start = lexer.here;
			let c;
			
			while (lexer.here < lexer.length) {
				c = lexer.source[lexer.here];
				
				if (/[\s;,=\}\{]/.test(c))
					break;
					
				lexer.here++;
			}
			
			if (c === '=') {
				c = lexer.source[lexer.here++];
				if (c === '>')
					return lexer.here - start;
			}
						
			return lexer.here - start;
		};
		
		let parse_string = function (lexer) {
			let c, last, length, start;
			start = lexer.here++;
			last = -1;
			
			while (lexer.here < lexer.length) {
				c = lexer.source[lexer.here++];
			
				if (c === '"' && last !== '\\') {
					length = lexer.here - start;
					lexer.token = lexer.source.substr(start, length);
					lexer.type = STRING;
					lexer.value = lexer.token;
					return true;
				}
				
				last = c;
			}
			
			throw new Error("Unexpected end of string" + report_where(lexer));
		};
						
		let lexer = {
			graph: this,
			source: source,
			length: source.length,
			here: 0,
			line: 1,
			line_start: 0,
			start: 0,
			next: 0,
			blank: {},
			token: null,
			type: null,
			peek: function () {
				if (lexer.here < lexer.length) {
					return lexer.source[lexer.here];
				}
			},
			next: function () {
				for (;;) {
					let c = skip_white(lexer);
					lexer.start = lexer.here;
				
					if (c === null) {
						lexer.type = END_OF_INPUT;
					} else if (c === '#') {
						skip_line(lexer);
						continue;
					} else if (/[.;,{}=!]/.test(c)) {
						lexer.type = PUNCTUATION;
						lexer.token = c;
						lexer.here++;
					} else if (c === '"') {
						parse_string(lexer);
					} else {
						// look for end of token and then classify
						let token_start = lexer.here;
						let token_length = find_end_of_token(lexer);
						let token = lexer.token = source.substr(token_start, token_length);
						
						if (/^true|false$/.test(token)) {
							lexer.type = BOOLEAN;
							lexer.value = (lexer.token === "true" ? true : false);
						} else if (re_number.test(token)) {
							lexer.type = NUMBER;
							lexer.value = parseFloat(token);
						} else if (re_iso8601.test(token)) {
							lexer.type = NAME;
							lexer.value = lexer.token;
						} else if (re_name.test(token)) {
							lexer.type = NAME;
							lexer.value = lexer.token;
						} else if (re_value.test(token)) {
							lexer.type = VALUE;
							lexer.value = lexer.token;
						} else if (re_uri.test(token)) {
							lexer.type = STRING;
							lexer.value = lexer.token;
						} else {
							throw new Error("Unexpected '" + token + "'" + report_where(lexer));
						}
					}
					
					break;
				}
			},
			parseValue: function () {
				let negated = false;
				if (lexer.token === "!") {
					negated = true;
					
					if (missing_value(lexer)) {
						return new Negate();
					}
					
					lexer.next();
				}
				
				if (lexer.type !== NAME &&
				    lexer.type !== VALUE &&
					lexer.type !== NUMBER &&
					lexer.type !== BOOLEAN &&
					lexer.type !== STRING) {
					throw new Error("Expected name token" + report_where(lexer));
				}

				if (negated)
					return new Negate(lexer.value);
					
				return lexer.value;
			},
			parseChunk: function (type, id) {
				let chunk;
				lexer.next();
				
				while (lexer.type !== PUNCTUATION) {
					
					if (lexer.type === END_OF_INPUT)
						throw new Error("Unexpected end of input" + report_where(lexer));
						
					if (lexer.type !== NAME) {
						throw new Error("Expected name token" + report_where(lexer));
					}
					
					let name = lexer.token;
					let line = lexer.line;
						
					lexer.next();
					
					value = lexer.parseValue();
											
					if (!chunk) {
						chunk = new Chunk(type, id);
					}
					
					chunk.properties[name] = value;
		
					lexer.next();
					
					if (lexer.token === '}')
						break;
						
					if (lexer.token === ';') {
						lexer.next();
						continue;
					}
					
					if (lexer.type === PUNCTUATION && lexer.token === ',') {
						chunk.properties[name] = [value];
					
						while (lexer.type === PUNCTUATION && lexer.token === ',') {
							lexer.next();
						
							if (lexer.type === END_OF_INPUT)
								throw new Error("Unexpected end of input" + report_where(lexer));
							
							value = lexer.parseValue();								
							chunk.properties[name].push(value);
							lexer.next();
						}
					}
					
					if (lexer.token === ';') {
						lexer.next();
						continue;
					}

					if (lexer.token === '}')
						continue;
					
					if (! (lexer.line > line))
						throw new Error("Expected line break after '" + value + "'" + report_where(lexer));
				}
				
				if (lexer.token !== '}')
					throw new Error("Expected }" + report_where(lexer));
					
				if (!chunk)
					chunk = new Chunk(type, id);
					
				lexer.next();
				return chunk;
			}
		}
		
		const CHUNK = 0;
		const LINK = 1
		const COMMA = 2;
		const RULE = 3;
				
		let line = 0;
		lexer.next();
		let rule = list = chunk = null;
		let last = CHUNK;
		let negated =  false;
		
		while (true) {
			if (lexer.type === END_OF_INPUT) {
				if (rule) {
					if (!chunk)
						throw new Error("Missing action(s) for rule" + report_where(lexer));
						
					if (list) {
						list.push(chunk.id);
						rule.properties['@action'] = list;
					} else {
						rule.properties['@action'] = chunk.id;
					}
				} else if (last === COMMA) {
					throw new Error("Unexpected comma on line" + report_where(lexer));
				}
				
				break;
			}
			
			if (lexer.token === '!') {
				negated = true;
				lexer.next();
				continue;
			}

			if (lexer.type === PUNCTUATION) {
				if (!chunk) {
					if (lexer.token === "=" && lexer.peek() === ">") {
						lexer.token = "=>";
						lexer.here++;
					}
						
					throw new Error("Unexpected punctuation '" + lexer.token + "'" + report_where(lexer));
				}
					
				if (lexer.token === ",") {
					// comma separates conditions or actions for rules
					if (!list)
						list = [];
						
					if (chunk.negated) {
						list.push(new Negate(chunk.id));
					} else {
						list.push(chunk.id);
					}

					lexer.next();
					last = COMMA;
					continue;
					
				} else 	if (lexer.token === "=" && lexer.peek() === ">") {
					// [!]condition[,[!]condition]* '=>' action[,action]*
					lexer.here++;
					rule = new Chunk('rule');
					add_chunk(rule);
					
					if (list) {
						if (chunk.negated) {
							list.push(new Negate(chunk.id));
						} else {
							list.push(chunk.id);
						}
						
						rule.properties['@condition'] = list;
					} else if (chunk.negated) {
						rule.properties['@condition'] = new Negate(chunk.id);
					} else {
						rule.properties['@condition'] = chunk.id;
					}
					
					list = chunk = null;
					
					lexer.next();
					last = RULE;
					continue;
				}
			}
			
			if (lexer.type !== NAME) {
				throw new Error("Unexpected '" + lexer.token + "'" + report_where(lexer));
			}
			
			let name1 = lexer.token;
			
			lexer.next();
			
			if (lexer.type === PUNCTUATION) {
				if (lexer.token !== "{")
					throw new Error("Unexpected '" + lexer.token + "'" + report_where(lexer));
					
				if (chunk && last === CHUNK) {
					if (rule) {
						if (list) {
							list.push(chunk.id);
							rule.properties['@action'] = list;
						} else {
							rule.properties['@action'] = chunk.id;
						}
					}
					
					rule = list = null;
				}
									
				chunk = lexer.parseChunk(name1);
				
				if (negated) {
					chunk.negated = true;
					negated = false;
				}
					
				if (mode === PARSE_CHUNK)
					return chunk;
					
				add_chunk(chunk);				
				last = CHUNK;
				continue;
			} else if (lexer.type !== NAME)
				throw new Error("Expected name token" + report_where(lexer));

			// could be chunk id or relation
			let name2 = lexer.token;
			
			lexer.next();
			
			if (lexer.type === PUNCTUATION) {
				if (lexer.token !== "{")
					throw new Error("Expected {" + report_where(lexer));

				if (chunk && last === CHUNK) {
					if (rule) {
						if (list) {
							list.push(chunk.id);
							rule.properties['@action'] = list;
						} else {
							rule.properties['@action'] = chunk.id;
						}
					}
					
					rule = list = null;
				}
				
				chunk = lexer.parseChunk(name1, name2);
				
				if (mode === PARSE_CHUNK)
					return chunk;
					
				add_chunk(chunk);
				last = CHUNK;
				continue;
			} else if (lexer.type === NAME) {
				let subject = name1;
				let predicate = name2;
				let object = lexer.token;

				if (! (lexer.line > line))
					throw new Error("Expected line break after '" + object + "'" + report_where(lexer));
					
				if (last === CHUNK && rule) {
					if (list) {
						list.push(chunk.id);
						rule.properties['@action'] = list;
					} else {
						rule.properties['@action'] = chunk.id;
					}
					
					rule = list = chunk = null;					
				}
					
				if (last === RULE)
					throw new Error("Missing action(s) for rule" + report_where(lexer));
					
				if (last === COMMA)
					throw new Error("Missing chunk after comma" + report_where(lexer));
					
				// add new link as a subclass of chunk
				add_chunk(new Link(subject, predicate, object));
				last = LINK;
				
				rule = list = id = null;
			} else {
				throw new Error("Expected name token" + report_where(lexer));
			}
			
			line = lexer.line;
			lexer.next();
		}
	};
	
	graph.toString = function () {
		const options = {concise:false};
		let s = "";
		let graph = this;
		forall (this.chunks, function (id) {
			let chunk = graph.chunks[id];
			s += chunk.toString(options);
		});
		return s;
	};
	
	graph.contextToString = function (context) {
		const options = {concise:false};
		let chunks = context !== undefined ? graph.contexts[context] : graph.chunks;
		let s = "";
		forall (chunks, function (id) {
			let chunk = chunks[id];
			s += chunk.toString(options);
		});
		return s;		
	};
	
	graph.ruleToString = function (chunk) {
		let rule = chunk;
		const options = {concise:true, rule:true};
		
		if (typeof(chunk) === "string")
			rule = graph.chunks[id];

		if (rule && rule.type === 'rule') {
			let conditions = rule.properties["@condition"];
			let actions = rule.properties["@action"];
			let text = "";
			
			if (Array.isArray(conditions)) {
				for (let i = 0; i < conditions.length; ++i) {
					let cond = conditions[i];
					
					if (cond.negate) {
						cond = cond.negate;
						text += '!' + graph.chunks[cond].toString(options);
					} else {
						text += graph.chunks[cond].toString(options);
					}
					
					if (i < conditions.length - 1)
						text += ',\n';
				}
			} else {
				let cond = conditions;
				if (cond.negate) {
					cond = cond.negate;
					text += '!' + graph.chunks[cond].toString(options);
				} else {
					text += graph.chunks[cond].toString(options);
				}
			}
			text += "\n => \n";
			
			if (Array.isArray(actions)) {
				for (let i = 0; i < actions.length; ++i) {
					text += "   " + graph.chunks[actions[i]].toString(options);
					if (i < actions.length - 1)
						text += ',\n';
				}
			} else {
				text += graph.chunks[actions].toString(options);
			}
			
			return text;
		}
		
		return "";
	};
	
	graph.rulesToString = function () {
		let rules = graph.types['rule'];
		let text = "";
		
		if (rules && rules.length > 0) {
			for (let i = 0; i < rules.length; ++i)
				text += graph.ruleToString(rules[i]) + "\n";
		}
		
		return text;
	};
		
	if (source) 
		graph.parse(source);
}

function RuleEngine (log){
	let engine = this;	
	let modules = {};
	let matchedBuffer = {};
	let singleStep = true;
	let runPending = false;
	let unchanged = true;
	
	if (!log)
		log = console.log;
	
	let randomIntFromInterval = function (min, max) {
  		return Math.floor(Math.random() * (max - min + 1)) + min;
	};
	
	// these three functions are used to detect when the buffers
	// used in a rule's conditions are unchanged by that rule
	// so that the same rule risks being pointlessly reapplied
	// by testing for this here, rules don't need to clear the goal
	
	let clearStatus = function (name) {
		if (unchanged && modules.goal)
			modules.goal.clearBuffer();
			
		unchanged = true;
		matchedBuffer = {};
	};
		
	let updatedBuffer = function (module) {
		if (matchedBuffer[module.name])
			unchanged = false;
	};

	let noteConditionModules = function (rule) {
		let conditionModule = function (chunk) {
			let name = "goal";
			if (chunk.properties["@module"])
				name = chunk.properties["@module"];
			matchedBuffer[name] = true;
		};
	
		let ids = rule.properties["@condition"];
		let id;
		
		if (Array.isArray(ids)) {
			for (let i = 0; i < ids.length; ++i) {
				id = ids[i];
				
				if (id instanceof Negate)
					id = id.negate;
					
				conditionModule(getCondition(id));
			}
		} else {
			id = ids;
				
			if (id instanceof Negate)
				id = id.negate;
					
			conditionModule(getCondition(id));
		}
	};
	
	let Module = function (name, graph, algorithms) {
		let module = this;
		module.updated = false;

		module.name = name;
		module.graph = graph ? graph : new ChunkGraph();
		module.algorithms = (algorithms !== undefined ? algorithms : {});
		graph.module = module;
		
		module.tasks = {};  // for tasks
		
		// Every module has a single chunk buffer
	
		let chunkBuffer;		// chunk buffer
		let chunkList;			// for iterations
		let chunkQueue = [];	// priority queue
		
		// actions change the status of the module's buffer
		let bufferStatus = "okay";  // pending, okay, nomatch, failed, or forbidden
					
		module.queueLength = function () {
			return chunkQueue.length;
		};
	
		// pushes chunk into priority queue where
		// lowest priority is 1 and maximum is 10
		// and priority is stored in chunk.priority
		module.pushBuffer = function (chunk) {
			if (chunk.id === undefined)	
				chunk.id = module.graph.gensym();

			log("push buffer with: " + chunk);

			if (chunkBuffer === undefined) {
				chunkBuffer = chunk;
				log('set goal to: ' + chunk);
				updatedBuffer(module);
				
				if (!singleStep)
					engine.run();
			} else {
				let priority = chunk.priority;
			
				if (priority === undefined)
					priority = 5;
				
				// search queue for where to insert chunk
			
				if (chunkQueue.length === 0) {
					chunkQueue.push(chunk);
				} else {
					for (let i = 0; i < chunkQueue.length; ++i) {
						let c = chunkQueue[i];
						let p = c.priority === undefined ? 5 : c.priority;
						
						if (priority <= p) {
							chunkQueue.splice(i, 0, chunk);	
							return;
						}
					}
				
					chunkQueue.push(chunk);
				}
			}
		};

		module.popBuffer = function () {
			if (chunkQueue.length > 0) {
				chunkBuffer = chunkQueue.pop();
				log('popped buffer: ' + chunkBuffer);
				
				if (!singleStep)
					engine.run();
			} else
				chunkBuffer = undefined;
		
			updatedBuffer(module);
			return chunkBuffer;
		};
	
		module.clearBuffer = function () {
			chunkBuffer = undefined;
			log('cleared ' + module.name + ' buffer');
			module.popBuffer();
		};
	
		// overwrites buffer independently of the queue
		module.writeBuffer = function (chunk) {
			if (chunk === undefined)
				console.log("writing undefined chunk to buffer");
				
			chunkBuffer = chunk;
			updatedBuffer(module);
			log('set ' + module.name + ' to: ' + chunk);
			
			if (!singleStep)
				engine.run();
		};
	
		module.readBuffer = function () {
			return chunkBuffer
		};
		
		module.pending = function () {
			bufferStatus = "pending";
			
		};
		
		module.setStatus = function (status) {
			bufferStatus = status;
		};
		
		module.getStatus = function () {
			return bufferStatus;
		};
		
		module.first = function (list) {
			chunkList = null;
			
			if (list !== undefined) {
				if (!Array.isArray(list))
					return list;
			
				chunkList = list;
				return module.next();
			}
		};
		
		module.next = function () {
			if (chunkList && chunkList.length > 0) {
				log("list length = " + chunkList.length);
				log("list is " + chunkList);
				let chunk = chunkList.shift();
				chunk.properties["@more"] = chunkList.length > 0 ? true : false;
				return chunk;
			}
			
			chunkList = null;
		};
	}

	engine.addModule = function (name, graph, algorithms) {			
		return modules[name] = new Module(name, graph, algorithms);
	};
	
	engine.getModule = function (condition) {
		let name = condition.properties["@module"];
		
		if (name === undefined)
			name = "goal";
			
		return modules[name];
	};

	engine.getModuleByName = function (name) {
		if (name)
			return modules[name];
	};
	
	engine.setTime = function (now) {
		if (now === undefined)
			now = Date.now()/1000.0;
			
		for (let name in modules) {
			if (modules.hasOwnProperty(name)) {
				let graph = modules[name].graph;
				graph.now = now;
			}
		}
	};
	
	engine.getBuffer = function (name) {
		let module = modules[name];
		
		if (module !== "undefined")
			return module.readBuffer();
		
		log("unknown module: " + name);
	};
	
	engine.setBuffer = function (name, chunk) {
		let module = modules[name];
		
		if (module !== "undefined") {
			if (typeof (chunk) === 'string')
				chunk = module.graph.parseChunk(chunk);
			
			module.writeBuffer(chunk);
			return chunk;
		}
		
		log("unknown module: " + name);
	};
	
	engine.getGoal = function () {
		return engine.getBuffer('goal');
	};
	
	engine.setGoal = function (source) {
		let goals = modules.goal;
		
		if (!goals)
			goals = this.addModule('goal', new ChunkGraph());
			
		if (source !== undefined && source !== null && source.length) {
			let chunk = goals.graph.parseChunk(source);
		
			if (chunk)
				goals.writeBuffer(chunk);
		} else {
			goals.clearBuffer();
		}
	};
	
	let getCondition = function (id) {
		return modules.rules.graph.chunks[id];
	};
	
	let getAction = function (id) {
		return modules.rules.graph.chunks[id];
	};
	
	// find which task the conditions selected for a given module
	// we use the first condition that explicitly names a task
	let find_task = function (rule, module, bindings) {
		let conditions = rule.properties["@condition"];
		if (Array.isArray(conditions)) {
			for (let i = 0; i < conditions.length; ++i) {
				let id = conditions[i]; // chunk id
				let condition = getCondition(id); // chunk for condition
				if (engine.getModule(condition) === module) {
					let task = condition.properties["@task"];
					if (typeof(task) === "string") {
						if (task[0] === '?') {
							task = bindings[task.substr(1)];
							if (typeof(task) === "string")
								return task;
						} else {
							return task;
						}						
					}
				}
			}
		} else {
			// single condition
			let condition = getCondition(conditions);
			if (engine.getModule(condition) === module) {
				let task = condition.properties["@task"];
				if (typeof(task) === "string") {
					if (task[0] === '?') {
						task = bindings[task.substr(1)];
						if (typeof(task) === "string")
							return task;
					} else {
						return task;
					}
				}
			}
		}
	};
	
	// action is a chunk
	let apply_action = function (rule, action, bindings) {
		let module_name = "goal";
		let operation = "update";
		let properties = action.properties;
		
		if (properties["@module"])
			module_name = properties["@module"];
						
		let module = modules[module_name];
				
		if (properties["@do"])
			operation = properties["@do"];
			
		// get property values instantiating any variables
		
		let values = {};
		
		let mapValue = function (name, value) {
			if (value instanceof Negate) {
				if (operation !== "update") {
					throw new Error("illegal action property: "
							 + name + " with value " + value);
				}
							 
				value = new Negate(mapValue(name, value.negate));
			} else {
				if (typeof value === "string" && value[0] === "?") {
					let v = value.substr(1);
					value = bindings[v];
					
					if (value === undefined) {
						log("undefined variable in property "
							 + name + " with value " + value);
					}
				}
			}

			return value;
		};
		
		const mapName = {
			"@id": true,
			"@type": true,
			"@for": true,
			"@from": true,
			"@to": true,
			"@push": true,
			"@pop": true,
			"@unshift": true,
			"@shift": true,
			"@state": true,
			"@subject": true,
			"@object": true,
			"@more": true,
			"@enter": true,
			"@leave" : true
		};
			
		for (let name in properties) {	
			if (name[0] === "@" && !mapName[name])
				continue;
				
			let value = properties[name];
			
			if (Array.isArray(value)) {
				let list = [];
				for (let i = 0; i < value.length; ++i) {
					list[i] = mapValue(name, value[i]);
				}
				value = list;
			}
			values[name] = mapValue(name, value);
		}
		
		//log('apply ' + action + ' with bindings ' + JSON.stringify(bindings));

		if (properties["@for"]) {
			module.setStatus("okay");
			let items = values["@for"];
			let from = values["@from"];
			let to = values["@to"];
			let list = [];
			
			if (from === undefined)
				from = 0;
			else if (typeof from === "number")
				from = Math.floor(from);
			else
				throw new Error("illegal @from value: " + values["@from"]);
				
			if (to === undefined)
				to = items.length - 1;
			else if (typeof to === "number")
				to = Math.floor(to);
			else
				throw new Error("illegal @to value: " + values["@to"]);
				
			if (items) {
				if (Array.isArray(items)) {
					for (let i = from; i <= to; ++i) {
						let chunk = action.clone(true);
						chunk.properties.value = items[i];
						chunk.properties["@index"]= i;
						chunk.properties["@more"]= i < to;
						list.push(chunk);
					}
				} else {
					let chunk = action.clone(true);
					chunk.properties.value = items;
					chunk.properties["@index"]= 0;
					chunk.properties["@more"]= false;
					list.push(chunk);
				}
				module.writeBuffer(module.first(list));
			}
			
			return "for";
		}
		
		// push value to end of list in named property
		if (properties.hasOwnProperty("@push")) {
			let value = values["@push"];
			let name = values["@to"];
			let buffer = module.readBuffer();
			let list;
			if (buffer.properties.hasOwnProperty(name)) {
				list = buffer.properties[name];
				if (Array.isArray(list))
					list.push(value);
				else {
					buffer.properties[name] = [list, value];
				}	
			} else
				buffer.properties[name] = value;
				
			console.log("pushed " + value + " to " + name + " yielding: " + buffer.properties[name]);
			module.updated = true;
			return "push";
		}
				
		// push value to start of list in named property
		if (properties.hasOwnProperty("@unshift")) {
			let value = values["@unshift"];
			let name = values["@to"];
			let buffer = module.readBuffer();
			let list;
			if (buffer.properties.hasOwnProperty(name)) {
				list = buffer.properties[name];
				if (Array.isArray(list))
					list.unshift(value);
				else {
					buffer.properties[name] = [value, list];
				}	
			} else
				buffer.properties[name] = value;
				
			module.updated = true;
			return "push";
		}
				
		// pop value from end of list in named property
		if (properties.hasOwnProperty("@pop")) {
			let to = values["@to"];
			let name = values["@pop"];
			let buffer = module.readBuffer();
			
			if (buffer.properties.hasOwnProperty(name)) {
				let list = buffer.properties[name];
				if (Array.isArray(list)) {
					buffer.properties[to] = list.pop();
					if (list.length === 0)
						delete buffer.properties[name];
				} else {
					buffer.properties[to] = list;
					delete buffer.properties[name];
				}
			
				module.updated = true;
			}
			return "pop";
		}
				
		// pop value from end of list in named property
		if (properties.hasOwnProperty("@shift")) {
			let to = values["@to"];
			let name = values["@shift"];
			let buffer = module.readBuffer();
			let list = buffer.properties[name];
			
			if (buffer.properties.hasOwnProperty(name)) {
				let list = buffer.properties[name];
				if (Array.isArray(list)) {
					buffer.properties[to] = list.shift();
					if (list.length === 0)
						delete buffer.properties[name];
				} else {
					buffer.properties[to] = list;
					delete buffer.properties[name];
				}
			
				module.updated = true;
			}
			return "shift";
		}
				
		if (operation === "update") {
			let old = module.readBuffer();
			let buffer = new Chunk(action.type);
			
			// copy buffer's current properties
			
			if (old) {
				let properties = old.properties;
			
				for (let name in properties) {
					if (properties.hasOwnProperty(name))
						buffer.properties[name] = properties[name];
				}
			}
			
			// values contains the variable bindings
			
			for (let name in values) {
				if (name[0] === "@" && name !== "@enter"  && name !== "@leave"
					 && name !== "@more" && name !== "@subject" && name !== "@object")
					continue;
					
				if (values.hasOwnProperty(name)) {
					if ((values[name] instanceof Negate) && values[name].negate === undefined) {
						delete buffer.properties[name];
					} else if (name === "@enter") {
						let value = values[name];
						if (Array.isArray(value)) {
							for (let i = 0; i < value.length; ++i) {
								log("entering " + value[i]);
								module.tasks[value[i]] = true;
							}
						} else {
							log("entering " + value);
							module.tasks[value] = true;
						}
						delete buffer.properties["@enter"];
						delete buffer.properties["@task"];
					} else if (name === "@leave") {
						let value = values[name];
						if (Array.isArray(value)) {
							for (let i = 0; i < value.length; ++i) {
								log("exiting " + value[i]);
								delete module.tasks[value[i]];
							}
						} else {
							log("exiting " + value);
							delete module.tasks[value];
						}
						delete buffer.properties["@leave"];
						delete buffer.properties["@task"];
					} else {
						buffer.properties[name] = values[name];
					}
				}
			}
						
			module.setStatus("okay");
			module.writeBuffer(buffer);
		} else if (operation === "clear") {
			module.setStatus("okay");
			module.clearBuffer();
		} else if (operation === "get") {
			module.setStatus("pending");
			log("@do get");
			let chunk = module.graph.doGet(action, bindings, engine, false);
			
			if (chunk) {
				module.setStatus("okay");
				module.writeBuffer(chunk.clone())
			} else {
				log("failed to get chunk")
				module.clearBuffer();
				module.setStatus("nomatch");
			}
		} else if (operation === "next") {
			log("@do next");
			module.setStatus("okay");
			let chunk = module.next();
			
			// if the next chunk doesn't match the action, we start afresh
			if (chunk && !module.graph.test_constraints(chunk, action, bindings, engine)) {
				chunk = undefined;
			}
			
			if (!chunk)
				chunk = module.first(module.graph.doGet(action, bindings, engine, true))

			if (chunk)
				module.writeBuffer(chunk);
		} else if (operation === "properties") {
			// foo {@module facts; @do properties; @to goal}
			// iterate properties in fact buffer to goal buffer
			log("@do properties");
			module.setStatus("okay");
			let targetModule = engine.getModuleByName(action.properties["@to"]);
			
			if (!targetModule)
				targetModule = module;
							
			if (targetModule) {
				let list = [];
				let buffer = module.readBuffer();
				
				if (buffer) {
					for (let name in buffer.properties) {
						if (name[0] === '@')
							continue;
							
						if (buffer.properties.hasOwnProperty(name)) {
							let chunk = action.clone(true);
							chunk.properties.name = name;
							chunk.properties.value = buffer.properties[name];
							list.push(chunk);
						}
					}
					targetModule.writeBuffer(targetModule.first(list));
				}
			}
		} else if (operation === "put") {
			log("@do put");
			module.setStatus("okay");
			module.graph.doPut(action, bindings, engine);
		} else if (operation === "delete") {
			log("@do delete");
			module.setStatus("okay");
			module.graph.doDelete(action, bindings, engine);
		} else if (operation === "queue") {
			log("@do queue");
			module.setStatus("okay");
			let chunk = new Chunk(action.type);
			for (let name in action.properties) {
				if (name[0] !== "@" && action.properties.hasOwnProperty(name))
					chunk.properties[name] = values[name];
			}
			if (action.properties["@priority"]) {
				let priority = action.properties["@priority"];
				if (typeof priority === "string")
					priority = parseInt(priority);
					
				if (priority !== undefined && typeof priority === "number") {
					priority = Math.floor(priority);
					if (1 <= priority && priority <= 10)
						chunk.priority = priority;
				}
			}
			module.pushBuffer(chunk);
		} else if (module && module.algorithms[operation]) {
			module.setStatus("okay");
			module.algorithms[operation](action, values, bindings);
 		} else {
			log("unrecognised action: " + operation);
			module.setStatus("failed");
		}
		return operation;
	};
	
	let apply_actions = function (match) {
		let rule = match[0];
		let bindings = match[1];
		let actions = rule.properties["@action"]; // chunk id or list of ids
		noteConditionModules(rule);  // used to avoid looping pointlessly
		
		if (actions === undefined)
			throw (new Error("rule " + rule.id + " is missing @action"));
					
		if (Array.isArray(actions)) {
			for (let i = 0; i < actions.length; ++i) {
				let action = getAction(actions[i]);
				
				if (action === undefined)
					throw (new Error("rule " + rule.id + " is missing action " + actions[i]));
					
				apply_action(rule, action, bindings);
			}
		} else { // single action
			let action = getAction(actions);
			operation = apply_action(rule, action, bindings);
		}
	};
	
	
	// condition specifies which module's buffer it
	// refers to default to the goal module buffer
	let get_buffer = function (condition) {
		let name = condition.properties["@module"];
		
		if (name === undefined)
			name = 'goal';
			
		return modules[name].readBuffer();
	}
	
	// value is a name or a list of names
	// bindings maps variable names to values
	// map to a list of names, substituting variables
	// return undefined if we find an unbound variable
	let get_value_list = function (value, bindings) {
		let list = [];
		if (Array.isArray(value)) {
			for (let i = 0; i < value.length; ++i) {
				if (value[i][0] === '?') {
					list[i] = bindings[value[i].substr(1)];
					
					if (list[i] === undefined)
						return undefined;
				} else
					list[i] = value[i];
			}
			return list;
		}
		
		if (value[0] === '?') {
			value = bindings[value.substr(1)];
			
			if (value === undefined)
				return undefined;
		}
			
		return [value];
	};
	
	// bind variables occurring in a rule's condition
	// return false if there is a problem, e.g. unknown
	// module, or previous bound variable doesn't match
	// chunk's value, or condition doesn't match value
	
	let bind_variables = function (condition, bindings, negated) {
		let chunk = get_buffer(condition);
		
		// fail if buffer is undefined and condition isn't negated?
		if (!chunk && !negated)
			return false;
			
		// can't bind variables on negative match
		// with the sole exception of @status
		if (negated) {
			let name = "@status";

			if (condition.properties[name]) {
				let cond = condition.properties[name];
				let status = engine.getModule(condition).getStatus();
				let negated = false;
				
				if (cond instanceof Negate) {
					negated = true;
					cond = cond.negate;
				}

				if (cond[0] === "?") {
					let v = cond.substr(1);
					if (bindings[v] === undefined) {
						bindings[v] = status;
					} else if (negated) {
						if (bindings[v] === status)
							return false;
					} else if (bindings[v] !== status)
						return false;
				}
			}
		
			return true;
		}

		if (chunk.type !== condition.type && condition.type !== '*')
			return false;	
	
		let properties = condition.properties;
		
		for (let name in properties) {
			if (name[0] === '@') {
				if (name === "@module")
					continue;
					
				if (name === "@id") {
					let cond = properties[name];

					if (cond instanceof Negate)
						cond = cond.negate;

					if (cond[0] === "?") {
						let v = cond.substr(1);
						if (bindings[v] === undefined) {
							bindings[v] = chunk.id;
						}
					}
				} else if (name === "@type") {
					let cond = properties[name];
					
					if (cond instanceof Negate)
						cond = cond.negate;

					if (cond !== undefined && cond[0] === "?") {
						let v = cond.substr(1);
						if (bindings[v] === undefined) {
							bindings[v] = chunk.type;
						} else if (bindings[v] !== chunk.type) {
							return false;
						}
					} else if (cond !== chunk.type) 
						return false;
				} else if (name === "@status" || name === "@count") {
					if (properties.hasOwnProperty(name)) {
						let module = engine.getModule(condition);
						let cond = properties[name];
				
						if (cond instanceof Negate)
							cond = cond.negate;

						if (cond !== undefined && cond[0] === "?") {
							let v = cond.substr(1);
							if (bindings[v] === undefined) {
								bindings[v] = module.getStatus();
							}
						}
					}
				} else if (name === "@context" || name === "@subject"
							 || name === "@object" || name === "@task") {
					let cond = properties[name];
				
					if (cond instanceof Negate)
						cond = cond.negate;

					if (cond !== undefined && cond[0] === "?") {
						let v = cond.substr(1);
						if (bindings[v] === undefined) {
							bindings[v] = chunk.properties[name];
						}
					}
				} else if (name !== "@index" && name !== "@more")
					continue;
			}
				
			// properties that don't start with @
			if (properties.hasOwnProperty(name)) {
				let cond = properties[name];
				
				if (Array.isArray(cond)) {
					let target = chunk.properties[name];
					if (!Array.isArray(target) && cond.length != target.length)
						return false;
						
					for (let i = 0; i < cond.length; ++i) {
						let c = cond[i];
						if (c instanceof Negate)
							c = c.negate;

						if (c !== undefined && c[0] === "?") {
							let v = c.substr(1);
							if (bindings[v] === undefined) {
								bindings[v] = target[i];
							}
						}
					}
				} else {
					if (cond instanceof Negate)
						cond = cond.negate;

					if (cond !== undefined && cond[0] === "?") {
						let v = cond.substr(1);
						if (bindings[v] === undefined) {
							bindings[v] = chunk.properties[name];
						}
					}
				}
			}
		}
		return true;
	};
	
	let matching_rule = function (rule) {
		let conditions = rule.properties["@condition"]; // chunk id or list of ids
		let bindings = {};
		
		if (conditions === undefined)
			throw (new Error("rule " + rule.id + " is missing @condition"));
	
		let gb = engine.getBuffer('goal');
		if (gb && gb.type === 'update-cluster')
			debug = true;
			
		// step 1 - bind variables in condition's property values
		
		if (Array.isArray(conditions)) { // list of conditions
			for (let i = 0; i < conditions.length; ++i) {
				let id = conditions[i]; // chunk id
				let negate = false;
				
				if (id instanceof Negate) {
					negate = true;
					id = id.negate;
				}

				let condition = getCondition(id); // chunk for condition
				
				if (gb && gb.type === 'update-cluster' && condition.type === 'update-cluster')
					debug = true;
				
				if (!bind_variables(condition, bindings, negate))
					return false;
			}
		} else { // single id
			let id = conditions; // chunk id
			let negate = false;
			
			if (id instanceof Negate) {
				negate = true;
				id = id.negate;
			}
			
			condition = getCondition(id);
			
			if (!bind_variables(condition, bindings, negate))
				return false;
		}
		
		// step 2 - using bindings to apply all constraints
		
		if (Array.isArray(conditions)) { // list of conditions
			for (let i = 0; i < conditions.length; ++i) {
				let negate = false;
				let id = conditions[i]; // chunk id
				
				if (id instanceof Negate) {
					negate = true;
					id = id.negate;
				}

				let condition = getCondition(id); // chunk for condition
				let chunk = get_buffer(condition);
				
				if (negate) {
					if (chunk === undefined)
						return bindings;
						
					let status = engine.getModule(condition).getStatus();
					
					if (status === "nomatch")
						return bindings;

					if (rule.graph.test_constraints(chunk, condition, bindings, engine))
						return false;	
				} else if (!rule.graph.test_constraints(chunk, condition, bindings, engine))
					return false;
			}
		} else { // single id
			let negate = false;
			let id = conditions; // chunk id
			if (id instanceof Negate) {
				negate = true;
				id = id.negate;
			}

			condition = getCondition(id);
			let chunk = get_buffer(condition);
			
			if (negate) {
				if (chunk === undefined)
					return bindings;

				let status = engine.getModule(condition).getStatus();
				
				if (status === "nomatch")
					return bindings;
					
				if (rule.graph.test_constraints(chunk, condition, bindings, engine))
					return false;
			} else if (!rule.graph.test_constraints(chunk, condition, bindings, engine))
				return false;
		}
		
		return bindings;
	};
	
	function ppBindings (bindings) {
		let s = "";
		for (let name in bindings) {
			if (bindings.hasOwnProperty(name)) {
				if (s === "")
					s = " ";
				else
					s += "; ";
					
				s += name + " = ";
				
				let value = bindings[name];
				if (Array.isArray(value)) {
					for (let i = 0; i < value.length - 1; ++i) {
						s += value[i] + ", ";
					}
					
					s += value[value.length - 1];
				} else {
					s += value;
				}
			}
		}
		
		return s;
	}
	
	// returns array of matching rules
	
	let matching_rules = function () {
		let matched = [];
		let rules = modules.rules.graph.types.rule;
		
		if (rules) {
			for (let i = 0; i < rules.length; ++i) {
				let rule = rules[i];
				let bindings = matching_rule(rule);
				if (bindings)
					matched.push([rule, bindings]);
			}
		}
		return matched;
	};

	engine.start = function (ruleGraph, factGraph, initial_goal) {
		engine.addModule('rules', ruleGraph);
		engine.addModule('facts', factGraph);
		engine.addModule('goal', new ChunkGraph());
		engine.setGoal(initial_goal);
	};
	
	// apply randomly chosen matching rule if any
	// *** needs updating to pick best rule using
	// *** stochastic choice based upon expected utility
	
	engine.next = function () {
		singleStep = true;
		let matches = matching_rules();
		
		if (matches && matches.length > 0) {
			let i = (matches.length === 1 ? 0 : randomIntFromInterval(0, matches.length - 1));
			let match = matches[i];
			let rule = match[0];
			let bindings = match[1];
			log("applying rule with:" + ppBindings(bindings) + "\n" 
				+ modules.rules.graph.ruleToString(rule));
			apply_actions(match);
			clearStatus(); // to avoid pointless looping on same rule
			return match
		}
		
		return null;
	};
	
	let run = function () {
		runPending = false;
		let goal = modules.goal;
		let matches = matching_rules();
		
		if (matches && matches.length > 0) {
			if (matches.length > 1) {
				log("found " + matches.length + " matching rules");
				for (let i = 0; i < matches.length; ++i)
					log(i + ": " + modules.rules.graph.ruleToString(matches[i][0]));
			}

			let i = (matches.length === 1 ? 0 : randomIntFromInterval(0, matches.length - 1));
			let rule = matches[i][0];
			let bindings = matches[i][1];
			log("applying rule with:" + ppBindings(bindings) + "\n" 
				+ modules.rules.graph.ruleToString(rule));
			apply_actions(matches[i]);
			clearStatus(); // to avoid pointless looping on same rule
		} else {
			log("no matching rules!");
			goal.popBuffer();
		}
		return matches;
	};
	
	engine.run = function () {
		if (!runPending) {
			runPending = true;
			singleStep = false;
			setTimeout(run, 0);
		}
	};
};
