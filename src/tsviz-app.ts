import * as tsviz from "./tsviz"; 

function main(args: string[]) {
    let switches = args.filter(a => a.indexOf("-") === 0);
    let nonSwitches = args.filter(a => a.indexOf("-") !== 0);
    
    if (nonSwitches.length < 1) {
        console.error(
            "Invalid number of arguments. Usage:\n" + 
            "  <switches> <sources filename/directory> <output.png>\n" +
            "Available switches:\n" +
            "  -d, dependencies: produces the modules' dependencies diagram\n" + 
            "  -r, recursive: include files in subdirectories (must be non-cyclic)\n" +
            "  -m, merge: merge top level modules (will drop globals)\n" +
            "  -no-methods: hide methods from class definitions\n" +
            "  -no-properties: hide properties from class definitions\n" +
            "  -svg: output an svg file\n" +
            "  -dot: output a dot file");
        return;
    }
    
    let targetPath = nonSwitches.length > 0 ? nonSwitches[0] : "";
    let outputFilename = nonSwitches.length > 1 ? nonSwitches[1] : "diagram.png";

    let dependenciesOnly = switches.indexOf("-d") >= 0 || switches.indexOf("-dependencies") >= 0; // dependencies or uml?
    let recursive = switches.indexOf("-r") >= 0 || switches.indexOf("-recursive") >= 0;
    let merge = switches.indexOf("-m") >= 0 || switches.indexOf("-merge") >= 0;
    let noMethods = switches.indexOf("-no-methods") >= 0;
    let noProperties = switches.indexOf("-no-properties") >= 0;
    let svgOutput = switches.indexOf("-svg") >= 0;
    let dotOutput = switches.indexOf("-dot") >= 0;

    tsviz.createGraph(targetPath, outputFilename, dependenciesOnly, recursive, merge, noMethods, noProperties, svgOutput, dotOutput);

    console.log("Done");
}

export function run() {
    main(process.argv.slice(2));
}
