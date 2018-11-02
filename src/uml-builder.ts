/// <reference path="typings/graphviz/graphviz.d.ts"/>

import * as graphviz from "graphviz";
import { Element, Module, Class, Method, Property, Visibility, QualifiedName, Lifetime } from "./ts-elements";
import { Collections } from "./extensions";
import { writeFileSync } from "fs";

export function buildUml(modules: Module[], outputFilename: string, dependenciesOnly: boolean, noMethods: boolean, noProperties: boolean, svgOutput: boolean, dotOutput: boolean) {
    let g: graphviz.Graph = graphviz.digraph("G");

    const FontSizeKey = "fontsize";
    const FontSize = 12;
    const FontNameKey = "fontname";
    const FontName = "Verdana";

    // set diagram default styles
    g.set(FontSizeKey, FontSize);
    g.set(FontNameKey, FontName);
    g.setEdgeAttribut(FontSizeKey, FontSize);
    g.setEdgeAttribut(FontNameKey, FontName);
    g.setNodeAttribut(FontSizeKey, FontSize);
    g.setNodeAttribut(FontNameKey, FontName);
    g.setNodeAttribut("shape", "record");

    // We need to scan the modules twice, once to add all the nodes then to add the edges 
    // otherwise non-existant nodes get added to the wrong cluster
    // (we only do this when not generating dependencies)
    if (!dependenciesOnly) {
        modules.forEach(module => {
            buildModule(module, g, module.path, 0, dependenciesOnly, noMethods, noProperties, false);
        });
    }
    modules.forEach(module => {
        buildModule(module, g, module.path, 0, dependenciesOnly, noMethods, noProperties, true);
    });

    if (process.platform === "win32") {
        let pathVariable = <string> process.env["PATH"];
        if (pathVariable.indexOf("Graphviz") === -1) {
            console.warn("Could not find Graphviz in PATH.");
        }
    }

    if (dotOutput) {
        // Generate a dot output
        writeFileSync(outputFilename, g.to_dot());
    } else {
        // Generate a PNG/SVG output
        g.output(svgOutput ? "svg" : "png", outputFilename);
    }
}

function buildModule(module: Module, g: graphviz.Graph, path: string, level: number, dependenciesOnly: boolean, noMethods: boolean, noProperties: boolean, addEdges: boolean) {
    const ModulePrefix = "cluster_";

    const moduleId = getGraphNodeId(path, module.name);

    // When adding edge, we put them at the top level to prevent nodes from being generated in the wrong clusters
    if (!dependenciesOnly && addEdges) {
        module.modules.forEach(childModule => {
            buildModule(childModule, g, moduleId, level + 1, false, noMethods, noProperties, addEdges);
        });

        module.classes.forEach(childClass => {
            buildClass(childClass, g, moduleId, noMethods, noProperties, addEdges);
        });
        return;
    }

    const clusterId = "\"" + ModulePrefix + moduleId + "\""

    let cluster = g.getCluster(clusterId);
    if (!cluster) {
        cluster = g.addCluster(clusterId);

        cluster.set("label", (module.visibility !== Visibility.Public ? visibilityToString(module.visibility) + " " : "") + module.name);
        cluster.set("style", "filled");
        cluster.set("color", "gray" + Math.max(40, (95 - (level * 6))));
    }

    if (dependenciesOnly) {
        Collections.distinct(module.dependencies, d => d.name).forEach(d => {
            g.addEdge(module.name, getGraphNodeId("", d.name));
        });
    } else {
        let moduleMethods = combineSignatures(module.methods, getMethodSignature);
        if (moduleMethods) {
            cluster.addNode(
                getGraphNodeId(path, module.name),
                {
                    "label": moduleMethods,
                    "shape": "none"
                });
        }

        module.modules.forEach(childModule => {
            buildModule(childModule, cluster, moduleId, level + 1, false, noMethods, noProperties, addEdges);
        });

        module.classes.forEach(childClass => {
            buildClass(childClass, cluster, moduleId, noMethods, noProperties, addEdges);
        });
    }
}

function buildClass(classDef: Class, g: graphviz.Graph, path: string, noMethods: boolean, noProperties: boolean, addEdges: boolean) {
    if (!addEdges) {
        let methodsSignatures = noMethods ? "" : combineSignatures(classDef.methods, getMethodSignature);
        let propertiesSignatures = noProperties ? "" : combineSignatures(classDef.properties, getPropertySignature);
    
        let classNode = g.addNode(
            getGraphNodeId(path, classDef.name),
            {
                "label": "{" + [ classDef.name + (classDef.typeParameter ? `\\<${classDef.typeParameter}\\>` : ""), methodsSignatures, propertiesSignatures].filter(e => e.length > 0).join("|") + "}"
            });
    } else {
        // add inheritance arrow
        let addEdge: Function = function(nodeOne: string, nodeTwo: string, nodeTwoLabel: string) {
            if (g.edges.some((edge: graphviz.Edge) => {
                return (edge.nodeOne.id === nodeOne) && (edge.nodeTwo.id === nodeTwo);
            })) {
                return;
            }

            // If the node doesn't exist anywhere add a placeholder as it might be external, this will give it a proper label
            if (!findNode(nodeTwo, g)) {
                g.addNode(nodeTwo, {
                    "label": "{" + nodeTwoLabel + "}"
                });
            }
    
            g.addEdge(
                nodeOne,
                nodeTwo,
                { "arrowhead": "onormal" });
        }

        if(classDef.extends) {
            addEdge(
                getGraphNodeId(path, classDef.name), 
                classDef.extends.parts.reduce((path, name) => getGraphNodeId(path, name), ""), 
                classDef.extends.parts.join("."));
        }

        if(classDef.implements) {
            addEdge(
                getGraphNodeId(path, classDef.name), 
                classDef.implements.parts.reduce((path, name) => getGraphNodeId(path, name), ""), 
                classDef.implements.parts.join("."));
        }
    }
}

function combineSignatures<T extends Element>(elements: T[], map: (e: T) => string): string {
    return elements.filter(e => e.visibility == Visibility.Public)
        .map(e => map(e) + "\\l")
        .join("");
}

function getMethodSignature(method: Method): string {
    return [
        visibilityToString(method.visibility),
        lifetimeToString(method.lifetime),
        getName(method) + "()"
    ].join(" ");
}

function getPropertySignature(property: Property): string {
    return [
        visibilityToString(property.visibility),
        lifetimeToString(property.lifetime),
        [
            (property.hasGetter ? "get" : null),
            (property.hasSetter ? "set" : null)
        ].filter(v => v !== null).join("/"),
        getName(property)
    ].join(" ");
}

function visibilityToString(visibility: Visibility) {
    switch(visibility) {
        case Visibility.Public:
            return "+";
        case Visibility.Protected:
            return "~";
        case Visibility.Private:
            return "-";
    }
}

function lifetimeToString(lifetime: Lifetime) {
    return lifetime === Lifetime.Static ? "\\<static\\>" : "";
}

function getName(element: Element) {
    return element.name;
}

function getGraphNodeId(path: string, name: string): string {
    let result = ((path ? path + "/" : "") + name).replace(/\//g, "|");
    return result;
}

function findNode(id: string, root: graphviz.Graph): graphviz.Node {
    let node = root.getNode(id);
    if (node) {
        return node;
    } else {
        for (let k in root.clusters.items) {
            if (k) {
                node = findNode(id, root.clusters.items[k]);
                if (node) {
                    return node;
                }
            }
        }
    }
    return null;
}