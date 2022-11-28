/*
variables
*/
var model;
var canvas;
var classNames = [];
var canvas;
var coords = [];
var mousePressed = false;
var mode;

/*
prepare the drawing canvas 
*/
$(function() {
    canvas = window._canvas = new fabric.Canvas('canvas', {
        objectCaching: false
    });
    canvas.backgroundColor = '#ffffff';
    canvas.setHeight(600);
    canvas.setWidth(600);
    canvas.isDrawingMode = 0;
    canvas.freeDrawingBrush.color = "black";
    canvas.freeDrawingBrush.width = 7;
    canvas.renderAll();
    //setup listeners 
    canvas.on('mouse:up', function(e) {
        getFrame();
        mousePressed = false
    });
    canvas.on('mouse:down', function(e) {
        mousePressed = true
    });
    canvas.on('mouse:move', function(e) {
        recordCoor(e)
    });
})

/*
record the current drawing coordinates
*/
function recordCoor(event) {
    var pointer = canvas.getPointer(event.e);
    var posX = pointer.x;
    var posY = pointer.y;

    if (posX >= 0 && posY >= 0 && mousePressed) {
        coords.push(pointer)
    }
}

/*
get the best bounding box by trimming around the drawing
*/
function getMinBox() {
    //get coordinates 
    var [coorX, coorY] = coords.map(function(p) {
        return [p.x, p.y];
    });

    //find top left and bottom right corners 
    var min_coords = {
        x: Math.min.apply(null, coorX),
        y: Math.min.apply(null, coorY)
    }
    var max_coords = {
        x: Math.max.apply(null, coorX),
        y: Math.max.apply(null, coorY)
    }

    //return as strucut 
    return {
        min: min_coords,
        max: max_coords
    }
}

/*
get the current image data 
*/
function getImageData() {
        //get the minimum bounding box around the drawing 
        const mbb = getMinBox()

        //get image data according to dpi 
        const dpi = window.devicePixelRatio
        const imgData = canvas.contextContainer.getImageData(mbb.min.x * dpi, mbb.min.y * dpi,
                                                      (mbb.max.x - mbb.min.x) * dpi, (mbb.max.y - mbb.min.y) * dpi);
        return imgData
    }

/*
get the prediction 
*/
let names;

function getFrame() {
    //make sure we have at least two recorded coordinates 
    if (coords.length >= 2) {

        //get the image data from the canvas 
        const imgData = getImageData()

        //get the prediction 
        const pred = model.predict(preprocess(imgData)).dataSync()

        //find the top 5 predictions 
        const indices = findIndicesOfMax(pred, 5)
        const probs = findTopValues(pred, 5)
        names = getClassNames(indices)
    }

}

/*
get the the class names 
*/
function getClassNames(indices) {
    var outp = []
    for (var i = 0; i < indices.length; i++)
        outp[i] = classNames[indices[i]]
    return outp
}

/*
load the class names 
*/
async function loadDict() {
    loc = 'model/class_names.txt'
    
    await $.ajax({
        url: loc,
        dataType: 'text',
    }).done(success);
}

/*
load the class names
*/
function success(data) {
    const lst = data.split(/\n/)
    for (var i = 0; i < lst.length - 1; i++) {
        let symbol = lst[i]
        classNames[i] = symbol
    }
}

/*
get indices of the top probs
*/
function findIndicesOfMax(inp, count) {
    var outp = [];
    for (var i = 0; i < inp.length; i++) {
        outp.push(i); // add index to output array
        if (outp.length > count) {
            outp.sort(function(a, b) {
                return inp[b] - inp[a];
            }); // descending sort the output array
            outp.pop(); // remove the last index (index of smallest element in output array)
        }
    }
    return outp;
}

/*
find the top 5 predictions
*/
function findTopValues(inp, count) {
    var outp = [];
    let indices = findIndicesOfMax(inp, count)
    // show 5 greatest scores
    for (var i = 0; i < indices.length; i++)
        outp[i] = inp[indices[i]]
    return outp
}

/*
preprocess the data
*/
function preprocess(imgData) {
    return tf.tidy(() => {
        //convert to a tensor 
        let tensor = tf.browser.fromPixels(imgData, numChannels = 1)
        
        //resize 
        const resized = tf.image.resizeBilinear(tensor, [28, 28]).toFloat()
        
        //normalize 
        const offset = tf.scalar(255.0);
        const normalized = tf.scalar(1.0).sub(resized.div(offset));

        //We add a dimension to get a batch shape 
        const batched = normalized.expandDims(0)
        return batched
    })
}

/*
load the model
*/
async function start(cur_mode) {
    mode = cur_mode
    
    //load the model 
    model = await tf.loadLayersModel('model/model.json')
    
    //warm up 
    model.predict(tf.zeros([1, 28, 28, 1]))
    
    //allow drawing on the canvas 
    allowDrawing()
    
    //load the class names
    await loadDict()
}

/*
allow drawing on canvas
*/
function allowDrawing() {
    canvas.isDrawingMode = 1;
    $('button').prop('disabled', false);
}

/*
clear the canvs 
*/
function erase() {
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    coords = [];
}

function save() {
    return canvas.toSVG({
        suppressPreamble: true,
    });    
}


const potential_subjects = [['line', 'lijn'], ['triangle', 'driehoek'], ['smiley_face', 'smiley'], ['cat', 'kat'], ['lightning', 'bliksem']];
let round = 0;
let onderwerp = document.getElementById('onderwerp');

// Timer function
let timeLeft = 30;
let elem = document.getElementById('time-left');
var timerId;
function countdown() {
    if (names.includes(potential_subjects[round][0])) {
        goed();
        names = null;
    }
    if (timeLeft == -1) {
        fout();
        names = null;
    } else {
        elem.innerHTML = timeLeft + ' Tijd over';
        timeLeft--;
    }
}

function choose_drawing() {
    document.getElementsByClassName("navbar")[0].style.backgroundColor = 'beige';
    erase();
    document.getElementById('beginnen').disabled = true;
    onderwerp.innerHTML = potential_subjects[round][1];
    // Begin met aftellen
    timerId = setInterval(countdown, 1000);
}

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
}

let data = 'object|score|names|device|drawing\n';

const popup = document.getElementsByClassName("popup")[0];

function goed(){
    canvas.isDrawingMode = 0;
    popup.style.display = "flex";
    popup.children.item(0).style.backgroundColor = 'green';
    popup.children.item(0).innerHTML = 'Goed Bezig';
    clearTimeout(timerId);
    timeLeft = 30;
    onderwerp.innerHTML = "Goed";
    data += potential_subjects[round][0] + '|1|' + getDeviceType() + '|' + save() + "\n";
    round++;
    if (round == potential_subjects.length) {
        onderwerp.innerHTML = "Klaar";
        download("persoon.txt", data);
    } else{
        erase();
        document.getElementById('beginnen').disabled = false;
    }
}

function fout() {
    canvas.isDrawingMode = 0;
    popup.style.display = "flex";
    popup.children.item(0).style.backgroundColor = 'red';
    popup.children.item(0).innerHTML = 'Ah Jammer';
    onderwerp.innerHTML = "Fout";
    clearTimeout(timerId);
    timeLeft = 30;
    data += potential_subjects[round][0] + '|0|' + getDeviceType() + '|' + save() + "\n";
    round++;
    if (round == potential_subjects.length) {
        onderwerp.innerHTML = "Klaar";
        download("persoon.txt", data);
    } else{
        erase();
        document.getElementById('beginnen').disabled = false;
    }
}

function closePopUp() {
    popup.style.display = "none";
    canvas.isDrawingMode = 1;
    choose_drawing();
}

function getDeviceType () {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return "tablet";
    }
    if (
      /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
        ua
      )
    ) {
      return "mobile";
    }
    return "desktop";
};