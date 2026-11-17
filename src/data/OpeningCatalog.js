import {REPLACEMENT_CATALOG} from './ReplacementCatalog.js';
import {makeOpening} from './ReplacementOpenings.js';
export const OPENING_CATALOG=REPLACEMENT_CATALOG.filter((item)=>item.placementType==='opening').map(makeOpening);
