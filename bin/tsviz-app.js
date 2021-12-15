"use strict";
var tsviz = require("./tsviz");
function main(args) {
    var switches = args.filter(function (a) { return a.indexOf("-") === 0; });
    var nonSwitches = args.filter(function (a) { return a.indexOf("-") !== 0; });
    if (nonSwitches.length < 1) {
        console.error("Invalid number of arguments. Usage:\n" +
            "  <switches> <sources filename/directory> <output.png>\n" +
            "Available switches:\n" +
            "  -d, dependencies: produces the modules' dependencies diagram\n" +
            "  -r, recursive: include files in subdirectories (must be non-cyclic)\n" +
            "  -m, merge: merge top level modules (will drop globals)\n" +
            "  -no-methods: hide methods from class definitions\n" +
            "  -no-properties: hide properties from class definitions\n" +
            "  -no-types: hide types from methods and properties definitions (types output require -plant)\n" +
            "  -svg: output an svg file\n" +
            "  -dot: output a dot file\n" +
            "  -plant: output plantuml to file\n");
        return;
    }
    var targetPath = nonSwitches.length > 0 ? nonSwitches[0] : "";
    var outputFilename = nonSwitches.length > 1 ? nonSwitches[1] : "diagram.png";
    var dependenciesOnly = switches.indexOf("-d") >= 0 || switches.indexOf("-dependencies") >= 0; // dependencies or uml?
    var recursive = switches.indexOf("-r") >= 0 || switches.indexOf("-recursive") >= 0;
    var merge = switches.indexOf("-m") >= 0 || switches.indexOf("-merge") >= 0;
    var noMethods = switches.indexOf("-no-methods") >= 0;
    var noProperties = switches.indexOf("-no-properties") >= 0;
    var noTypes = switches.indexOf("-no-types") >= 0;
    var svgOutput = switches.indexOf("-svg") >= 0;
    var dotOutput = switches.indexOf("-dot") >= 0;
    var plantOutput = switches.indexOf("-plant") >= 0;
    tsviz.createGraph(targetPath, outputFilename, dependenciesOnly, recursive, merge, noMethods, noProperties, noTypes, svgOutput, dotOutput, plantOutput);
    console.log("Done");
}
function run() {
    main(process.argv.slice(2));
}
exports.run = run;
