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
let handlingClick = false;

const bgCurveCount = 200;
const fgCurveCount = 20;

const trackCount = 7;
const wavePad = 15;  

const DEBUG = new URLSearchParams(location.search).has('debug');  // add ?debug to the URL
const GUTTER = 40;  // space to the left of the labels for the play buttons
const canHover = matchMedia('(hover: hover)').matches;

// ?debug: show the latest message in a box on screen (handy on a phone with no console)
function debugLog(msg) {
    console.log(msg);
    if (!DEBUG) return;
    let el = document.getElementById('dbg-log');
    if (!el) {
        el = Object.assign(document.createElement('div'), {
            id: 'dbg-log',
            style: 'position:fixed;left:4px;right:4px;top:24px;z-index:9;font:10px monospace;background:#fff;white-space:pre-wrap;word-break:break-all'
        });
        document.body.appendChild(el);
    }
    el.textContent = msg;
}

function audioReport(audio) {
    const e = audio.error;
    return `audio.error=${e ? e.code + ' ' + (e.message || '') : 'none'}  readyState=${audio.readyState}  networkState=${audio.networkState}\n` +
           `src=${audio.currentSrc || audio.src}\norigin=${location.origin}  ctx=${audioContext.state}`;
}

// iOS: let Web Audio play even when the ringer/silent switch is on
if (navigator.audioSession) navigator.audioSession.type = 'playback';

const audioContext = new AudioContext();

const tracks = {
    zoe: setupAudio("https://pub-3cccac1bc30c4fa2a3ca1794a8def177.r2.dev/zoe%20track.wav"),
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
    track5: {text: 'ZOELCRO REEL', track: tracks.zoe},   
    track0: {text: 'CROP CIRCLES', track: tracks.crop},
    track2: {text: 'WAX WALKING', track: tracks.wax},
    track3: {text: 'SYNTHESIZED SEA', track: tracks.sea},   
    track6: {text: 'CLOUD TANK', track: tracks.spark},
    track4: {text: 'BOOK-MUSIC', track: tracks.book},
    track1: {text: 'PHYSICAL MEMORY', track: tracks.skee},
}

function layoutLabel(label, x, y, w, h) {
    textFont(deansgate);
    textSize(100);
    textAlign(LEFT, TOP);
    label.paths = deansgate.textToContours(label.text, 0, 0, {sampleFactor: 0.25});

    // Measure the outlines themselves. textBounds() reports a tight box, but p5 places
    // the contours using the font-level ascent, which can differ between browsers.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    label.paths.forEach(points => points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }));
    const bw = maxX - minX;
    const bh = maxY - minY;

    const scale = min(w / bw, (h != null) ? h / bh : Infinity);
    const sw = bw * scale;
    const sh = bh * scale;
    const ox = x + (w - sw) / 2;
    const oy = (h != null) ? y + (h - sh) / 2 : y;

    label.scale = scale;
    label.drawX = ox - minX * scale;   // where drawLabel translates to
    label.drawY = oy - minY * scale;
    label.x = ox;                      // the visible box of the glyphs
    label.y = oy;
    label.w = sw;
    label.h = sh;

    return {x: ox, y: oy, w: sw, h: sh};
}

function drawLabel(label, color, weight, reactive, amp, fft_amp, fft_angle) {
    push();
    translate(label.drawX, label.drawY);
    scale(label.scale);
    stroke(color);
    strokeWeight(weight / label.scale);
    label.paths.forEach(points => {
        beginShape();
        points.forEach(p => {
            if (reactive && playing) {
                const a = map(track.samples[constrain(floor(map(p.x, 0, width * 2.5, 0, track.samples.length)), 0, track.samples.length)], 0, 255, -amp, amp);
                const fft_a = map(track.fft[constrain(floor(map(p.y, 0, height, 0, track.fft.length)), 0, track.fft.length)], 0, 255, 0, fft_amp);
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

async function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);     
    origin = createVector(width / 2, height / 2);

    backgroundColor = color(252, 248, 240);
    mainColor = color(153, 128, 147);     
    highlightColor = color(148, 95, 160);     
    distanceColor = lerpColor(backgroundColor, mainColor, 0.25);

    deansgate = await loadFont('fonts/deansgate.ttf');
    garamond = await loadFont('fonts/EBGaramond-Regular.ttf');

    makeButtons();
    layout();       

    curveTarget =  distributePoints(bgCurveCount, fgCurveCount, 400, waveStart);
    curve = [...curveTarget];

    setInterval(() => { perturb(curveTarget, floor(random(curveTarget.length - 3)), 50); }, 5);   

    // Re-run layout whenever a text card changes height (e.g. web font swaps in)
    const relayout = () => layout();
    new ResizeObserver(relayout).observe(document.querySelector('.text-block.top'));
    new ResizeObserver(relayout).observe(document.querySelector('.text-block.bottom'));
    document.fonts.ready.then(relayout);

    if (DEBUG) {
        const dbg = Object.assign(document.createElement('div'), {
            style: 'position:fixed;left:4px;top:4px;z-index:9;font:10px monospace;background:#fff'
        });
        document.body.appendChild(dbg);
        setInterval(() => {
            const r = document.querySelector('canvas').getBoundingClientRect();
            dbg.textContent = `css ${r.width|0}x${r.height|0}  buf ${width}x${height}  inner ${innerWidth}x${innerHeight}`;
        }, 500);
    }
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
        layoutLabel(
            label,
            origin.x - cardWidth() / 2 + GUTTER,
            areaTop + rowH * i,
            cardWidth() - GUTTER,
            rowH - gap
        );
    });
    positionButtons();

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

    drawLabel(titles.name, mainColor, 1, true, 5, 20, HALF_PI);
    drawLabel(titles.listen, mainColor, 1, true, 5, 20, PI);

    Object.entries(labels).forEach(([_, label], i) => {   
        setLabelFocus(label);
        const playing = track == label.track;
        const color = (label.focus || playing) ? highlightColor : mainColor;
        const weight = (label.focus || playing) ? 2 : 1;
        drawLabel(label, color, weight, playing, 10, 20, -PI / 4);        
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

    if (DEBUG) drawDebug();
}

// ?debug: red = label boxes, blue = text cards
function drawDebug() {
    noFill();
    strokeWeight(1);
    stroke(255, 0, 0);
    [titles.name, titles.listen, ...Object.values(labels)].forEach(l => rect(l.x, l.y, l.w, l.h));
    stroke(0, 0, 255);
    ['.text-block.top', '.text-block.bottom'].forEach(sel => {
        const r = document.querySelector(sel).getBoundingClientRect();
        rect(r.left, r.top, r.width, r.height);
    });
}

function setLabelFocus(label) {
    label.focus = canHover && in_rect(createVector(mouseX, mouseY), label.x, label.y, label.w, label.h);   
}

function makeButtons() {
    Object.values(labels).forEach(label => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'play-btn';
        b.textContent = '▶';
        b.setAttribute('aria-label', `Play ${label.text}`);
        b.addEventListener('click', () => toggleTrack(label));
        document.body.appendChild(b);
        label.button = b;
    });
}

function positionButtons() {
    const left = origin.x - cardWidth() / 2;
    Object.values(labels).forEach(l => {
        l.button.style.left = `${left}px`;
        l.button.style.top = `${l.y + l.h / 2}px`;
    });
}

function refreshButtons() {
    Object.values(labels).forEach(l => {
        l.button.textContent = (track === l.track) ? '■' : '▶';
    });
}

// Everything audio-related must start synchronously inside the tap (iOS)
function toggleTrack(label) {
    if (audioContext.state !== 'running') audioContext.resume();  // don't await

    const next = label.track;
    if (track) {
        track.audio.pause();
        track.audio.currentTime = 0;
    }

    if (track === next) {
        track = null;
        playing = false;
    } else {
        track = next;
        playing = true;
        // a media element that failed to load stays failed until load() is called again
        if (next.audio.error) next.audio.load();
        next.audio.play().catch(err => {
            debugLog(`play failed: ${err.name}: ${err.message}\n` + audioReport(next.audio));
            if (track === next) { track = null; playing = false; refreshButtons(); }
        });
    }
    refreshButtons();
}

// Only reshuffles the curve. Button clicks bubble up to window, so they trigger this too.
function mouseClicked() {
    curveTarget = distributePoints(bgCurveCount, fgCurveCount, 400, waveStart);
}

function windowResized() {    
    resizeCanvas(windowWidth, windowHeight);
    origin.x = width / 2;
    origin.y = height / 2;
    layout();
    curveTarget = distributePoints(bgCurveCount, fgCurveCount, 400, waveStart);
}

function cardWidth() {  
  const size = parseFloat(getComputedStyle(document.documentElement).fontSize);  
  return min(window.innerWidth * 0.9, 32 * size);
}

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); 
}


function setupAudio(url) {
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    audio.preload = 'none';
    audio.loop = 'true';
    audio.addEventListener('error', () => debugLog('media error\n' + audioReport(audio)));

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