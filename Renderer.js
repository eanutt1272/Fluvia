class Renderer {
  constructor(terrain, params, colourMaps, cameraData, vertSrc, fragSrc) {
    this.terrain = terrain;
    this.params = params;
    this.colourMaps = colourMaps;
    this.cameraData = cameraData;

    this.canvas3d = createGraphics(width, height, WEBGL);
    this.terrainShader = this.canvas3d.createShader(vertSrc, fragSrc);

    this.canvas2d = createImage(terrain.size, terrain.size);
    this.heightMapTex = createImage(terrain.size, terrain.size);

    this.lut = new Uint8ClampedArray(256 * 3);
    this.currentColourMap = "";
  }

  updateLUT(colourMapName) {
    const { colourMaps, lut } = this;

    if (this.currentColourMap === colourMapName) return;

    this.currentColourMap = colourMapName;
    const colourData = colourMaps[colourMapName];

    if (!colourData) return;

    const channelKeys = ['r', 'g', 'b'];
    for (let i = 0; i < 256; i++) {
      const normalisedIntensity = i / 255;
      const lutOffset = i * 3;

      for (let channelIdx = 0; channelIdx < 3; channelIdx++) {
        const coefficients = colourData[channelKeys[channelIdx]];
        let polynomialResult = 0;

        for (let degree = coefficients.length - 1; degree >= 0; degree--) {
          polynomialResult = polynomialResult * normalisedIntensity + coefficients[degree];
        }

        const clampedValue = Math.max(0, Math.min(255, polynomialResult * 255));
        lut[lutOffset + channelIdx] = clampedValue;
      }
    }
  }

  render() {
    const {
      fps, surfaceMap, colourMap, lightDir, flatColour, steepColour,
      sedimentColour, waterColour, displayMethod, terrainHeight, renderHeightScale
    } = this.params;
    
    const { size, area, heightMap, sedimentMap, originalHeightMap } = this.terrain;
    const { canvas2d, canvas3d, heightMapTex, lut, terrain } = this;

    if (surfaceMap !== "composite") {
      this.updateLUT(colourMap || "greyscale");
    }

    const lightMagnitude = (Math.sqrt(lightDir.x ** 2 + lightDir.y ** 2 + lightDir.z ** 2) || 1) / 2;
    const lightDirX = lightDir.x / lightMagnitude;
    const lightDirY = lightDir.y / lightMagnitude;
    const lightDirZ = lightDir.z / lightMagnitude;

    const bounds = this.calculateBounds(surfaceMap);

    canvas2d.loadPixels();
    heightMapTex.loadPixels();

    const canvasPixels = canvas2d.pixels;
    const heightPixels = heightMapTex.pixels;

    for (let i = 0; i < area; i++) {
      const pixelIdx = i << 2;

      const heightValue = (heightMap[i] * 255) | 0;
      
      heightPixels[pixelIdx] = heightPixels[pixelIdx + 1] = heightPixels[pixelIdx + 2] = heightValue;
      heightPixels[pixelIdx + 3] = 255;

      let r, g, b;

      if (surfaceMap === "composite") {
        const normal = terrain.getSurfaceNormal(i % size, (i / size) | 0);
        const dotProduct = normal.x * lightDirX + normal.y * lightDirY + normal.z * lightDirZ;
        const shadingIntensity = dotProduct > 0.15 ? dotProduct : 0.15;
        
        const slopeSteepness = 1 - normal.y;
        const slopeFlatness = 1 - slopeSteepness;

        r = (slopeFlatness * flatColour.r + slopeSteepness * steepColour.r) * shadingIntensity;
        g = (slopeFlatness * flatColour.g + slopeSteepness * steepColour.g) * shadingIntensity;
        b = (slopeFlatness * flatColour.b + slopeSteepness * steepColour.b) * shadingIntensity;

        const sediment = sedimentMap[i];
        if (sediment > 0) {
          const sedimentAlpha = Math.min(1, sediment) * 5;
          const inverseSedimentAlpha = 1 - sedimentAlpha;
          
          r = inverseSedimentAlpha * r + sedimentAlpha * (sedimentColour.r * shadingIntensity);
          g = inverseSedimentAlpha * g + sedimentAlpha * (sedimentColour.g * shadingIntensity);
          b = inverseSedimentAlpha * b + sedimentAlpha * (sedimentColour.b * shadingIntensity);
        }

        const waterDischarge = terrain.getDischarge(i);
        if (waterDischarge > 0) {
          const waterAlpha = Math.min(1, waterDischarge);
          const inverseWaterAlpha = 1 - waterAlpha;
          const waterDepthShade = Math.max(0.3, 1 - waterDischarge * 0.25) * shadingIntensity;
          
          r = inverseWaterAlpha * r + waterAlpha * (waterColour.r * waterDepthShade);
          g = inverseWaterAlpha * g + waterAlpha * (waterColour.g * waterDepthShade);
          b = inverseWaterAlpha * b + waterAlpha * (waterColour.b * waterDepthShade);
        }
      } else {
        let normalisedValue = 0;
        
        if (surfaceMap === "height") {
          normalisedValue = (heightMap[i] - bounds.min) / bounds.range;
        } else if (surfaceMap === "sediment") {
          normalisedValue = (sedimentMap[i] - bounds.min) / bounds.range;
        } else if (surfaceMap === "delta") {
          normalisedValue = 0.5 + (heightMap[i] - originalHeightMap[i]) * 10;
        } else if (surfaceMap === "slope") {
          normalisedValue = 1 - terrain.getSurfaceNormal(i % size, (i / size) | 0).y;
        } else if (surfaceMap === "discharge") {
          normalisedValue = terrain.getDischarge(i) / bounds.range;
        }

        const lutIndexBase = ((normalisedValue * 255) | 0) * 3;
        const safeLutIdx = Math.max(0, Math.min(762, lutIndexBase));
        
        r = lut[safeLutIdx];
        g = lut[safeLutIdx + 1];
        b = lut[safeLutIdx + 2];
      }

      canvasPixels[pixelIdx] = r;
      canvasPixels[pixelIdx + 1] = g;
      canvasPixels[pixelIdx + 2] = b;
      canvasPixels[pixelIdx + 3] = 255;
    }

    canvas2d.updatePixels();
    heightMapTex.updatePixels();

    if (displayMethod === "3D") {
      this.render3D(renderHeightScale);
    } else if (displayMethod === "2D") {
      image(canvas2d, 0, 0, width, height);
    }
  }

  calculateBounds(mode) {
    const { area, heightMap, sedimentMap } = this.terrain;
    const { terrain } = this;

    if (mode === "height") {
      const bounds = terrain.getMapBounds(heightMap);
      return { min: bounds.min, range: bounds.max - bounds.min || 1 };
    }
    
    if (mode === "sediment") {
      const bounds = terrain.getMapBounds(sedimentMap);
      return { min: bounds.min, range: bounds.max - bounds.min || 1 };
    }
    
    if (mode === "discharge") {
      let maxDischarge = 0;
      
      for (let i = 0; i < area; i++) {
        const discharge = terrain.getDischarge(i);
        if (discharge > maxDischarge) maxDischarge = discharge;
      }
      return { min: 0, range: maxDischarge || 1 };
    }
    return { min: 0, range: 1 };
  }

  orbitControl(event, type) {
    const { cameraData } = this;

    if (type === "orbit") {
      if (event.target.tagName !== 'CANVAS') return;
      cameraData.rotZ += (pmouseX - mouseX) * 0.01;
      cameraData.rotX -= (pmouseY - mouseY) * 0.01;
      cameraData.rotX = constrain(cameraData.rotX, 0, PI / 2);
    } else if (type === "zoom") {
      if (event.target.closest('.tp-dfwv')) return;
      cameraData.zoom = Math.max(1, cameraData.zoom + event.delta * 0.5);
    }
  }

  render3D(calculatedScale) {
    const { canvas3d, cameraData, terrainShader, heightMapTex, canvas2d } = this;
    const { size } = this.terrain;

    canvas3d.background(32);
    canvas3d.noStroke();

    const eyeX = cameraData.zoom * (cos(cameraData.rotX) * sin(cameraData.rotZ));
    const eyeY = cameraData.zoom * (cos(cameraData.rotX) * cos(cameraData.rotZ));
    const eyeZ = cameraData.zoom * sin(cameraData.rotX);

    canvas3d.resetMatrix();
    canvas3d.perspective(PI / 3, width / height, 0.1, 10000);
    canvas3d.camera(eyeX, eyeY, eyeZ, 0, 0, 0, 0, 0, -1);

    canvas3d.shader(terrainShader);
    terrainShader.setUniform('uHeightMap', heightMapTex);
    terrainShader.setUniform('uTexture', canvas2d);
    terrainShader.setUniform('uHeightScale', calculatedScale);

    canvas3d.plane(size * 2, size * 2, size - 1, size - 1);

    image(canvas3d, 0, 0, width, height);
  }

  resize() {
    const { displayMethod } = this.params;
    const { canvas3d } = this;
    const canvasSize = min(windowWidth, windowHeight);

    resizeCanvas(canvasSize, canvasSize);

    if (canvas3d && displayMethod === "3D") {
      canvas3d.resizeCanvas(canvasSize, canvasSize);
    }
  }
}