/*
	Test script for tasks using Chunks rule language
*/

window.addEventListener("load", () => {
	let logView = document.getElementById("log");

	function log (message) {
		let atBottom = logView.scrollHeight - 
			logView.clientHeight <= logView.scrollTop + 1;
			
		logView.innerText += message + '\n';
		
		if (logView.innerText.length > 100000)
			// discard old data to avoid memory overflow
			logView.innerText =
				logView.innerText.substr(logView.innerText.length - 50000);
		
		if (atBottom)
			logView.scrollTop = logView.scrollHeight;
	}

	let startButton = document.getElementById("start");
	let agents = {}; // agent names -> agent objects
	let subscribers = {};  // topic -> set of agent names
	let factGraph, agent1, agent2, agent3, rules1, rules2, rules3;
	
	startButton.disabled = true;
	
	function viewButton (buttonID, viewID) {
		let button = document.getElementById(buttonID);
		let view = document.getElementById(viewID);
		button.innerText = "►";
		view.style.height = "20px";
		
		view.show = function (text) {
			view.textContent = text;
			text = view.innerHTML;
			text = text.replace(/=\&gt;/ig, "<span class='implies'>=&gt;</span>");
			text = text.replace(/@[\w|\.|\-|\/|:]+/ig, function replace(match) {
				return "<span class='operator'>"+match+"</span>";
			});
			view.innerHTML = text.replace(/#.*/ig, function replace(match) {
				return "<span class='comment'>"+match+"</span>";
			});
		};
		
		button.parentElement.addEventListener("click", () => {
			if (button.innerText === "►") {
				button.innerText = "▼"
				view.style.height = "auto";
			} else {
				button.innerText = "►"
				view.style.height = "20px";
			}
		});
	}
	
	viewButton("factsButton", "facts");
	viewButton("rulesButton1", "rules1");
	viewButton("rulesButton2", "rules2");
	viewButton("rulesButton3", "rules3");

	startButton.onclick = function () {
		logView.innerText = "";
		agent1.ruleEngine.setGoal('start { }');
		agent2.ruleEngine.setGoal('start { }');
		agent3.ruleEngine.setGoal('start { }');
		agent1.ruleEngine.getModuleByName('facts').clearBuffer();
	    agent1.ruleEngine.run();
	    agent2.ruleEngine.run();
	    agent3.ruleEngine.run();
		return false;
	}

	// loads the chunk graphs and other resources as needed
	function loadResources(next) {
		let promises = [];
		let ready = null;
		
		promises.push(
    		new Promise((resolve, reject) => {
    		    const file = "facts.chk";
				fetch(file)
				.then((response) => response.text())
				.then(function (source) {
						factGraph = new ChunkGraph(source);
						document.getElementById("facts").show(source);
						log("loaded " + factGraph.chunkCount() + " facts from " + file);
						resolve(true);
				});
			})
    	);

		promises.push(
    		new Promise((resolve, reject) => {
    		    const file = "rules1.chk";
				fetch(file)
				.then((response) => response.text())
				.then(function (source) {
						ruleGraph1 = new ChunkGraph(source);
						document.getElementById("rules1").show(source);
						log("loaded " + ruleGraph1.typeCount('rule') + " rules from " + file);
						resolve(true);
				});
			})
    	);
    	
		promises.push(
    		new Promise((resolve, reject) => {
    		    const file = "rules2.chk";
				fetch(file)
				.then((response) => response.text())
				.then(function (source) {
						ruleGraph2 = new ChunkGraph(source);
						document.getElementById("rules2").show(source);
						log("loaded " + ruleGraph2.typeCount('rule') + " rules from " + file);
						resolve(true);
				});
			})
    	);
    	
		promises.push(
    		new Promise((resolve, reject) => {
    		    const file = "rules3.chk";
				fetch(file)
				.then((response) => response.text())
				.then(function (source) {
						ruleGraph3 = new ChunkGraph(source);
						document.getElementById("rules3").show(source);
						log("loaded " + ruleGraph3.typeCount('rule') + " rules from " + file);
						resolve(true);
				});
			})
    	);
    	
		Promise.all(promises).then((results) => {			
			ready();			
		});
		
		return new Promise(resolve => {
			ready = resolve;
		});
	};
	
	function addSubscriber (topic, agent) {
	    const name = agent.name;
	    
	    if (subscribers[topic] === undefined)
	        subscribers[topic] = [];
	        
	    let list = subscribers[topic];
	        
	    for (let i = 0; i < list.length; ++i) {
	        if (list[i] === name)
	            return;
	    }
	    
	    list.push(name);
	}

	function removeSubscriber (topic, agent) {
	    const name = agent.name;
	    
	    if (Array.isArray(subscribers[topic])) {
	        let list = subscribers[topic];
	        
            for (let i = 0; i < list.length; ++i) {
                if (list[i] === name) {
                    list.splice(i, 1);
                    return;
                }
            }
	    }
	}
	
	// returns list of subscribers
	function getSubscribers(topic) {
	    let list = subscribers[topic];
	    return list === undefined ? [] : list;
	}

    // define some custom operations for agents
	function customActions (agent) {
	    return {
            timer: (action, values) => {
                let goal = agent.goalModule.readBuffer();
                //log("goal is " + goal);
            
                let min = values.min ? values.min : 0;
                let max = values.max ? values.max : 5;
                min = min >= 0 ? min : 0;
                max = max > min ? max : min;
                let time = Math.floor(1000 * (min + (max-min) * Math.random()));
                let chunk = action.clone(true);
            
                // set time property
                //chunk.setValue("time", time);
                
                // drop min and max properties
                chunk.forgetProperty("min");
                chunk.forgetProperty("max");
            
                // copy goal's task ID
                chunk.setValue("@task", goal.properties["@task"]);
                
                setTimeout(() => {
                    log(agent.name + ": timeout after " + time + " mS");
                    agent.goalModule.pushBuffer(chunk);
                }, time);
            },
            log: (action, values) => {
                let message = values.message;
            
                if (Array.isArray(message))
                    message = message.join(' ');
                    
                log(agent.name + ": " + message);
            }
		};
	}
	
	class Agent {
	    constructor (name, factsGraph, ruleGraph) {
	        let actions = customActions(this);
	        this.name = name;
	        this.ruleEngine = new RuleEngine(log, this);
	        this.rulesModule = this.ruleEngine.addModule('rules', ruleGraph);
		    this.factsModule = this.ruleEngine.addModule('facts', factGraph);
		    this.goalModule = this.ruleEngine.addModule('goal', new ChunkGraph(), actions);
	        this.ruleEngine.agent = this;
	        agents[name] = this;
	    }
	    
	    send (agentName, chunk) {
	        // send chunk to named agent
	        let agent = agents[agentName];
	        
	        if (agent) {
	            agent.receive(chunk);
	        } else {
	            log(this.name + ": Error trying to send to unknown agent " + agentName);
	        }
	    }
	    
	    receive (chunk) {
	        log(this.name + ": " + chunk);
	        
	        // used for messages sent to named agent or named topic
	        // either update chunk graph or queue chunk as an event
	        // for now let's queue the incoming chunk
	        this.goalModule.pushBuffer(chunk);
	    }
	    
	    subscribe (topic) {
	        log(this.name + ": subscribe to " + topic);
	        addSubscriber(topic, this);
	    }
	    
	    unsubscribe (topic) {
	        log(this.name + ": unsubscribe from " + topic);
	        removeSubscriber(topic, this);
	    }
	    
	    publish (topic, chunk) {
	        // anonymously send chunk to all agents
	        // currently subscribed to this topic
	        log(this.name + ": publish: " + chunk);
	        const subscribers = getSubscribers(topic);
	        
	        for (let i = 0; i < subscribers.length; ++i) {
	            let agent = agents[subscribers[i]];
	            agent.receive(chunk);
	        }
	    }
	    
	    delegateTask (agentNames, moduleName, taskID, chunk) {
	        // send message to assignee to do a task
	        // assignee maps module name and taskID to its names
	        
	        if (!Array.isArray(agentNames))
	            agentNames = [agentNames];
	        		    
            for (let i = 0; i < agentNames.length; ++i) {
                const agentName = agentNames[i];
	            log(this.name + ": delegate " + taskID + " to " + agentName);
	            
                let agent = agents[agentName];
                
                if (agent)
                    agent.taskRequest(this.name, moduleName, taskID, chunk);
                else
                   log(this.name + ": Error trying to delegate task to unknown agent " + agentName); 
            }
	    }
	    
	    taskRequest (agentName, moduleName, taskID, chunk) {
	        //log(this.name + ": accepting " + taskID + " from " + agentName);
	        // handle incoming request to do a task for another agent
	        // generate local taskID and record mapping between local
	        // and remote taskIDs and moduleNames
	        let module = this.ruleEngine.getModuleByName(moduleName);
	        
	        if (module) {
	            module.delegatedTask(taskID, agentName, chunk);
	        } else {
	            log(this.name + ": Error invalid module name " + moduleName); 
	        }
	    }
	    
	    // agentName is name of the agent that delegated me this task
	    // the moduleName and taskID have already been mapped back
	    sendTaskNotification (agentName, moduleName, taskID, succeeded) {
	        log(this.name + ": notify completion of delegated task " + taskID + ", status " + succeeded);
	        
	        let agent = agents[agentName];
	        
	        if (agent) {
	            agent.receiveTaskNotification (this.name, moduleName, taskID, succeeded)
	        } else {
	            log(this.name + ": Error trying to delegate task to unknown agent " + agentName);
	        }
	    }
	    
	    // agentName is name of the agent that handled the delegated task
	    // that agent mapped the taskID and moduleName back to mine
	    receiveTaskNotification (agentName, moduleName, taskID, succeeded) {
	        // lookup active tasks and handle notification
	        log(this.name + ": received notice for " + taskID + ", status " + succeeded +
	            " from " + agentName);
	        // ask engine to handle the notification and any dependencies
	        let module = this.ruleEngine.getModuleByName(moduleName);
	        
	        if (module)
	            module.endTask(taskID, succeeded);
	    }
	}

	loadResources().then(() => {		
		agent1 = new Agent("agent1", factGraph, ruleGraph1);
		agent2 = new Agent("agent2", factGraph, ruleGraph2);
		agent3 = new Agent("agent3", factGraph, ruleGraph3);
		startButton.disabled = false;
	});
}, false);
