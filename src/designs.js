import { check, positive } from './common.js';
const bodies = {
  flexure: `union() {
  cube([0.12, 0.18, 0.08]);
  translate([0.12, 0.06, 0.03]) cube([0.5, 0.06, 0.02]);
  translate([0.62, 0.04, 0.03]) cube([0.12, 0.1, 0.02]);
}`,
  valve: `difference() {
  cube([1.2, 0.8, 0.3]);
  translate([-0.01, 0.35, 0.12]) cube([1.22, 0.1, 0.08]);
  translate([0.6, 0.4, 0.12]) cylinder(h=0.19, r=0.18, $fn=48);
}`,
  mixer: `difference() {
  cube([1.5, 1, 0.2]);
  translate([-0.01, 0.25, 0.1]) cube([0.61, 0.08, 0.11]);
  translate([-0.01, 0.65, 0.1]) cube([0.61, 0.08, 0.11]);
  translate([0.52, 0.25, 0.1]) cube([0.08, 0.48, 0.11]);
  translate([0.52, 0.45, 0.1]) cube([1, 0.08, 0.11]);
}`,
  'thermal-channel': `difference() {
  cube([2, 1.2, 0.3]);
  for (i=[0:5]) translate([-0.01, 0.1+i*0.18, 0.18]) cube([2.02, 0.1, 0.13]);
}`,
  contact: `union() {
  cube([0.2, 0.3, 0.08]);
  translate([0.2, 0.1, 0.05]) cube([0.6, 0.1, 0.02]);
  translate([0.8, 0.07, 0.02]) cube([0.15, 0.16, 0.03]);
}`,
};
/** Illustrative geometry only; does not implement a qualified physical function. */
export function designFor(blockId, { scale = 1, locale = 'fr' } = {}) {
  check(Object.hasOwn(bodies, blockId) && positive(scale) && scale >= 0.8 && scale <= 1.2, locale);
  return `// FR : géométrie illustrative, unités mm, fonction non validée.\n// EN: illustrative geometry, mm units, unvalidated function.\n// ES: geometría ilustrativa, unidades mm, función no validada.\nscale([${scale}, ${scale}, ${scale}]) {\n${bodies[blockId]}\n}\n`;
}
