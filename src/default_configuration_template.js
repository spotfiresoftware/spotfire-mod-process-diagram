/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

const defaultConfigurationTemplate = {
    "label": "Display",
    "rowLimit": {
        "label": "Row Limit",
        "datatype": "int",
        "minVal": 0
    },
    "trellisDirection": {
        "label": "Trellis Direction",
        "datatype": "string",
        "enumeration": [
            "Rows",
            "Columns"
        ]
    },
    "maxTrellisCount": {
        "label": "Max Trellis Panel Count",
        "datatype": "int",
        "minVal": 0
    },
    "diagram": {
        "label": "Process Diagram",
        "diagramMode": {
            "label": "Diagram Mode",
            "datatype": "string",
            "enumeration": [
                "Flow",
                "Schematic"
            ]
        },
        "allowActivityMarking": {
            "label": "Allow Activity Marking",
            "datatype": "boolean"
        },
        "allowTaskMarking": {
            "label": "Allow Task Marking",
            "datatype": "boolean"
        },
        "allowTransitionMarking": {
            "label": "Allow Transition Marking",
            "datatype": "boolean"
        },
        "processSchematic": {
            "label": "Process Schematic",
            "transposeCoordinates": {
                "label": "Transpose Schematic Coordinates",
                "datatype": "boolean"
            }    
        }
    }

}
