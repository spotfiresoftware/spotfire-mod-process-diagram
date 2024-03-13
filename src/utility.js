/*
 * Copyright © 2024. Cloud Software Group, Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

class Utility {
    static hexToRgb(hexColor) {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
     
        return `(${r},${g},${b})`
    }

    static hexIsLight(hexColor) {
        let rgb = this.hexToRgb(hexColor);
        return this.rgbIsLight(rgb);
    }

    static rgbIsLight(rgbColor) {
        const firstParen = rgbColor.indexOf('(') + 1;
        const lastParen = rgbColor.indexOf(')');
        let colors = rgbColor.substring(firstParen, lastParen);
        colors = colors.split(',');
        var luma = 0.2126 * parseInt(colors[0]) + 0.7152 * parseInt(colors[1]) + 0.0722 * parseInt(colors[2]); // per ITU-R BT.709
        return luma > 160;
    }
	
    static formatTimestamp(data, format) {			
        if(data == undefined) return "";				
        if(format == undefined) return data;
        
        var date = data;
        if(!(date instanceof Date)) {
            date = new Date(date);
            // Firefox hack
            //date = new Date(data.replace(' ', 'T'));
        }

        // Array of short month names
        var shortMonth 	= ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];	
        var longMonth 	= ['January','February','March','April','May','June','July','August','September','October','November','December'];	
        
        // Array of date format tokens
        var o = {
            "yyyy+" : 	date.getFullYear(),
            "yy+" : 	(date.getFullYear() + "").substring((date.getFullYear() + "").length - 2),
            "dd+" : 	(date.getDate() < 10 ? "0" : "") + date.getDate(),
            "HH+" : 	(date.getHours() < 10 ? "0" : "") + date.getHours(),
            "mm+" : 	(date.getMinutes() < 10 ? "0" : "") + date.getMinutes(),
            "ss+" : 	(date.getSeconds() < 10 ? "0" : "") + date.getSeconds(),
            "S" : 		(date.getMilliseconds() < 10 ? "00" : date.getMilliseconds() < 100 ? "0" : "") + date.getMilliseconds(),
            // Month has to come last and has to be in this order due to the string substitution
            "MMMM+" : 	longMonth[date.getMonth()],
            "MMM+" : 	shortMonth[date.getMonth()],
            "MM+":		(date.getMonth() + 1 < 10 ? "0" : "") + (date.getMonth() + 1),
            "Z":		(date.getTimezoneOffset()),
        }

        var formatted = format;
        for(var k in o) {
            if(new RegExp("("+ k +")").test(formatted))
                formatted = formatted.replace(RegExp.$1,o[k]);
        }
            
        return formatted;
    }  
    	
    static rectangleOverlap(selectionRect, componentRect) {
        return !(
            ((selectionRect.top + selectionRect.height) < (componentRect.top)) ||
            (selectionRect.top > (componentRect.top + componentRect.height)) ||
            ((selectionRect.left + selectionRect.width) < componentRect.left) ||
            (selectionRect.left > (componentRect.left + componentRect.width))
        );
    }

    static pointInRect(selectionRect, point) {
        // Convert the selection rectangle coordinates
        let selectionBox = {
            x1: selectionRect.x,
            x2: selectionRect.x + selectionRect.width,
            y1: selectionRect.y,
            y2: selectionRect.y + selectionRect.height
        };

        return point.x >= selectionBox.x1 && point.x <= selectionBox.x2 && 
            point.y >= selectionBox.y1 && point.y <= selectionBox.y2;

    }

}