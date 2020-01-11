/*
	Chunk Graph library with support for Chunk import/export
	========================================================

	Dave Raggett <dsr@w3.org>
	
	Released under the MIT open source software license.
	Copyright (c) 2019

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
		this.type = type;
		this.properties = {};
		
		if (id !== undefined)
			this.id = id;
		
		// clean house keeping for lists of values
		// used to avoid lists with just one item
		// and to avoid bad values (undefined, null, [])
		
		// overrides property's existing value(s)
		this.setValue = function (name, value) {
			if (value === undefined || value === null ||
				(Array.isArray(value) && value.length === 0)) {
				if (this.properties[name] !== undefined)
					delete this.properties[name];
			} else {
				this.properties[name] = value;
			}
		};
		
		// supplement's property's existing values
		this.addValue = function (name, value) {
			if (value === undefined)
				return;
				
			if (Array.isArray(value)) {
				if (value.length === 0)
					return;

				if (value.length === 1)
					value = value[0];
			}
				
			let old = this.properties[name];
			if (old === undefined)
				this.properties[name] = value;
			else if (Array.isArray(old)) {
				if (Array.isArray(value))
					this.properties[name] = old.concat(value);
				else
					old.push(value);
			} else if (Array.isArray(value)) {
				if (value.length )
				this.properties[name] = [old].concat(value);
			} else
				this.properties[name] = [old, value];
		};
		
		// remove value from list of values
		this.removeValue = function (name, value) {
			let old = this.properties[name];
			if (old === value) {
				delete this.properties[name];
			} else {
				if (Array.isArray(old)) {
					for (let i = 0; i < old.length; ++i) {
						if (old[i] === value) {
							old.splice(i, 1);
							
							if (old.length === 0)
								delete this.properties[name];
								
							if (old.length === 1)
								this.properties[name] = old[0];

							break;
						}
					}
				}
			}
		};
		
		this.hasValue = function (name, value) {
			let current = this.properties[name];
			
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
	
		this.toString = function () {
			let s= this.type + ' ' + this.id + ' {\n'
			let props = this.properties;
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
			subject: subject,
			object:object
		};
		this.toString = function () {
			return this.properties.subject + 
				' ' + this.type +
				' ' + this.properties.object + '\n';
		};
	}
}

function ChunkGraph (source) {

	this.chunks = {}; // map chunk id to chunk
	this.types = {};  // map chunk type to list of chunks
	this.count = 0;   // count of chunks created
	
	let gensym_count = 0;
	
 	this.gensym = function () {
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
	
	let randomIntFromInterval = function (min, max) {
  		return Math.floor(Math.random() * (max - min + 1)) + min;
	};
	
	// return list of chunks with given property values
	let matching_values = function (chunks, values) {
		if (values === undefined)
			return chunks;
	
		let matched = [];
		
		for (let i = 0; i < chunks.length; ++i) {
			let chunk = chunks[i];
			let properties = chunk.properties;
			let pass = true
			
			for (name in values) {
				if (values.hasOwnProperty(name)) {
					// does chunk have this property?
					if (!(properties.hasOwnProperty(name) &&
						properties[name] === values[name]))
							pass = false
				}
			}
			
			if (pass)
				matched.push(chunk);
		}
		
		return matched;
	};
	
	// apply handler(this, chunk, context) to all chunks
	// that are an instance of a type which is declared
	// as a kindof the chunk identified by 'kind'
	this.forall = function (kind, handler, context) {
		let children = this.types['kindof'];
		
		for (let i = 0; i < children.length; ++i) {
			let child = children[i];
			if (child.properties.object === kind) {
				let type = child.properties.subject;
				this.forall(type, handler, context);
				let chunks = this.types[type];
				for (let j = 0; j < chunks.length; ++j)
					handler(chunks[j], context);
			}
		}
	};

	// recall best chunk with given type and given property values
	// *** needs updating for stochastic recall according to expected utility
	this.recall = function (type, values) {
		let chunks = this.types[type];
		let matched = matching_values(chunks, values);
		
		if (matched && matched.length > 0) {
			// pick best match based on prior knowledge & past experience
			// for now we cheat and return random choice
			let i = randomIntFromInterval(0, matched.length - 1);
			return matched[i];
		}
	};
	
	// create a new chunk with given type and values
	// unless there is an existing matching chunk
	this.remember = function (type, values, id) {
		let chunk = id !== undefined ? this.chunks[i] : this.recall(type, values);
		
		if (chunk !== undefined) {
			let chunk = new Chunk(type, id);
			for (name in values) {
				chunk.properties[name] = values[name];
			}
			this.add(chunk);
		}
		
		return chunk;
	}
		
	this.add = function (chunk) {
		// if it belongs to another graph we need to
		// remove it before adding it to this graph
		if (chunk.graph !== undefined) {
			if (chunk.graph === this)
				return; // already in this graph
		
			chunk.graph.remove(chunk);
		}
		
		chunk.graph = this;
		
		if (chunk.id === undefined)
			chunk.id = this.gensym();
			
		this.chunks[chunk.id] = chunk;
		
		if (!this.types[chunk.type])
			this.types[chunk.type] = [];
			
		this.types[chunk.type].push(chunk);
			
		this.count++;
		return chunk;
	};
	
	this.remove = function (chunk) {
		this.count--;
		chunk.graph = undefined;
		delete this.chunks[chunk.id];
		let list = this.types[chunk.type];
		let i = find(list, chunk);
		list.splice(i, 1);
		
		if (/^_:[0-9]+$/.test(token))
			chunk.id = undefined;
	};
	
	this.parse = function (source) {
		const END_OF_INPUT = 0;
		const WHITE_SPACE = 1;
		const PUNCTUATION = 2;
		const VARIABLE = 3;
		const NAME = 4;
		const STRING = 5;
		const NUMBER = 6;
		const BOOLEAN = 7;
		const NULL = 8;
		
		let graph = this;
		let map = {};  // map from source code ids to graph ids

		let skip_white = function(lexer) {
			while (lexer.here < lexer.length) {
				let c = lexer.source[lexer.here];
				
				if (c === '\r' && ! c === '\n') {
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
		
		let skip_line = function(lexer) {
			while (lexer.here < lexer.length) {
				let c = lexer.source[lexer.here];
				
				if (c === '\r' && ! c === '\n') {
					lexer.line_start = lexer.here;
					lexer.line++;
				}
				
				if (c === '\n') {
					lexer.line_start = lexer.here + 1;
					lexer.line++;
					break;
				}
					
				lexer.here++;
			}
			
			return ;
		};
		
		let find_end_of_token = function (lexer) {
			let start = lexer.here;
			
			while (lexer.here < lexer.length) {
				let c = lexer.source[lexer.here];
				
				if (/\s/.test(c))
					break;
					
				lexer.here++;
			}
			
			c = lexer.source[lexer.here-1];
			
			if (/[.;,]/.test(c))
				lexer.here--;
			
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
			
			throw new Error("Unexpected end of string on line " + lexer.line);
		};
		
		let lexer = {
			graph: this,
			source: source,
			length: source.length,
			here: 0,
			line: 1,
			line_start: 0,
			next: 0,
			blank: {},
			token: null,
			type: null,
			next: function () {
				for (;;) {
					let c = skip_white(lexer);
				
					if (c === null) {
						lexer.type = END_OF_INPUT;
					} else if (c === '#') {
						skip_line(lexer);
						continue;
					} else if (/[.;,{}|\?]/.test(c)) {
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
						} else if (/^[-+]?[0-9]+\.?[0-9]*([eE][-+]?[0-9]+)?/.test(token)) {
							lexer.type = NUMBER;
							lexer.value = parseFloat(token);
						} else if (/^(\*|(@)?\w[\w|\d|_|\-|:]+)$/.test(token)) {
							lexer.type = NAME;
							lexer.value = lexer.token;
						} else {
							throw new Error("Unexpected '" + token + "' on line " + lexer.line);
						}
					}
					
					break;
				}
			},
			parseValue: function (chunk) {
				let pvar = false
				let nvar = false;

				if (lexer.type === PUNCTUATION) {
					if (lexer.token === "?") {
						pvar = true;
					} else if (lexer.token === "!") {
						nvar = true;
					} else {
						throw new Error("Unexpected punctuation on line " + lexer.line);
					}
					
					lexer.next();
				}
				
				if (lexer.type !== NAME &&
					lexer.type !== NUMBER &&
					lexer.type !== BOOLEAN &&
					lexer.type !== STRING) {
					throw new Error("Expected name token on line " + lexer.line);
				}

				let value = lexer.value;
				
				if (pvar)
					value = '?' + value;
				else if (nvar)
					value = '!' + value;
				
				return value;
			},
			parseChunk: function (type, id) {
				let chunk;
				lexer.next();
				
				while (lexer.type !== PUNCTUATION) {
					
					if (lexer.type === END_OF_INPUT)
						throw new Error("Unexpected end of input on line " + lexer.line);
						
					if (lexer.type !== NAME) {
						throw new Error("Expected name token on line " + lexer.line);
					}
					
					let name = lexer.token;
					let line = lexer.line;
						
					lexer.next();
					
					value = lexer.parseValue();
											
					if (!chunk) {
						chunk = new Chunk(type, id);
						graph.add(chunk);
					}
					
					chunk.properties[name] = value;
		
					lexer.next();
					
					if (lexer.type === PUNCTUATION && lexer.token === ',') {
						chunk.properties[name] = [value];
					
						while (lexer.type === PUNCTUATION && lexer.token === ',') {
							lexer.next();
						
							if (lexer.type === END_OF_INPUT)
								throw new Error("Unexpected end of input on line " + lexer.line);
							
							value = lexer.parseValue();								
							chunk.properties[name].push(value);
							lexer.next();
						}
					}
					
					if (! (lexer.line > line))
						throw new Error("Expected line break after '" + value + "' on line " + lexer.line);
				}
				
				if (lexer.token !== '}')
					throw new Error("Expected } on line " + lexer.line);
					
				lexer.next();
			}
		}
				
		let line = 0;
		lexer.next();
		
		while (lexer.type !== END_OF_INPUT) {
			if (lexer.type !== NAME) {
				throw new Error("Expected name token on line " + lexer.line);
			}
			
			let name1 = lexer.token;
			
			lexer.next();
			
			if (lexer.type === PUNCTUATION) {
				if (lexer.token !== "{")
					throw new Error("Expected { on line " + lexer.line);
					
				lexer.parseChunk(name1);
				continue;
			} else if (lexer.type !== NAME)
				throw new Error("Expected name token on line " + lexer.line);

			// could be chunk id or relation
			let name2 = lexer.token;
			
			lexer.next();
			
			if (lexer.type === PUNCTUATION) {
				if (lexer.token !== "{")
					throw new Error("Expected { on line " + lexer.line);
					
				lexer.parseChunk(name1, name2);
				continue;
			} else if (lexer.type === NAME) {
				let subject = name1;
				let predicate = name2;
				let object = lexer.token;

				if (! (lexer.line > line))
					throw new Error("Expected line break after '" + object + "' on line " + lexer.line);
					
				// add new link as a subclass of chunk
				graph.add(new Link(subject, predicate, object));
			} else {
				throw new Error("Expected name token on line " + lexer.line);
			}
			
			line = lexer.line;
			lexer.next();
			
		}
	};
	
	this.toString = function () {
		let s = "";
		let graph = this;
		forall (this.chunks, function (id) {
			let chunk = graph.chunks[id];
			s += chunk.toString();
		});
		return s;
	}
		
	if (source) 
		this.parse(source);
}


function RuleEngine (){
	let log_element = document.getElementById("log");
	
	let log = function (msg) {
		if (log_element === undefined)
			console.log(msg + '\n');
		else
			log_element.innerText += msg + '\n';
	};
	
	let clear_log = function () {
		if (log_element !== undefined)
			log_element.innerText = "";
	};
	
	let randomIntFromInterval = function (min, max) {
  		return Math.floor(Math.random() * (max - min + 1)) + min;
	};
	
	let engine = this;
	let goals; // initialised by start()
	let goal, fact;  // chunk buffers
	
	// *** needs updating to allow for
	// *** registering modules by name
	
	let get_buffer = function (module) {
		if (module === "goal")
			return goal;
			
		if (module === "facts")
			return fact;

		if (module !== "output")
			log("unknown module: " + module);
	};
	
	// action is a chunk
	let apply_action = function (action, bindings) {
		let module = "goal";
		let operation = "update";
		let properties = action.properties;
		
		if (properties["@module"])
			module = properties["@module"];
		
		if (properties["@invoke"])
			operation = properties["@invoke"];
//		else if (properties["@action"])
//			operation = properties["@action"];
			
		let buffer = get_buffer(module);
		let values = {};
			
		for (name in properties) {
			if (name[0] === "@")
				continue;
				
			let value = properties[name];
				
			if (value[0] === "?") {
				let v = value.substr(1);
				value = bindings[v];
			} else if (value[0] === "!") {
				log("action's can't have values: " + name);
			}
			
			values[name] = value;
		}
		
		// if update then update buffered chunk's properties
		if (operation === "recall") {
			if (module === "facts") {
				// recall facts for matching chunk for values
				// and use response to update fact buffer
				let facts = engine.facts; // ChunkGraph for facts
				log("recall: " + action.type + " " + JSON.stringify(values));
				fact = facts.recall(action.type, values);
				log("found: " + fact);
			} else {
				log("sorry, recall action is currently unsupported for " + module + " module");
			}
		} else if (operation === "remember") {
			if (module === "facts") {
				// remember fact for given type and values
				let facts = engine.facts; // ChunkGraph for facts
				log("remember: " + action.type + " " + JSON.stringify(values));
				facts.remember(action.type, values);
			} else {
				log("sorry, remember action is currently unsupported for " + module + " module");
			}			
		} else if (operation === "update") {
			if (module === "output") {
				log("OUTPUT: " + JSON.stringify(values));
			} else {
				let properties = buffer.properties;
				for (name in values) {
					if (values.hasOwnProperty(name))
						properties[name] = values[name];
				}
			}
		} else {
			log("unknown action: " + operation);
		}
	};
	
	let apply_actions = function (match) {
		let rule = match[0];
		let bindings = match[1];
		let actions = rule.properties["@action"]; // chunk id or list of ids
		
		if (actions === undefined)
			throw (new Error("rule " + rule.id + " is missing @action"));
		
		if (Array.isArray(actions)) {
			for (let i = 0; i < actions.length; ++i) {
				let action = engine.rules.chunks[actions[i]];
				
				if (action === undefined)
					throw (new Error("rule " + rule.id + " is missing action " + actions[i]));
					
				apply_action(action, bindings);
			}
		} else { // single action
			let action = engine.rules.chunks[actions];
			apply_action(action, bindings);
		}
		
		log("\ngoal buffer: " + goal);
	};
	
	let match = function (chunk, condition, bindings) {
		// for each property in the condition
		// if it is an unbound variable bind it to chunk's value
		// if it is a bound variable test if it is the same
		// otherwise test if it is the same
		let properties = condition.properties;
		
		for (name in properties) {
			//if (! properties.hasOwnProperty(name));
			//	continue;
				
			if (name[0] === "@") // rule metadata
				continue;
								
			if (properties.hasOwnProperty(name)) {
				let cond = properties[name];
				let value = chunk.properties[name];
				
				if (cond[0] === "?") {
					let v = cond.substr(1);
					if (bindings[v] === undefined) {
						bindings[v] = value;
					} else {
						if (bindings[v] !== value)
							return false;
					}
				} else if (cond[0] === "!") {
					// must not match variable value
					let v = cond.substr(1);
					if (bindings[v] !== undefined) {
						if (bindings[v] === value)
							return false;
					}
				} else if (cond !== value) {
					return false;
				}
			}
		}
		
		// at this point all of the variables will have been bound
		// so it is safe to apply comparative tests
		if (properties["@distinct"] !== undefined) {
			let args = properties["@distinct"]; // e.g. [?num1, ?num2]
			let values = [];
			
			// distinct requires 2 or more variable names
			if (! Array.isArray(args))
				return false;
			
			// substitute variable bindings
			for (let i = 0; i < args.length; ++i) {
				if (args[i][0] === "?") {
					let v = args[i].substr(1);
					values.push(bindings[v]);
				} else
					values.push(args[i]);
			}
			
			// now test if values are all the same
			let same = true;
			for (let i = 1; i < values.length; ++i) {
				if (values[i] !== values[i-1]) {
					same = false;
					break;
				}
			}
			
			if (same)
				return false;
		}
		
		// less than or equal to
		if (properties["@lteq"] !== undefined) {
			let args = properties["@lteq"]; // e.g. [?num1, ?num2]
			let values = [];
			
			// lteq requires 2 arguments
			if (! Array.isArray(args))
				return false;
			
			// substitute variable bindings
			for (let i = 0; i < args.length; ++i) {
				if (args[i][0] === "?") {
					let v = args[i].substr(1);
					values.push(bindings[v]);
				} else
					values.push(args[i]);
			}
			
			// now test if arg1 <= arg2
			if (typeof values[0] === "number" && typeof values[1] === "number") {
				return (values[0] <= values[1]);
			}
		}
		
		// greater than
		if (properties["@gt"] !== undefined) {
			let args = properties["@gt"]; // e.g. [?num1, ?num2]
			let values = [];
			
			// gt requires 2 arguments
			if (! Array.isArray(args))
				return false;
			
			// substitute variable bindings
			for (let i = 0; i < args.length; ++i) {
				if (args[i][0] === "?") {
					let v = args[i].substr(1);
					values.push(bindings[v]);
				} else
					values.push(args[i]);
			}
			
			// now test if arg1 > arg2
			if (typeof values[0] === "number" && typeof values[1] === "number") {
				return (values[0] > values[1]);
			}
		}
		
		return true;
	};
	
	// test if chunk matches module's buffer
	let match_module = function (condition, bindings) {
		let module = condition.properties["@module"];
		let buffer = get_buffer(module);
		
		return match(buffer, condition, bindings);
	};
	
	let matching_rule = function (rule) {
		let conditions = rule.properties["@condition"]; // chunk id or list of ids
		let bindings = {};
		let rules = engine.rules; 
		
		if (conditions === undefined)
			throw (new Error("rule " + rule.id + " is missing @condition"));
		
		if (Array.isArray(conditions)) { // list of conditions
			for (let i = 0; i < conditions.length; ++i) {
				let id = conditions[i]; // chunk id
				let condition = rules.chunks[id]; // chunk for condition
				
				if (!match_module(condition, bindings))
					return false;
			}
		} else { // single id
			condition = rules.chunks[conditions];
			
			if (!match_module(condition, bindings))
				return false;
		}
		
		log("matched rule " + rule.id + " with bindings " + JSON.stringify(bindings));
		return bindings;
	};
	
	// returns array of matching rules
	
	let matching_rules = function () {
		let matched = [];
		let rules = engine.rules.types["rule"];
		
		for (let i = 0; i < rules.length; ++i) {
			let rule = rules[i];
			let bindings = matching_rule(rule);
			if (bindings)
				matched.push([rule, bindings]);
		}
		return matched;
	};

	this.start = function (rules, facts, initial_goal) {
		clear_log();
		this.rules = rules;
		this.facts = facts;
		
		goals = new ChunkGraph(initial_goal);

		// set the initial goal	- it's the only one! :-)	
		for (type in goals.types) {
			if (goals.types.hasOwnProperty(type)) {
				goal = goals.types[type][0];  // set the goal module buffer
				break;
			}
		}
		
		log("started with initial goal:\n\n" + goal.toString());
		log("there are " + rules.types["rule"].length + " known rules in total\n");
	};
	
	// apply randomly chosen matching rule if any
	// *** needs updating to pick best rule using
	// *** stochastic choice based upon expected utility
	
	this.next = function () {
		let matches = matching_rules();
		
		if (matches && matches.length > 0) {
			let i = (matches.length === 1 ? 0 : randomIntFromInterval(0, matches.length - 1));
			apply_actions(matches[i]);
		} else
			log("no matching rules!");
		return matches;
	};
	
	this.getGoals = function () {
		return goals;
	};
};
