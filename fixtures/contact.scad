// FR : géométrie illustrative, unités mm, fonction non validée.
// EN: illustrative geometry, mm units, unvalidated function.
// ES: geometría ilustrativa, unidades mm, función no validada.
scale([1, 1, 1]) {
union() {
  cube([0.2, 0.3, 0.08]);
  translate([0.2, 0.1, 0.05]) cube([0.6, 0.1, 0.02]);
  translate([0.8, 0.07, 0.02]) cube([0.15, 0.16, 0.03]);
}
}
