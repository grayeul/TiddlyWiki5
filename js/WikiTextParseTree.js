/*\
title: js/WikiTextParseTree.js

A container for the parse tree generated by parsing wikitext

\*/
(function(){

/*jslint node: true */
"use strict";

var WikiTextRenderer = require("./WikiTextRenderer.js").WikiTextRenderer,
	ArgParser = require("./ArgParser.js").ArgParser,
	utils = require("./Utils.js");

// Intialise the parse tree object
var WikiTextParseTree = function(tree,dependencies,store) {
	this.tree = tree;
	this.dependencies = dependencies; // An array of tiddler names, or null if this tiddler depends on too many to track
	this.store = store;
};

// Compile the parse tree into a JavaScript function that returns the required
// representation of the tree
WikiTextParseTree.prototype.compile = function(type,treenode) {
	/*jslint evil: true */
	treenode = treenode || this.tree;
	var renderer = new WikiTextRenderer(),
		renderStep = {},
		renderStepIndex = renderer.addRenderStep(renderStep),
		output = [];
	if(type === "text/html") {
		this.compileSubTreeHtml(output,renderer,treenode);
	} else if(type === "text/plain") {
		this.compileSubTreePlain(output,renderer,treenode);
	} else {
		return null;
	}
	// Create the parse tree for the rendering step function definition
	var parseTree = this.store.jsParser.createTree(
		[
			{
				type: "Function",
				name: null,
				params: ["tiddler","renderer","store","utils"], // These are the parameters passed to the tiddler function; must match the invocation in WikiStore.renderTiddler()
				elements: [
					{
					type: "ReturnStatement",
					value: {
						type: "FunctionCall",
						name: {
							type: "PropertyAccess",
							base: {
								type: "ArrayLiteral",
								elements: output
							},
							name: "join"
						},
						"arguments": [ {
							type: "StringLiteral",
							value: ""
							}
						]
						}
					}
				]
			}
		]);
	renderStep.step = renderStepIndex;
	renderStep.dependencies = [];
	renderStep.handler = eval(parseTree.render());
	return renderer;
};

var pushString = function(output,s) {
	var last = output[output.length-1];
	if(output.length > 0 && last.type === "StringLiterals") {
		last.value.push(s);
	} else if (output.length > 0 && last.type === "StringLiteral") {
		last.type = "StringLiterals";
		last.value = [last.value,s];
	} else {
		output.push({type: "StringLiteral", value: s});
	}
};

WikiTextParseTree.prototype.compileMacroCall = function(output,renderer,type,node) {
	/*jslint evil: true */
	var name = node.name,
		params = node.params,
		macro = this.store.macros[name],
		p,
		n,
		renderStep = {},
		renderStepIndex = renderer.addRenderStep(renderStep);
	// Check for errors
	if(!macro) {
		pushString(output,"{{** Unknown macro '" + name + "' **}}");
		return;
	}
	if(macro.types.indexOf(type) === -1) {
		pushString(output,"{{**  Macro '" + name + "' cannot render to MIME type '" + type + "'**}}");
		return;
	}
	// Compose the macro call as a render function
	var macroCall = {
		type: "Function",
		name: null,
		params: ["tiddler","renderer","store","utils"], // These are the parameters passed to the tiddler function; must match the invocation in WikiStore.renderTiddler()
		elements: [ {
			type: "ReturnStatement",
			value: {
				type: "FunctionCall",
				name: {
					base: {
						base: {
							base: {
								name: "store", 
								type: "Variable"}, 
							name: "macros", 
							type: "PropertyAccess"}, 
						name: {
							type: "StringLiteral", 
							value: name}, 
						type: "PropertyAccess"}, 
					name: "handler", 
					type: "PropertyAccess"},
				"arguments": [ {
					type: "StringLiteral", 
					value: type
				},{
					type: "Variable",
					name: "tiddler"
				},{
					type: "Variable",
					name: "store"
				},{
					type: "ObjectLiteral",
					properties: []	
				}]
			}}]
	};
	// Slot the parameters into the macro call
	for(p in params) {
		if(params[p].type === "string") {
			n = {type: "StringLiteral", value: params[p].value};
		} else {
			n = this.store.jsParser.parse(params[p].value).tree.elements[0];
		}
		macroCall.elements[0].value["arguments"][3].properties.push({
			type: "PropertyAssignment",
			name: p,
			value: n
		});
	}
	// Compile any child nodes
	if(node.children) {
		var subOutput = [];
		this.compileSubTreeHtml(subOutput,renderer,node.children);
		macroCall.elements[0].value["arguments"].push({
			type: "FunctionCall",
			name: {
				type: "PropertyAccess",
				base: {
					type: "ArrayLiteral",
					elements: subOutput
				},
				name: "join"
			},
			"arguments": [ {
				type: "StringLiteral",
				value: ""
			}]
		});
	}
	renderStep.step = renderStepIndex;
	renderStep.dependencies = node.dependencies;
	renderStep.handler = eval(this.store.jsParser.createTree(macroCall).render());
	var wrapperTag = macro.wrapperTag || "div";
	if(type === "text/html") {
		pushString(output,"<" + wrapperTag +
			" data-tw-macro='" + name + "' data-tw-render-step='" + renderStepIndex + "' data-tw-render-tiddler='");
		output.push({type: "PropertyAccess", name: "title", base: {type: "Variable", name: "tiddler"}});
		pushString(output,"'>");
	}
	output.push({
		type: "FunctionCall",
		name: {
			base: {
				name: "renderer", 
				type: "Variable"}, 
			name: "render", 
			type: "PropertyAccess"},
		"arguments": [ {
			type: "Variable",
			name: "tiddler"
		},{
			type: "Variable",
			name: "store"
		},{
			type: "NumericLiteral",
			value: renderStepIndex	
		}]
	});
	if(type === "text/html") {
		pushString(output,"</" + wrapperTag + ">");
	}
};

WikiTextParseTree.prototype.compileElementHtml = function(output,renderer,element,options) {
	options = options || {};
	pushString(output,utils.stitchElement(element.type,element.attributes,{
		selfClosing: options.selfClosing
	}));
	if(!options.selfClosing) {
		if(element.children) {
			this.compileSubTreeHtml(output,renderer,element.children);
		}
		pushString(output,"</" + element.type + ">");
	}
};

WikiTextParseTree.prototype.compileSubTreeHtml = function(output,renderer,tree) {
	for(var t=0; t<tree.length; t++) {
		switch(tree[t].type) {
			case "text":
				pushString(output,utils.htmlEncode(tree[t].value));
				break;
			case "entity":
				pushString(output,tree[t].value);
				break;
			case "br":
			case "img":
				this.compileElementHtml(output,renderer,tree[t],{selfClosing: true}); // Self closing elements
				break;
			case "macro":
				this.compileMacroCall(output,renderer,"text/html",tree[t]);
				break;
			default:
				this.compileElementHtml(output,renderer,tree[t]);
				break;
		}
	}
};

WikiTextParseTree.prototype.compileElementPlain = function(output,renderer,element,options) {
	options = options || {};
	if(!options.selfClosing) {
		if(element.children) {
			this.compileSubTreePlain(output,renderer,element.children);
		}
	}
};

WikiTextParseTree.prototype.compileSubTreePlain = function(output,renderer,tree) {
	for(var t=0; t<tree.length; t++) {
		switch(tree[t].type) {
			case "text":
				pushString(output,tree[t].value);
				break;
			case "entity":
				var c = utils.entityDecode(tree[t].value);
				if(c) {
					pushString(output,c);
				} else {
					pushString(output,tree[t].value);
				}
				break;
			case "br":
			case "img":
				this.compileElementPlain(output,renderer,tree[t],{selfClosing: true}); // Self closing elements
				break;
			case "macro":
				this.compileMacroCall(output,renderer,"text/plain",tree[t]);
				break;
			default:
				this.compileElementPlain(output,renderer,tree[t]);
				break;
		}
	}
};

// Render the parse tree to a debugging string of the specified MIME type
WikiTextParseTree.prototype.toString = function(type) {
	var output = [],
		htmlNodes = "a br hr table tr td th h1 h2 h3 h4 h5 h6 ul ol li dl dd dt blockquote pre img strong em u sup sub strike code span div".split(" "),
		customTemplates = [
			function(output,type,node) { // Text nodes
				if(node.type === "text") {
					output.push(utils.stitchElement("div",null,
						{classNames: ["treeNode","splitLabel"]}));
					output.push(utils.stitchElement("span",{"data-tw-treenode-type": "text"},{
						content: node.type,
						classNames: ["splitLabelLeft"]
					}));
					output.push(utils.stitchElement("span",null,{
						content: utils.htmlEncode(node.value).replace(/\n/g,"<br>"),
						classNames: ["splitLabelRight"]
					}));
					output.push("</div>");
					return true;
				}
				return false;
			},
			function(output,type,node) { // Macro nodes
				if(node.type === "macro") {
					output.push(utils.stitchElement("span",
						{"data-tw-treenode-type": "macro"},{
							content: utils.htmlEncode(node.name),
							classNames: ["treeNode","label"]
					}));
					for(var f in node.params) {
						output.push(utils.stitchElement("span",null,{
							classNames: ["splitLabel"]
						}));
						output.push(utils.stitchElement("span",{"data-tw-treenode-type": "param"},{
							content: utils.htmlEncode(f),
							classNames: ["splitLabelLeft"]
						}));
						var v = node.params[f].value;
						if(node.params[f].type === "string") {
							v = '"' + utils.stringify(v) + '"';
						} else if(node.params[f].type === "eval") {
							v = "{{" + v + "}}";
						}
						output.push(utils.stitchElement("span",null,{
							content: utils.htmlEncode(v),
							classNames: ["splitLabelRight"]
						}));
						output.push("</span>");
					}
					output.push(utils.stitchElement("span",null,
						{classNames: ["treeNode","splitLabel"]}));
					output.push(utils.stitchElement("span",{"data-tw-treenode-type": "renderStepDependencies"},{
						content: "dependencies",
						classNames: ["splitLabelLeft"]
					}));
					output.push(utils.stitchElement("span",null,{
						content: utils.htmlEncode(node.dependencies === null ? "*" : node.dependencies.join(", ")),
						classNames: ["splitLabelRight"]
					}));
					output.push("</span>");
					if(node.children) {
						utils.renderObject(output,type,node.children,customTemplates);
					}
					output.push("</span>");
					return true;
				}
				return false;
			},
			function(output,type,node) { // HTML nodes
				if(htmlNodes.indexOf(node.type) !== -1) {
					output.push(utils.stitchElement("span",
						{"data-tw-treenode-type": "html"},{
						content: node.type,
						classNames: ["treeNode","label"]
					}));
					for(var f in node.attributes) {
						output.push(utils.string("span",null,{
							classNames: ["treeNode"]
						}));
						var v = node.attributes[f];
						output.push(utils.stitchElement("span",null,{
							content: utils.htmlEncode(f),
							classNames: (typeof v === "object") ? ["label"] : ["splitLabel","splitLabelLeft"]
						}));
						if(typeof v === "string") {
							v = '"' + utils.stringify(v) + '"';
						} else if(v instanceof Array) {
							v = v.join("; ");
						}
						if(typeof v === "object") {
							utils.renderObject(output,type,v);
						} else {
							output.push(utils.stitchElement("span",null,{
								content: utils.htmlEncode(v),
								classNames: ["splitLabelRight"]
							}));
						}
					}
					if(node.children) {
						utils.renderObject(output,type,node.children,customTemplates);
					}
					return true;
				} else {
					return false;
				}
			}
		];
	utils.renderObject(output,type,this.tree,customTemplates);
	return output.join("");
};

exports.WikiTextParseTree = WikiTextParseTree;

})();
