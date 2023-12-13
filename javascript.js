// Global variables
let dragindex = 0;
let clone = " ";
let tileSources = [];

// This is the number of rows (and columns) of tiles in the puzzle. If this number is changed
// it will be necessary to change the HTML layout also. It should be possible in a future version
// of this code to link the HTML and this variable using Flask. The code can be improved to make
// this value selectable by the user.
const NUM_ROWS = 4;

// This function scrambles the puzzle tiles by executing a number of random drags and drops
function scrambleImage(dropBoxes, draggedImages) {
    const n = 50;
    for (let i = 0; i < n; i++) {
        index1 = Math.floor(Math.random() * NUM_ROWS * NUM_ROWS);
        index2 = Math.floor(Math.random() * NUM_ROWS * NUM_ROWS);
        while (index1 == index2) {
            index2 = Math.floor(Math.random() * NUM_ROWS * NUM_ROWS);
        }
        clone = draggedImages[index1].cloneNode(true);
        draggedImages[index1].src = dropBoxes[index2].children[0].src;
        dropBoxes[index2].children[0].src = clone.src;
    }
}

function checkComplete(dropBoxes) {
    for (let i = 0; i < NUM_ROWS; i++) {
        if (tileSources[i] !== dropBoxes[i + 12].children[0].src ||
            tileSources[i + 4] !== dropBoxes[i + 8].children[0].src ||
            tileSources[i + 8] !== dropBoxes[i + 4].children[0].src ||
            tileSources[i + 12] !== dropBoxes[i].children[0].src) {
                return false;
            }
    }
    return true;
}

function readImage(file, largeImage, draggedImages, dropBoxes) {
    // Confirm that the file is an image
//    if (file.type && !file.type.startsWith("image/")) {
//        console.log("File is not an image", file.type, file);
//        return;
//    }

    // Create an object of class FileReader to read the image file for inserting into the image element
    const base64Reader = new FileReader();

    // Add an event listener to the reader that triggers when a file is read successfully
    base64Reader.addEventListener("load", function(event) {
        // update the 'src' attribute of the target img element to be the file read below
        largeImage.src = event.target.result;

        // Carry on to the next step in the app - dividing the large image into smaller tiles
        divideImage(file, draggedImages, dropBoxes);
    });

    // Read the file as a base64 encoded string
    base64Reader.readAsDataURL(file);
}

function divideImage(file, draggedImages, dropBoxes) {
    // Confirm that the file is a bitmap
//    if(file.type && !file.type.startsWith("image/bmp")) {
//        console.log("File is not a bitmap", file.type, file);
//        return;
//    }

    // Create a reader for the file
    const reader = new FileReader();

    // Read the file as un-typed data
    reader.readAsArrayBuffer(file);

    // Create an event listener that triggers when the file has been completely read
    reader.addEventListener("load", function(event) {
        // Save the contents of file as an array buffer
        arrayBuffer = event.target.result;

        // Create a dataview for accessing data in the array buffer
        const bmpDv = new DataView(arrayBuffer);

        // Confirm the buffer represents a bitmap - first two bytes should be 0x42 and 0x4D
        // repesenting the ascii values for 'B' and 'M'
        if (bmpDv.getUint8(0) !== 0x42 || bmpDv.getUint8(1) !== 0x4D) {
            console.log("BM signature not found");
            return;
        }

        // Get the offset, in bytes, from start of the array buffer to start of bitmap pixel data
        // This includes the length of the bitmap file header, the DIB information header, and
        // any colour palette used for the bitmap
        const dataOffset = bmpDv.getUint32(10, true);

        // Get the size of the bitmap file header and the DIB header
        // DIB header sizes less than 40 bytes are unsupported
        const fileHeaderSize = 14;
        const dibHeaderSize = bmpDv.getUint32(fileHeaderSize, true);
        if (dibHeaderSize < 40) {
            console.log("Older bitmap formats not supported");
            return;
        }

        // Get the width and height of the bitmap
        const bmpWidth = bmpDv.getInt32(fileHeaderSize + 4, true);
        const bmpHeight = bmpDv.getInt32(fileHeaderSize + 8, true);

        // Get the number of bytes per pixel
        const bytesPerPixel = bmpDv.getUint16(fileHeaderSize + 14, true) / 8;
        if (bytesPerPixel !== 3) {
            console.log("Unsupported pixel format");
            return;
        }

        // Confirm that the image is not compressed
        if (bmpDv.getUint32(fileHeaderSize + 16, true) !== 0) {
            console.log("Compressed formats are not supported");
            return;
        }

        // Get the image size
        const bmpDataSize = bmpDv.getUint32(fileHeaderSize + 20, true);

        // Calculate how much padding is used at the end of each row in the bitmap data
        const bmpDataRowSize = bmpDataSize / bmpHeight;
        const bmpImageRowSize = bmpWidth * bytesPerPixel;
        const bmpPadding = bmpDataRowSize - bmpImageRowSize;

        // Everything that needs to be known about the bitmap to be divided is now determined.
        // Now calculate the requirements for the tiles that the bitmap will be divided into.
        let tileWidth = 0;
        if (bmpWidth > bmpHeight) {
            tileWidth = Math.trunc(bmpHeight / NUM_ROWS);
        }
        else {
            tileWidth = Math.trunc(bmpWidth / NUM_ROWS);
        }
        let tileHeight = tileWidth;

        // Calculate how much padding will be required at the end of each row of data in
        // each tile (number of bytes per row should be a multiple of 4)
        let tilePadding = 0;
        const tileImageRowSize = tileWidth * bytesPerPixel;
        if (tileImageRowSize % NUM_ROWS) {
            tilePadding = NUM_ROWS - ((tileWidth * bytesPerPixel) % NUM_ROWS);
        }
        tileDataRowSize = tileImageRowSize + tilePadding;

        // Calculate the total file size and the size of the data block, for each tile
        const tileImageSize = tileWidth * tileHeight * bytesPerPixel;
        const tileDataSize = tileDataRowSize * tileHeight;
        const tileFileSize = dataOffset + tileDataSize;

        // Create the required number of bitmap tiles, copy the headers and colour palette into
        // each of them, and update their values for height, width, file size, and image size.
        let tiles = [];
        for (let i = 0, n = NUM_ROWS * NUM_ROWS; i < n; i++) {
            tiles[i] = new ArrayBuffer(tileFileSize);
            let tileDv = new DataView(tiles[i]);

            // Copy the original bitmap file header, dib info header, and colour palette to the tile
            for (j = 0; j < dataOffset; j++) {
                tileDv.setUint8(j, bmpDv.getUint8(j));
            }

            // Revise the entries in the headers for width, height, file size, and image size
            tileDv.setUint32(2, tileFileSize, true);
            tileDv.setInt32(18, tileWidth, true);
            tileDv.setInt32(22, tileHeight, true);
            tileDv.setUint32(34, tileDataSize, true);

            // Calculate the point in the bitmap corresponding to the upper-left corner of tile[i]
            let bmpStart = dataOffset + (i % NUM_ROWS) * tileWidth * bytesPerPixel + Math.trunc(i / NUM_ROWS) * tileHeight * bmpDataRowSize;

            // Scan through the data in the bitmap that corresponds to the data in tile[i] and transfer
            // this data into tile[i]
            for (let j = 0; j < tileImageSize; j++) {
                tileDv.setUint8(dataOffset + j + Math.trunc(j / (tileWidth * bytesPerPixel)) * tilePadding,
                bmpDv.getUint8(bmpStart + j + Math.trunc( j / (tileWidth * bytesPerPixel)) * (bmpDataRowSize - bytesPerPixel * tileWidth)));
            }

            // The following event handler attaches the bitmap file to the src attribute of one of the small tile areas after it has
            // been read by its FileReader object
            blobReader = new FileReader();
            blobReader.addEventListener("load", function(event) {
                draggedImages[i].src = event.target.result;
                tileSources[i] = event.target.result;
                if (i == NUM_ROWS * NUM_ROWS - 1) {
                    scrambleImage(dropBoxes, draggedImages);
                }
            });

            // Convert the bmp file to type 'blob' so it can be read as a Data URL
            const blob = new Blob([tiles[i]], {type: "image/bmp"});
            blobReader.readAsDataURL(blob);
        }
    });
}

document.addEventListener("DOMContentLoaded", function() {
    const body = document.getElementById("body");
    const dropBoxes = document.getElementsByClassName("dropbox");
    const draggedImages = document.getElementsByClassName("draggedimage");
    const largeImage = document.getElementById("large-image");
    const largeDiv = document.getElementById("large-div");
    const fileSelector = document.getElementById("file-selector");
    const status = document.getElementById("status");
    const winDialog = document.querySelector("dialog");

    // Set up the HTML body element so that it is not draggable/droppable outside of defined elements
    ["drag", "dragend", "dragenter", "dragleave", "dragover", "drop"].forEach(function(eventType){
        body.addEventListener(eventType, function(event){
            event.stopPropagation
            event.preventDefault();
        });
    });

    for (let i = 0; i < dropBoxes.length; i++) {
        draggedImages[i].addEventListener("dragstart", function(event) {
            // Make a copy of the element being dragged
            dragindex = i;
            clone = event.target.cloneNode(true);
        });

        dropBoxes[i].addEventListener("dragover", function(event) {
            event.preventDefault();
        });

        dropBoxes[i].addEventListener("drop", function(event) {
            event.preventDefault();
            let isPuzzleComplete = false;
            draggedImages[dragindex].src = event.target.src;
            event.target.src = clone.src;
            isPuzzleComplete = checkComplete(dropBoxes);
            if (isPuzzleComplete) {
                console.log(isPuzzleComplete);
                winDialog.show();
            }
        });
    }

    largeDiv.addEventListener("dragover", function(event) {
        event.stopPropagation();
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
    });

    largeDiv.addEventListener("drop", function(event) {
        event.stopPropagation();
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        readImage(file, largeImage, draggedImages, dropBoxes);
    })

    // Get the elements for selecting files from user's OS, and outputting those files in the browser
    fileSelector.addEventListener("change", function(event) {
        // Get the file selected by the user
        const file = event.target.files[0];

//        if (!file.type || !file.name || !file.size) {
//            status.textContent = "Error: The File.type property does not appear to be supported on this browser.";
//            return;
//        }

        readImage(file, largeImage, draggedImages, dropBoxes);
    });
});
