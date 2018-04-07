exports.printMsg = function() {
  console.log("This is a message from the demo package");
}

exports.combine = combine;

function combine(args) {
  console.log("Combine", args);
}
