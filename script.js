let time = 0;
let deansgate;
let garamond;
let origin;
let track;

let curve;
let curveTarget;


let bg;
let mainColor;
let bounds;

const curveCount = 150;

const audioContext = new AudioContext();

const tracks = {
    matmo: setupAudio("https://pub-3cccac1bc30c4fa2a3ca1794a8def177.r2.dev/matmo.wav"),
    skee: setupAudio("https://pub-3cccac1bc30c4fa2a3ca1794a8def177.r2.dev/skee2.wav"),
    crop: setupAudio("https://pub-3cccac1bc30c4fa2a3ca1794a8def177.r2.dev/crop%20circles.wav"),
    book: setupAudio("https://pub-3cccac1bc30c4fa2a3ca1794a8def177.r2.dev/book.wav"),
}

let textContours = {

}

async function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);     
    origin = createVector(width / 2, height / 2);

    bg = color(252, 248, 240);
    mainColor = color(153, 128, 147); 

    deansgate = await loadFont('fonts/deansgate.ttf');
    garamond = await loadFont('fonts/EBGaramond-Regular.ttf');
    textSize(75);
    textAlign(CENTER, TOP)   
    textContours.title = deansgate.textToContours('MICHAEL SMITH', origin.x, 15, {sampleFactor: 0.5});

    textAlign(CENTER, CENTER)   
    textContours.listen = deansgate.textToContours('LISTEN:', origin.x, origin.y, {sampleFactor: 0.5});

    textContours.track1 = deansgate.textToContours('TRACK NAME 1', origin.x, origin.y - 75 * 1, {sampleFactor: 0.5});
    textContours.track2 = deansgate.textToContours('TRACK NAME 2', origin.x, origin.y - 75 * 2, {sampleFactor: 0.5});
    textContours.track3 = deansgate.textToContours('TRACK NAME 3', origin.x, origin.y + 75 * 1, {sampleFactor: 0.5});
    textContours.track4 = deansgate.textToContours('TRACK NAME 4', origin.x, origin.y + 75 * 2, {sampleFactor: 0.5});
    textContours.track5 = deansgate.textToContours('TRACK NAME 5', origin.x, origin.y + 75 * 3, {sampleFactor: 0.5});
    
    track = tracks.book;
    track.audio.play();

    curve = Array.from({ length: curveCount }, (_, i) => createVector(width / 2, height / 2));
    curveTarget =  distributePoints(curveCount, 400, origin);

    setInterval(() => { perturb_fft() }, 5);   
}

function draw() {
    time += deltaTime;    

    track.analyser.getByteTimeDomainData(track.samples);
    track.analyser.getByteFrequencyData(track.fft);

    background(bg);      
         
    noFill();    

    for (let i = 0; i < curve.length; i++) {
        curve[i].lerp(curveTarget[i], 0.04);
    }      

    splineProperty('ends', EXCLUDE);  

    for (let i = 0; i < curve.length - 3; i++) {     

        const t = (i / (curve.length - 3));     

        let c = lerpColor(bg, mainColor, constrain(pow(t, 5), 0, 0.35));
        stroke(c);
        strokeWeight(pow(t, 3) * 2);

        spline(
            curve[i].x, curve[i].y, 
            curve[i + 1].x, curve[i + 1].y,
            curve[i + 2].x, curve[i + 2].y,
            curve[i + 3].x, curve[i + 3].y
        );
    }

    stroke(mainColor);
    strokeWeight(1);
    for (const [_, text] of Object.entries(textContours)) {
        text.forEach(points => {
            beginShape();
            points.forEach(p => vertex(p.x, p.y));
            endShape(CLOSE);
        });   
    }
    rect(bounds);
   
    

}

function mouseClicked() {   
    curveTarget = distributePoints(curveCount, 400, origin);
}

function windowResized() {    
    resizeCanvas(windowWidth, windowHeight);
    origin.x = width / 2;
    origin.y = height / 2;
    curveTarget = distributePoints(curveCount, 400, origin);
    //clamp_points(curveTarget);
}

function setupAudio(url) {
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    audio.preload = 'none';
    audio.loop = 'true';

    const source = audioContext.createMediaElementSource(audio);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 4096;
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    return {
        audio, 
        analyser, 
        samples: new Uint8Array(analyser.fftSize),
        fft: new Uint8Array(analyser.frequencyBinCount)
    };
}

function distributePoints(n, step, end) {  
    let last = origin;
    let points = [];

    for (let i = 0; i < n - 2; i++) {
        let offset;
        let next;
        while (true) {
            offset = createVector(random(-step, step), random(-step, step));
            next = p5.Vector.add(last, offset);           
            if (on_screen(next)) {
                break;
            }
        }         
        points.push(next);
        last = next;
    }

    points.push(end);
    points.push(end);

    return points;
}

function clamp_points(points) {
    for (let point of points) {
        point.x = constrain(point.x, 0, width);
        point.y = constrain(point.y, 0, height);
    }
}

function perturb(points, i, step) {    
    let offset;
    let next;
    while (true) {
        offset = createVector(random(-step, step), random(-step, step));
        next = p5.Vector.add(points[i], offset);           
        if (on_screen(next)) {
            break;
        }
    }
    points[i] = next;    
}

function perturb_fft() {    
    perturb(curveTarget, floor(random(curveTarget.length - 2)), track.samples[0]);   
}

function on_screen(p) {
    return (p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height);
}