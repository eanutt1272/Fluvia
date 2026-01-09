class Terrain {
  constructor(size, params) {
    this.size = size;
    this.area = size * size;
    this.params = params;

    this.heightMap = new Float32Array(this.area);
    this.originalHeightMap = new Float32Array(this.area);

    this.bedrockMap = new Float32Array(this.area);
    this.sedimentMap = new Float32Array(this.area);

    this.dischargeMap = new Float32Array(this.area);
    this.dischargeTrack = new Float32Array(this.area);

    this.momentumX = new Float32Array(this.area);
    this.momentumY = new Float32Array(this.area);
    this.momentumXTrack = new Float32Array(this.area);
    this.momentumYTrack = new Float32Array(this.area);

    this.sharedNormal = { x: 0, y: 0, z: 0 };
  }

  getIndex(x, y) {
    return y * this.size + x;
  }

  getHeight(x, y) {
    const { size, heightMap } = this;
    if (x < 0 || x >= size || y < 0 || y >= size) return 0;
    return heightMap[y * size + x];
  }

  updateTotalHeight(index) {
    const { heightMap, bedrockMap, sedimentMap } = this;
    heightMap[index] = bedrockMap[index] + sedimentMap[index];
  }

  getMapBounds(mapArray) {
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let i = 0; i < mapArray.length; i++) {
      const value = mapArray[i];
      if (value < minVal) minVal = value;
      if (value > maxVal) maxVal = value;
    }

    return { min: minVal, max: maxVal };
  }

  getSurfaceNormal(x, y) {
    const { size, heightMap, sharedNormal, params } = this;
    const { renderHeightScale } = params;

    const westIdx = x > 0 ? y * size + (x - 1) : y * size + x;
    const eastIdx = x < size - 1 ? y * size + (x + 1) : y * size + x;
    const northIdx = y > 0 ? (y - 1) * size + x : y * size + x;
    const southIdx = y < size - 1 ? (y + 1) * size + x : y * size + x;

    const dx = (heightMap[westIdx] - heightMap[eastIdx]) * renderHeightScale;
    const dz = (heightMap[northIdx] - heightMap[southIdx]) * renderHeightScale;
    const dy = 1.0;

    const magnitude = Math.sqrt(dx * dx + dy * dy + dz * dz);

    sharedNormal.x = dx / magnitude;
    sharedNormal.y = dy / magnitude;
    sharedNormal.z = dz / magnitude;

    return sharedNormal;
  }

  getDischarge(index) {
    const { dischargeMap } = this;
    const intensity = dischargeMap[index];

    return this.codyErf(0.4 * intensity);
  }

  abramowitzStegunErf(x) {
    const sign = x >= 0 ? 1 : -1;
    const absX = Math.abs(x);
    
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    
    const t = 1 / (1 + p * absX);
    const approximation = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    
    const result = sign * approximation

    return result;
  }
  
  chebyshevErf(x) {
    const absX = Math.abs(x);
    
    if (absX > 6.0) return x > 0 ? 1.0 : -1.0;

    const a = [
      1.1283791670955125738961589031,
      -0.37612638903183752362,
      0.11283791670955125739,
      -0.02686617064513125176,
      0.00522327757190974828,
      -0.00088351659070514131,
      0.00013233215284423719,
      -0.00001741655653496154,
      0.00000201887306263814,
      -0.00000020120181794270,
      0.00000001814660991950,
      -0.00000000143977521850,
      0.00000000010141380310,
      -0.00000000000624003310,
      0.00000000000033621400
    ];

    let result = 0;
    
    if (absX < 0.84375) {
      const xSq = x * x;
      result = x * (a[0] + xSq * (a[1] + xSq * (a[2] + xSq * (a[3] + xSq * (a[4] + xSq * (a[5] + xSq * (a[6] + xSq * (a[7] + xSq * (a[8] + xSq * (a[9] + xSq * (a[10] + xSq * (a[11] + xSq * (a[12] + xSq * (a[13] + xSq * a[14]))))))))))))));
    } else {
      const t = 1 / (1 + 0.3275911 * absX);
      const z = absX;
      const expTerm = Math.exp(-z * z);
      const poly = (0.56418958354775628695 / (z + 0.5 / (z + 1.0 / (z + 1.5 / (z + 2.0 / (z + 2.5 / (z + 3.0)))))));
      
      result = 1.0 - expTerm * poly;
      if (x < 0) result = -result;
    }

    return result;
  }
  
  codyErf(x) {
    const absX = Math.abs(x);
    if (absX > 9.3) return x > 0 ? 1.0 : -1.0;

    let result;

    if (absX <= 0.84375) {
      const xSq = x * x;
      const p = [3.16112374387056560e0, 1.13864154151050156e2, 3.77485237685302021e2, 3.20937758913846947e3, 1.85777706184603153e-1];
      const q = [2.36012909538734121e1, 2.44553034426929480e2, 1.28717518608477483e3, 2.84423683343917062e3];

      const numerator = (((p[4] * xSq + p[0]) * xSq + p[1]) * xSq + p[2]) * xSq + p[3];
      const denominator = (((xSq + q[0]) * xSq + q[1]) * xSq + q[2]) * xSq + q[3];

      result = x * (numerator / denominator);
    } else if (absX <= 4.0) {
      const p = [5.64188496988670089e-1, 8.88314979438837594e0, 6.61154209374380795e1, 2.98635138197400131e2, 8.81952221241769090e2, 1.71204761263407058e3, 2.05107837782607147e3, 1.23033935479799725e3, 2.15311535474403846e-8];
      const q = [1.57449261107098347e1, 1.17693950891312499e2, 5.37181101862009858e2, 1.62138957453867840e3, 3.29079923573345963e3, 4.36261909014206030e3, 3.43936767414372164e3, 1.23033935480374426e3];

      const n = (((((((p[8] * absX + p[0]) * absX + p[1]) * absX + p[2]) * absX + p[3]) * absX + p[4]) * absX + p[5]) * absX + p[6]) * absX + p[7];
      const d = (((((((absX + q[0]) * absX + q[1]) * absX + q[2]) * absX + q[3]) * absX + q[4]) * absX + q[5]) * absX + q[6]) * absX + q[7];

      result = 1.0 - Math.exp(-x * x) * (n / d);
      if (x < 0) result = -result;
    } else {
      result = x > 0 ? 1.0 : -1.0;
    }

    return result;
  }

  generate() {
    const { noiseScale, noiseOctaves, amplitudeFalloff } = this.params;
    const { 
      size, area, heightMap, originalHeightMap, bedrockMap, sedimentMap, 
      dischargeMap, dischargeTrack, momentumX, momentumY, momentumXTrack, momentumYTrack 
    } = this;

    [
      heightMap, originalHeightMap, bedrockMap, sedimentMap, 
      dischargeMap, dischargeTrack, momentumX, momentumY, 
      momentumXTrack, momentumYTrack
    ].forEach(map => map.fill(0));

    const octaveOffsets = [];
    for (let i = 0; i < noiseOctaves; i++) {
      octaveOffsets.push({ x: random(100000), y: random(100000) });
    }

    for (let i = 0; i < area; i++) {
      const posX = i % size;
      const posY = (i / size) | 0;
      
      let currentAmplitude = 1;
      let currentFrequency = noiseScale / 100;
      let accumulatedNoise = 0;

      for (let octave = 0; octave < noiseOctaves; octave++) {
        const sampleX = posX * currentFrequency + octaveOffsets[octave].x;
        const sampleY = posY * currentFrequency + octaveOffsets[octave].y;

        accumulatedNoise += noise(sampleX, sampleY) * currentAmplitude;
        currentFrequency *= 2;
        currentAmplitude *= amplitudeFalloff;
      }

      heightMap[i] = Math.pow(accumulatedNoise, 1.2);
    }

    const { min: minH, max: maxH } = this.getMapBounds(heightMap);
    const heightRange = maxH - minH || 1;

    for (let i = 0; i < area; i++) {
      const normalisedHeight = (heightMap[i] - minH) / heightRange;
      const finalHeight = normalisedHeight;

      heightMap[i] = finalHeight;
      bedrockMap[i] = finalHeight;
      originalHeightMap[i] = finalHeight;
    }
  }

  reset() {
    [this.heightMap, this.bedrockMap].forEach(map => {
      map.set(this.originalHeightMap);
    });

    [
      this.sedimentMap, 
      this.dischargeMap, 
      this.dischargeTrack,
      this.momentumX, 
      this.momentumY, 
      this.momentumXTrack, 
      this.momentumYTrack
    ].forEach(map => map.fill(0));
  }
}