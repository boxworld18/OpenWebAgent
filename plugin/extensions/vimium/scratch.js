const fns = [];

const types = [1,2];

// for (const i = 0; i < 2; i++) {
//   fns.push(() => console.log(i));
// }

for (const t of types) {
  fns.push(() => console.log(t));
}

for (const fn of fns) {
  fn();
}
