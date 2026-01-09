const SOFTWARE_VERSION = "3.9";

let terrain, media, solver, renderer, gui, vertSrc, fragSrc;

const params = {
  fps: 0,
  simulationRunning: true,
  dropletsPerFrame: 512,
  maxAge: 500,
  minVolume: 0.01,

  terrainSize: 512,
  noiseScale: 0.1,
  noiseOctaves: 8,
  amplitudeFalloff: 0.6,

  sedimentErosionRate: 0.1,
  bedrockErosionRate: 0.1,
  depositionRate: 0.1,
  evaporationRate: 0.001,
  precipitationRate: 1,
  
  entrainment: 2,
  gravity: 1,
  momentumTransfer: 1,

  learningRate: 0.1,
  maxHeightDiff: 0.01,
  settlingRate: 0.8,

  displayMethod: "3D",
  surfaceMap: "composite",
  colourMap: "greyscale",
  
  renderHeightScale: 100,
  
  flatColour: { r: 50, g: 81, b: 33 },
  steepColour: { r: 115, g: 115, b: 95 },
  waterColour: { r: 20, g: 64, b: 128 },
  sedimentColour: { r: 201, g: 189, b: 117 },
  lightDir: { x: 50, y: 50, z: -50 },
};

let cameraData = {
  rotX: 3.14159265359 / 4,
  rotZ: 0,
  zoom: 1300,
}

function preload() {
  fetchData();
}

function setup() {
  const canvasSize = min(windowWidth, windowHeight);
  createCanvas(canvasSize, canvasSize);
  
  noSmooth();
  pixelDensity(1);
	
  p5.displayFriendlyErrors = false;
  
  setShaderSrc();
  initialiseSimulation(true);
  
  terrain.generate();
  gui.setupTabs();
}

function draw() {
  if (params.simulationRunning) {
    solver.hydraulicErosion();
    solver.updateDischargeMap();
  }

  renderer.render();
  params.fps = frameRate();
}

function initialiseSimulation(initialiseGUI) {
  terrain = new Terrain(params.terrainSize, params);
  solver = new Solver(terrain, params);
  renderer = new Renderer(terrain, params, colourMapData, cameraData, vertSrc, fragSrc);
  media = new Media(terrain, params, SOFTWARE_VERSION, renderer);

  if (initialiseGUI == true) {
    gui = new GUI(params, cameraData, media, renderer, SOFTWARE_VERSION, {
      onInitialise: initialiseSimulation,
      onGenerate: generateTerrain,
      onReset: resetTerrain
    });
  }
}

function fetchData() {
  colourMapData = loadJSON('colour-maps.json');  
  vertSrc = loadStrings('shader.vert');  
  fragSrc = loadStrings('shader.frag');
}

function setShaderSrc() {
  vertSrc = vertSrc.join('\n');
  fragSrc = fragSrc.join('\n');
}

function generateTerrain() {
  if (terrain.size !== params.terrainSize) {
    initialiseSimulation(false);
  }
  
  terrain.generate(383342929);
}

function resetTerrain() {
  terrain.reset();
}

function mouseDragged(event) {
  renderer.orbitControl(event, 'orbit');
  return false;
}

function touchMoved(event) {
  renderer.orbitControl(event, 'orbit');
  return false;
}

function mouseWheel(event) {
  renderer.orbitControl(event, 'zoom');
  gui.pane.refresh();
}

function windowResized() {
  renderer.resize();
}