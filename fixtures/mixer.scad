// FR : géométrie illustrative, unités mm, fonction non validée.
// EN: illustrative geometry, mm units, unvalidated function.
// ES: geometría ilustrativa, unidades mm, función no validada.
scale([1, 1, 1]) {
difference() {
  cube([1.5, 1, 0.2]);
  translate([-0.01, 0.25, 0.1]) cube([0.61, 0.08, 0.11]);
  translate([-0.01, 0.65, 0.1]) cube([0.61, 0.08, 0.11]);
  translate([0.52, 0.25, 0.1]) cube([0.08, 0.48, 0.11]);
  translate([0.52, 0.45, 0.1]) cube([1, 0.08, 0.11]);
}
}
