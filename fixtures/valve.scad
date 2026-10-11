// FR : géométrie illustrative, unités mm, fonction non validée.
// EN: illustrative geometry, mm units, unvalidated function.
// ES: geometría ilustrativa, unidades mm, función no validada.
scale([1, 1, 1]) {
difference() {
  cube([1.2, 0.8, 0.3]);
  translate([-0.01, 0.35, 0.12]) cube([1.22, 0.1, 0.08]);
  translate([0.6, 0.4, 0.12]) cylinder(h=0.19, r=0.18, $fn=48);
}
}
