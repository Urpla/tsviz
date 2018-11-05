import { Element, Module, Class, Method, Property, Visibility, QualifiedName, Lifetime } from "./ts-elements";
import { writeFileSync } from "fs";

export function buildUml(modules: Module[], outputFilename: string, noMethods: boolean, noProperties: boolean, noTypes: boolean) {
    let out: string[] = [];

    out.push("@startuml");

    modules.forEach(module => {
        buildModule(module, out, module.path, noMethods, noProperties, noTypes);
    });

    out.push("@enduml");

   writeFileSync(outputFilename, out.join("\n"));
}

function buildModule(module: Module, out: string[], path: string, noMethods: boolean, noProperties: boolean, noTypes: boolean) {
    module.modules.forEach(childModule => {
        buildModule(childModule, out, (path ? path + "." : "") + module.name, noMethods, noProperties, noTypes);
    });

    module.classes.forEach(childClass => {
        buildClass(childClass, out, (path ? path + "." : "") + module.name, noMethods, noProperties, noTypes);
    });
}

function buildClass(classDef: Class, out: string[], path: string, noMethods: boolean, noProperties: boolean, noTypes: boolean) {
    let className = (path ? path + "." : "") + classDef.name;
    out.push(`${classDef.isInterface ? "interface" : "class"} ${className}${classDef.typeParameter ? `<${classDef.typeParameter}>` : ""}${!noMethods || !noProperties ? " {" : ""}`);

    if (!noMethods || !noProperties) {
        if (!noMethods) {
            out.push.apply(out, classDef.methods
                .filter(e => e.visibility == Visibility.Public)
                .map(e => getMethodSignature(e, path, noTypes)));
        }
        if (!noProperties) {
            out.push.apply(out, classDef.properties
                .filter(e => e.visibility == Visibility.Public)
                .map(e => getPropertySignature(e, path, noTypes)));
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

function getMethodSignature(method: Method, path: string, noTypes: boolean): string {
    let postfix = "()";
    if (!noTypes && method.type) {
        let type = method.type;
        if (path) {
            // Strip out the current namespace from the type, we could give the type more 
            // structure to more easily ommit the current namespace but this works for now
            type = type.replace(path + '.', '');
        }
        postfix += ` : ${type}`;
    }
    return [
        visibilityToString(method.visibility),
        lifetimeToString(method.lifetime),
        getName(method) + postfix
    ].join(" ");
}

function getPropertySignature(property: Property, path: string, noTypes: boolean): string {
    let postfix = "";
    if (!noTypes && property.type) {
        let type = property.type;
        if (path) {
            // Strip out the current namespace from the type, we could give the type more 
            // structure to more easily ommit the current namespace but this works for now
            type = type.replace(path + '.', '');
        }
        postfix += ` : ${type}`;
    }
    return [
        visibilityToString(property.visibility),
        lifetimeToString(property.lifetime),
        [
            (property.hasGetter ? "get" : null),
            (property.hasSetter ? "set" : null)
        ].filter(v => v !== null).join("/"),
        getName(property) + postfix
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
