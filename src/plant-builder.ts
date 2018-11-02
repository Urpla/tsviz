import { Element, Module, Class, Method, Property, Visibility, QualifiedName, Lifetime } from "./ts-elements";
import { writeFileSync } from "fs";

export function buildUml(modules: Module[], outputFilename: string, noMethods: boolean, noProperties: boolean) {
    let out: string[] = [];

    out.push("@startuml");

    modules.forEach(module => {
        buildModule(module, out, module.path, noMethods, noProperties);
    });

    out.push("@enduml");

   writeFileSync(outputFilename, out.join("\n"));
}

function buildModule(module: Module, out: string[], path: string, noMethods: boolean, noProperties: boolean) {
    module.modules.forEach(childModule => {
        buildModule(childModule, out, (path ? path + "." : "") + module.name, noMethods, noProperties);
    });

    module.classes.forEach(childClass => {
        buildClass(childClass, out, (path ? path + "." : "") + module.name, noMethods, noProperties);
    });
}

function buildClass(classDef: Class, out: string[], path: string, noMethods: boolean, noProperties: boolean) {
    let className = (path ? path + "." : "") + classDef.name;
    out.push(`class ${className}${classDef.typeParameter ? `<${classDef.typeParameter}>` : ""}${!noMethods || !noProperties ? " {" : ""}`);

    if (!noMethods || !noProperties) {
        if (!noMethods) {
            out.push.apply(out, classDef.methods
                .filter(e => e.visibility == Visibility.Public)
                .map(e => getMethodSignature(e)));
        }
        if (!noProperties) {
            out.push.apply(out, classDef.properties
                .filter(e => e.visibility == Visibility.Public)
                .map(e => getPropertySignature(e)));
        }
        out.push("}");
    }
    if(classDef.extends) {
        let relation = `${classDef.extends.parts.join(".")} <|-- ${className}`;
        if (out.indexOf(relation) < 0) {
            out.push(relation);
        }
    }

    if(classDef.implements) {
        let relation = `${classDef.implements.parts.join(".")} <|-- ${className}`;
        if (out.indexOf(relation) < 0) {
            out.push(relation);
        }
    }
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
            return "#";
        case Visibility.Private:
            return "-";
    }
}

function lifetimeToString(lifetime: Lifetime) {
    return lifetime === Lifetime.Static ? "{static} " : "";
}

function getName(element: Element) {
    return element.name;
}
