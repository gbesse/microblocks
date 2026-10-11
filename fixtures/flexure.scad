// FR : géométrie illustrative, unités mm, fonction non validée.
// EN: illustrative geometry, mm units, unvalidated function.
// ES: geometría ilustrativa, unidades mm, función no validada.
scale([1, 1, 1]) {
union() {
  cube([0.12, 0.18, 0.08]);
  translate([0.12, 0.06, 0.03]) cube([0.5, 0.06, 0.02]);
  translate([0.62, 0.04, 0.03]) cube([0.12, 0.1, 0.02]);
}
}
