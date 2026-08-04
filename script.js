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

let waveEnd;
let waveStart;
let waveAmplitude;

const curveCount = 150;
const trackCount = 7;
const wavePad = 15;  

const audioContext = new AudioContext();

const tracks = {
    matmo: setupAudio("https://pub-3cccac1bc30c4fa2a3ca1794a8def177.r2.dev/matmo.wav"),
    skee: setupAudio("https://pub-3cccac1bc30c4fa2a3ca1794a8def177.r2.dev/skee2.wav"),
    crop: setupAudio("https://pub-3cccac1bc30c4fa2a3ca1794a8def177.r2.dev/crop%20circles.wav"),
    book: setupAudio("https://pub-3cccac1bc30c4fa2a3ca1794a8def177.r2.dev/book.wav"),
}

let labels = {
    title: {text: 'MICHAEL SMITH'},
    listen: {text: 'LISTEN:'},
    crop_circles: {text: 'CROP CIRCLES'},
    track1: {text: 'TRACK TITLE 1'},
    track2: {text: 'TRACK TITLE 2'},
    track3: {text: 'SYNTHESIZED SEA'},
    track4: {text: 'TRACK TITLE 4'},
    track5: {text: 'TRACK TITLE 5'},
    track6: {text: 'TRACK TITLE 6'},
}

function layoutLabel(label, x, y, w, h) {    
    textSize(100);
    textAlign(LEFT, TOP)   
    label.paths = deansgate.textToContours(label.text, 0, 0, {sampleFactor: 0.5});
    const size = getLabelSize(deansgate, label.text, w, h);
    label.scale = size.scale;
    label.x = x;
    label.y = y;
    label.w = size.w;
    label.h = size.h;
    return {x: x, y: y, w: size.w, h: size.h};
}

function drawLabel(label, color) {
    push();
    translate(label.x, label.y);
    scale(label.scale);
    stroke(color);
    strokeWeight(1 / label.scale);
    label.paths.forEach(points => {
        beginShape();
        points.forEach(p => vertex(p.x, p.y));
        endShape(CLOSE);
    }); 
    pop();
}

function getLabelSize(font, text, w, h) {
    textFont(font);
    textAlign(LEFT, TOP);
    textSize(100);
    const size = textBounds(text, 0, 0);
    const scale_w = w / size.w;
    const scale_h = h / size.h;
    const scale = min(scale_w, scale_h);
    return { scale: scale, w: size.w * scale, h: size.h * scale };
}


async function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);     
    origin = createVector(width / 2, height / 2);

    bg = color(252, 248, 240);
    mainColor = color(153, 128, 147); 

    deansgate = await loadFont('fonts/deansgate.ttf');
    garamond = await loadFont('fonts/EBGaramond-Regular.ttf');

    layout();
    
    track = tracks.crop;
    track.audio.play();

    
    curveTarget =  distributePoints(curveCount, 400, waveStart);
    curve = [...curveTarget];

    setInterval(() => { perturb_fft() }, 5);   

    
}

function layout() {
    const gap = 5;
    const topText = document.querySelector('.text-block.top'); 
    const bottomText = document.querySelector('.text-block.bottom'); 

    let info = layoutLabel(labels.title, origin.x - cardWidth() / 2, 10, cardWidth(), 999);       
    topText.style.top = `${info.y + info.h}px`;

    const areaTop = topText.getBoundingClientRect().bottom;
    const areaBottom = bottomText.getBoundingClientRect().top;   

    info = layoutLabel(labels.listen, origin.x - cardWidth() / 2, areaTop + gap, cardWidth() / 2, 999);    

    const rowH = (areaBottom - (info.y + info.h + gap * trackCount)) / trackCount;

    info = layoutLabel(labels.crop_circles, origin.x - cardWidth() / 2, info.y + info.h + gap, cardWidth(), rowH);
    info = layoutLabel(labels.track1, origin.x - cardWidth() / 2, info.y + info.h + gap, cardWidth(), rowH);
    info = layoutLabel(labels.track2, origin.x - cardWidth() / 2, info.y + info.h + gap, cardWidth(), rowH);
    info = layoutLabel(labels.track3, origin.x - cardWidth() / 2, info.y + info.h + gap, cardWidth(), rowH);
    info = layoutLabel(labels.track4, origin.x - cardWidth() / 2, info.y + info.h + gap, cardWidth(), rowH);
    info = layoutLabel(labels.track5, origin.x - cardWidth() / 2, info.y + info.h + gap, cardWidth(), rowH);
    info = layoutLabel(labels.track6, origin.x - cardWidth() / 2, info.y + info.h + gap, cardWidth(), rowH);

    waveEnd = createVector(labels.listen.x + labels.listen.w + wavePad, labels.listen.y + labels.listen.h / 2);
    waveStart = createVector(waveEnd.x + cardWidth() / 2 - wavePad, waveEnd.y);
    waveAmplitude = labels.listen.h / 2;
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

    drawLabel(labels.title, mainColor);
    drawLabel(labels.listen, mainColor);
    drawLabel(labels.crop_circles, mainColor);
    
    drawLabel(labels.track1, mainColor);
    drawLabel(labels.track2, mainColor);
    drawLabel(labels.track3, mainColor);
    drawLabel(labels.track4, mainColor);
    drawLabel(labels.track5, mainColor);
    drawLabel(labels.track6, mainColor);    

    stroke(mainColor)
    strokeWeight(1);    
    beginShape();
    for (let i = 0; i < track.samples.length; i++) {
        const t = i / track.samples.length;
        vertex(lerp(waveStart.x, waveEnd.x, t), waveStart.y + map(track.samples[i], 0, 255, -waveAmplitude, waveAmplitude) * pow(t, 0.5));
    }
    endShape();
    
    
   
    

}

function mouseClicked() {   
    curveTarget = distributePoints(curveCount, 400, waveStart);
}

function windowResized() {    
    resizeCanvas(windowWidth, windowHeight);
    origin.x = width / 2;
    origin.y = height / 2;
    curveTarget = distributePoints(curveCount, 400, waveStart);
    layout();
}

function cardWidth() {  
  const size = parseFloat(getComputedStyle(document.documentElement).fontSize);  
  return min(window.innerWidth * 0.9, 32 * size);
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

    for (let i = 0; i < n - 3; i++) {
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

    points.push(createVector(end.x + 50, end.y));
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
    perturb(curveTarget, floor(random(curveTarget.length - 3)), track.samples[0] / 5);   
}

function on_screen(p) {
    return (p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height);
}