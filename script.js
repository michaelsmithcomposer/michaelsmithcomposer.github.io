let time = 0;
let deansgate;
let garamond;
let origin;
let track;

let curve;
let curveTarget;


let backgroundColor;
let mainColor;
let highlightColor;
let distanceColor;

let waveEnd;
let waveStart;
let waveAmplitude;

let playing = false;

const bgCurveCount = 200;
const fgCurveCount = 20;

const trackCount = 7;
const wavePad = 15;  

const audioContext = new AudioContext();

const tracks = {
    matmo: setupAudio("https://pub-3cccac1bc30c4fa2a3ca1794a8def177.r2.dev/matmo.wav"),
    skee: setupAudio("https://pub-3cccac1bc30c4fa2a3ca1794a8def177.r2.dev/skee2.wav"),
    crop: setupAudio("https://pub-3cccac1bc30c4fa2a3ca1794a8def177.r2.dev/crop%20circles.wav"),
    book: setupAudio("https://pub-3cccac1bc30c4fa2a3ca1794a8def177.r2.dev/book.wav"),
    wax: setupAudio("https://pub-3cccac1bc30c4fa2a3ca1794a8def177.r2.dev/waxWalkingHighlights.wav"),
    sea: setupAudio("https://pub-3cccac1bc30c4fa2a3ca1794a8def177.r2.dev/synthesizedSea.wav"),  
    spark: setupAudio("https://pub-3cccac1bc30c4fa2a3ca1794a8def177.r2.dev/spark.wav"),
}

let titles = {
    name: {text: 'MICHAEL SMITH'},
    listen: {text: 'LISTEN:'},
}

let labels = {    
    track5: {text: 'IMPULSE RESPONSE', track: tracks.matmo},   
    track0: {text: 'CROP CIRCLES', track: tracks.crop},
    track2: {text: 'WAX WALKING', track: tracks.wax},
    track3: {text: 'SYNTHESIZED SEA', track: tracks.sea},   
    track6: {text: 'CLOUD TANK', track: tracks.spark},
    track4: {text: 'BOOK-MUSIC', track: tracks.book},
    track1: {text: 'PHYSICAL MEMORY', track: tracks.skee},
}

function layoutLabel(label, x, y, w, h) {    
    textSize(100);
    textAlign(LEFT, TOP)   
    label.paths = deansgate.textToContours(label.text, 0, 0, {sampleFactor: 0.25});
    const size = getLabelSize(deansgate, label.text, w, h);
    const ox = x + (w - size.w) / 2;
    const oy = (h != null) ? y + (h - size.h) / 2 : y;

    label.scale = size.scale;
    label.x = ox;
    label.y = oy;
    label.w = size.w;
    label.h = size.h;

    return {x: ox, y: oy, w: size.w, h: size.h};
}

function drawLabel(label, color, weight, reactive, amp, fft_amp, fft_angle) {
    push();
    translate(label.x, label.y);
    scale(label.scale);
    stroke(color);
    strokeWeight(weight / label.scale);
    label.paths.forEach(points => {
        beginShape();
        points.forEach(p => {
            if (reactive && playing) {
                const a = map(track.samples[constrain(floor(map(p.x, 0, width * 2.5, 0, track.samples.length)), 0, track.samples.length)], 0, 255, -amp, amp);
                const fft_a = map(track.fft[constrain(floor(map(p.y, 0, height, 0, track.fft.length)), 0, track.fft.length)], 0, 255, -fft_amp, fft_amp);
                const ox = cos(p.alpha - HALF_PI) * a + cos(fft_angle) * fft_a;
                const oy = sin(p.alpha - HALF_PI) * a + sin(fft_angle) * fft_a;                            
                vertex(p.x + ox, p.y + oy);
            } else {
                vertex(p.x, p.y)
            }
           
        });
        endShape(CLOSE);
    }); 
    pop();
}

function getLabelSize(font, text, w, h = 999) {
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

    backgroundColor = color(252, 248, 240);
    mainColor = color(153, 128, 147);     
    highlightColor = color(148, 95, 160);     
    distanceColor = lerpColor(backgroundColor, mainColor, 0.25);

    deansgate = await loadFont('fonts/deansgate.ttf');
    garamond = await loadFont('fonts/EBGaramond-Regular.ttf');

    layout();       

    curveTarget =  distributePoints(bgCurveCount, fgCurveCount, 400, waveStart);
    curve = [...curveTarget];

    setInterval(() => { perturb(curveTarget, floor(random(curveTarget.length - 3)), 50); }, 5);   
    
}

function layout() {
    const gap = 5;
    const topText = document.querySelector('.text-block.top'); 
    const bottomText = document.querySelector('.text-block.bottom'); 

    let info = layoutLabel(titles.name, origin.x - cardWidth() / 2, 15, cardWidth());       
    topText.style.top = `${info.y + info.h + gap}px`;   

    info = layoutLabel(
        titles.listen, 
        origin.x - cardWidth() / 2, 
        topText.getBoundingClientRect().bottom + gap, 
        cardWidth() / 2
    );    
    
    const areaTop = info.y + info.h + gap;
    const areaBottom = bottomText.getBoundingClientRect().top;   
    const rowH = (areaBottom - areaTop) / trackCount;

    Object.entries(labels).forEach(([_, label], i) => {       
        layoutLabel(label, origin.x - cardWidth() / 2, areaTop + (rowH) * i, cardWidth(), rowH - gap);
    });       

    waveEnd = createVector(titles.listen.x + titles.listen.w + wavePad, titles.listen.y + titles.listen.h / 2);
    waveStart = createVector(waveEnd.x + cardWidth() / 2 - wavePad * 3, waveEnd.y);
    waveAmplitude = titles.listen.h;
}

function draw() {
    time += deltaTime;    

    if (playing) {
        track.analyser.getByteTimeDomainData(track.samples);
        track.analyser.getByteFrequencyData(track.fft);  
    }
   

    background(backgroundColor);      
         
    noFill();    

    for (let i = 0; i < curve.length; i++) {
        curve[i].lerp(curveTarget[i], 0.04);
    }      

    splineProperty('ends', EXCLUDE);  

    for (let i = 0; i < curve.length - 3; i++) {     

        const t = (i / (curve.length - 3));     

        let c = distanceColor;

        if (t > 0.75) {
            c = lerpColor(backgroundColor, mainColor, pow(map(t, 0.75, 1, 0, 0.75), 2));
        }
        
        stroke(c);
        strokeWeight(pow(t, 3) * 2);

        spline(
            curve[i].x, curve[i].y, 
            curve[i + 1].x, curve[i + 1].y,
            curve[i + 2].x, curve[i + 2].y,
            curve[i + 3].x, curve[i + 3].y
        );
    }

    drawLabel(titles.name, mainColor, 1, true, 5, 10, HALF_PI);
    drawLabel(titles.listen, mainColor, 1, true, 5, 10, PI);

    Object.entries(labels).forEach(([_, label], i) => {   
        label.focus = in_rect(createVector(mouseX, mouseY), label.x, label.y, label.w, label.h);   
        const playing = track == label.track;
        const color = (label.focus || playing) ? highlightColor : mainColor;
        const weight = (label.focus || playing) ? 2 : 1;
        drawLabel(label, color, weight, playing, 10, 10, -PI / 4);        
    });     

    stroke(mainColor)
    strokeWeight(1);    
   
    if (playing) {
        beginShape();
        for (let i = 0; i < 500; i++) {
            const t = i / 500;
            const s = floor(map(i, 0, 500, 0, track.samples.length));
            vertex(lerp(waveStart.x, waveEnd.x, t), waveStart.y + map(track.samples[s], 0, 255, -waveAmplitude, waveAmplitude) * pow(t, 0.5));
        }
        endShape();
    } else {
        line(waveStart.x, waveStart.y, waveEnd.x, waveEnd.y);
    }   
   
    

}

async function mouseClicked() {   
    curveTarget = distributePoints(bgCurveCount, fgCurveCount, 400, waveStart);
    for (const [_, label] of Object.entries(labels)) {
        if (label.focus) {
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            if (playing) {
                track.audio.pause();
                track.audio.currentTime = 0;
            }

            if (track != label.track) {
                track = label.track;
                try {
                    await track.audio.play();
                    playing = true;
                } catch (err) {
                    console.error('play failed:', err);
                }
            } else {
                playing = false;
                track = null;
            }
        }
    }
}

function windowResized() {    
    resizeCanvas(windowWidth, windowHeight);
    origin.x = width / 2;
    origin.y = height / 2;
    curveTarget = distributePoints(bgCurveCount, fgCurveCount, 400, waveStart);
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

function distributePoints(bgCount, fgCount, step, end) {  
    let last = origin;
    let points = [];

    for (let i = 0; i < bgCount - 1; i++) {
        let offset;
        let next;
        let c = 0;
        while (true) {
            offset = createVector(random(-step, step), random(-step, step));
            next = p5.Vector.add(last, offset);      
            c++;     
            if (on_screen(next) || c > 100) {
                next.x = constrain(next.x, 0, width);
                next.y = constrain(next.y, 0, height);
                break;
            }
        }         
        points.push(next);
        last = next;
    }

    points.push(createVector(origin.x, origin.y));

    for (let i = 0; i < fgCount - 3; i++) {
        let offset;
        let next;
        let c = 0;
        while (true) {
            offset = createVector(random(-step, step), random(-step, step));
            next = p5.Vector.add(last, offset);  
            c++;         
            if (in_rect(next, origin.x - cardWidth() / 2, 0, cardWidth(), height) || c > 100) {              
                next.x = constrain(next.x, origin.x - cardWidth() / 2, origin.x + cardWidth() / 2);
                next.y = constrain(next.y, 0, height);
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



function on_screen(p) {
    return (p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height);
}

function in_rect(p, x, y, w, h) {
    return (p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h);
}