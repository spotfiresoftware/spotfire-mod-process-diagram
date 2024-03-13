/*
* Copyright © 2024. Cloud Software Group, Inc.
* This file is subject to the license terms contained
* in the license file that is distributed with this file.
*/

class ProcessSchematic {
    static MIN_PADDING_TOP = 50;
    static MIN_PADDING_LEFT = 70;

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

        // Create process schematic element and append
        let processSchematicElem = document.createElement('div');
        processSchematicElem.classList.add("process-schematic");
        canvasElem.appendChild(processSchematicElem);

        // Draw process objects
        this.drawActivities(groupData, processSchematicElem);
        this.drawTasks(groupData, processSchematicElem);
        this.drawTransitions(groupData, processSchematicElem);    

        // Position components
        this.position();
        this.center(processSchematicElem);

        // Append event handlers
        this.appendEventHandlers(canvasElem);

        // Set markable class if marking enabled
        if(configuration.marking != null) {
            processSchematicElem.classList.add('markable');
        }
        else {
            processSchematicElem.classList.remove('markable');
        }
    }

    // Draw all activities
    drawActivities(groupData, processSchematicElem) {
        let configuration = this.configuration;
        let activityMap = groupData.activityData;

        this.activityComponentMap = {};
        this.activityRelatedComponentsMap = {};

        for(let key in activityMap) {
            let activity = activityMap[key];
            let component = new ActivitySchematicComponent(this, activity, configuration);
            this.activityComponentMap[activity.activityId] = component;
            component.draw(processSchematicElem);
            this.components.push(component);

            this.minX = Math.min(this.minX, component.minX);
            this.minY = Math.min(this.minY, component.minY);
            this.maxX = Math.max(this.maxX, component.maxX);
            this.maxY = Math.max(this.maxY, component.maxY);
        }
    }

    // Draw all tasks
    drawTasks(groupData, processSchematicElem) {
        let configuration = this.configuration;
        let activityMap = groupData.activityData;
        let taskMap = groupData.taskData;

        for(let key in taskMap) {
            let task = taskMap[key];
            let component = new TaskSchematicComponent(this, task, activityMap, configuration);
            component.draw(processSchematicElem);

            this.minX = Math.min(this.minX, component.minX);
            this.minY = Math.min(this.minY, component.minY);
            this.maxX = Math.max(this.maxX, component.maxX);
            this.maxY = Math.max(this.maxY, component.maxY);
        }
    }

    // Draw all transitions
    drawTransitions(groupData, processSchematicElem) {
        let configuration = this.configuration;
        let activityMap = groupData.activityData;
        let transitionMap = groupData.transitionData;

        for(let key in transitionMap) {
            let transition = transitionMap[key];
            let component = new TransitionSchematicComponent(this, transition, activityMap, configuration)
            component.draw(processSchematicElem);
            this.components.push(component);
        }
    }

    // Position all schematic elements
    position() {
        // Update position of all activities
        for(let thisActivityId in this.activityComponentMap) {
            let thisActivityComponent = this.activityComponentMap[thisActivityId];
            thisActivityComponent.position();
        }

        // Update position of all transitions
        for(let thisActivityId in this.activityRelatedComponentsMap) {
            let relatedComponents = this.activityRelatedComponentsMap[thisActivityId];
            for(let thisRelatedComponent of relatedComponents) {
                let transition = thisRelatedComponent.transition;
                let startActivity = this.activityComponentMap[transition.initialActivityId];
                let endActivity = this.activityComponentMap[transition.terminalActivityId];
                
                if(startActivity != null)
                    startActivity = startActivity.activity;
                if(endActivity != null)
                    endActivity = endActivity.activity;

                thisRelatedComponent.position(startActivity, endActivity);
            }
        }

        // Update dynamically positioned items for each activity
        for(let thisActivityId in this.activityRelatedComponentsMap) {
            let activity = this.activityComponentMap[thisActivityId].activity;
            this.updatePositionsForActivity(activity);
        }
    }

    // Link a related component to an activity
    linkComponentToActivity(activityId, component) {
        let related = this.activityRelatedComponentsMap[activityId];
        if(related == null) {
            related = [];
            this.activityRelatedComponentsMap[activityId] = related;
        }
        related.push(component);
    }

    // Update dynamic label position for activity, and dynamic trigger and terminal transition positions, if present
    updatePositionsForActivity(activity) {
        // Get the activityId
        let activityId = activity.activityId;

        // Retrieve all linked transitions
        let linkedTransitions = this.activityRelatedComponentsMap[activityId];

        // Initialize an array of available points for attachment
        let availablePoints = [
            TransitionLineSchematicComponent.AttachmentPoint.EAST, 
            TransitionLineSchematicComponent.AttachmentPoint.SOUTH, 
            TransitionLineSchematicComponent.AttachmentPoint.NORTH, 
            TransitionLineSchematicComponent.AttachmentPoint.WEST
        ];

        // Initialize trigger and terminal transitions
        let triggerTransition = null;
        let terminalTransition = null;

        // Loop over transitions and remove attach points from available list
        for(let thisTransition of linkedTransitions) {
            // Linked transition can be initial or terminal so select accordingly
            // Remove the attachment point from the list of available points
            if(thisTransition.transition.initialActivityId == activityId && thisTransition.layout != null) {
                let idx = availablePoints.indexOf(thisTransition.layout.startAttachPoint);
                if(idx >= 0) availablePoints.splice(idx, 1);
            }
            if(thisTransition.transition.terminalActivityId == activityId && thisTransition.layout != null) {
                let idx = availablePoints.indexOf(thisTransition.layout.endAttachPoint);
                if(idx >= 0) availablePoints.splice(idx, 1);
            }

            // Set trigger and terminal if so flagged
            if(thisTransition.transition.initialActivityId == null) {
                triggerTransition = thisTransition;
            }
            if(thisTransition.transition.terminalActivityId == null) {
                terminalTransition = thisTransition;
            }
        }

        // If there is a trigger transition, pick best orientation and position
        if(triggerTransition != null) {
            // Base test points
            let baseTestPoints = [TransitionLineSchematicComponent.AttachmentPoint.WEST, TransitionLineSchematicComponent.AttachmentPoint.NORTH];

            // Set default direction and test points in priority order
            let dir = 'right';
            let testPoints = baseTestPoints;
            if(this.configuration.transposeCoordinates == true) {
                dir = 'down';
                testPoints = baseTestPoints.toReversed();
            }

            // Check the test points for availablity
            for(let thisTestPoint of testPoints) {
                if(availablePoints.includes(thisTestPoint) == true) {
                    dir = this.getDirection(thisTestPoint);
                    let idx = availablePoints.indexOf(thisTestPoint);
                    if(idx >= 0) availablePoints.splice(idx, 1);
                    break;
                }
            }

            // Position trigger
            triggerTransition.positionTrigger(activity, dir);
        }

        // If there is a trigger transition, pick best orientation and position
        if(terminalTransition != null) {            
            // Base test points
            let baseTestPoints = [TransitionLineSchematicComponent.AttachmentPoint.EAST, TransitionLineSchematicComponent.AttachmentPoint.SOUTH];

            // Set default direction and test points in priority order
            let dir = 'right';
            let testPoints = baseTestPoints;
            if(this.configuration.transposeCoordinates == true) {
                dir = 'down';
                testPoints = baseTestPoints.toReversed();
            }

            // Check the test points for availablity
            for(let thisTestPoint of testPoints) {
                if(availablePoints.includes(thisTestPoint) == true) {
                    dir = this.getDirection(thisTestPoint);
                    let idx = availablePoints.indexOf(thisTestPoint);
                    if(idx >= 0) availablePoints.splice(idx, 1);
                    break;
                }
            }

            // Position trigger
            terminalTransition.positionTerminal(activity, dir);
        }        

        // Adjust label position for activities, and remove this position from the activity
        let activityComponent = this.activityComponentMap[activityId];
        let orientation = this.getOrientation(availablePoints[0]);
        activityComponent.positionLabel(orientation);
        availablePoints.splice(0, 1);
    }

    // Convert the attachment point into a direction class name
    getDirection(point) {
        let target = null;
        switch(point) {
            case 'N': target = 'down'; break;
            case 'S': target = 'down'; break;
            case 'E': target = 'right'; break;
            case 'W': target = 'right'; break;
            default: target = '';
        };

        return target;
    }

    // Convert the attachment point into an orientation class name
    getOrientation(point) {
        let target = null;
        switch(point) {
            case 'N': target = 'north'; break;
            case 'S': target = 'south'; break;
            case 'E': target = 'east'; break;
            case 'W': target = 'west'; break;
            default: target = '';
        };

        return target;
    }

    // Center the diagram within the canvas area.
    // This isn't ideal using JS for centering
    center(processSchematicElem) {     
        // Calculate centering padding
        let contentWidth = this.maxX - this.minX;
        let contentHeight = this.maxY - this.minY;
    
        let paddingX = processSchematicElem.clientWidth - contentWidth;
        if(paddingX < ProcessSchematic.MIN_PADDING_LEFT) {
            paddingX = ProcessSchematic.MIN_PADDING_LEFT;
        }
        
        let paddingY = processSchematicElem.clientHeight - contentHeight;
        if(paddingY < ProcessSchematic.MIN_PADDING_TOP) {
            paddingY = ProcessSchematic.MIN_PADDING_TOP;
        }

        let orientation = contentHeight > contentWidth ? 'vertical' : 'horizontal';

        // Center content
        let processObjectElems = processSchematicElem.querySelectorAll(".process-object");
        for(let thisProcessObjectElem of processObjectElems) {
            let left = thisProcessObjectElem.style.left;
            let top = thisProcessObjectElem.style.top;

            if(orientation == 'vertical') {
                thisProcessObjectElem.style.left = (parseInt(left.substring(0, left.length - 2)) - this.minX + paddingX / 2) + "px";
                thisProcessObjectElem.style.top = (parseInt(top.substring(0, top.length - 2)) - this.minY + ProcessSchematic.MIN_PADDING_TOP / 2) + "px";
            }
            else if(orientation == 'horizontal') {
                thisProcessObjectElem.style.left = (parseInt(left.substring(0, left.length - 2)) - this.minX + ProcessSchematic.MIN_PADDING_LEFT / 2) + "px";
                thisProcessObjectElem.style.top = (parseInt(top.substring(0, top.length - 2)) - this.minY + paddingY / 2) + "px";
            }
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

class ActivitySchematicComponent {
    static WIDTH = 100;
    static CIRCLE_RADIUS = 10;
    static CIRCLE_THICKNESS = 5;
    static CIRCLE_OFFSET_X = 15;
    static CIRCLE_OFFSET_Y = 15;
    static BORDER_THICKNESS = 3;

    constructor(processSchematic, activity, configuration) {
        this.processSchematic = processSchematic;
        this.activity = activity;
        this.configuration = configuration;
    }

    // Draw the activity and label
    draw(elem) {
        let configuration = this.configuration;
        let activity = this.activity;

        // Create element and append classes
        let activityElem = document.createElement('div');
        elem.appendChild(activityElem);
        activityElem.classList.add("activity");
        activityElem.classList.add("process-object");

        // Set element on component
        this.activityElem = activityElem;

        // Create SVG and Circle
        let svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        activityElem.appendChild(svgElem);

        let circleElem = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        svgElem.appendChild(circleElem);
        circleElem.setAttribute('cx', ActivitySchematicComponent.CIRCLE_OFFSET_X);
        circleElem.setAttribute('cy', ActivitySchematicComponent.CIRCLE_OFFSET_Y);
        circleElem.setAttribute('r', ActivitySchematicComponent.CIRCLE_RADIUS);
        circleElem.setAttribute('stroke-width', ActivitySchematicComponent.CIRCLE_THICKNESS);

        // Calculate delta
        let delta = activity.delay == null ? '' : activity.delay;
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

        // Create display name element
        let titleContainerElem = document.createElement('div');
        activityElem.appendChild(titleContainerElem);
        titleContainerElem.classList.add('title-container');
        titleContainerElem.classList.add('south'); // default positioning for label
        titleContainerElem.innerHTML = template.trim();

        this.titleContainerElem = titleContainerElem;

        // Set color
        if(activity.color != null) {
            circleElem.setAttribute('stroke', activity.color);
        }

        // Set Progress class
        if(activity.progress != null)
            activityElem.classList.add(activity.progress.toLowerCase().replaceAll(' ', '-'));

        // Set SLA Violation class
        if(activity.slaViolation == true) {
            activityElem.classList.add('sla-violation');
        }

        // Set Conditional class
        if(activity.conditional == true) {
            activityElem.classList.add('conditional');
        }

        // Set Is Delayed class
        if(activity.isDelayed == true) {
            activityElem.classList.add('delayed');
        }

        // Set Error classes
        if(activity.isError == true) {
            activityElem.classList.add('error');
        }
        if(activity.hadError == true) {
            activityElem.classList.add('had-error');
        }

        // Set Markable class
        if(configuration.marking != null && configuration.allowActivityMarking == true) {
            let self = this;
            activityElem.classList.add('markable');

            // Marking handler
            activityElem.onclick = function(event) {
                event.stopPropagation();
                if(event.ctrlKey == true)
                    activity.row.mark("Toggle");
                else
                    activity.row.mark("Replace");
            };

            activityElem.onmouseover = function(event) {
                if(activity.row.isMarked() == false) {
                    circleElem.setAttribute('stroke', configuration.marking.colorHexCode);
                }
            }

            activityElem.onmouseout = function(event) {
                if(activity.row.isMarked() == false) {
                    circleElem.setAttribute('stroke', activity.color);
                }
            }
        }

        // Set Marking class and color
        // This is done last to override any other style classes
        if(configuration.marking != null && activity.row.isMarked() == true) {
            activityElem.classList.add('marked');
            circleElem.setAttribute('stroke', configuration.marking.colorHexCode);
        }

        // Set bounds
        this.minX = this.getPosition().x;
        this.minY = this.getPosition().y;
        this.maxX = this.getPosition().x + ActivitySchematicComponent.WIDTH;
        this.maxY = this.getPosition().y + activityElem.clientHeight;
    }

    // Position the activity icon
    position() {
        let activityElem = this.activityElem;

        // Position element
        activityElem.style.left = this.getPosition().x + "px";
        activityElem.style.top = this.getPosition().y + "px";
    }

    // Position the activity label to the specified orientation
    positionLabel(orientation) {
        let classes = ['north', 'south', 'west', 'east'];
        this.titleContainerElem.classList.remove(...classes);
        this.titleContainerElem.classList.add(orientation);
    }

    // Get the activity position, apply any transpose configuration
    getPosition() {
        let activity = this.activity;
        if(this.configuration.transposeCoordinates == true) {
            return {
                x: activity.position_y,
                y: activity.position_x
            }
        }
        else {
            return {
                x: activity.position_x,
                y: activity.position_y
            }
        }
    }

    rectangleSelection(selectionRect) {
        let componentRect = this.activityElem.getBoundingClientRect();
        let match = Utility.rectangleOverlap(selectionRect, componentRect);

        return (match == true ? this.activity.row : null);
    }
}

class TaskSchematicComponent {
    constructor(processSchematic, task, activityMap, configuration) {
        this.processSchematic = processSchematic;
        this.task = task;
        this.activityMap = activityMap;
        this.configuration = configuration;
    }

    draw(elem, activityData) {
        // Tasks are not drawn on schematics

        // Set bounds - use integer defaults
        this.minX = Number.MAX_SAFE_INTEGER;
        this.minY = Number.MAX_SAFE_INTEGER;
        this.maxX = Number.MIN_SAFE_INTEGER;
        this.maxY = Number.MIN_SAFE_INTEGER;
    }

    position() {
        // Tasks are not drawn on schematics
    }
}

class TransitionSchematicComponent {
    constructor(processSchematic, transition, activityMap, configuration) {
        this.processSchematic = processSchematic;
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
            component = new TransitionArrowSchematicComponent(this.processSchematic, this, this.transition, this.configuration, startActivity, endActivity);            
        }
        else if(startActivity != null && endActivity == null) {
            component = new TransitionArrowSchematicComponent(this.processSchematic, this, this.transition, this.configuration, startActivity, endActivity);            
        }
        else if(startActivity != null && endActivity != null) {
            component = new TransitionLineSchematicComponent(this, this.transition, this.configuration, startActivity, endActivity);
        }
    
        if(component == null) return;
        this.component = component;

        // Link to related activities for initial
        if(transition.initialActivityId != null) {
            this.processSchematic.linkComponentToActivity(transition.initialActivityId, component);
        }
        
        // Link to related activities for terminal
        if(transition.terminalActivityId != null) {
            this.processSchematic.linkComponentToActivity(transition.terminalActivityId, component);
        }

        // Draw the component
        component.draw(elem);

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

    // Return the position for an activity
    getActivityPosition(activity) {
        if(this.configuration.transposeCoordinates == true) {
            return {
                x: activity.position_y,
                y: activity.position_x
            }
        }
        else {
            return {
                x: activity.position_x,
                y: activity.position_y
            }
        }
    }

    rectangleSelection(selectionRect) {
        return this.component.rectangleSelection(selectionRect);
    }
}

class TransitionArrowSchematicComponent {
    // Trigger and terminal arrow size and padding
    static LARGE_ARROW_SIZE = 12;
    static LARGE_ARROW_PADDING_X = 3;
    static LARGE_ARROW_PADDING_Y = 3;

    constructor(processSchematic, parent, transition, configuration, startActivity, endActivity) {
        this.processSchematic = processSchematic;
        this.parent = parent;
        this.transition = transition;
        this.configuration = configuration;
        this.startActivity = startActivity;
        this.endActivity = endActivity;
    }

    // Draw arrow
    draw(elem) {
        let configuration = this.configuration;
        let transition = this.transition;

        // Create transition div and append
        let transitionElem = document.createElement('div');
        elem.appendChild(transitionElem);
        transitionElem.classList.add("transition");
        transitionElem.classList.add("process-object");

        // Set element to component
        this.transitionElem = transitionElem;

        // Create arrow element and append
        let arrowElem = document.createElement('div');
        arrowElem.classList.add('large-arrow');
        transitionElem.appendChild(arrowElem);

        // Set element to component
        this.arrowElem = arrowElem;

        // Activated
        if(transition.activated == true) {
            transitionElem.classList.add("activated");
            transitionElem.style.zIndex = 3;      
        }

        // Append event handlers
        this.appendEventHandlers(transitionElem, arrowElem);

        // Set Marking class, color is set in positionTrigger/positionTerminal due to dynamic
        if(configuration.marking != null && transition.row.isMarked() == true) {
            transitionElem.classList.add('marked');
        }

        // Do not call position here, will be called in parent object
    }

    // Position arrow
    position() {
        // Dynamically positioned after all other components
    }

    // Position trigger arrow
    positionTrigger(activity, dir) {
        let configuration = this.configuration;
        let transition = this.transition;
        let arrowElem = this.arrowElem;
        let transitionElem = this.transitionElem;

        // Set direction on the component
        this.dir = dir;

        // Initialize list of directional classes
        let classes = ['down', 'right'];
        
        // Get activity position
        let activityPosition = this.parent.getActivityPosition(activity);

        // Remove all directional classes
        transitionElem.classList.remove(...classes);

        // Calculate position
        let left = 0;
        let top = 0;
        if(dir == 'right') {
            left = activityPosition.x - ActivitySchematicComponent.CIRCLE_THICKNESS * 1.5 - TransitionArrowSchematicComponent.LARGE_ARROW_PADDING_X;
            top = activityPosition.y + ActivitySchematicComponent.BORDER_THICKNESS * 2;

            arrowElem.style.borderLeftColor = transition.color;
            arrowElem.style.borderTopColor = 'transparent';
        }
        else if(dir == 'down') {
            left = activityPosition.x + ActivitySchematicComponent.BORDER_THICKNESS * 1.5;
            top = activityPosition.y - ActivitySchematicComponent.BORDER_THICKNESS * 3;

            arrowElem.style.borderLeftColor = 'transparent';
            arrowElem.style.borderTopColor = transition.color;
        }

        // Position the transition group div and size correctly
        transitionElem.style.top = top + "px";
        transitionElem.style.left = left + "px";
        
        if(dir != null && dir.length > 0) {
            transitionElem.classList.add(dir);
        }

        // Set color
        // This is done last to override any other style classes
        if(configuration.marking != null && transition.row.isMarked() == true) {
            if(dir == 'right') {
                arrowElem.style.borderLeftColor = configuration.marking.colorHexCode;
            }
            else if(dir == 'down') {
                arrowElem.style.borderTopColor = configuration.marking.colorHexCode;
            }            
        }
    }

    // Position terminal arrow
    positionTerminal(activity, dir) {
        let configuration = this.configuration;
        let transition = this.transition;
        let arrowElem = this.arrowElem;
        let transitionElem = this.transitionElem;

        // Set direction on the component
        this.dir = dir;

        // Initialize list of directional classes
        let classes = ['down', 'right'];

        // Get activity position
        let activityPosition = this.parent.getActivityPosition(activity);

        // Remove all directional classes
        transitionElem.classList.remove(...classes);

        // Calculate position
        let left = 0;
        let top = 0;
        if(dir == 'right') {
            left = activityPosition.x + ActivitySchematicComponent.CIRCLE_RADIUS * 2 + ActivitySchematicComponent.CIRCLE_THICKNESS + TransitionArrowSchematicComponent.LARGE_ARROW_PADDING_X * 2;
            top = activityPosition.y + ActivitySchematicComponent.BORDER_THICKNESS * 2;

            this.arrowElem.style.borderLeftColor = this.transition.color;
            this.arrowElem.style.borderTopColor = 'transparent';
        }
        else if(dir == 'down') {
            left = activityPosition.x + ActivitySchematicComponent.BORDER_THICKNESS * 1.5;
            top = activityPosition.y + ActivitySchematicComponent.CIRCLE_OFFSET_Y * 2 + TransitionArrowSchematicComponent.LARGE_ARROW_PADDING_Y;

            this.arrowElem.style.borderLeftColor = 'transparent';
            this.arrowElem.style.borderTopColor = this.transition.color;
        }

        // Position the transition group div and size correctly
        transitionElem.style.top = top + "px";
        transitionElem.style.left = left + "px";

        if(dir != null && dir.length > 0) {
            transitionElem.classList.add(dir);
        }

        // Set color
        // This is done last to override any other style classes
        if(configuration.marking != null && transition.row.isMarked() == true) {
            if(dir == 'right') {
                arrowElem.style.borderLeftColor = configuration.marking.colorHexCode;
            }
            else if(dir == 'down') {
                arrowElem.style.borderTopColor = configuration.marking.colorHexCode;
            }            
        }
    }

    // Append event handlers
    appendEventHandlers(transitionElem, arrowElem) {
        let configuration = this.configuration;
        let transition = this.transition;
        let self = this;

        // Append event handler for marking
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

            arrowElem.onmouseover = function(event) {
                if(transition.row.isMarked() == false) {
                    if(self.dir == 'right') {
                        arrowElem.style.borderLeftColor = configuration.marking.colorHexCode;
                    }
                    else if(self.dir == 'down') {
                        arrowElem.style.borderTopColor = configuration.marking.colorHexCode;
                    }
                }
            }

            arrowElem.onmouseout = function(event) {
                if(transition.row.isMarked() == false) {
                    if(self.dir == 'right') {
                        arrowElem.style.borderLeftColor = transition.color;
                    }
                    else if(self.dir == 'down') {
                        arrowElem.style.borderTopColor = transition.color;
                    }
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

class TransitionLineSchematicComponent {
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
	
	// Minimum separation of activities in pixels
	static ACTIVITY_MIN_SEP = 30;
	
    // Transition line thickness
    static LINE_THICKNESS = 5;

    // Transition line angle in degrees for vertical or horizontal separation
    static LINE_ANGLE_DEGREES = 45;

    constructor(parent, transition, configuration, startActivity, endActivity) {
        this.parent = parent;
        this.transition = transition;
        this.configuration = configuration;
        this.startActivity = startActivity;
        this.endActivity = endActivity;
    }

    // Draw line
    draw(elem) {
        let configuration = this.configuration;
        let transition = this.transition;
        let startActivity = this.startActivity;
        let endActivity = this.endActivity;

        // Declare conditional flag
        let conditional = (startActivity.conditional || endActivity.conditional);
     
        // Create element and append classes
        let transitionElem = document.createElement('div');
        elem.appendChild(transitionElem);
        transitionElem.classList.add("transition");
        transitionElem.classList.add("process-object");

        // Set element to component
        this.transitionElem = transitionElem;

        // Activated
        if(transition.activated == true) {
            transitionElem.classList.add("activated");
            transitionElem.style.zIndex = 3;      
        }

        // Append conditional
        if(conditional == true) {
            transitionElem.classList.add("conditional");
        }

        // Create SVG and line elements
        let svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        transitionElem.appendChild(svgElem);
        
        let lineElem = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        svgElem.appendChild(lineElem);
        lineElem.setAttribute('stroke-width', TransitionLineSchematicComponent.LINE_THICKNESS);

        // Set line to component
        this.lineElem = lineElem;

        // Set line color
        if(transition.color != null) {
            lineElem.setAttribute('stroke', transition.color);
        }

        // Append event handlers
        this.appendEventHandlers(transitionElem, lineElem);

        // Set marking class and color
        // This is done last to override any other style classes
        if(configuration.marking != null && transition.row.isMarked() == true) {
            transitionElem.classList.add('marked');
            lineElem.setAttribute('stroke', configuration.marking.colorHexCode);
        }
    }

    // Position line
    position() {
        let transitionElem = this.transitionElem;
        let startActivity = this.startActivity;
        let endActivity = this.endActivity;
        let lineElem = this.lineElem;

        // Calculate layout points
        let layout = this.calculateLayout(startActivity, endActivity);
        this.layout = layout;

         // Set attributes for debugging only
         transitionElem.setAttribute("startAttachPoint", layout.startAttachPoint);
         transitionElem.setAttribute("endAttachPoint", layout.endAttachPoint);
         transitionElem.setAttribute("quad", layout.quad);
 
         // Extract attachment points and validate
         let startAttachPoint = layout.startAttachPoint;
         let endAttachPoint = layout.endAttachPoint;
         if(startAttachPoint == -1 || endAttachPoint == -1) return;

        // Initialize positioning variables
        let left = 0;
        let top = 0;
        let width = 0;
        let height = 0;

        let startActivityPosition = this.parent.getActivityPosition(startActivity);
        let endActivityPosition = this.parent.getActivityPosition(endActivity);

        // Define dimensions for the containing transition box
        // Start attachment determines left and top
        if(startAttachPoint == TransitionLineSchematicComponent.AttachmentPoint.EAST || startAttachPoint == TransitionLineSchematicComponent.AttachmentPoint.WEST) {
            left = Math.min(startActivityPosition.x, endActivityPosition.x) + ActivitySchematicComponent.CIRCLE_OFFSET_X * 2 - 2;
            top = Math.min(startActivityPosition.y, endActivityPosition.y);
        }
        else if(startAttachPoint == TransitionLineSchematicComponent.AttachmentPoint.SOUTH || startAttachPoint == TransitionLineSchematicComponent.AttachmentPoint.NORTH) {
            left = Math.min(startActivityPosition.x, endActivityPosition.x);
            top = Math.min(startActivityPosition.y, endActivityPosition.y) + ActivitySchematicComponent.CIRCLE_OFFSET_Y * 2 - 1;
        }

        // End attachment determins width and height
        if(endAttachPoint == TransitionLineSchematicComponent.AttachmentPoint.WEST || endAttachPoint == TransitionLineSchematicComponent.AttachmentPoint.EAST) {
            width = Math.max(startActivityPosition.x, endActivityPosition.x) - left + ActivitySchematicComponent.BORDER_THICKNESS * 2;
            height = Math.max(startActivityPosition.y, endActivityPosition.y) - top + ActivitySchematicComponent.CIRCLE_OFFSET_Y * 2 + ActivitySchematicComponent.BORDER_THICKNESS;
        }
        if(endAttachPoint == TransitionLineSchematicComponent.AttachmentPoint.NORTH || endAttachPoint == TransitionLineSchematicComponent.AttachmentPoint.SOUTH) {
            width = Math.max(startActivityPosition.x, endActivityPosition.x) - left + ActivitySchematicComponent.CIRCLE_OFFSET_X * 2 + ActivitySchematicComponent.BORDER_THICKNESS;
            height = Math.max(startActivityPosition.y, endActivityPosition.y) - top + ActivitySchematicComponent.BORDER_THICKNESS * 1.5;
        }

        // Position the transition group div and size correctly
        transitionElem.style.top = top + "px";
        transitionElem.style.left = left + "px";
        transitionElem.style.height = height + "px";
        transitionElem.style.width = width + "px";

        // Define deltas
        let dx = endActivityPosition.x - startActivityPosition.x;
        let dy = endActivityPosition.y - startActivityPosition.y;

        // Define coordinates for the polyline
        let coords = [];

        // Define offsets for positioning
        let offset_x = ActivitySchematicComponent.CIRCLE_OFFSET_X + ActivitySchematicComponent.BORDER_THICKNESS;
        let offset_y = ActivitySchematicComponent.CIRCLE_OFFSET_Y + ActivitySchematicComponent.BORDER_THICKNESS;

        // Calculate coordinates depending on attachment points
        if(layout.startAttachPoint == TransitionLineSchematicComponent.AttachmentPoint.EAST && layout.endAttachPoint == TransitionLineSchematicComponent.AttachmentPoint.WEST) {
            // Calculate line2 horizontal width (will be zero for dy == 0)
            let dy_abs = Math.abs(dy);
            let line2_x = dy_abs / Math.tan((TransitionLineSchematicComponent.LINE_ANGLE_DEGREES * Math.PI) / 180);
            
            // Distribute remaining horzontal width to line1 and line3
            let line1_x = (width - line2_x) / 2;
            let line3_x = line1_x;

            if(dy >= 0) {
                coords = [
                    [0, offset_y], [line1_x, offset_y],
                    [line1_x, offset_y], [line1_x + line2_x, offset_y + dy_abs],
                    [line1_x + line2_x, offset_y + dy_abs], [line1_x + line2_x + line3_x, offset_y + dy_abs]
                ];
            }
            else {
                coords = [
                    [0, offset_y + dy_abs], [line1_x, offset_y + dy_abs],
                    [line1_x, offset_y + dy_abs], [line1_x + line2_x, offset_y],
                    [line1_x + line2_x, offset_y], [line1_x + line2_x + line3_x, offset_y]
                ];
            }
        }
        else if(layout.startAttachPoint == TransitionLineSchematicComponent.AttachmentPoint.WEST && layout.endAttachPoint == TransitionLineSchematicComponent.AttachmentPoint.EAST) {
            // Calculate line2 horizontal width (will be zero for dy == 0)
            let dy_abs = Math.abs(dy);
            let line2_x = dy_abs / Math.tan((TransitionLineSchematicComponent.LINE_ANGLE_DEGREES * Math.PI) / 180);
            
            // Distribute remaining horzontal width to line1 and line3
            let line1_x = (width - line2_x) / 2;
            let line3_x = line1_x;

            if(dy >= 0) {
                coords = [
                    [0, offset_y + dy_abs], [line1_x, offset_y + dy_abs],
                    [line1_x, offset_y + dy_abs], [line1_x + line2_x, offset_y],
                    [line1_x + line2_x, offset_y], [line1_x + line2_x + line3_x, offset_y]
                ];
            }
            else {
                coords = [
                    [0, offset_y], [line1_x, offset_y],
                    [line1_x, offset_y], [line1_x + line2_x, offset_y + dy_abs],
                    [line1_x + line2_x, offset_y + dy_abs], [line1_x + line2_x + line3_x, offset_y + dy_abs]
                ];
            }
        }
        else if(layout.startAttachPoint == TransitionLineSchematicComponent.AttachmentPoint.SOUTH && layout.endAttachPoint == TransitionLineSchematicComponent.AttachmentPoint.NORTH) {
            // Calculate line2 vertical height (will be zero for dx == 0)
            let dx_abs = Math.abs(dx);
            let line2_y = dx_abs / Math.tan((TransitionLineSchematicComponent.LINE_ANGLE_DEGREES * Math.PI) / 180);

            // Distribute remaining vertical height to line1 and line3
            let line1_y = (height - line2_y) / 2;
            let line3_y = line1_y;

            if(dx > 0) {
                coords = [
                    [offset_x, 0], [offset_x, line1_y],
                    [offset_x, line1_y], [offset_x + dx_abs, line1_y + line2_y],
                    [offset_x + dx_abs, line1_y + line2_y], [offset_x + dx_abs, line1_y + line2_y + line3_y]
                ];
            }
            else {
                coords = [
                    [offset_x + dx_abs, 0], [offset_x + dx_abs, line1_y],
                    [offset_x + dx_abs, line1_y], [offset_x, line1_y + line2_y],
                    [offset_x, line1_y + line2_y], [offset_x, line1_y + line2_y + line3_y]
                ];
            }
        }
        else if(layout.startAttachPoint == TransitionLineSchematicComponent.AttachmentPoint.NORTH && layout.endAttachPoint == TransitionLineSchematicComponent.AttachmentPoint.SOUTH) {
            // Calculate line2 vertical height (will be zero for dx == 0)
            let dx_abs = Math.abs(dx);
            let line2_y = dx_abs / Math.tan((TransitionLineSchematicComponent.LINE_ANGLE_DEGREES * Math.PI) / 180);

            // Distribute remaining vertical height to line1 and line3
            let line1_y = (height - line2_y) / 2;
            let line3_y = line1_y;

            if(dx > 0) {
                coords = [
                    [offset_x + dx_abs, 0], [offset_x + dx_abs, line1_y],
                    [offset_x + dx_abs, line1_y], [offset_x, line1_y + line2_y],
                    [offset_x, line1_y + line2_y], [offset_x, line1_y + line2_y + line3_y]
                ];
            }
            else {
                coords = [
                    [offset_x, 0], [offset_x, line1_y],
                    [offset_x, line1_y], [offset_x + dx_abs, line1_y + line2_y],
                    [offset_x + dx_abs, line1_y + line2_y], [offset_x + dx_abs, line1_y + line2_y + line3_y]
                ];
            }
        }

        // Convert coords to points and set on polyline
        let points = this.coordinatesToPoints(coords);
        lineElem.setAttribute('points', points);
    }

    // Calculate the layout based on position of start and end activities
    calculateLayout(startActivity, endActivity) {
        // Declare attachments points
        let startAttachPoint	= -1;
        let endAttachPoint 		= -1;

        // Declare letiables for deltas between activities on x and y axes
        let dx = 0;
        let dy = 0;
        
        let startActivityPosition = this.parent.getActivityPosition(startActivity);
        let endActivityPosition = this.parent.getActivityPosition(endActivity);

        // Compute the origin for each activity (origin is the center of the circle)
        let sx = startActivityPosition.x + ActivitySchematicComponent.CIRCLE_OFFSET_X;
        let sy = startActivityPosition.y + ActivitySchematicComponent.CIRCLE_OFFSET_Y;
        let ex = endActivityPosition.x + ActivitySchematicComponent.CIRCLE_OFFSET_X;
        let ey = endActivityPosition.y + ActivitySchematicComponent.CIRCLE_OFFSET_Y;

        // Determine the relative quadrant for the end activity compare to the start activity
        let quad = -1;
        if(ex >= sx && ey >= sy)
            quad = TransitionLineSchematicComponent.RelativeQuadrant.SOUTH_EAST;
        else if(ex >= sx && ey < sy)
            quad = TransitionLineSchematicComponent.RelativeQuadrant.NORTH_EAST;
        else if(ex < sx && ey < sy)
            quad = TransitionLineSchematicComponent.RelativeQuadrant.NORTH_WEST;
        else if(ex < sx && ey >= sy)
            quad = TransitionLineSchematicComponent.RelativeQuadrant.SOUTH_WEST;

        // Calculate deltas
        dx = Math.abs(sx - ex);
        dy = Math.abs(sy - ey);

        // Define attachment points based on parameters
        if((quad == TransitionLineSchematicComponent.RelativeQuadrant.SOUTH_EAST || quad == TransitionLineSchematicComponent.RelativeQuadrant.SOUTH_WEST) && dy >= dx) {
            startAttachPoint = TransitionLineSchematicComponent.AttachmentPoint.SOUTH;
            endAttachPoint = TransitionLineSchematicComponent.AttachmentPoint.NORTH;
        }
        else if((quad == TransitionLineSchematicComponent.RelativeQuadrant.SOUTH_EAST || quad == TransitionLineSchematicComponent.RelativeQuadrant.NORTH_EAST) && dy < dx) {
            startAttachPoint = TransitionLineSchematicComponent.AttachmentPoint.EAST;
            endAttachPoint = TransitionLineSchematicComponent.AttachmentPoint.WEST;
        }
        else if((quad == TransitionLineSchematicComponent.RelativeQuadrant.NORTH_EAST || quad == TransitionLineSchematicComponent.RelativeQuadrant.NORTH_WEST) && dy >= dx) {
            startAttachPoint = TransitionLineSchematicComponent.AttachmentPoint.NORTH;
            endAttachPoint = TransitionLineSchematicComponent.AttachmentPoint.SOUTH;
        }
        else if((quad == TransitionLineSchematicComponent.RelativeQuadrant.NORTH_WEST || quad == TransitionLineSchematicComponent.RelativeQuadrant.SOUTH_WEST) && dy < dx) {
            startAttachPoint = TransitionLineSchematicComponent.AttachmentPoint.WEST;
            endAttachPoint = TransitionLineSchematicComponent.AttachmentPoint.EAST;
        }

        // Create layout object and return
        let layout = {
            startAttachPoint: startAttachPoint,
            endAttachPoint: endAttachPoint,
            quad: quad
        }

        return layout;
    }

    // Converts a coordinate array into a string for use by polyline
    coordinatesToPoints(coordArray) {
        let points = '';
        for(let thisCoord of coordArray) {
            points += thisCoord[0] + ',' + thisCoord[1] + ' ';
        }
        return points.trim();
    }

    // Append event handlers
    appendEventHandlers(transitionElem, lineElem) {
        let configuration = this.configuration;
        let transition = this.transition;

        // Set Markable class
        if(configuration.marking != null && configuration.allowTransitionMarking == true) {
            let self = this;
            transitionElem.classList.add('markable');

            // Marking handler
            lineElem.onclick = function(event) {
                event.stopPropagation();
                if(event.ctrlKey == true)
                    transition.row.mark("Toggle");
                else
                    transition.row.mark("Replace");
            };

            lineElem.onmouseover = function(event) {
                if(transition.row.isMarked() == false) {
                    lineElem.setAttribute('stroke', configuration.marking.colorHexCode);
                }
            }

            lineElem.onmouseout = function(event) {
                if(transition.row.isMarked() == false) {
                    lineElem.setAttribute('stroke', transition.color);
                }
            }
        }

    }

    rectangleSelection(selectionRect) {
        let componentRect = this.transitionElem.getBoundingClientRect();
        let match = Utility.rectangleOverlap(selectionRect, componentRect);

        return (match == true ? this.transition.row : null);
   }
}