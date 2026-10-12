import model from './model-definition.js';
import {normalizeModel} from './model-schema.js';
export const {MODEL,SCALE,world,source,zones,regions,structuralRegions,categoryLabels,footprint,voids,columns,partialBoundaries,SOURCE,META}=normalizeModel(model);
export const polygonArea=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2);
