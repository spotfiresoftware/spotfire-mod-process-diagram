/*
* Copyright © 2024. Cloud Software Group, Inc.
* This file is subject to the license terms contained
* in the license file that is distributed with this file.
*/

class ProcessFlow {
    static MIN_PADDING_TOP = 20;
    static MIN_PADDING_LEFT = 20;

    constructor(canvasElem, actions) {
        this.canvasElem = canvasElem;
        this.actions = actions;

        // Initialize extents
        this.minX = Number.MAX_SAFE_INTEGER;
        this.minY = Number.MAX_SAFE_INTEGER;
        this.maxX = Number.MIN_SAFE_INTEGER;
        this.maxY = Number.MIN_SAFE_INTEGER;
    }

    /* ---------------------------------------------------------------------------------------------------- */
    /* DRAW COMPONENTS */
    // Draw main
    draw(groupMap, configuration) {
        // Extract the group, no grouping in this mod so just get the null key
        let groupData = groupMap[null];
        this.groupData = groupData;

        // Set the updated configuration
        this.configuration = configuration;

        // Get the canvas element
        let canvasElem = this.canvasElem

        // Reset contents
        canvasElem.innerHTML = '';

        // Reset component array
        this.components = [];

        // Create process flow element and append
        let processFlowElem = document.createElement('div');
        processFlowElem.classList.add("process-flow");
        canvasElem.appendChild(processFlowElem);

        // Draw process objects
        this.drawActivities(groupData, processFlowElem);
        this.drawTasks(groupData, processFlowElem);
        this.drawTransitions(groupData, processFlowElem);    

        // Position components
        this.position();
        this.center(processFlowElem);

        // Append event handlers
        this.appendEventHandlers(canvasElem);

        // Set markable class if marking enabled
        if(configuration.marking != null) {
            processFlowElem.classList.add('markable');
        }
        else {
            processFlowElem.classList.remove('markable');
        }
    }

    // Draw all activities
    drawActivities(groupData, processFlowElem) {
        let configuration = this.configuration;
        let activityMap = groupData.activityData;

        for(let key in activityMap) {
            let activity = activityMap[key];
            let component = new ActivityFlowComponent(activity, configuration);
            component.draw(processFlowElem);
            this.components.push(component);

            this.minX = Math.min(this.minX, component.minX);
            this.minY = Math.min(this.minY, component.minY);
            this.maxX = Math.max(this.maxX, component.maxX);
            this.maxY = Math.max(this.maxY, component.maxY);
        }
    }

    // Draw all tasks
    drawTasks(groupData, processFlowElem) {
        let configuration = this.configuration;
        let activityMap = groupData.activityData;
        let taskMap = groupData.taskData;

        for(let key in taskMap) {
            let task = taskMap[key];
            let component = new TaskFlowComponent(task, activityMap, configuration);
            component.draw(processFlowElem);
            this.components.push(component);

            this.minX = Math.min(this.minX, component.minX);
            this.minY = Math.min(this.minY, component.minY);
            this.maxX = Math.max(this.maxX, component.maxX);
            this.maxY = Math.max(this.maxY, component.maxY);
        }
    }
    
    // Draw all transitions
    drawTransitions(groupData, processFlowElem) {
        let configuration = this.configuration;
        let activityMap = groupData.activityData;
        let transitionMap = groupData.transitionData;

        for(let key in transitionMap) {
            let transition = transitionMap[key];
            let component = new TransitionFlowComponent(transition, activityMap, configuration);
            component.draw(processFlowElem);
            this.components.push(component);

            this.minX = Math.min(this.minX, component.minX);
            this.minY = Math.min(this.minY, component.minY);
            this.maxX = Math.max(this.maxX, component.maxX);
            this.maxY = Math.max(this.maxY, component.maxY);
        }
    }

    // Position all flow elements
    position() {
        // No dynamic positioning for this diagram type
    }

    // Center the diagram within the canvas area.
    // This isn't ideal using JS for centering
    center(processFlowElem) {
        // Calculate centering padding
        let contentWidth = this.maxX - this.minX;
        let contentHeight = this.maxY - this.minY;
        
        let paddingX = processFlowElem.clientWidth - contentWidth;
        if(paddingX < ProcessFlow.MIN_PADDING_LEFT) {
            paddingX = ProcessFlow.MIN_PADDING_LEFT;
        }
        
        let paddingY = processFlowElem.clientHeight - contentHeight;
        if(paddingY < ProcessFlow.MIN_PADDING_TOP) {
            paddingY = ProcessFlow.MIN_PADDING_TOP;
        }

        // Center content
        let processObjectElems = processFlowElem.querySelectorAll(".process-object");
        for(let thisProcessObjectElem of processObjectElems) {
            let left = thisProcessObjectElem.style.left;
            let top = thisProcessObjectElem.style.top;
            thisProcessObjectElem.style.left = (parseInt(left.substring(0, left.length - 2)) - this.minX + paddingX / 2) + "px";
            thisProcessObjectElem.style.top = (parseInt(top.substring(0, top.length - 2)) - this.minY + paddingY / 2) + "px";
        }
    }

    /* ---------------------------------------------------------------------------------------------------- */
    /* EVENTS */

    // Append event handlers
    appendEventHandlers(canvasElem) {
        let self = this;

        // Append click handler for diagram clicks
        canvasElem.onclick = function(event) {
            event.stopPropagation();
            self.actions.clearAllMarking();
        };
    }

    // Rectangular selection
    rectangleSelection(selection) {
        let selectedArr = [];

        // Iterate components
        for(let thisComponent of this.components) {
            let selected = thisComponent.rectangleSelection(selection.rect);    
            if(selected != null) {
                selectedArr.push(selected);
            }
        }
        return selectedArr;
    }
}

class ActivityFlowComponent {
    static WIDTH = 120;
    static HEIGHT = 65;
    static BORDER_WIDTH = 1;

    constructor(activity, configuration) {
        this.activity = activity;
        this.configuration = configuration;
    }

    draw(elem) {
        let activity = this.activity;
        let configuration = this.configuration;

        // Calculate delta
        let delta = activity.delay == null ? '' : activity.delay;

        // Define the template
        let template = `
            <div class="title">${activity.displayName}</div>
            <div class="icons">
                <div class="icon error">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-114 59.5-210.5T301-838q1 19 4 38.5t10 45.5q-72 44-113.5 116.5T160-480q0 134 93 227t227 93q134 0 227-93t93-227q0-85-41.5-158T644-755q7-26 10-45.5t5-37.5q102 51 161.5 147T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-160q-100 0-170-70t-70-170q0-58 25.5-109t72.5-85q5 15 11 34.5t16 48.5q-22 23-33.5 51T320-480q0 66 47 113t113 47q66 0 113-47t47-113q0-32-11.5-60T595-591q8-24 14.5-44.5T621-674q47 34 73 85t26 109q0 100-70 170t-170 70Zm-40-380q-37-112-48.5-157.5T380-860q0-42 29-71t71-29q42 0 71 29t29 71q0 37-11.5 82.5T520-620h-80Zm40 220q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Z"/></svg>
                </div>
                <div class="icon warning">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="m40-120 440-760 440 760H40Zm138-80h604L480-720 178-200Zm302-40q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm-40-120h80v-200h-80v200Zm40-100Z"/></svg>                        
                </div>
                <div class="icon jeopardy">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M440-440h80v-200h-80v200Zm40 120q17 0 28.5-11.5T520-360q0-17-11.5-28.5T480-400q-17 0-28.5 11.5T440-360q0 17 11.5 28.5T480-320ZM160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80H160Zm320-300Zm0 420q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM320-280h320v-280q0-66-47-113t-113-47q-66 0-113 47t-47 113v280Z"/></svg>                
                </div>
                <div class="icon clock">
                    <svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48"><path d="m627-287 45-45-159-160v-201h-60v225l174 181ZM480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-82 31.5-155t86-127.5Q252-817 325-848.5T480-880q82 0 155 31.5t127.5 86Q817-708 848.5-635T880-480q0 82-31.5 155t-86 127.5Q708-143 635-111.5T480-80Zm0-400Zm0 340q140 0 240-100t100-240q0-140-100-240T480-820q-140 0-240 100T140-480q0 140 100 240t240 100Z"/></svg>
                </div>
                <div class="delay">${delta}</div>
            </div>
        `;

        // Create element and append classes
        let activityElem = document.createElement('div');
        elem.appendChild(activityElem);
        activityElem.classList.add("activity");
        activityElem.classList.add("process-object");
        
        // Set element
        this.activityElem = activityElem;
        
        // Append content and set size
        activityElem.innerHTML = template.trim();
        activityElem.style.width = ActivityFlowComponent.WIDTH + "px";
        activityElem.style.height = ActivityFlowComponent.HEIGHT + "px";

        // Set color
        if(activity.color != null) {
            activityElem.style.backgroundColor = activity.color;            
            // This stupid timeout is due to a race condition when setting the color from marking
            setTimeout(function() {
                // Set darkcolor class if specified color is dark
                if(Utility.rgbIsLight(activityElem.style.backgroundColor) == false) {
                    activityElem.classList.add('darkcolor');
                }
            });
        }

        // Set Is Delayed class
        if(activity.isDelayed == true) {
            activityElem.classList.add('delayed');
        }

        // Set SLA Violation class
        if(activity.slaViolation == true) {
            activityElem.classList.add('sla-violation');
        }

        // Set Error class
        if(activity.hadError == true) {
            activityElem.classList.add('had-error');
        }

        // Set Conditional class
        if(activity.conditional == true) {
            activityElem.classList.add('conditional');
        }

        // Append event handler for marking
        if(configuration.marking != null && configuration.allowActivityMarking == true) {
            // Append markable class
            activityElem.classList.add('markable');

            // Marking handler
            activityElem.onclick = function(event) {
                event.stopPropagation();
                if(event.ctrlKey == true)
                    activity.row.mark("Toggle");
                else
                    activity.row.mark("Replace");
            };
        }

        // Set Marking class and color
        // This is done last to override any other style classes
        if(configuration.marking != null && activity.row.isMarked() == true) {
            activityElem.classList.add('marked');
            activityElem.style.backgroundColor = configuration.marking.colorHexCode;
        }

        // Position activity
        this.position();
    }

    position() {
        let activity = this.activity;
        let activityElem = this.activityElem;
        
        activityElem.style.left = activity.position_x + "px";
        activityElem.style.top = activity.position_y + "px";

        // Set bounds
        this.minX = activity.position_x;
        this.minY = activity.position_y;
        this.maxX = activity.position_x + ActivityFlowComponent.WIDTH;
        this.maxY = activity.position_y + ActivityFlowComponent.HEIGHT;
    }

    rectangleSelection(selectionRect) {
        let componentRect = this.activityElem.getBoundingClientRect();
        let match = Utility.rectangleOverlap(selectionRect, componentRect);
        
        return (match == true ? this.activity.row : null);
    }
}

class TaskFlowComponent {
    static PADDING_X = 10;
    static PADDING_TOP = 30;
    static PADDING_BOTTOM = 30;

    constructor(task, activityMap, configuration) {
        this.task = task;
        this.activityMap = activityMap;
        this.configuration = configuration;
    }

    draw(elem) {
        let task = this.task;
        let configuration = this.configuration;

        // Calculate delta
        let delta = task.delay == null ? '' : task.delay;
        let template = `
            <div class="title">${task.displayName}</div>
            <div class="icons">
                <div class="icon warning">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="m40-120 440-760 440 760H40Zm138-80h604L480-720 178-200Zm302-40q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm-40-120h80v-200h-80v200Zm40-100Z"/></svg>                        
                </div>
                <div class="icon jeopardy">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M440-440h80v-200h-80v200Zm40 120q17 0 28.5-11.5T520-360q0-17-11.5-28.5T480-400q-17 0-28.5 11.5T440-360q0 17 11.5 28.5T480-320ZM160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80H160Zm320-300Zm0 420q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM320-280h320v-280q0-66-47-113t-113-47q-66 0-113 47t-47 113v280Z"/></svg>                
                </div>
                <div class="icon clock">
                    <svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48"><path d="m627-287 45-45-159-160v-201h-60v225l174 181ZM480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-82 31.5-155t86-127.5Q252-817 325-848.5T480-880q82 0 155 31.5t127.5 86Q817-708 848.5-635T880-480q0 82-31.5 155t-86 127.5Q708-143 635-111.5T480-80Zm0-400Zm0 340q140 0 240-100t100-240q0-140-100-240T480-820q-140 0-240 100T140-480q0 140 100 240t240 100Z"/></svg>
                </div>
                <div class="delay">${delta}</div>
            </div>
        `;

        // Append task element
        let taskElem = document.createElement('div');
        elem.appendChild(taskElem);
        taskElem.classList.add("task");
        taskElem.classList.add("process-object");
        taskElem.innerHTML = template.trim();

        // Set element
        this.taskElem = taskElem;

        // Set color
        if(task.color != null) {
            taskElem.style.borderColor = task.color;            
            setTimeout(function() {
                // Set darkcolor class if specified color is dark
                if(Utility.rgbIsLight(taskElem.style.borderColor) == false) {
                    taskElem.classList.add('darkcolor');
                }
            });
        }

        // Set Is Delayed class
        if(task.isDelayed == true) {
            taskElem.classList.add('delayed');
        }

        // Set SLA Violation class
        if(task.slaViolation == true) {
            taskElem.classList.add('sla-violation');
        }

        // Append event handler for marking
        if(configuration.marking != null && configuration.allowTaskMarking == true) {
            // Append markable class
            taskElem.classList.add('markable');

            // Marking handler
            taskElem.onclick = function(event) {
                event.stopPropagation();
                if(event.ctrlKey == true)
                    task.row.mark("Toggle");
                else
                    task.row.mark("Replace");
            };
        }

        // Set Marking class and color
        // This is done last to override any other style classes
        if(task.row.isMarked() == true) {
            taskElem.classList.add('marked');
            taskElem.style.borderColor = configuration.marking.colorHexCode;
        }

        // Position task
        this.position();
    }

    position() {
        let task = this.task;
        let taskElem = this.taskElem;
        let activityMap = this.activityMap;

        // Find min/max activity for extents of the box base on constituent activities
        let minX = Number.MAX_SAFE_INTEGER;
        let minY = Number.MAX_SAFE_INTEGER;
        let maxX = Number.MIN_SAFE_INTEGER;
        let maxY = Number.MIN_SAFE_INTEGER;

        for(let activityKey in activityMap) {
            let activity = activityMap[activityKey];
            if(activity.taskId == task.taskId) {
                if(activity.position_x < minX)
                    minX = activity.position_x;
                if(activity.position_x > maxX)
                    maxX = activity.position_x;
                if(activity.position_y < minY)
                    minY = activity.position_y;
                if(activity.position_y > maxY)
                    maxY = activity.position_y;
            }
        }

        // Check max min have been set for each
        if(minX == Number.MAX_SAFE_INTEGER || maxX == Number.MIN_SAFE_INTEGER || minY == Number.MAX_SAFE_INTEGER || maxY == Number.MIN_SAFE_INTEGER) return;

        taskElem.style.left = (minX - TaskFlowComponent.PADDING_X) + "px";
        taskElem.style.top = (minY - TaskFlowComponent.PADDING_TOP) + "px";
        taskElem.style.width = (maxX - minX + ActivityFlowComponent.WIDTH + TaskFlowComponent.PADDING_X * 2) + "px";
        taskElem.style.height = (maxY - minY + ActivityFlowComponent.HEIGHT + TaskFlowComponent.PADDING_TOP + TaskFlowComponent.PADDING_BOTTOM) + "px";

        // Set bounds
        this.minX = (minX - TaskFlowComponent.PADDING_X);
        this.minY = (minY - TaskFlowComponent.PADDING_TOP);
        this.maxX = (minX - TaskFlowComponent.PADDING_X) + (maxX - minX + ActivityFlowComponent.WIDTH + TaskFlowComponent.PADDING_X * 2);
        this.maxY = (minY - TaskFlowComponent.PADDING_TOP) + (maxY - minY + ActivityFlowComponent.HEIGHT + TaskFlowComponent.PADDING_TOP + TaskFlowComponent.PADDING_BOTTOM);
    }

    rectangleSelection(selectionRect) {
        let componentRect = this.taskElem.getBoundingClientRect();
        let match = Utility.rectangleOverlap(selectionRect, componentRect);
        
        return (match == true ? this.task.row : null);
    }
}

class TransitionFlowComponent {
    constructor(transition, activityMap, configuration) {
        this.transition = transition;
        this.activityMap = activityMap;
        this.configuration = configuration;
    }

    draw(elem) {
        let transition = this.transition;
        let activityMap = this.activityMap;

        // Lookup activities
        let startActivity = activityMap[transition.initialActivityId];
        let endActivity = activityMap[transition.terminalActivityId];

        let component = null;
        if(startActivity == null && endActivity != null) {
            component = new TransitionArrowFlowComponent(this.transition, this.configuration, startActivity, endActivity);   
        }
        else if(startActivity != null && endActivity == null) {
            component = new TransitionArrowFlowComponent(this.transition, this.configuration, startActivity, endActivity);            
        }
        else if(startActivity != null && endActivity != null) {
            component = new TransitionLineFlowComponent(this.transition, this.configuration, startActivity, endActivity);
        }
        
        if(component == null) return;
        this.component = component;

        // Draw the component
        component.draw(elem);
        this.transitionElem = component.transitionElem;         

        // Position component
        this.position();
    }

    // Position transition by type
    position() {
        let component = this.component;
        if(component == null) return;

        component.position();

        this.minX = component.minX;
        this.minY = component.minY;
        this.maxX = component.maxX;
        this.maxY = component.maxY;
    }

    rectangleSelection(selectionRect) {
        return this.component.rectangleSelection(selectionRect);
    }
}

class TransitionArrowFlowComponent {
    // Arrow sizes for positioning
    static LARGE_ARROW_SIZE = 24;
    static LARGE_ARROW_PADDING_X = 3;

    constructor(transition, configuration, startActivity, endActivity) {
        this.transition = transition;
        this.configuration = configuration;
        this.startActivity = startActivity;
        this.endActivity = endActivity;
    }

    draw(elem) {
        let configuration = this.configuration;
        let transition = this.transition;

        // Create transition group div and append
        let transitionElem = document.createElement('div');
        elem.appendChild(transitionElem);
        transitionElem.classList.add("transition");
        transitionElem.classList.add("process-object");

        // Set element for toggle of select class
        this.transitionElem = transitionElem;

        // Append activated
        if(transition.activated == true) {
            transitionElem.classList.add("activated");
        }

        // Create arrow element and append
        let arrowElem = document.createElement('div');
        arrowElem.classList.add('large-arrow');
        arrowElem.classList.add('large-arrow-right');
        transitionElem.appendChild(arrowElem);
        this.arrowElem = arrowElem;

        // Set color if specified
        if(transition.color != null) {
            arrowElem.style.borderLeftColor = transition.color;
        }

        // Append event handlers
        this.appendEventHandlers(transitionElem, arrowElem);

        // Set Marking class and color
        // This is done last to override any other style classes
        if(configuration.marking != null && transition.row.isMarked() == true) {
            transitionElem.classList.add('marked');
            arrowElem.style.borderLeftColor = configuration.marking.colorHexCode;
        }

        // Do not call position here, will be called in main object
    }

    // Position the transition
    position() {
        let startActivity = this.startActivity;
        let endActivity = this.endActivity;

        // Position depending on trigger or terminal
        if(startActivity == null && endActivity != null) {
            this.positionTrigger(endActivity);
        }
        else if(startActivity != null && endActivity == null) {
            this.positionTerminal(startActivity);
        }
    }

    // Position trigger arrow
    positionTrigger(endActivity) {
        let transitionElem = this.transitionElem;

        // Calculate position
        let left = endActivity.position_x - TransitionArrowFlowComponent.LARGE_ARROW_SIZE - ActivityFlowComponent.BORDER_WIDTH - TransitionArrowFlowComponent.LARGE_ARROW_PADDING_X / 2;
        let top = endActivity.position_y - TransitionArrowFlowComponent.LARGE_ARROW_SIZE + ActivityFlowComponent.HEIGHT / 2;

        // Position the transition group div and size correctly
        transitionElem.style.top = top + "px";
        transitionElem.style.left = left + "px";

        // Set extents
        this.minX = left;
        this.minY = top;
        this.maxX = left + TransitionArrowFlowComponent.LARGE_ARROW_SIZE;
        this.maxY = top + TransitionArrowFlowComponent.LARGE_ARROW_SIZE;
    }

    // Position terminal arrow
    positionTerminal(startActivity) {
        let transitionElem = this.transitionElem;

        // Calculate position
        let left = startActivity.position_x + ActivityFlowComponent.WIDTH + ActivityFlowComponent.BORDER_WIDTH + TransitionArrowFlowComponent.LARGE_ARROW_PADDING_X;
        let top = startActivity.position_y - TransitionArrowFlowComponent.LARGE_ARROW_SIZE + ActivityFlowComponent.HEIGHT / 2;

        // Position the transition group div and size correctly
        transitionElem.style.top = top + "px";
        transitionElem.style.left = left + "px";

        // Set extents
        this.minX = left;
        this.minY = top;
        this.maxX = left + TransitionArrowFlowComponent.LARGE_ARROW_SIZE;
        this.maxY = top + TransitionArrowFlowComponent.LARGE_ARROW_SIZE;
    }

    // Append event handlers
    appendEventHandlers(transitionElem, arrowElem) {
        let configuration = this.configuration;
        let transition = this.transition;

        if(configuration.marking != null && configuration.allowTransitionMarking == true) {
            // Append markable class
            transitionElem.classList.add('markable');

            // Marking handler
            arrowElem.onclick = function(event) {
                event.stopPropagation();
                if(event.ctrlKey == true)
                    transition.row.mark("Toggle");
                else
                    transition.row.mark("Replace");
            };

            // Mouse over and mouse out to apply styling changes
            arrowElem.onmouseover = function(event) {
                if(transition.row.isMarked() == false) {
                    arrowElem.style.borderLeftColor = configuration.marking.colorHexCode;
                }
            }

            arrowElem.onmouseout = function(event) {
                if(transition.row.isMarked() == false) {
                    arrowElem.style.borderLeftColor = transition.color;
                }
            }
        }
    }

    rectangleSelection(selectionRect) {
        let componentRect = this.arrowElem.getBoundingClientRect();
        let match = Utility.rectangleOverlap(selectionRect, componentRect);

        return (match == true ? this.transition.row : null);
    }
}

class TransitionLineFlowComponent {
	// Attachment points constants
	static AttachmentPoint = {
		NORTH: 	'N',
		EAST: 	'E',
		SOUTH: 	'S',
		WEST: 	'W'
	};

	// Relative quadrant constants
	static RelativeQuadrant = {
		NORTH_EAST: 'NE',
		SOUTH_EAST: 'SE',
		SOUTH_WEST: 'SW',
		NORTH_WEST: 'NW'
	};
	
	// Strategy classification constants
	static Strategy = {
		C: 'C',
		L: 'L',
		S: 'S'
	};
	
	// Minimum separation of activities in pixels
	static ACTIVITY_MIN_SEP = 30;
	
	// Minimum arrow size in pixels
	static ARROW_SIZE = 7;

    constructor(transition, configuration, startActivity, endActivity) {
        this.transition = transition;
        this.configuration = configuration;
        this.startActivity = startActivity;
        this.endActivity = endActivity;
    }

    draw(elem) {
        let configuration = this.configuration;
        let transition = this.transition;
        let startActivity = this.startActivity;
        let endActivity = this.endActivity;

        // Declare conditional flag
        let conditional = (startActivity.conditional || endActivity.conditional);

        // Create transition group element and append
        let transitionElem = document.createElement('div');
        elem.appendChild(transitionElem);
        transitionElem.classList.add("transition");
        transitionElem.classList.add("process-object");

        // Set element for toggle of select class
        this.transitionElem = transitionElem;

        // Append markable class
        if(configuration.marking != null && configuration.allowTransitionMarking == true) {
            transitionElem.classList.add('markable');
        }

        // Append conditional
        if(conditional == true) {
            transitionElem.classList.add("conditional");
        }

        // Append activated
        if(transition.activated == true) {
            transitionElem.classList.add("activated");
        }

        // Create transition group container element and append
        let transitionGroupContainerElem = document.createElement('div');
        transitionGroupContainerElem.classList.add("transition-group-container");
        transitionElem.appendChild(transitionGroupContainerElem);

        // Create line elements and append 
        let line1Elem = document.createElement('div');
        line1Elem.classList.add('transition-line');
        line1Elem.classList.add('transition-1');
        transitionGroupContainerElem.appendChild(line1Elem);

        let line2Elem = document.createElement('div');
        line2Elem.classList.add('transition-line');
        line2Elem.classList.add('transition-2');
        transitionGroupContainerElem.appendChild(line2Elem);

        let line3Elem = document.createElement('div');
        line3Elem.classList.add('transition-line');
        line3Elem.classList.add('transition-3');
        transitionGroupContainerElem.appendChild(line3Elem);

        // Do not call position here, will be called in main object
    }

    position() {
        let transition = this.transition;
        let transitionElem = this.transitionElem;
        let startActivity = this.startActivity;
        let endActivity = this.endActivity;

        // Get color
        let color = transition.color;

        // Calculate layout points
        let layout = this.calculateLayout(startActivity, endActivity);
        transitionElem.setAttribute("strategy", layout.transitionStrategy);
        transitionElem.setAttribute("startAttachPoint", layout.startAttachPoint);
        transitionElem.setAttribute("endAttachPoint", layout.endAttachPoint);
        transitionElem.setAttribute("quad", layout.quad);

        // Extract attachment points and validate
        let startAttachPoint = layout.startAttachPoint;
        let endAttachPoint = layout.endAttachPoint;
        if(startAttachPoint == -1 || endAttachPoint == -1) return;

        // Compute the co-ordinates of the start attachment point
        let startAtt = null;
        if(startAttachPoint == TransitionLineFlowComponent.AttachmentPoint.NORTH)
            startAtt = [startActivity.position_x + ActivityFlowComponent.WIDTH / 2, startActivity.position_y - ActivityFlowComponent.BORDER_WIDTH];
        else if(startAttachPoint == TransitionLineFlowComponent.AttachmentPoint.EAST)
            startAtt = [startActivity.position_x + ActivityFlowComponent.WIDTH + ActivityFlowComponent.BORDER_WIDTH, startActivity.position_y + ActivityFlowComponent.HEIGHT / 2];
        else if(startAttachPoint == TransitionLineFlowComponent.AttachmentPoint.SOUTH)
            startAtt = [startActivity.position_x + ActivityFlowComponent.WIDTH / 2, startActivity.position_y + ActivityFlowComponent.HEIGHT + ActivityFlowComponent.BORDER_WIDTH];
        else if(startAttachPoint == TransitionLineFlowComponent.AttachmentPoint.WEST)
            startAtt = [startActivity.position_x - ActivityFlowComponent.BORDER_WIDTH, startActivity.position_y + ActivityFlowComponent.HEIGHT / 2];
            
        // Compute the co-ordinates of the end attachment point
        let endAtt = null;
        if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.NORTH)
            endAtt = [endActivity.position_x + ActivityFlowComponent.WIDTH / 2, endActivity.position_y - ActivityFlowComponent.BORDER_WIDTH];
        else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.EAST)
            endAtt = [endActivity.position_x + ActivityFlowComponent.WIDTH + ActivityFlowComponent.BORDER_WIDTH, endActivity.position_y + ActivityFlowComponent.HEIGHT / 2];
        else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.SOUTH)
            endAtt = [endActivity.position_x + ActivityFlowComponent.WIDTH / 2 + ActivityFlowComponent.BORDER_WIDTH, endActivity.position_y + (ActivityFlowComponent.HEIGHT)];
        else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.WEST)
            endAtt = [endActivity.position_x - ActivityFlowComponent.BORDER_WIDTH, endActivity.position_y + (ActivityFlowComponent.HEIGHT / 2)];
        
        // Define the left, top, width, and height for the transition group div
        let left = Math.min(startAtt[0], endAtt[0]);
        let top = Math.min(startAtt[1], endAtt[1]);
        let width = Math.max(startAtt[0], endAtt[0]) - left;
        let height = Math.max(startAtt[1], endAtt[1]) - top;

        // Position the transition group div and size correctly
        transitionElem.style.top = top + "px";
        transitionElem.style.left = left + "px";
        transitionElem.style.height = height + "px";
        transitionElem.style.width = width + "px";

        // Remove any arrows
        let arrowElems = transitionElem.querySelectorAll('.transition-arrow');
        for(let thisArrowElem of arrowElems) {
            thisArrowElem.parentNode.removeChild(thisArrowElem);
        }

        // Based on transition strategy, adjust the child div properties
        let transitionStrategy = layout.transitionStrategy;
        let quad = layout.quad;
        if(transitionStrategy == TransitionLineFlowComponent.Strategy.C) {
            this.strategyConnectorC(transitionElem, startAttachPoint, startActivity, endAttachPoint, endActivity, quad, color);
        }
        else if(transitionStrategy == TransitionLineFlowComponent.Strategy.L) {
            this.strategyConnectorL(transitionElem, startAttachPoint, startActivity, endAttachPoint, endActivity, quad, color);
        }
        else if(transitionStrategy == TransitionLineFlowComponent.Strategy.S) {
            this.strategyConnectorS(transitionElem, startAttachPoint, startActivity, endAttachPoint, endActivity, quad, color);
        }
        // Otherwise it's an unknown strategy so hide all lines and arrows

        this.minX = Number.MAX_SAFE_INTEGER;
        this.minY = Number.MAX_SAFE_INTEGER;
        this.maxX = Number.MIN_SAFE_INTEGER;
        this.maxY = Number.MIN_SAFE_INTEGER;
    }

    calculateLayout(startActivity, endActivity) {
        // Declare attachments points and strategy variables
        let startAttachPoint	= -1;
        let endAttachPoint 		= -1;
        let transitionStrategy	= -1;

        // Declare variables for deltas between activities on x and y axes
        let dx = 0;
        let dy = 0;
        
        // Compute the origin for each activity (origin is the center of the box)
        let sx = startActivity.position_x + ActivityFlowComponent.WIDTH / 2;
        let sy = startActivity.position_y + ActivityFlowComponent.HEIGHT / 2;
        let ex = endActivity.position_x + ActivityFlowComponent.WIDTH / 2;
        let ey = endActivity.position_y + ActivityFlowComponent.HEIGHT / 2;

        // Determine the relative quadrant for the end activity compare to the start activity
        let quad = -1;
        if(ex >= sx && ey >= sy)
            quad = TransitionLineFlowComponent.RelativeQuadrant.SOUTH_EAST;
        else if(ex >= sx && ey < sy)
            quad = TransitionLineFlowComponent.RelativeQuadrant.NORTH_EAST;
        else if(ex < sx && ey < sy)
            quad = TransitionLineFlowComponent.RelativeQuadrant.NORTH_WEST;
        else if(ex < sx && ey >= sy)
            quad = TransitionLineFlowComponent.RelativeQuadrant.SOUTH_WEST;

        // Compute the delta on x-axis
        if(startActivity.position_x <= endActivity.position_x)
            dx = endActivity.position_x - (startActivity.position_x + ActivityFlowComponent.WIDTH);
        else 
            dx = startActivity.position_x - (endActivity.position_x + ActivityFlowComponent.WIDTH);

        // Compute the delta on the y-axis
        if(startActivity.position_y <= endActivity.position_y)
            dy = endActivity.position_y - (startActivity.position_y + ActivityFlowComponent.HEIGHT);
        else
            dy = startActivity.position_y - (endActivity.position_y + ActivityFlowComponent.HEIGHT);

        // Define attachment points and transition strategy based on parameters
        if((quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_EAST || quad == TransitionLineFlowComponent.RelativeQuadrant.NORTH_EAST) && dx >= TransitionLineFlowComponent.ACTIVITY_MIN_SEP) {
            startAttachPoint = TransitionLineFlowComponent.AttachmentPoint.EAST;
            endAttachPoint = TransitionLineFlowComponent.AttachmentPoint.WEST;
            transitionStrategy = TransitionLineFlowComponent.Strategy.S;
        }
        else if((quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_WEST || quad == TransitionLineFlowComponent.RelativeQuadrant.NORTH_WEST) && dx >= TransitionLineFlowComponent.ACTIVITY_MIN_SEP && dy <= 2 * TransitionLineFlowComponent.ACTIVITY_MIN_SEP) {
            startAttachPoint = TransitionLineFlowComponent.AttachmentPoint.WEST;
            endAttachPoint = TransitionLineFlowComponent.AttachmentPoint.EAST;
            transitionStrategy = TransitionLineFlowComponent.Strategy.S;
        }
        else if(quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_WEST && dx >= TransitionLineFlowComponent.ACTIVITY_MIN_SEP && dy > 2 * TransitionLineFlowComponent.ACTIVITY_MIN_SEP) {
            startAttachPoint = TransitionLineFlowComponent.AttachmentPoint.SOUTH;
            endAttachPoint = TransitionLineFlowComponent.AttachmentPoint.NORTH;
            transitionStrategy = TransitionLineFlowComponent.Strategy.S;
        }
        else if(quad == TransitionLineFlowComponent.RelativeQuadrant.NORTH_WEST && dx >= TransitionLineFlowComponent.ACTIVITY_MIN_SEP && dy > 2 * TransitionLineFlowComponent.ACTIVITY_MIN_SEP) {
            startAttachPoint = TransitionLineFlowComponent.AttachmentPoint.NORTH;
            endAttachPoint = TransitionLineFlowComponent.AttachmentPoint.SOUTH;
            transitionStrategy = TransitionLineFlowComponent.Strategy.S;
        }
        else if((quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_WEST || quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_EAST) && dx < TransitionLineFlowComponent.ACTIVITY_MIN_SEP && dy >= TransitionLineFlowComponent.ACTIVITY_MIN_SEP) {
            startAttachPoint = TransitionLineFlowComponent.AttachmentPoint.SOUTH;
            endAttachPoint = TransitionLineFlowComponent.AttachmentPoint.NORTH;
            transitionStrategy = TransitionLineFlowComponent.Strategy.S;
        }
        else if((quad == TransitionLineFlowComponent.RelativeQuadrant.NORTH_WEST || quad == TransitionLineFlowComponent.RelativeQuadrant.NORTH_EAST) && dx < TransitionLineFlowComponent.ACTIVITY_MIN_SEP && dy >= TransitionLineFlowComponent.ACTIVITY_MIN_SEP) {
            startAttachPoint = TransitionLineFlowComponent.AttachmentPoint.NORTH;
            endAttachPoint = TransitionLineFlowComponent.AttachmentPoint.SOUTH;
            transitionStrategy = TransitionLineFlowComponent.Strategy.S;
        }
        else if(quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_EAST && dx < TransitionLineFlowComponent.ACTIVITY_MIN_SEP && dy < TransitionLineFlowComponent.ACTIVITY_MIN_SEP) {
            if(ex >= startActivity.position_x + ActivityFlowComponent.WIDTH && ey > startActivity.position_y + ActivityFlowComponent.HEIGHT + TransitionLineFlowComponent.ACTIVITY_MIN_SEP / 2) {
                startAttachPoint = TransitionLineFlowComponent.AttachmentPoint.EAST;
                endAttachPoint = TransitionLineFlowComponent.AttachmentPoint.NORTH;
                transitionStrategy = TransitionLineFlowComponent.Strategy.L;
            }
            else if(ex >= startActivity.position_x + ActivityFlowComponent.WIDTH && ey > startActivity.position_y + ActivityFlowComponent.HEIGHT) {
                startAttachPoint = TransitionLineFlowComponent.AttachmentPoint.SOUTH;
                endAttachPoint = TransitionLineFlowComponent.AttachmentPoint.WEST;
                transitionStrategy = TransitionLineFlowComponent.Strategy.L;
            }
            else {
                startAttachPoint = TransitionLineFlowComponent.AttachmentPoint.EAST;
                endAttachPoint = TransitionLineFlowComponent.AttachmentPoint.EAST;
                transitionStrategy = TransitionLineFlowComponent.Strategy.C
            }
            // This is incomplete, there is a case where no line will appear
        }
        else if(quad == TransitionLineFlowComponent.RelativeQuadrant.NORTH_EAST && dx < TransitionLineFlowComponent.ACTIVITY_MIN_SEP && dy < TransitionLineFlowComponent.ACTIVITY_MIN_SEP) {
            if(ex >= startActivity.position_x + ActivityFlowComponent.WIDTH && ey <= startActivity.position_y - TransitionLineFlowComponent.ACTIVITY_MIN_SEP / 2) {
                startAttachPoint = TransitionLineFlowComponent.AttachmentPoint.EAST;
                endAttachPoint = TransitionLineFlowComponent.AttachmentPoint.SOUTH;
                transitionStrategy = TransitionLineFlowComponent.Strategy.L;
            }
            else if(ex >= startActivity.position_x + ActivityFlowComponent.WIDTH && ey <= startActivity.position_y) {
                startAttachPoint = TransitionLineFlowComponent.AttachmentPoint.NORTH;
                endAttachPoint = TransitionLineFlowComponent.AttachmentPoint.WEST;
                transitionStrategy = TransitionLineFlowComponent.Strategy.L;
            }
            else {
                startAttachPoint = TransitionLineFlowComponent.AttachmentPoint.EAST;
                endAttachPoint = TransitionLineFlowComponent.AttachmentPoint.EAST;
                transitionStrategy = TransitionLineFlowComponent.Strategy.C
            }
            // This is incomplete, there is a case where no line will appear
        }
        else if(quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_WEST && dx < TransitionLineFlowComponent.ACTIVITY_MIN_SEP && dy < TransitionLineFlowComponent.ACTIVITY_MIN_SEP) {
            if(ex <= startActivity.position_x && ey > startActivity.position_y + ActivityFlowComponent.HEIGHT + TransitionLineFlowComponent.ACTIVITY_MIN_SEP / 2) {
                startAttachPoint = TransitionLineFlowComponent.AttachmentPoint.WEST;
                endAttachPoint = TransitionLineFlowComponent.AttachmentPoint.NORTH;
                transitionStrategy = TransitionLineFlowComponent.Strategy.L;
            }
            else if(ex <= startActivity.position_x && ey > startActivity.position_y + ActivityFlowComponent.HEIGHT) {
                startAttachPoint = TransitionLineFlowComponent.AttachmentPoint.SOUTH;
                endAttachPoint = TransitionLineFlowComponent.AttachmentPoint.EAST;
                transitionStrategy = TransitionLineFlowComponent.Strategy.L;
            }
            else {
                startAttachPoint = TransitionLineFlowComponent.AttachmentPoint.WEST;
                endAttachPoint = TransitionLineFlowComponent.AttachmentPoint.WEST;
                transitionStrategy = TransitionLineFlowComponent.Strategy.C
            }
            // This is incomplete, there is a case where no line will appear
        }
        else if(quad == TransitionLineFlowComponent.RelativeQuadrant.NORTH_WEST && dx < TransitionLineFlowComponent.ACTIVITY_MIN_SEP && dy < TransitionLineFlowComponent.ACTIVITY_MIN_SEP) {
            if(ex <= startActivity.position_x && ey <= startActivity.position_y - TransitionLineFlowComponent.ACTIVITY_MIN_SEP / 2) {
                startAttachPoint = TransitionLineFlowComponent.AttachmentPoint.WEST;
                endAttachPoint = TransitionLineFlowComponent.AttachmentPoint.SOUTH;
                transitionStrategy = TransitionLineFlowComponent.Strategy.L;
            }
            else if(ex <= startActivity.position_x && ey < startActivity.position_y && ey > startActivity.position_y - TransitionLineFlowComponent.ACTIVITY_MIN_SEP / 2) {
                startAttachPoint = TransitionLineFlowComponent.AttachmentPoint.NORTH;
                endAttachPoint = TransitionLineFlowComponent.AttachmentPoint.EAST;
                transitionStrategy = TransitionLineFlowComponent.Strategy.L;
            }
            else {
                startAttachPoint = TransitionLineFlowComponent.AttachmentPoint.WEST;
                endAttachPoint = TransitionLineFlowComponent.AttachmentPoint.WEST;
                transitionStrategy = TransitionLineFlowComponent.Strategy.C
            }
            // This is incomplete, there is a case where no line will appear
        }

        // Create layout object and return
        let layout = {
            startAttachPoint: startAttachPoint,
            endAttachPoint: endAttachPoint,
            transitionStrategy: transitionStrategy,
            quad: quad
        }

        return layout;
    }

    strategyConnectorC(transitionElem, startAttachPoint, startActivity, endAttachPoint, endActivity, quad, color) {
        let transitionGroupContainerElem = transitionElem.querySelector('.transition-group-container');

        let line1Elem = transitionGroupContainerElem.querySelector('.transition-1');
        let line2Elem = transitionGroupContainerElem.querySelector('.transition-2');
        let line3Elem = transitionGroupContainerElem.querySelector('.transition-3');
        
        //console.log('Strategy C');
        //console.log(startAttachPoint + ">" + endAttachPoint);

        if(startAttachPoint == TransitionLineFlowComponent.AttachmentPoint.EAST) {
            line1Elem.style.height = 0 + 'px';
            line1Elem.style.width = (transitionElem.clientWidth + TransitionLineFlowComponent.ACTIVITY_MIN_SEP) + 'px';
            line1Elem.style.top = (quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_EAST ? 0 : transitionElem.clientHeight) + 'px';
            line1Elem.style.left = 0 + 'px';

            line2Elem.style.height = (transitionElem.clientHeight + 2) + 'px';
            line2Elem.style.width = 0 + 'px';
            line2Elem.style.top = 0 + 'px';
            line2Elem.style.left = (transitionElem.clientWidth + TransitionLineFlowComponent.ACTIVITY_MIN_SEP) + 'px';

            line3Elem.style.height = 0 + 'px';
            line3Elem.style.width = TransitionLineFlowComponent.ACTIVITY_MIN_SEP + 'px';									
            line3Elem.style.top = (quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_EAST ? transitionElem.clientHeight : 0) + 'px';
            line3Elem.style.left = transitionElem.clientWidth + 'px';
        }
        else if(startAttachPoint == TransitionLineFlowComponent.AttachmentPoint.WEST) {
            line1Elem.style.height = 0 + 'px';
            line1Elem.style.width = (transitionElem.clientWidth + TransitionLineFlowComponent.ACTIVITY_MIN_SEP) + 'px';
            line1Elem.style.top = (quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_WEST ? 0 : transitionElem.clientHeight) + 'px';
            line1Elem.style.left = (0 - TransitionLineFlowComponent.ACTIVITY_MIN_SEP) + 'px';

            line2Elem.style.height = transitionElem.clientHeight + 'px';
            line2Elem.style.width = 0 + 'px';
            line2Elem.style.top = 0 + 'px';
            line2Elem.style.left = (0 - TransitionLineFlowComponent.ACTIVITY_MIN_SEP) + 'px';

            line3Elem.style.height = 0 + 'px';
            line3Elem.style.width = TransitionLineFlowComponent.ACTIVITY_MIN_SEP + 'px';
            line3Elem.style.top = (quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_WEST ? transitionElem.clientHeight : 0) + 'px';
            line3Elem.style.left = (0 - TransitionLineFlowComponent.ACTIVITY_MIN_SEP) + 'px';
        }
        
        // Display the arrows
        let arrowElem = null;
        if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.EAST) {
            arrowElem = this.getTransitionArrowLeft(transitionGroupContainerElem);
            arrowElem.style.top = (quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_EAST ? transitionElem.clientHeight - TransitionLineFlowComponent.ARROW_SIZE : 0) + 'px';
            arrowElem.style.left = 0 + 'px';
            if(color != null)
                arrowElem.style.borderRightColor = color;
        }
        else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.WEST) {
            arrowElem = this.getTransitionArrowRight(transitionGroupContainerElem);
            arrowElem.style.top = (quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_WEST ? transitionElem.clientHeight - TransitionLineFlowComponent.ARROW_SIZE : 0) + 'px';
            arrowElem.style.left = (0 - TransitionLineFlowComponent.ARROW_SIZE) + 'px';
            if(color != null)
                arrowElem.style.borderLeftColor = color;
        }	

        if(color != null) {
            line1Elem.style.borderColor = color;
            line2Elem.style.borderColor = color;
            line3Elem.style.borderColor = color;
        } 
        
        // Append event handlers
        this.appendEventHandlers(line1Elem, line2Elem, line3Elem, arrowElem, endAttachPoint, color);   
        
        // Set Marking class and color
        // This is done last to override any other style classes
        this.setMarkingClassAndColor(line1Elem, line2Elem, line3Elem, arrowElem, endAttachPoint);
    }

    strategyConnectorL(transitionElem, startAttachPoint, startActivity, endAttachPoint, endActivity, quad, color) {
        let transitionGroupContainerElem = transitionElem.querySelector('.transition-group-container');

        let line1Elem = transitionGroupContainerElem.querySelector('.transition-1');
        let line2Elem = transitionGroupContainerElem.querySelector('.transition-2');
        let line3Elem = transitionGroupContainerElem.querySelector('.transition-3');
        
        //console.log('Strategy L');
        //console.log(startAttachPoint + ">" + endAttachPoint);

        // Show 2 lines, hide 1 line not required for transition strategy
        line3Elem.style.display = 'none';
        
        if(startAttachPoint == TransitionLineFlowComponent.AttachmentPoint.NORTH || startAttachPoint == TransitionLineFlowComponent.AttachmentPoint.SOUTH) {
            line1Elem.style.height = transitionElem.clientHeight +'px';
            line1Elem.style.width = 0 + 'px';
            line1Elem.style.top = 0 + 'px';
            line1Elem.style.left = (quad == TransitionLineFlowComponent.RelativeQuadrant.NORTH_WEST || quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_WEST ? transitionElem.clientWidth : 0) + 'px';
            
            line2Elem.style.height = 0 + 'px';
            line2Elem.style.width = transitionElem.clientWidth + 'px';
            line2Elem.style.top = (quad == TransitionLineFlowComponent.RelativeQuadrant.NORTH_EAST || quad == TransitionLineFlowComponent.RelativeQuadrant.NORTH_WEST ? 0 : transitionElem.clientHeight) + 'px';
            line2Elem.style.left = 0 + 'px';
        }
        else if(startAttachPoint == TransitionLineFlowComponent.AttachmentPoint.EAST || startAttachPoint == TransitionLineFlowComponent.AttachmentPoint.WEST) {
            line1Elem.style.height = 0 + 'px';
            line1Elem.style.width = transitionElem.clientWidth + 'px';
            line1Elem.style.top = (quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_EAST || quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_WEST ? 0 : transitionElem.clientHeight) + 'px';
            line1Elem.style.left = 0 + 'px';

            line2Elem.style.height = transitionElem.clientHeight + 'px';
            line2Elem.style.width = 0 + 'px';
            line2Elem.style.top = 0 + 'px';
            line2Elem.style.left = (quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_WEST || quad == TransitionLineFlowComponent.RelativeQuadrant.NORTH_WEST ? 0 : transitionElem.clientWidth) + 'px';
        }
        
        // Display the arrows
        let arrowElem = null;
        if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.NORTH) {
            arrowElem = this.getTransitionArrowDown(transitionGroupContainerElem);
            arrowElem.style.top = (transitionElem.clientHeight - TransitionLineFlowComponent.ARROW_SIZE) + 'px';
            arrowElem.style.left = (quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_WEST ? 0 - TransitionLineFlowComponent.ARROW_SIZE : transitionElem.clientWidth - TransitionLineFlowComponent.ARROW_SIZE) + 'px';
            if(color != null)
                arrowElem.style.borderTopColor = color;
        }
        else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.EAST) {
            arrowElem = this.getTransitionArrowLeft(transitionGroupContainerElem);
            arrowElem.style.top = (quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_WEST ? transitionElem.clientHeight - TransitionLineFlowComponent.ARROW_SIZE : 0 - TransitionLineFlowComponent.ARROW_SIZE) + 'px';
            arrowElem.style.left = 0 + 'px';
            if(color != null)
                arrowElem.style.borderRightColor = color;
        }
        else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.SOUTH) {
            arrowElem = this.getTransitionArrowUp(transitionGroupContainerElem);
            arrowElem.style.top = 0 + 'px';
            arrowElem.style.left = (quad == TransitionLineFlowComponent.RelativeQuadrant.NORTH_WEST ? 0 - TransitionLineFlowComponent.ARROW_SIZE : transitionElem.clientWidth - TransitionLineFlowComponent.ARROW_SIZE) + 'px';
            if(color != null)
                arrowElem.style.borderBottomColor = color;
        }
        else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.WEST) {
            arrowElem = this.getTransitionArrowRight(transitionGroupContainerElem);
            arrowElem.style.top = (quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_EAST ? transitionElem.clientHeight - TransitionLineFlowComponent.ARROW_SIZE : 0 - TransitionLineFlowComponent.ARROW_SIZE) + 'px';
            arrowElem.style.left = (transitionElem.clientWidth - TransitionLineFlowComponent.ARROW_SIZE) + 'px';
            if(color != null)
                arrowElem.style.borderLeftColor = color;
        }

        if(color != null) {
            line1Elem.style.borderColor = color;
            line2Elem.style.borderColor = color;
            line3Elem.style.borderColor = color;
        }

        // Append event handlers
        this.appendEventHandlers(line1Elem, line2Elem, line3Elem, arrowElem, endAttachPoint, color);

        // Set Marking class and color
        // This is done last to override any other style classes
        this.setMarkingClassAndColor(line1Elem, line2Elem, line3Elem, arrowElem, endAttachPoint);
    }

    strategyConnectorS(transitionElem, startAttachPoint, startActivity, endAttachPoint, endActivity, quad, color) {
        let transitionGroupContainerElem = transitionElem.querySelector('.transition-group-container');
        
        let line1Elem = transitionGroupContainerElem.querySelector('.transition-1');
        let line2Elem = transitionGroupContainerElem.querySelector('.transition-2');
        let line3Elem = transitionGroupContainerElem.querySelector('.transition-3');
        
        //console.log('Strategy S');
        //console.log(startAttachPoint + ">" + endAttachPoint);

        if(startAttachPoint == TransitionLineFlowComponent.AttachmentPoint.NORTH || startAttachPoint == TransitionLineFlowComponent.AttachmentPoint.SOUTH) {
            line1Elem.style.height = (transitionElem.clientHeight / 2 + 2) + 'px';
            line1Elem.style.width = 0 + 'px';
            line1Elem.style.top = 0 + 'px';
            line1Elem.style.left = (quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_EAST || quad == TransitionLineFlowComponent.RelativeQuadrant.NORTH_WEST ? 0 : transitionElem.clientWidth) + 'px';

            line2Elem.style.height = 0 + 'px';
            line2Elem.style.width = transitionElem.clientWidth + 2 + 'px';
            line2Elem.style.top = transitionElem.clientHeight / 2 + 'px';
            line2Elem.style.left = 0 + 'px';

            line3Elem.style.height = transitionElem.clientHeight / 2 + 'px';
            line3Elem.style.width = 0 + 'px';								
            line3Elem.style.top = transitionElem.clientHeight / 2 + 'px';
            line3Elem.style.left = (quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_WEST || quad == TransitionLineFlowComponent.RelativeQuadrant.NORTH_EAST ? 0 : transitionElem.clientWidth) + 'px';
        }
        else if(startAttachPoint == TransitionLineFlowComponent.AttachmentPoint.EAST || startAttachPoint == TransitionLineFlowComponent.AttachmentPoint.WEST) {
            line1Elem.style.height = 0 + 'px';
            line1Elem.style.width = transitionElem.clientWidth / 2 + 'px';
            line1Elem.style.top = (quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_EAST || quad == TransitionLineFlowComponent.RelativeQuadrant.NORTH_WEST ? 0 : transitionElem.clientHeight) + 'px';
            line1Elem.style.left = 0 + 'px';

            line2Elem.style.height = transitionElem.clientHeight + 'px';
            line2Elem.style.width = 0 + 'px';
            line2Elem.style.top = 0 + 'px';
            line2Elem.style.left = transitionElem.clientWidth / 2  + 'px';

            line3Elem.style.height = 0 + 'px';
            line3Elem.style.width = transitionElem.clientWidth / 2 + 'px';
            line3Elem.style.top = (quad == TransitionLineFlowComponent.RelativeQuadrant.NORTH_EAST || quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_WEST ? 0 : transitionElem.clientHeight) + 'px';
            line3Elem.style.left = transitionElem.clientWidth / 2 + 'px';
        }
        
        // Display the arrows
        let arrowElem = null;
        if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.NORTH) {
            arrowElem = this.getTransitionArrowDown(transitionGroupContainerElem);
            arrowElem.style.top = (transitionElem.clientHeight - TransitionLineFlowComponent.ARROW_SIZE) + 'px';
            arrowElem.style.left = (quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_WEST ? 0 - TransitionLineFlowComponent.ARROW_SIZE : transitionElem.clientWidth - TransitionLineFlowComponent.ARROW_SIZE) + 'px';
            if(color != null)
            arrowElem.style.borderTopColor = color;
        }
        else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.EAST) {
            arrowElem = this.getTransitionArrowLeft(transitionGroupContainerElem);
            arrowElem.style.top = (quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_WEST ? transitionElem.clientHeight - TransitionLineFlowComponent.ARROW_SIZE : 0 - TransitionLineFlowComponent.ARROW_SIZE) + 'px';
            arrowElem.style.left = 0 + 'px';
            if(color != null)
            arrowElem.style.borderRightColor = color;
        }
        else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.SOUTH) {
            arrowElem = this.getTransitionArrowUp(transitionGroupContainerElem);
            arrowElem.style.top = 0 + 'px';
            arrowElem.style.left = (quad == TransitionLineFlowComponent.RelativeQuadrant.NORTH_WEST ? 0 - TransitionLineFlowComponent.ARROW_SIZE : transitionElem.clientWidth - TransitionLineFlowComponent.ARROW_SIZE) + 'px';
            if(color != null)
            arrowElem.style.borderBottomColor = color;
        }
        else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.WEST) {
            arrowElem = this.getTransitionArrowRight(transitionGroupContainerElem);
            arrowElem.style.top = (quad == TransitionLineFlowComponent.RelativeQuadrant.SOUTH_EAST ? transitionElem.clientHeight - TransitionLineFlowComponent.ARROW_SIZE : 0 - TransitionLineFlowComponent.ARROW_SIZE) + 'px';
            arrowElem.style.left = (transitionElem.clientWidth - TransitionLineFlowComponent.ARROW_SIZE) + 'px';
            if(color != null)
                arrowElem.style.borderLeftColor = color;
        }

        if(color != null) {
            line1Elem.style.borderColor = color;
            line2Elem.style.borderColor = color;
            line3Elem.style.borderColor = color;
        }

        // Append event handlers
        this.appendEventHandlers(line1Elem, line2Elem, line3Elem, arrowElem, endAttachPoint, color);

        // Set Marking class and color
        // This is done last to override any other style classes
        this.setMarkingClassAndColor(line1Elem, line2Elem, line3Elem, arrowElem, endAttachPoint);
    }

    getTransitionArrow(transitionGroupContainerElem, direction) {
        let arrowElem = document.createElement('div');
        arrowElem.classList.add('transition-arrow');
        arrowElem.classList.add('transition-arrow-' + direction);
        transitionGroupContainerElem.appendChild(arrowElem);

        return arrowElem;
    }

    getTransitionArrowUp(transitionGroupContainerElem) {
        return this.getTransitionArrow(transitionGroupContainerElem, 'up');
    }

    getTransitionArrowDown(transitionGroupContainerElem) {
        return this.getTransitionArrow(transitionGroupContainerElem, 'down');
    }

    getTransitionArrowLeft(transitionGroupContainerElem) {
        return this.getTransitionArrow(transitionGroupContainerElem, 'left');
    }

    getTransitionArrowRight(transitionGroupContainerElem) {
        return this.getTransitionArrow(transitionGroupContainerElem, 'right');
    }

    // Append event handlers
    appendEventHandlers(line1Elem, line2Elem, line3Elem, arrowElem, endAttachPoint, color) {        
        let configuration = this.configuration;
        let transition = this.transition;
        
        if(configuration.allowTransitionMarking == false) return;

        let elemClick = function(event) {
            event.stopPropagation();
            if(event.ctrlKey == true)
                transition.row.mark("Toggle");
            else
                transition.row.mark("Replace");
        }

        let elemMouseOver = function(event) {
            if(transition.row.isMarked() == false) {
                line1Elem.style.borderColor = configuration.marking.colorHexCode;
                line2Elem.style.borderColor = configuration.marking.colorHexCode;
                line3Elem.style.borderColor = configuration.marking.colorHexCode;
                
                if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.NORTH) {
                    arrowElem.style.borderTopColor = configuration.marking.colorHexCode;
                }
                else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.EAST) {
                    arrowElem.style.borderRightColor = configuration.marking.colorHexCode;
                }
                else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.SOUTH) {
                    arrowElem.style.borderBottomColor = configuration.marking.colorHexCode;
                }
                else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.WEST) {
                    arrowElem.style.borderLeftColor = configuration.marking.colorHexCode;
                }
            }
        }

        let elemMouseOut = function(event) {
            if(transition.row.isMarked() == false) {
                line1Elem.style.borderColor = color;
                line2Elem.style.borderColor = color;
                line3Elem.style.borderColor = color;

                if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.NORTH) {
                    arrowElem.style.borderTopColor = color;
                }
                else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.EAST) {
                    arrowElem.style.borderRightColor = color;
                }
                else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.SOUTH) {
                    arrowElem.style.borderBottomColor = color;
                }
                else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.WEST) {
                    arrowElem.style.borderLeftColor = color;
                }
            }
        }

        if(configuration.marking != null) {
            line1Elem.onclick = elemClick;
            line1Elem.onmouseover = elemMouseOver;
            line1Elem.onmouseout = elemMouseOut;

            line2Elem.onclick = elemClick;
            line2Elem.onmouseover = elemMouseOver;
            line2Elem.onmouseout = elemMouseOut;

            line3Elem.onclick = elemClick;
            line3Elem.onmouseover = elemMouseOver;
            line3Elem.onmouseout = elemMouseOut;
        }
    }

    // Set marking class and color
    setMarkingClassAndColor(line1Elem, line2Elem, line3Elem, arrowElem, endAttachPoint) {        
        let configuration = this.configuration;
        let transition = this.transition;
        let transitionElem = this.transitionElem;

        if(configuration.marking != null && transition.row.isMarked() == true) {
            transitionElem.classList.add('marked');
            line1Elem.style.borderColor = configuration.marking.colorHexCode;
            line2Elem.style.borderColor = configuration.marking.colorHexCode;
            line3Elem.style.borderColor = configuration.marking.colorHexCode;

            if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.NORTH) {
                arrowElem.style.borderTopColor = configuration.marking.colorHexCode;
            }
            else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.EAST) {
                arrowElem.style.borderRightColor = configuration.marking.colorHexCode;
            }
            else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.SOUTH) {
                arrowElem.style.borderBottomColor = configuration.marking.colorHexCode;
            }
            else if(endAttachPoint == TransitionLineFlowComponent.AttachmentPoint.WEST) {
                arrowElem.style.borderLeftColor = configuration.marking.colorHexCode;
            }
        }
    }

    rectangleSelection(selectionRect) {
        let lineElems = this.transitionElem.querySelectorAll('.transition-line');
        for(let thisLineElem of lineElems) {
            let lineRect = thisLineElem.getBoundingClientRect();
            let match = Utility.rectangleOverlap(selectionRect, lineRect);
            if(match == true) return this.transition.row;
        }

        return null;
    }
}