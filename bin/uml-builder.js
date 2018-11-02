"use strict";
var graphviz = require("graphviz");
var ts_elements_1 = require("./ts-elements");
var extensions_1 = require("./extensions");
var fs_1 = require("fs");
function buildUml(modules, outputFilename, dependenciesOnly, noMethods, noProperties, svgOutput, dotOutput) {
    var g = graphviz.digraph("G");
    var FontSizeKey = "fontsize";
    var FontSize = 12;
    var FontNameKey = "fontname";
    var FontName = "Verdana";
    g.set(FontSizeKey, FontSize);
    g.set(FontNameKey, FontName);
    g.setEdgeAttribut(FontSizeKey, FontSize);
    g.setEdgeAttribut(FontNameKey, FontName);
    g.setNodeAttribut(FontSizeKey, FontSize);
    g.setNodeAttribut(FontNameKey, FontName);
    g.setNodeAttribut("shape", "record");
    if (!dependenciesOnly) {
        modules.forEach(function (module) {
            buildModule(module, g, module.path, 0, dependenciesOnly, noMethods, noProperties, false);
        });
    }
    modules.forEach(function (module) {
        buildModule(module, g, module.path, 0, dependenciesOnly, noMethods, noProperties, true);
    });
    if (process.platform === "win32") {
        var pathVariable = process.env["PATH"];
        if (pathVariable.indexOf("Graphviz") === -1) {
            console.warn("Could not find Graphviz in PATH.");
        }
    }
    if (dotOutput) {
        fs_1.writeFileSync(outputFilename, g.to_dot());
    }
    else {
        g.output(svgOutput ? "svg" : "png", outputFilename);
    }
}
exports.buildUml = buildUml;
function buildModule(module, g, path, level, dependenciesOnly, noMethods, noProperties, addEdges) {
    var ModulePrefix = "cluster_";
    var moduleId = getGraphNodeId(path, module.name);
    if (!dependenciesOnly && addEdges) {
        module.modules.forEach(function (childModule) {
            buildModule(childModule, g, moduleId, level + 1, false, noMethods, noProperties, addEdges);
        });
        module.classes.forEach(function (childClass) {
            buildClass(childClass, g, moduleId, noMethods, noProperties, addEdges);
        });
        return;
    }
    var clusterId = "\"" + ModulePrefix + moduleId + "\"";
    var cluster = g.getCluster(clusterId);
    if (!cluster) {
        cluster = g.addCluster(clusterId);
        cluster.set("label", (module.visibility !== ts_elements_1.Visibility.Public ? visibilityToString(module.visibility) + " " : "") + module.name);
        cluster.set("style", "filled");
        cluster.set("color", "gray" + Math.max(40, (95 - (level * 6))));
    }
    if (dependenciesOnly) {
        extensions_1.Collections.distinct(module.dependencies, function (d) { return d.name; }).forEach(function (d) {
            g.addEdge(module.name, getGraphNodeId("", d.name));
        });
    }
    else {
        var moduleMethods = combineSignatures(module.methods, getMethodSignature);
        if (moduleMethods) {
            cluster.addNode(getGraphNodeId(path, module.name), {
                "label": moduleMethods,
                "shape": "none"
            });
        }
        module.modules.forEach(function (childModule) {
            buildModule(childModule, cluster, moduleId, level + 1, false, noMethods, noProperties, addEdges);
        });
        module.classes.forEach(function (childClass) {
            buildClass(childClass, cluster, moduleId, noMethods, noProperties, addEdges);
        });
    }
}
function buildClass(classDef, g, path, noMethods, noProperties, addEdges) {
    if (!addEdges) {
        var methodsSignatures = noMethods ? "" : combineSignatures(classDef.methods, getMethodSignature);
        var propertiesSignatures = noProperties ? "" : combineSignatures(classDef.properties, getPropertySignature);
        var classNode = g.addNode(getGraphNodeId(path, classDef.name), {
            "label": "{" + [classDef.name + (classDef.typeParameter ? "\\<" + classDef.typeParameter + "\\>" : ""), methodsSignatures, propertiesSignatures].filter(function (e) { return e.length > 0; }).join("|") + "}"
        });
    }
    else {
        var addEdge = function (nodeOne, nodeTwo, nodeTwoLabel) {
            if (g.edges.some(function (edge) {
                return (edge.nodeOne.id === nodeOne) && (edge.nodeTwo.id === nodeTwo);
            })) {
                return;
            }
            if (!findNode(nodeTwo, g)) {
                g.addNode(nodeTwo, {
                    "label": "{" + nodeTwoLabel + "}"
                });
            }
            g.addEdge(nodeOne, nodeTwo, { "arrowhead": "onormal" });
        };
        if (classDef.extends) {
            addEdge(getGraphNodeId(path, classDef.name), classDef.extends.parts.reduce(function (path, name) { return getGraphNodeId(path, name); }, ""), classDef.extends.parts.join("."));
        }
        if (classDef.implements) {
            addEdge(getGraphNodeId(path, classDef.name), classDef.implements.parts.reduce(function (path, name) { return getGraphNodeId(path, name); }, ""), classDef.implements.parts.join("."));
        }
    }
}
function combineSignatures(elements, map) {
    return elements.filter(function (e) { return e.visibility == ts_elements_1.Visibility.Public; })
        .map(function (e) { return map(e) + "\\l"; })
        .join("");
}
function getMethodSignature(method) {
    return [
        visibilityToString(method.visibility),
        lifetimeToString(method.lifetime),
        getName(method) + "()"
    ].join(" ");
}
function getPropertySignature(property) {
    return [
        visibilityToString(property.visibility),
        lifetimeToString(property.lifetime),
        [
            (property.hasGetter ? "get" : null),
            (property.hasSetter ? "set" : null)
        ].filter(function (v) { return v !== null; }).join("/"),
        getName(property)
    ].join(" ");
}
function visibilityToString(visibility) {
    switch (visibility) {
        case ts_elements_1.Visibility.Public:
            return "+";
        case ts_elements_1.Visibility.Protected:
            return "~";
        case ts_elements_1.Visibility.Private:
            return "-";
    }
}
function lifetimeToString(lifetime) {
    return lifetime === ts_elements_1.Lifetime.Static ? "\\<static\\>" : "";
}
function getName(element) {
    return element.name;
}
function getGraphNodeId(path, name) {
    var result = ((path ? path + "/" : "") + name).replace(/\//g, "|");
    return result;
}
function findNode(id, root) {
    var node = root.getNode(id);
    if (node) {
        return node;
    }
    else {
        for (var k in root.clusters.items) {
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
