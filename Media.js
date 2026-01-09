class Media {
  constructor(terrain, params, softwareVersion, renderer) {
    this.terrain = terrain;
    this.params = params;
    this.version = softwareVersion;
    this.renderer = renderer;

    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
  }

  startRecording() {
    const { terrainSize, surfaceMap, displayMethod } = this.params;
    const { renderer } = this;
    
    const sourceCanvas = displayMethod === "3D" ? renderer.canvas3d.elt : canvas;

    this.recordedChunks = [];
    const stream = sourceCanvas.captureStream(60);

    const preferredFormats = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
    ];

    const supportedMimeType = preferredFormats.find((format) => MediaRecorder.isTypeSupported(format)) || "";

    try {
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
        videoBitsPerSecond: 5000000,
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const videoBlob = new Blob(this.recordedChunks, { type: supportedMimeType });
        const downloadUrl = URL.createObjectURL(videoBlob);
        const downloadAnchor = document.createElement("a");
        
        const timestamp = Date.now();
        const fileExtension = supportedMimeType.includes("mp4") ? "mp4" : "webm";
        const fileName = `Fluvia_v${this.version}_${displayMethod}_${surfaceMap}_${terrainSize}x${terrainSize}_${timestamp}_Recording.${fileExtension}`;

        downloadAnchor.href = downloadUrl;
        downloadAnchor.download = fileName;
        
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
        
        window.URL.revokeObjectURL(downloadUrl);
      };

      this.mediaRecorder.start(1000);
      this.isRecording = true;
      console.log(`(${displayMethod} ${surfaceMap}): Recording view started: ${supportedMimeType}`);
    } catch (error) {
      console.error(`(${displayMethod} ${surfaceMap}): startRecording Exception:`, error);
    }
  }

  stopRecording() {
    const { surfaceMap, displayMethod } = this.params;

    try {
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();
        this.isRecording = false;
        console.log(`(${displayMethod} ${surfaceMap}): Successfully exported recording`);
      }
    } catch (error) {
      console.error(`(${displayMethod} ${surfaceMap}): stopRecording Exception:`, error);
    }
  }

  exportImage() {
    const { terrainSize, surfaceMap, displayMethod } = this.params;
    const { renderer } = this;
    
    const timestamp = Date.now();
    const fileName = `Fluvia_v${this.version}_${displayMethod}_${surfaceMap}_${terrainSize}x${terrainSize}_${timestamp}_Image.png`;

    const sourceImage = displayMethod === "3D" ? renderer.canvas3d : renderer.canvas2d;
    let exportTarget;

    if (displayMethod === "3D") {
      exportTarget = sourceImage.elt;
    } else {
      const scratchCanvas = document.createElement("canvas");
      scratchCanvas.width = sourceImage.width;
      scratchCanvas.height = sourceImage.height;
      const context = scratchCanvas.getContext("2d");

      sourceImage.loadPixels();
      const imageData = context.createImageData(sourceImage.width, sourceImage.height);
      imageData.data.set(sourceImage.pixels);
      context.putImageData(imageData, 0, 0);
      exportTarget = scratchCanvas;
    }

    try {
      exportTarget.toBlob((imageBlob) => {
        const downloadUrl = URL.createObjectURL(imageBlob);
        const downloadLink = document.createElement("a");
        
        downloadLink.href = downloadUrl;
        downloadLink.download = fileName;
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
        console.log(`(${displayMethod} ${surfaceMap}): Successfully exported image: ${fileName}`);
      }, "image/png");
    } catch (error) {
      console.error(`(${displayMethod} ${surfaceMap}): exportImage Exception:`, error);
    }
  }

  /* broken function
  handleImport(file) {
    if (file.type !== "image") return;

    loadImage(file.data, (img) => {
      this.params.terrainSize = img.width;
      img.loadPixels();

      const { heightMap, bedrockMap, originalHeightMap, sedimentMap, dischargeMap } = this.terrain;

      for (let i = 0; i < this.terrain.area; i++) {
        const pixelIdx = i * 4;
        const r = img.pixels[pixelIdx];
        const g = img.pixels[pixelIdx + 1];
        const b = img.pixels[pixelIdx + 2];

        const lumaValue = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        heightMap[i] = lumaValue;
        bedrockMap[i] = lumaValue;
        originalHeightMap[i] = lumaValue;
        sedimentMap[i] = 0;
        
        if (dischargeMap) {
          dischargeMap[i] = 0;
        }
      }
      console.log(`Imported ${img.width}x${img.height} heightmap successfully`);
    });
  }
  */
}