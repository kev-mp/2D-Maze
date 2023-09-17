"use strict";

var gl;

var numColumns = 3;
var numRows = 3;

var entranceStartpoint;
var originPoint; 

var rot;
var wallLength;
var ratCell;

var vertices = [];

var maze = [];
var rat = [];


window.onload = function init()
{
    var canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    //
    //  Configure WebGL
    //
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    //  Load shaders and initialize attribute buffers

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram( program );

    //Initially calculate the vertex array

    drawMaze();
    
    // Load the data into the GPU

    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    // Associate out shader variables with our data buffer

    var positionLoc = gl.getAttribLocation( program, "aPosition" );
    gl.vertexAttribPointer( positionLoc, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray(positionLoc);

    // Initialize event handlers

    document.getElementById("rowSlider").onchange = function(event) {
        numRows = event.target.value;
        document.getElementById("rowText").innerHTML = numRows;
    };

    document.getElementById("columnSlider").onchange = function(event) {
        numColumns = event.target.value;
        document.getElementById("columnText").innerHTML = numColumns;
        
    };

    document.getElementById("generateBtn").onclick = function() {
        drawMaze();
        gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
        render();
    };

    window.onkeydown = function(event) {
        let wall;

        var key = event.keyCode;
        switch( key ) {

          //Left
          case 37:
            //console.log("left");

            rot = rot + Math.PI/2;
            vertices = maze;
            vertices = vertices.concat(drawRat(ratCell, rot));
            

            break;

          //Up
          case 38:
            //console.log("up");
            /*
            wall = vec2(ratCell[0], ratCell[1] + 1);
            if (!wallExists(vertices, wall, true)) {
                ratCell = wall;
            }
            
            vertices = maze;
            vertices = vertices.concat(drawRat(ratCell, Math.PI/2));
            */
            //console.log("hi")
            //console.log(Math.round(Math.cos(rot)) + " " + Math.round(Math.sin(rot)));
            //right
            if (Math.round(Math.cos(rot)) == 1 && Math.round(Math.sin(rot)) == 0) {
                
                wall = vec2(ratCell[0] + 1, ratCell[1]);
                if (!wallExists(vertices, wall, false)) {
                    ratCell = wall;
                }    
                
            //up
            } else if (Math.round(Math.cos(rot)) == 0 && Math.round(Math.sin(rot)) == 1) {
                //console.log("hi2")
                wall = vec2(ratCell[0], ratCell[1] + 1);
                if (!wallExists(vertices, wall, true)) {
                    ratCell = wall;
                }
            //right
            } else if (Math.round(Math.cos(rot)) == -1 && Math.round(Math.sin(rot)) == 0) {
                if (!wallExists(vertices, ratCell, false)) {
                    ratCell = vec2(ratCell[0] - 1, ratCell[1]);
                }
            } else if (Math.round(Math.cos(rot)) == 0 && Math.round(Math.sin(rot)) == -1) {
                if (!wallExists(vertices, ratCell, true)) {
                    ratCell = vec2(ratCell[0], ratCell[1] - 1);
                }
            }

            vertices = maze;
            vertices = vertices.concat(drawRat(ratCell, rot))
            break;

          //Right
          case 39:
            //console.log("right");

            rot = rot - Math.PI/2;

            vertices = maze;
            vertices = vertices.concat(drawRat(ratCell, rot));

            break;
          
          //Down
          case 40:
            //console.log("down");
            /*
            if (!wallExists(vertices, ratCell, true)) {
                ratCell = vec2(ratCell[0], ratCell[1] - 1);
            }
            
            vertices = maze;
            vertices = vertices.concat(drawRat(ratCell, Math.PI * 3/2));
            */
            break;

        }

        gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
        render();
    };

    render();
};

function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays(gl.LINES, 0, vertices.length);
}

function drawMaze() {

    let mazePoints = [];

    //STEP 1: Create the grid
    wallLength = 2 / (Math.max(numColumns, numRows) + 2);
    originPoint = vec2(-(wallLength*numColumns)/2, -(wallLength*numRows)/2);

    let startpointPool = [];
    let endpointPool = [];

    // loop to populate grid with line segments
    for (let i = 0; i <= numColumns; i++) {
        for (let j = 0; j <= numRows; j ++) {

            //add each vertical line segment
            if (j < numRows) {

                let vertStartpoint = vec2(originPoint[0] + i * wallLength, originPoint[1] + j*wallLength);
                let vertEndpoint = vec2(originPoint[0] + i * wallLength, originPoint[1] + j*wallLength + wallLength);

                mazePoints.push(vertStartpoint);
                mazePoints.push(vertEndpoint); 
                
                //Puts only the inner walls into a pool
                if (i != 0 && i != numColumns) {
                    startpointPool.push(vertStartpoint);
                    endpointPool.push(vertEndpoint);
                }
            }
            
            //add each horizontal line segment
            if (i < numColumns) {

                let horiStartpoint = vec2(originPoint[0] + i * wallLength, originPoint[1] + j*wallLength);
                let horiEndpoint = vec2(originPoint[0] + i * wallLength + wallLength, originPoint[1] + j*wallLength);

                mazePoints.push(horiStartpoint);
                mazePoints.push(horiEndpoint);
                
                //Puts only the inner walls into a pool
                if (j != 0 && j != numRows) {
                    startpointPool.push(horiStartpoint);
                    endpointPool.push(horiEndpoint);
                }
            }
        }
    }

    /*
    for (let i = originPoint[0]; i <= -originPoint[0]; i+= wallLength) {

        for (let j = originPoint[1]; j <= -originPoint[1]; j+= wallLength) {
            mazePoints.push(vec2(i,j));
            mazePoints.push(vec2(i, j + wallLength));

            mazePoints.push(vec2(i,j));
            mazePoints.push(vec2(i + wallLength, j));
        }
    }
    */


    //STEP 2: Run Kruskal's algorithm to generate the inner maze itself
    
    //First, create array of arrays that'll
    let cellSetArray = [];

    for (let i = 0; i < numColumns; i ++) {
        for (let j = 0; j < numRows; j++) {
            cellSetArray.push([vec2(i, j)]);
        }
    }

    //var iteration = 1; 
    while (cellSetArray.length > 1) {
        //Gets a random inner wall
        let randIndex = getRandomInt(0, startpointPool.length);
        let removeStartpoint = startpointPool[randIndex];
        let removeEndpoint = endpointPool[randIndex];

        let cell1;
        let cell2;

        //These vars denote where the inner walls start. We can also use them to determine
        //which cells we combine.
        let centerX = Math.round((removeStartpoint[0] - originPoint[0]) / wallLength);
        let centerY = Math.round((removeStartpoint[1] - originPoint[1]) / wallLength);

        //Checks whether wall is vertical or horizontal
        if (removeStartpoint[1] < removeEndpoint[1]) {
            //Instance where the wall is VERTICAL

            //console.log("VERTICAL");
            cell1 = vec2(centerX - 1, centerY);
            cell2 = vec2(centerX, centerY);
        } else {
            //Instance where the wall is HORIZONTAL
            
            //console.log("HORIZONTAL");
            cell1 = vec2(centerX, centerY - 1);
            cell2 = vec2(centerX, centerY);
        }

        //console.log(cell1[0] + " " + cell1[1]);
        //console.log(cell2[0] + " " + cell2[1]);

        var cell1SetIndex = findCellSet(cellSetArray, cell1);
        var cell2SetIndex = findCellSet(cellSetArray, cell2);
        
        //Combines two sets (trees) if they aren't already connected
        if (cell1SetIndex != cell2SetIndex) {

            //console.log("REMOVE THE WALL");
            //Deletes inner wall from mazePoints
            removeWall(mazePoints, removeStartpoint, removeEndpoint);

            //Combines cell2's set onto cell1's set, then removes the previous set from cellSetArray
            cellSetArray[cell1SetIndex] = cellSetArray[cell1SetIndex].concat(cellSetArray[cell2SetIndex]);
            cellSetArray.splice(cell2SetIndex, 1);
        }

        //Removes inner wall from pool
        startpointPool.splice(randIndex, 1);
        endpointPool.splice(randIndex, 1);

        //console.log(iteration);
        //iteration++;
    }
    
    //STEP 3: remove two walls on the outer left and right walls for the entrance and exit

    
    //I can also make it so that the entrance and exit is on the further ends (ie if more columns than rows,
    //then the the exits will be on the far left and right walls)
    if (+numColumns >= +numRows) {
        var entranceLoc = getRandomInt(0, numRows);
        entranceStartpoint = vec2(originPoint[0], originPoint[1] + entranceLoc * wallLength);
        var entranceEndpoint = vec2(entranceStartpoint[0], entranceStartpoint[1] + wallLength);

        var exitLoc = getRandomInt(0, numRows);
        var exitStartpoint = vec2(originPoint[0] + numColumns * wallLength, originPoint[1] + exitLoc * wallLength);
        var exitEndpoint = vec2(exitStartpoint[0], exitStartpoint[1] + wallLength);
        //console.log("long or equal");
    } else {
        var entranceLoc = getRandomInt(0, numColumns);
        entranceStartpoint = vec2(originPoint[0] + entranceLoc * wallLength, originPoint[1] + numRows * wallLength);
        var entranceEndpoint = vec2(entranceStartpoint[0] + wallLength, entranceStartpoint[1]);

        var exitLoc = getRandomInt(0, numColumns);
        var exitStartpoint = vec2(originPoint[0] + exitLoc * wallLength, originPoint[1]);
        var exitEndpoint = vec2(exitStartpoint[0] + wallLength, exitStartpoint[1]);

        //console.log("tall");
    }

    removeWall(mazePoints, entranceStartpoint, entranceEndpoint);
    removeWall(mazePoints, exitStartpoint, exitEndpoint);

    //STEP 4: Create a "mouse" that starts at the entrance of the maze

    let ratLoc;
    //checks the orientation of the start point
    if (entranceStartpoint[0] < entranceEndpoint[0]) {
        rot = Math.PI*(3/2);
        ratLoc = entranceStartpoint;
    } else {
        rot = 0;
        ratLoc = vec2(entranceStartpoint[0] - wallLength, entranceStartpoint[1]);
    }


    let ratCellX = Math.round((ratLoc[0] - originPoint[0]) / wallLength);
    let ratCellY = Math.round((ratLoc[1] - originPoint[1]) / wallLength);
    ratCell = vec2(ratCellX, ratCellY);
    
    let ratPoints = drawRat(ratCell, rot);

    vertices = mazePoints;
    vertices = vertices.concat(ratPoints);

    maze = mazePoints;
    //rat = ratPoints;

    
}

//Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

//Returns array of rat points
function drawRat(ratCell, rot) {
    let ratPoints = [];

    let ratLocX = originPoint[0] + ratCell[0] * wallLength;
    let ratLocY = originPoint[1] + ratCell[1] * wallLength;

    let ratLoc = vec2(ratLocX, ratLocY);

    let ratCenter = vec2(ratLoc[0] + 0.5*wallLength, ratLoc[1] + 0.5*wallLength);
    
    let wallFraction = wallLength*0.25;

    let nose = vec2(ratCenter[0] + wallFraction, ratCenter[1]);
    let leftLeg = vec2(ratCenter[0] - wallFraction, ratCenter[1] + wallFraction);
    let rightLeg = vec2(ratCenter[0] - wallFraction, ratCenter[1] - wallFraction);

    let noseRot = rotate(nose, ratCenter, rot);
    let leftLegRot = rotate(leftLeg, ratCenter, rot);
    let rightLegRot = rotate(rightLeg, ratCenter, rot);

    ratPoints.push(noseRot, leftLegRot);
    ratPoints.push(leftLegRot, rightLegRot);
    ratPoints.push(rightLegRot, noseRot);

    return ratPoints;
}

//Finds the index of the set that a given cell is in
function findCellSet(cellSetArray, cell) {
    for (let i = 0; i < cellSetArray.length; i++) {
        for (let j = 0; j < cellSetArray[i].length; j ++) {
            if (equal(cellSetArray[i][j], cell)) {
                return i;
            }
        }
    }

    return -1;
}

//Removes a wall given its startpoint and endpoint
function removeWall(mazePoints, startpoint, endpoint) {
    
    for (let i = 0; i < mazePoints.length; i+=2) {
        if (equal(mazePoints[i], startpoint) && equal(mazePoints[i+1], endpoint)) {
            mazePoints.splice(i, 2);
            break;
        }
    }
    
}

//Checks if a wall exists
function wallExists(mazePoints, startCell, isHorizontal) {

    let startpoint = vec2(originPoint[0] + startCell[0] * wallLength, originPoint[1] + startCell[1] * wallLength);

    let endpoint;

    if (isHorizontal) {
        endpoint = vec2(startpoint[0] + wallLength, startpoint[1]);
    } else {
        endpoint = vec2(startpoint[0], startpoint[1] + wallLength);
    }

    for (let i = 0; i < mazePoints.length; i+=2) {
        if (equal(mazePoints[i], startpoint) && equal(mazePoints[i+1], endpoint)) {
            return true;
        }
    }
    return false;
}

//Rotates a point about a center point, by a given value of radians
function rotate(point, center, rot) {
    let resultX = (point[0] - center[0]) * Math.cos(rot) - (point[1] - center[1]) * Math.sin(rot) + center[0];
    let resultY = (point[0] - center[0]) * Math.sin(rot) + (point[1] - center[1]) * Math.cos(rot) + center[1];

    return vec2(resultX, resultY);
}