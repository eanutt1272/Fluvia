/* 
* JS-GEMS (Javascript Geomorphological Modelling System) Core Solver
*/

class Solver {
  constructor(terrain, params) {
    this.terrain = terrain;
    this.params = params;
    
    this.neighbours = [
      { x: -1, y: -1, d: Math.SQRT2 }, { x: -1, y: 0, d: 1 }, { x: -1, y: 1, d: Math.SQRT2 },
      { x: 0, y: -1, d: 1 },                                 { x: 0, y: 1, d: 1 },
      { x: 1, y: -1, d: Math.SQRT2 },  { x: 1, y: 0, d: 1 },  { x: 1, y: 1, d: Math.SQRT2 },
    ];
  }

  updateDischargeMap() {
    const { learningRate } = this.params;
    const { area, dischargeMap, dischargeTrack, momentumX, momentumXTrack, momentumY, momentumYTrack } = this.terrain;
    const inverseLearningRate = 1.0 - learningRate;

    for (let i = 0; i < area; i++) {
      dischargeMap[i] = inverseLearningRate * dischargeMap[i] + learningRate * dischargeTrack[i];
      momentumX[i] = inverseLearningRate * momentumX[i] + learningRate * momentumXTrack[i];
      momentumY[i] = inverseLearningRate * momentumY[i] + learningRate * momentumYTrack[i];
    }
  }

  hydraulicErosion() {
    const { 
      dropletsPerFrame, maxAge, minVolume, precipitationRate, 
      gravity, momentumTransfer, entrainment, depositionRate, 
      evaporationRate, sedimentErosionRate, bedrockErosionRate 
    } = this.params;
    
    const terrain = this.terrain
    const { size } = this.terrain;

	 terrain.dischargeTrack.fill(0);
	 terrain.momentumXTrack.fill(0);
	 terrain.momentumYTrack.fill(0);

    for (let droplets = 0; droplets < dropletsPerFrame; droplets++) {
      let x = random(size) | 0;
      let y = random(size) | 0;
      
      if (terrain.getHeight(x, y) < 0.1) continue;

      let vx = 0, vy = 0, sediment = 0, age = 0, volume = precipitationRate;

      while (age < maxAge && volume >= minVolume) {
        const floorX = x | 0, floorY = y | 0;
        
        if (floorX < 0 || floorX >= size || floorY < 0 || floorY >= size) break;

        const cellIdx = terrain.getIndex(floorX, floorY);
        const heightAtStart = terrain.heightMap[cellIdx];
        const surfaceNormal = terrain.getSurfaceNormal(floorX, floorY);

        vx += (gravity * surfaceNormal.x) / volume;
        vy += (gravity * surfaceNormal.z) / volume;

        const px = terrain.momentumX[cellIdx], py = terrain.momentumY[cellIdx];
        
        const flowSpeed = Math.sqrt(px * px + py * py);
        
        if (flowSpeed > 0) {
          const currSpeed = Math.sqrt(vx * vx + vy * vy);
          
          if (currSpeed > 0) {
            const align = (px * vx + py * vy) / (flowSpeed * currSpeed);
            const transfer = (momentumTransfer * align) / (volume + terrain.dischargeMap[cellIdx]);
            vx += transfer * px; vy += transfer * py;
          }
        }

        const finalSpeed = Math.sqrt(vx * vx + vy * vy);
        
        if (finalSpeed > 0) {
          const magnitude = Math.SQRT2 / finalSpeed;
          vx *= magnitude; vy *= magnitude;
        }

        x += vx; y += vy;
        
        terrain.dischargeTrack[cellIdx] += volume;
        terrain.momentumXTrack[cellIdx] += volume * vx;
        terrain.momentumYTrack[cellIdx] += volume * vy;

        let heightAtEnd = (x < 0 || x >= size || y < 0 || y >= size) ? heightAtStart - 0.002 : terrain.getHeight(x | 0, y | 0);
        
        const transportCapacity = Math.max(0, (1 + entrainment * terrain.getDischarge(cellIdx)) * (heightAtStart - heightAtEnd));
        const sedimentDeficit = transportCapacity - sediment;

        if (sedimentDeficit > 0) { 
          const canErodeFromSediment = Math.min(terrain.sedimentMap[cellIdx], sedimentDeficit * sedimentErosionRate);
          
          terrain.sedimentMap[cellIdx] -= canErodeFromSediment;
          
          let actualErosion = canErodeFromSediment;
          const remainingDeficit = (sedimentDeficit - (canErodeFromSediment / sedimentErosionRate));
          
          if (remainingDeficit > 0) {
            const fromBedrock = remainingDeficit * bedrockErosionRate;
            terrain.bedrockMap[cellIdx] -= fromBedrock;
            actualErosion += fromBedrock;
          }
          
          sediment += actualErosion;
        } else { 
          const deposited = -sedimentDeficit * depositionRate;
          terrain.sedimentMap[cellIdx] += deposited;
          sediment -= deposited;
        }
        
        terrain.updateTotalHeight(cellIdx);
        
        volume *= (1 - evaporationRate);
        sediment *= (1 - evaporationRate);

        if (x < 0 || x >= size || y < 0 || y >= size) break;

        this.thermalErosion(x, y);
        age++;
      }
    }
  }

  thermalErosion(x, y) {
    const { size, heightMap, sedimentMap, bedrockMap } = this.terrain;
    const { maxHeightDiff, settlingRate, renderHeightScale } = this.params;
    const terrain = this.terrain;
    const offsets = this.neighbours;

    x = x | 0;
    y = y | 0;

    if (x < 0 || x >= size || y < 0 || y >= size) return;

    const centreIdx = terrain.getIndex(x, y);
    const centreHeight = heightMap[centreIdx];

    for (let i = 0; i < offsets.length; i++) {
      const offset = offsets[i];
      const nx = x + offset.x;
      const ny = y + offset.y;

      if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;

      const neighbourIdx = terrain.getIndex(nx, ny);
      const neighbourHeight = heightMap[neighbourIdx];

      const heightDiff = centreHeight - neighbourHeight;
      if (heightDiff === 0) continue;

      const absDiff = heightDiff < 0 ? -heightDiff : heightDiff;
      const excessHeight = absDiff - offset.d * maxHeightDiff;

      if (excessHeight <= 0) continue;

      const materialTransfer = (settlingRate * excessHeight) / 2;

      if (heightDiff > 0) {
        heightMap[centreIdx] -= materialTransfer;
        heightMap[neighbourIdx] += materialTransfer;

        let remaining = materialTransfer;
        const amountFromSediment = Math.min(remaining, sedimentMap[centreIdx]);
        sedimentMap[centreIdx] -= amountFromSediment;
        remaining -= amountFromSediment;

        if (remaining > 0) {
          bedrockMap[centreIdx] -= remaining;
        }

        sedimentMap[neighbourIdx] += materialTransfer;
      } else {
        heightMap[centreIdx] += materialTransfer;
        heightMap[neighbourIdx] -= materialTransfer;

        let remaining = materialTransfer;
        const amountFromSediment = Math.min(remaining, sedimentMap[neighbourIdx]);
        sedimentMap[neighbourIdx] -= amountFromSediment;
        remaining -= amountFromSediment;

        if (remaining > 0) {
          bedrockMap[neighbourIdx] -= remaining;
        }

        sedimentMap[centreIdx] += materialTransfer;
      }
    }
  }
}