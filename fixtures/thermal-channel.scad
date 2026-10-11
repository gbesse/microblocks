// FR : géométrie illustrative, unités mm, fonction non validée.
// EN: illustrative geometry, mm units, unvalidated function.
// ES: geometría ilustrativa, unidades mm, función no validada.
scale([1, 1, 1]) {
difference() {
  cube([2, 1.2, 0.3]);
  for (i=[0:5]) translate([-0.01, 0.1+i*0.18, 0.18]) cube([2.02, 0.1, 0.13]);
}
}
