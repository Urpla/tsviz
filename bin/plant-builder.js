"use strict";
var ts_elements_1 = require("./ts-elements");
var fs_1 = require("fs");
function buildUml(modules, outputFilename, noMethods, noProperties) {
    var out = [];
    out.push("@startuml");
    modules.forEach(function (module) {
        buildModule(module, out, module.path, noMethods, noProperties);
    });
    out.push("@enduml");
    fs_1.writeFileSync(outputFilename, out.join("\n"));
}
exports.buildUml = buildUml;
function buildModule(module, out, path, noMethods, noProperties) {
    module.modules.forEach(function (childModule) {
        buildModule(childModule, out, (path ? path + "." : "") + module.name, noMethods, noProperties);
    });
    module.classes.forEach(function (childClass) {
        buildClass(childClass, out, (path ? path + "." : "") + module.name, noMethods, noProperties);
    });
}
function buildClass(classDef, out, path, noMethods, noProperties) {
    var className = (path ? path + "." : "") + classDef.name;
    out.push("class " + className + (classDef.typeParameter ? "<" + classDef.typeParameter + ">" : "") + (!noMethods || !noProperties ? " {" : ""));
    if (!noMethods || !noProperties) {
        if (!noMethods) {
            out.push.apply(out, classDef.methods
                .filter(function (e) { return e.visibility == ts_elements_1.Visibility.Public; })
                .map(function (e) { return getMethodSignature(e); }));
        }
        if (!noProperties) {
            out.push.apply(out, classDef.properties
                .filter(function (e) { return e.visibility == ts_elements_1.Visibility.Public; })
                .map(function (e) { return getPropertySignature(e); }));
        }
        out.push("}");
    }
    if (classDef.extends) {
        var relation = classDef.extends.parts.join(".") + " <|-- " + className;
        if (out.indexOf(relation) < 0) {
            out.push(relation);
        }
    }
    if (classDef.implements) {
        var relation = classDef.implements.parts.join(".") + " <|-- " + className;
        if (out.indexOf(relation) < 0) {
            out.push(relation);
        }
    }
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
            return "#";
        case ts_elements_1.Visibility.Private:
            return "-";
    }
}
function lifetimeToString(lifetime) {
    return lifetime === ts_elements_1.Lifetime.Static ? "{static} " : "";
}
function getName(element) {
    return element.name;
}
