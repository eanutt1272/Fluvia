class GUI {
  constructor(params, cameraData, media, renderer, softwareVersion, callbacks) {
    this.params = params;
	 this.cameraData = cameraData;
    this.media = media;
    this.renderer = renderer;
    this.version = softwareVersion;
    this.callbacks = callbacks;

    this.pane = new Tweakpane.Pane({
      title: `Fluvia ${this.version} Parameters`,
		expanded: false,
    });
  }

  setupTabs() {
    const tabs = this.pane.addTab({
      pages: [
        { title: "General" },
        { title: "Erosion" },
        { title: "Visuals" },
        { title: "Media" },
      ],
    });

    const [generalPage, erosionPage, visualsPage, mediaPage] = tabs.pages;

    this.createGeneralTab(generalPage);
    this.createErosionTab(erosionPage);
    this.createVisualTab(visualsPage);
    this.createMediaTab(mediaPage);
  }

  createGeneralTab(page) {
    const { params, cameraData, callbacks } = this;

    page.addButton({
      title: "Generate Terrain" 
    }).on("click", callbacks.onGenerate);
    
    page.addButton({
      title: "Reset Terrain"
    }).on("click", callbacks.onReset);
      
    page.addBlade({ view: "separator" });
        
    page.addBinding(params, "fps", {
      readonly: true,
      label: 'FPS',
      view: 'graph',
      interval: 60,
      min: 0,
      max: 100,
    });

    page.addBlade({ view: "separator" });
    
    page.addBinding(params, "simulationRunning", {
      label: "Simulation Running"
    });
    
    page.addBinding(params, "dropletsPerFrame", {
      label: "Droplets/Frame",
      min: 0,
      max: 512,
      step: 1,
    });

    page.addBinding(params, "maxAge", {
      label: "Maximum Age",
      min: 128,
      max: 512,
      step: 1,
    });

    page.addBinding(params, "minVolume", {
      label: "Minimum Volume",
      min: 0.001,
      max: 0.1,
      step: 0.001,
    });

    const generationFolder = page.addFolder({
      title: "Terrain Generation",
    });
    
    generationFolder.addBinding(params, "terrainSize", {
      label: "Terrain Size",
      options: { "128×128": 128, "256×256": 256, "512×512": 512, },
    });
    
    generationFolder.addBinding(params, "noiseScale", {
      label: "Noise Scale",
      min: 0.1,
      max: 5,
    });

    generationFolder.addBinding(params, "noiseOctaves", {
      label: "Noise Octaves",
      min: 1,
      max: 12,
      step: 1,
    });

	 page.addBinding(cameraData, "zoom", {
      label: "Zoom",
      min: 0,
      max: 2048,
    });
  }

  createErosionTab(page) {
    const { params } = this;

    const hydraulicFolder = page.addFolder({
      title: "Hydraulic Erosion"
    });
    
    hydraulicFolder.addBinding(params, "sedimentErosionRate", {
      label: "Sediment Erosion",
      min: 0,
      max: 1,
    });
    
    hydraulicFolder.addBinding(params, "bedrockErosionRate", {
      label: "Bedrock Erosion",
      min: 0,
      max: 1,
    });
    
    hydraulicFolder.addBinding(params, "depositionRate", {
      label: "Deposition",
      min: 0,
      max: 1,
    });
    
    hydraulicFolder.addBinding(params, "evaporationRate", {
      label: "Evaporation",
      min: 0.001,
      max: 1,
      step: 0.001,
    });

    hydraulicFolder.addBinding(params, "precipitationRate", {
      label: "Precipitation",
      min: 0,
      max: 5,
    });

    hydraulicFolder.addBinding(params, "entrainment", {
      label: "Entrainment",
      min: 0,
      max: 32,
    });

    hydraulicFolder.addBinding(params, "gravity", {
      label: "Gravity",
      min: 0.1,
      max: 5,
    });

    hydraulicFolder.addBinding(params, "momentumTransfer", {
      label: "Momentum Transfer",
      min: 0,
      max: 4,
    });

    hydraulicFolder.addBinding(params, "learningRate", {
      label: "Learning Rate",
      min: 0,
      max: 0.5,
    });

    page.addBlade({ view: "separator" });

    const thermalFolder = page.addFolder({
      title: "Thermal Erosion"
    });
    
    thermalFolder.addBinding(params, "maxHeightDiff", {
      label: "Maximum Height Difference",
      min: 0.01,
      max: 1,
    });
    
    thermalFolder.addBinding(params, "settlingRate", {
      label: "Settling Rate",
      min: 0,
      max: 1,
    });
  }

  createVisualTab(page) {
    const { params } = this;

    page.addBinding(params, "displayMethod", {
      label: "Display Method",
      options: { "3D": "3D", "2D": "2D" },
    });
    
    page.addBinding(params, "surfaceMap", {
      label: "Surface Map",
      options: {
        "Composite": "composite",
        "Height": "height",
        "Sediment": "sediment",
        "Delta": "delta",
        "Slope": "slope",
        "Discharge": "discharge",
      },
    });
    
    page.addBinding(params, "colourMap", {
      label: "Data Colour Map",
      options: {
        "Greyscale": "greyscale", "Viridis": "viridis", "Plasma": "plasma",
        "Magma": "magma", "Inferno": "inferno", "Cividis": "cividis",
        "Turbo": "turbo", "Rocket": "rocket", "Mako": "mako",
      },
    });
     
    page.addBinding(params, "renderHeightScale", {
      label: "Height Scale",
      min: 0,
      max: 256,
    });

    const lightingFolder = page.addFolder({
      title: "Lighting"
    });
    
    lightingFolder.addBinding(params, "lightDir", {
      label: "Light Direction",
      x: { min: -100, max: 100 },
      y: { min: -100, max: 100 },
      z: { min: -100, max: 100 },
    });
    
    page.addBlade({ view: "separator" });

    const colourFolder = page.addFolder({
      title: "Colours",
    });
    
    colourFolder.addBinding(params, "flatColour", { label: "Flat Plains" });
    colourFolder.addBinding(params, "steepColour", { label: "Steep Slopes" });
    colourFolder.addBinding(params, "waterColour", { label: "Water" });
    colourFolder.addBinding(params, "sedimentColour", { label: "Sediment" });
  }

  createMediaTab(page) {
    const { media } = this;

    const importFolder = page.addFolder({
      title: "Import",
    });
    
    importFolder.addButton({
      title: "Import Heightmap"
    }).on("click", () => {
      console.info("NOTE: This feature is currently unavailable (development)");
    });
    
    const exportFolder = page.addFolder({
      title: "Export",
    });
    
    const recordButton = exportFolder.addButton({
      title: media.isRecording ? "Stop Recording" : "Start Recording"
    });
    
    recordButton.on("click", () => {
      if (!media.isRecording) {
        media.startRecording(document.querySelector('canvas'));
        recordButton.title = "Stop Recording";
      } else {
        media.stopRecording();
        recordButton.title = "Start Recording";
      }
    });
    
    exportFolder.addBlade({ view: "separator" });
    
    exportFolder.addButton({
      title: "Export Image"
    }).on("click", () => {
      media.exportImage();
    });
  }
}