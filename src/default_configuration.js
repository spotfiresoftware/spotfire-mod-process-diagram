/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

/* This object is used to populate the default configuration on mod creation into the mod properties. */
const defaultConfiguration = {
    "rowLimit": 1000,
    "trellisDirection": "Columns",
    "maxTrellisCount": 10,
    "diagram": {
        "diagramMode": "Flow",
        "allowActivityMarking": true,
        "allowTaskMarking": true,
        "allowTransitionMarking": true,
        "processSchematic": {
            "transposeCoordinates": false
        }
    }
}
