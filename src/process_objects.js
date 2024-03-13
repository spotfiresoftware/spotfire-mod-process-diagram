/*
* Copyright © 2024. Cloud Software Group, Inc.
* This file is subject to the license terms contained
* in the license file that is distributed with this file.
*/

class Activity {
    constructor(displayName, color, activityId, delay, slaViolation, hadError, conditional, positionX, positionY, taskId, row) {
        this.displayName = displayName;
        this.color = color;
        this.activityId = activityId;
        this.delay = delay == "(Empty)" ? null : delay;
        this.isDelayed = this.delay != null && !delay.startsWith('-');
        this.slaViolation = slaViolation != null && slaViolation.toLowerCase() === 'true';
        this.hadError = hadError != null && hadError.toLowerCase() === 'true';
        this.conditional = conditional != null && conditional.toLowerCase() === 'true';
        this.position_x = parseInt(positionX);
        this.position_y = parseInt(positionY);
        this.taskId = taskId;
        this.row = row;
    }
}

class Task {
    constructor(displayName, color, taskId, delay, slaViolation, row) {
        this.displayName = displayName;
        this.color = color;

        this.taskId = taskId;
        this.delay = delay == "(Empty)" ? null : delay;
        this.isDelayed = this.delay != null && delay.startsWith('+');
        this.slaViolation = slaViolation != null && slaViolation.toLowerCase() === 'true';
        this.row = row;
    }
}

class Transition {
    constructor(displayName, color, initialActivityId, terminalActivityId, activated, row) {
        this.displayName = displayName;
        this.color = color;

        this.transitionId = initialActivityId + "/" + terminalActivityId;
        this.initialActivityId = initialActivityId;
        this.terminalActivityId = terminalActivityId;
        this.activated = activated != null && activated.toLowerCase() === 'true';
        this.row = row;
    }
}
