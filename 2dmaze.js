"use strict";

var gl;

var numColumns = 3;
var numRows = 3;

var entranceStartpoint;

var vertices = [];

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
    };

    document.getElementById("columnSlider").onchange = function(event) {
        numColumns = event.target.value;
        
    };

    document.getElementById("generateBtn").onclick = function() {
        drawMaze();
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

    vertices = [];

    //STEP 1: Create the grid
    var wallLength = 2 / (Math.max(numColumns, numRows) + 2);
    var originPoint = vec2(-(wallLength*numColumns)/2, -(wallLength*numRows)/2);

    var numCells = numRows * numColumns;

    var startpointPool = [];
    var endpointPool = [];

    // loop to populate grid with line segments
    for (let i = 0; i <= numColumns; i++) {
        for (let j = 0; j <= numRows; j ++) {

            //add each vertical line segment
            if (j < numRows) {

                var vertStartpoint = vec2(originPoint[0] + i * wallLength, originPoint[1] + j*wallLength);
                var vertEndpoint = vec2(originPoint[0] + i * wallLength, originPoint[1] + j*wallLength + wallLength);

                vertices.push(vertStartpoint);
                vertices.push(vertEndpoint); 
                
                //Puts only the inner walls into a pool
                if (i != 0 && i != numColumns) {
                    startpointPool.push(vertStartpoint);
                    endpointPool.push(vertEndpoint);
                }
            }
            
            //add each horizontal line segment
            if (i < numColumns) {

                var horiStartpoint = vec2(originPoint[0] + i * wallLength, originPoint[1] + j*wallLength);
                var horiEndpoint = vec2(originPoint[0] + i * wallLength + wallLength, originPoint[1] + j*wallLength);

                vertices.push(horiStartpoint);
                vertices.push(horiEndpoint);
                
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
            vertices.push(vec2(i,j));
            vertices.push(vec2(i, j + wallLength));

            vertices.push(vec2(i,j));
            vertices.push(vec2(i + wallLength, j));
        }
    }
    */


    //STEP 2: Run Kruskal's algorithm to generate the inner maze itself
    
    //First, create array of arrays that'll
    var cellSetArray = [];

    for (let i = 0; i < numColumns; i ++) {
        for (let j = 0; j < numRows; j++) {
            cellSetArray.push([vec2(i, j)]);
        }
    }

    //var iteration = 1; 
    while (cellSetArray.length > 1) {
        //Gets a random inner wall
        var randIndex = getRandomInt(0, startpointPool.length);
        var removeStartpoint = startpointPool[randIndex];
        var removeEndpoint = endpointPool[randIndex];

        var cell1;
        var cell2;

        //These vars denote where the inner walls start. We can also use them to determine
        //which cells we combine.
        var centerX = Math.round((removeStartpoint[0] - originPoint[0]) / wallLength);
        var centerY = Math.round((removeStartpoint[1] - originPoint[1]) / wallLength);

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
            //Deletes inner wall from vertices
            removeWall(vertices, removeStartpoint, removeEndpoint);

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

    /*
    //I can make it so that the entrance and exit is on the further ends (ie if more columns than rows,
    //then the the exits will be on the far left and right walls)
    if (numColumns >= numRows) {
        var entranceLoc = getRandomInt(0, numRows);
        entranceStartpoint = vec2(originPoint[0], originPoint[1] + entranceLoc * wallLength);
        var entranceEndpoint = vec2(entranceStartpoint[0], entranceStartpoint[1] + wallLength);

        var exitLoc = getRandomInt(0, numRows);
        var exitStartpoint = vec2(originPoint[0] + numColumns * wallLength, originPoint[1] + exitLoc * wallLength);
        var exitEndpoint = vec2(exitStartpoint[0], exitStartpoint[1] + wallLength);
    } else {
        var entranceLoc = getRandomInt(0, numColumns);
        entranceStartpoint = vec2(originPoint[0] + entranceLoc * wallLength, originPoint[1] + numRows * wallLength);
        var entranceEndpoint = vec2(entranceStartpoint[0] + wallLength, entranceStartpoint[1]);

        var exitLoc = getRandomInt(0, numColumns);
        var exitStartpoint = vec2(originPoint[0] + exitLoc * wallLength, originPoint[1]);
        var exitEndpoint = vec2(exitStartpoint[0] + wallLength, exitStartpoint[1]);

    }
    */
    
    var entranceLoc = getRandomInt(0, numRows);
    entranceStartpoint = vec2(originPoint[0], originPoint[1] + entranceLoc * wallLength);
    var entranceEndpoint = vec2(entranceStartpoint[0], entranceStartpoint[1] + wallLength);

    var exitLoc = getRandomInt(0, numRows);
    var exitStartpoint = vec2(originPoint[0] + numColumns * wallLength, originPoint[1] + exitLoc * wallLength);
    var exitEndpoint = vec2(exitStartpoint[0], exitStartpoint[1] + wallLength);
    

    removeWall(vertices, entranceStartpoint, entranceEndpoint);
    removeWall(vertices, exitStartpoint, exitEndpoint);
    
}

//Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
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
function removeWall(vertices, startpoint, endpoint) {
    for (let i = 0; i < vertices.length; i++) {
        if (equal(vertices[i], startpoint) && equal(vertices[i+1], endpoint)) {
            vertices.splice(i, 2);
            break;
        }
    }
}