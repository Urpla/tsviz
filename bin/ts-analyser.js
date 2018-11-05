"use strict";
var ts = require("typescript");
var path = require("path");
var ts_elements_1 = require("./ts-elements");
var extensions_1 = require("./extensions");
function collectInformation(program, sourceFile) {
    var typeChecker = program.getTypeChecker();
    var filename = sourceFile.fileName;
    filename = filename.substr(0, filename.lastIndexOf("."));
    var moduleName = path.basename(filename);
    var module = new ts_elements_1.Module(moduleName, null);
    module.path = path.dirname(filename);
    analyseNode(sourceFile, module);
    function analyseNode(node, currentElement) {
        var childElement;
        var skipChildren = false;
        switch (node.kind) {
            case ts.SyntaxKind.ModuleDeclaration:
                var moduleDeclaration = node;
                childElement = new ts_elements_1.Module(moduleDeclaration.name.text, currentElement, getVisibility(node));
                break;
            case ts.SyntaxKind.ImportEqualsDeclaration:
                var importEqualDeclaration = node;
                childElement = new ts_elements_1.ImportedModule(importEqualDeclaration.name.text, currentElement);
                break;
            case ts.SyntaxKind.ImportDeclaration:
                var importDeclaration = node;
                var moduleName_1 = importDeclaration.moduleSpecifier.text;
                childElement = new ts_elements_1.ImportedModule(moduleName_1, currentElement);
                break;
            case ts.SyntaxKind.InterfaceDeclaration:
                var interfaceDeclaration = node;
                var interfaceDef = new ts_elements_1.Class(interfaceDeclaration.name.text, currentElement, getVisibility(node));
                interfaceDef.isInterface = true;
                if (interfaceDeclaration.typeParameters && interfaceDeclaration.typeParameters.length > 0) {
                    interfaceDef.typeParameter = interfaceDeclaration.typeParameters[0].name.text;
                }
                if (interfaceDeclaration.heritageClauses) {
                    var extendsClause = extensions_1.Collections.firstOrDefault(interfaceDeclaration.heritageClauses, function (c) { return c.token === ts.SyntaxKind.ExtendsKeyword; });
                    if (extendsClause && extendsClause.types.length > 0) {
                        interfaceDef.extends = getFullyQualifiedName(extendsClause.types[0]);
                    }
                    var implementsClause = extensions_1.Collections.firstOrDefault(interfaceDeclaration.heritageClauses, function (c) { return c.token === ts.SyntaxKind.ImplementsKeyword; });
                    if (implementsClause && implementsClause.types.length > 0) {
                        interfaceDef.implements = getFullyQualifiedName(implementsClause.types[0]);
                    }
                }
                childElement = interfaceDef;
                break;
            case ts.SyntaxKind.ClassDeclaration:
                var classDeclaration = node;
                var classDef = new ts_elements_1.Class(classDeclaration.name.text, currentElement, getVisibility(node));
                if (classDeclaration.typeParameters && classDeclaration.typeParameters.length > 0) {
                    classDef.typeParameter = classDeclaration.typeParameters[0].name.text;
                }
                if (classDeclaration.heritageClauses) {
                    var extendsClause = extensions_1.Collections.firstOrDefault(classDeclaration.heritageClauses, function (c) { return c.token === ts.SyntaxKind.ExtendsKeyword; });
                    if (extendsClause && extendsClause.types.length > 0) {
                        classDef.extends = getFullyQualifiedName(extendsClause.types[0]);
                    }
                    var implementsClause = extensions_1.Collections.firstOrDefault(classDeclaration.heritageClauses, function (c) { return c.token === ts.SyntaxKind.ImplementsKeyword; });
                    if (implementsClause && implementsClause.types.length > 0) {
                        classDef.implements = getFullyQualifiedName(implementsClause.types[0]);
                    }
                }
                childElement = classDef;
                break;
            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.SetAccessor:
            case ts.SyntaxKind.PropertyDeclaration:
            case ts.SyntaxKind.PropertySignature:
                var propertyDeclaration = node;
                var property = new ts_elements_1.Property(propertyDeclaration.name.text, currentElement, getVisibility(node), getLifetime(node));
                if (propertyDeclaration.type) {
                    property.type = getTypeFromNode(propertyDeclaration.type);
                }
                switch (node.kind) {
                    case ts.SyntaxKind.GetAccessor:
                        property.hasGetter = true;
                        break;
                    case ts.SyntaxKind.SetAccessor:
                        property.hasSetter = true;
                }
                childElement = property;
                skipChildren = true;
                break;
            case ts.SyntaxKind.MethodDeclaration:
            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.MethodSignature:
                var functionDeclaration = node;
                var method = new ts_elements_1.Method(functionDeclaration.name.text, currentElement, getVisibility(node), getLifetime(node));
                if (functionDeclaration.type) {
                    method.type = getTypeFromNode(functionDeclaration.type);
                }
                childElement = method;
                skipChildren = true;
                break;
        }
        if (childElement) {
            currentElement.addElement(childElement);
        }
        if (skipChildren) {
            return;
        }
        ts.forEachChild(node, function (node) { return analyseNode(node, childElement || currentElement); });
    }
    function getFullyQualifiedName(expression) {
        var symbol = typeChecker.getSymbolAtLocation(expression.expression);
        if (symbol) {
            var nameParts = typeChecker.getFullyQualifiedName(symbol).split(".");
            if (symbol.declarations.length > 0 && symbol.declarations[0].kind === ts.SyntaxKind.ImportSpecifier) {
                var importSpecifier = symbol.declarations[0];
                var moduleName_2 = importSpecifier.parent.parent.parent.moduleSpecifier.text;
                nameParts.unshift(moduleName_2);
            }
            else {
                if (nameParts.length > 0 && nameParts[0].indexOf("\"") === 0) {
                    var moduleName_3 = nameParts[0].replace(/\"/g, "");
                    nameParts[0] = moduleName_3;
                }
            }
            return new ts_elements_1.QualifiedName(nameParts);
        }
        console.warn("Unable to resolve type: '" + expression.getText() + "'");
        return new ts_elements_1.QualifiedName(["unknown"]);
    }
    function getVisibility(node) {
        if (node.modifiers) {
            if (hasModifierSet(node.modifiers.flags, ts.NodeFlags.Protected)) {
                return ts_elements_1.Visibility.Protected;
            }
            else if (hasModifierSet(node.modifiers.flags, ts.NodeFlags.Private)) {
                return ts_elements_1.Visibility.Private;
            }
            else if (hasModifierSet(node.modifiers.flags, ts.NodeFlags.Public)) {
                return ts_elements_1.Visibility.Public;
            }
            else if (hasModifierSet(node.modifiers.flags, ts.NodeFlags.Export)) {
                return ts_elements_1.Visibility.Public;
            }
        }
        switch (node.parent.kind) {
            case ts.SyntaxKind.InterfaceDeclaration:
            case ts.SyntaxKind.ClassDeclaration:
                return ts_elements_1.Visibility.Public;
            case ts.SyntaxKind.ModuleDeclaration:
                return ts_elements_1.Visibility.Private;
        }
        return ts_elements_1.Visibility.Private;
    }
    function getLifetime(node) {
        if (node.modifiers) {
            if (hasModifierSet(node.modifiers.flags, ts.NodeFlags.Static)) {
                return ts_elements_1.Lifetime.Static;
            }
        }
        return ts_elements_1.Lifetime.Instance;
    }
    function hasModifierSet(value, modifier) {
        return (value & modifier) === modifier;
    }
    function getTypeFromType(type) {
        if (hasModifierSet(type.flags, ts.TypeFlags.Any)) {
            return "any";
        }
        else if (hasModifierSet(type.flags, ts.TypeFlags.String)) {
            return "string";
        }
        else if (hasModifierSet(type.flags, ts.TypeFlags.Number)) {
            return "number";
        }
        else if (hasModifierSet(type.flags, ts.TypeFlags.Boolean)) {
            return "boolean";
        }
        else if (hasModifierSet(type.flags, ts.TypeFlags.Void)) {
            return "void";
        }
        else if (hasModifierSet(type.flags, ts.TypeFlags.Enum)) {
            return typeChecker.getFullyQualifiedName(type.symbol);
        }
        else if (hasModifierSet(type.flags, ts.TypeFlags.TypeParameter)) {
            return typeChecker.getFullyQualifiedName(type.symbol);
        }
        else if (hasModifierSet(type.flags, ts.TypeFlags.Class)) {
            return typeChecker.getFullyQualifiedName(type.symbol);
        }
        else if (hasModifierSet(type.flags, ts.TypeFlags.Interface)) {
            return typeChecker.getFullyQualifiedName(type.symbol);
        }
        else if (hasModifierSet(type.flags, ts.TypeFlags.Reference)) {
            var typeRef = type;
            if (typeRef.typeArguments) {
                var args = typeRef.typeArguments.map(function (t) { return getTypeFromType(t); });
                return getTypeFromType(typeRef.target) + "<" + args.join(', ') + ">";
            }
            return getTypeFromType(typeRef.target);
        }
        else if (hasModifierSet(type.flags, ts.TypeFlags.Union)) {
            var union = type;
            var memebers = union.types.map(function (t) { return getTypeFromType(t); });
            return memebers.join(" | ");
        }
        else if (hasModifierSet(type.flags, ts.TypeFlags.Anonymous)) {
            return "anonymous";
        }
        else {
            return "unknown";
        }
    }
    function getTypeFromNode(node) {
        var type = typeChecker.getTypeAtLocation(node);
        return getTypeFromType(type);
    }
    return module;
}
exports.collectInformation = collectInformation;
