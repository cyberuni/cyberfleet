#!/usr/bin/env node
import fs, { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { EventEmitter } from "node:events";
import childProcess, { execFileSync } from "node:child_process";
import path, { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import process$1 from "node:process";
import { stripVTControlCharacters } from "node:util";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
//#region ../../node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/error.js
/**
* CommanderError class
*/
var CommanderError = class extends Error {
	/**
	* Constructs the CommanderError class
	* @param {number} exitCode suggested exit code which could be used with process.exit
	* @param {string} code an id string representing the error
	* @param {string} message human-readable description of the error
	*/
	constructor(exitCode, code, message) {
		super(message);
		Error.captureStackTrace(this, this.constructor);
		this.name = this.constructor.name;
		this.code = code;
		this.exitCode = exitCode;
		this.nestedError = void 0;
	}
};
/**
* InvalidArgumentError class
*/
var InvalidArgumentError = class extends CommanderError {
	/**
	* Constructs the InvalidArgumentError class
	* @param {string} [message] explanation of why argument is invalid
	*/
	constructor(message) {
		super(1, "commander.invalidArgument", message);
		Error.captureStackTrace(this, this.constructor);
		this.name = this.constructor.name;
	}
};
//#endregion
//#region ../../node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/argument.js
var Argument = class {
	/**
	* Initialize a new command argument with the given name and description.
	* The default is that the argument is required, and you can explicitly
	* indicate this with <> around the name. Put [] around the name for an optional argument.
	*
	* @param {string} name
	* @param {string} [description]
	*/
	constructor(name, description) {
		this.description = description || "";
		this.variadic = false;
		this.parseArg = void 0;
		this.defaultValue = void 0;
		this.defaultValueDescription = void 0;
		this.argChoices = void 0;
		switch (name[0]) {
			case "<":
				this.required = true;
				this._name = name.slice(1, -1);
				break;
			case "[":
				this.required = false;
				this._name = name.slice(1, -1);
				break;
			default:
				this.required = true;
				this._name = name;
		}
		if (this._name.endsWith("...")) {
			this.variadic = true;
			this._name = this._name.slice(0, -3);
		}
	}
	/**
	* Return argument name.
	*
	* @return {string}
	*/
	name() {
		return this._name;
	}
	/**
	* @package
	*/
	_collectValue(value, previous) {
		if (previous === this.defaultValue || !Array.isArray(previous)) return [value];
		previous.push(value);
		return previous;
	}
	/**
	* Set the default value, and optionally supply the description to be displayed in the help.
	*
	* @param {*} value
	* @param {string} [description]
	* @return {Argument}
	*/
	default(value, description) {
		this.defaultValue = value;
		this.defaultValueDescription = description;
		return this;
	}
	/**
	* Set the custom handler for processing CLI command arguments into argument values.
	*
	* @param {Function} [fn]
	* @return {Argument}
	*/
	argParser(fn) {
		this.parseArg = fn;
		return this;
	}
	/**
	* Only allow argument value to be one of choices.
	*
	* @param {string[]} values
	* @return {Argument}
	*/
	choices(values) {
		this.argChoices = values.slice();
		this.parseArg = (arg, previous) => {
			if (!this.argChoices.includes(arg)) throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
			if (this.variadic) return this._collectValue(arg, previous);
			return arg;
		};
		return this;
	}
	/**
	* Make argument required.
	*
	* @returns {Argument}
	*/
	argRequired() {
		this.required = true;
		return this;
	}
	/**
	* Make argument optional.
	*
	* @returns {Argument}
	*/
	argOptional() {
		this.required = false;
		return this;
	}
};
/**
* Takes an argument and returns its human readable equivalent for help usage.
*
* @param {Argument} arg
* @return {string}
* @private
*/
function humanReadableArgName(arg) {
	const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
	return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
}
//#endregion
//#region ../../node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/help.js
/**
* TypeScript import types for JSDoc, used by Visual Studio Code IntelliSense and `npm run typescript-checkJS`
* https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#import-types
* @typedef { import("./argument.js").Argument } Argument
* @typedef { import("./command.js").Command } Command
* @typedef { import("./option.js").Option } Option
*/
var Help = class {
	constructor() {
		this.helpWidth = void 0;
		this.minWidthToWrap = 40;
		this.sortSubcommands = false;
		this.sortOptions = false;
		this.showGlobalOptions = false;
	}
	/**
	* prepareContext is called by Commander after applying overrides from `Command.configureHelp()`
	* and just before calling `formatHelp()`.
	*
	* Commander just uses the helpWidth and the rest is provided for optional use by more complex subclasses.
	*
	* @param {{ error?: boolean, helpWidth?: number, outputHasColors?: boolean }} contextOptions
	*/
	prepareContext(contextOptions) {
		this.helpWidth = this.helpWidth ?? contextOptions.helpWidth ?? 80;
	}
	/**
	* Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
	*
	* @param {Command} cmd
	* @returns {Command[]}
	*/
	visibleCommands(cmd) {
		const visibleCommands = cmd.commands.filter((cmd) => !cmd._hidden);
		const helpCommand = cmd._getHelpCommand();
		if (helpCommand && !helpCommand._hidden) visibleCommands.push(helpCommand);
		if (this.sortSubcommands) visibleCommands.sort((a, b) => {
			return a.name().localeCompare(b.name());
		});
		return visibleCommands;
	}
	/**
	* Compare options for sort.
	*
	* @param {Option} a
	* @param {Option} b
	* @returns {number}
	*/
	compareOptions(a, b) {
		const getSortKey = (option) => {
			return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
		};
		return getSortKey(a).localeCompare(getSortKey(b));
	}
	/**
	* Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
	*
	* @param {Command} cmd
	* @returns {Option[]}
	*/
	visibleOptions(cmd) {
		const visibleOptions = cmd.options.filter((option) => !option.hidden);
		const helpOption = cmd._getHelpOption();
		if (helpOption && !helpOption.hidden) {
			const removeShort = helpOption.short && cmd._findOption(helpOption.short);
			const removeLong = helpOption.long && cmd._findOption(helpOption.long);
			if (!removeShort && !removeLong) visibleOptions.push(helpOption);
			else if (helpOption.long && !removeLong) visibleOptions.push(cmd.createOption(helpOption.long, helpOption.description));
			else if (helpOption.short && !removeShort) visibleOptions.push(cmd.createOption(helpOption.short, helpOption.description));
		}
		if (this.sortOptions) visibleOptions.sort(this.compareOptions);
		return visibleOptions;
	}
	/**
	* Get an array of the visible global options. (Not including help.)
	*
	* @param {Command} cmd
	* @returns {Option[]}
	*/
	visibleGlobalOptions(cmd) {
		if (!this.showGlobalOptions) return [];
		const globalOptions = [];
		for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
			const visibleOptions = ancestorCmd.options.filter((option) => !option.hidden);
			globalOptions.push(...visibleOptions);
		}
		if (this.sortOptions) globalOptions.sort(this.compareOptions);
		return globalOptions;
	}
	/**
	* Get an array of the arguments if any have a description.
	*
	* @param {Command} cmd
	* @returns {Argument[]}
	*/
	visibleArguments(cmd) {
		if (cmd._argsDescription) cmd.registeredArguments.forEach((argument) => {
			argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
		});
		if (cmd.registeredArguments.find((argument) => argument.description)) return cmd.registeredArguments;
		return [];
	}
	/**
	* Get the command term to show in the list of subcommands.
	*
	* @param {Command} cmd
	* @returns {string}
	*/
	subcommandTerm(cmd) {
		const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
		return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + (args ? " " + args : "");
	}
	/**
	* Get the option term to show in the list of options.
	*
	* @param {Option} option
	* @returns {string}
	*/
	optionTerm(option) {
		return option.flags;
	}
	/**
	* Get the argument term to show in the list of arguments.
	*
	* @param {Argument} argument
	* @returns {string}
	*/
	argumentTerm(argument) {
		return argument.name();
	}
	/**
	* Get the longest command term length.
	*
	* @param {Command} cmd
	* @param {Help} helper
	* @returns {number}
	*/
	longestSubcommandTermLength(cmd, helper) {
		return helper.visibleCommands(cmd).reduce((max, command) => {
			return Math.max(max, this.displayWidth(helper.styleSubcommandTerm(helper.subcommandTerm(command))));
		}, 0);
	}
	/**
	* Get the longest option term length.
	*
	* @param {Command} cmd
	* @param {Help} helper
	* @returns {number}
	*/
	longestOptionTermLength(cmd, helper) {
		return helper.visibleOptions(cmd).reduce((max, option) => {
			return Math.max(max, this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option))));
		}, 0);
	}
	/**
	* Get the longest global option term length.
	*
	* @param {Command} cmd
	* @param {Help} helper
	* @returns {number}
	*/
	longestGlobalOptionTermLength(cmd, helper) {
		return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
			return Math.max(max, this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option))));
		}, 0);
	}
	/**
	* Get the longest argument term length.
	*
	* @param {Command} cmd
	* @param {Help} helper
	* @returns {number}
	*/
	longestArgumentTermLength(cmd, helper) {
		return helper.visibleArguments(cmd).reduce((max, argument) => {
			return Math.max(max, this.displayWidth(helper.styleArgumentTerm(helper.argumentTerm(argument))));
		}, 0);
	}
	/**
	* Get the command usage to be displayed at the top of the built-in help.
	*
	* @param {Command} cmd
	* @returns {string}
	*/
	commandUsage(cmd) {
		let cmdName = cmd._name;
		if (cmd._aliases[0]) cmdName = cmdName + "|" + cmd._aliases[0];
		let ancestorCmdNames = "";
		for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
		return ancestorCmdNames + cmdName + " " + cmd.usage();
	}
	/**
	* Get the description for the command.
	*
	* @param {Command} cmd
	* @returns {string}
	*/
	commandDescription(cmd) {
		return cmd.description();
	}
	/**
	* Get the subcommand summary to show in the list of subcommands.
	* (Fallback to description for backwards compatibility.)
	*
	* @param {Command} cmd
	* @returns {string}
	*/
	subcommandDescription(cmd) {
		return cmd.summary() || cmd.description();
	}
	/**
	* Get the option description to show in the list of options.
	*
	* @param {Option} option
	* @return {string}
	*/
	optionDescription(option) {
		const extraInfo = [];
		if (option.argChoices) extraInfo.push(`choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
		if (option.defaultValue !== void 0) {
			if (option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean") extraInfo.push(`default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`);
		}
		if (option.presetArg !== void 0 && option.optional) extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
		if (option.envVar !== void 0) extraInfo.push(`env: ${option.envVar}`);
		if (extraInfo.length > 0) {
			const extraDescription = `(${extraInfo.join(", ")})`;
			if (option.description) return `${option.description} ${extraDescription}`;
			return extraDescription;
		}
		return option.description;
	}
	/**
	* Get the argument description to show in the list of arguments.
	*
	* @param {Argument} argument
	* @return {string}
	*/
	argumentDescription(argument) {
		const extraInfo = [];
		if (argument.argChoices) extraInfo.push(`choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
		if (argument.defaultValue !== void 0) extraInfo.push(`default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`);
		if (extraInfo.length > 0) {
			const extraDescription = `(${extraInfo.join(", ")})`;
			if (argument.description) return `${argument.description} ${extraDescription}`;
			return extraDescription;
		}
		return argument.description;
	}
	/**
	* Format a list of items, given a heading and an array of formatted items.
	*
	* @param {string} heading
	* @param {string[]} items
	* @param {Help} helper
	* @returns string[]
	*/
	formatItemList(heading, items, helper) {
		if (items.length === 0) return [];
		return [
			helper.styleTitle(heading),
			...items,
			""
		];
	}
	/**
	* Group items by their help group heading.
	*
	* @param {Command[] | Option[]} unsortedItems
	* @param {Command[] | Option[]} visibleItems
	* @param {Function} getGroup
	* @returns {Map<string, Command[] | Option[]>}
	*/
	groupItems(unsortedItems, visibleItems, getGroup) {
		const result = /* @__PURE__ */ new Map();
		unsortedItems.forEach((item) => {
			const group = getGroup(item);
			if (!result.has(group)) result.set(group, []);
		});
		visibleItems.forEach((item) => {
			const group = getGroup(item);
			if (!result.has(group)) result.set(group, []);
			result.get(group).push(item);
		});
		return result;
	}
	/**
	* Generate the built-in help text.
	*
	* @param {Command} cmd
	* @param {Help} helper
	* @returns {string}
	*/
	formatHelp(cmd, helper) {
		const termWidth = helper.padWidth(cmd, helper);
		const helpWidth = helper.helpWidth ?? 80;
		function callFormatItem(term, description) {
			return helper.formatItem(term, termWidth, description, helper);
		}
		let output = [`${helper.styleTitle("Usage:")} ${helper.styleUsage(helper.commandUsage(cmd))}`, ""];
		const commandDescription = helper.commandDescription(cmd);
		if (commandDescription.length > 0) output = output.concat([helper.boxWrap(helper.styleCommandDescription(commandDescription), helpWidth), ""]);
		const argumentList = helper.visibleArguments(cmd).map((argument) => {
			return callFormatItem(helper.styleArgumentTerm(helper.argumentTerm(argument)), helper.styleArgumentDescription(helper.argumentDescription(argument)));
		});
		output = output.concat(this.formatItemList("Arguments:", argumentList, helper));
		this.groupItems(cmd.options, helper.visibleOptions(cmd), (option) => option.helpGroupHeading ?? "Options:").forEach((options, group) => {
			const optionList = options.map((option) => {
				return callFormatItem(helper.styleOptionTerm(helper.optionTerm(option)), helper.styleOptionDescription(helper.optionDescription(option)));
			});
			output = output.concat(this.formatItemList(group, optionList, helper));
		});
		if (helper.showGlobalOptions) {
			const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
				return callFormatItem(helper.styleOptionTerm(helper.optionTerm(option)), helper.styleOptionDescription(helper.optionDescription(option)));
			});
			output = output.concat(this.formatItemList("Global Options:", globalOptionList, helper));
		}
		this.groupItems(cmd.commands, helper.visibleCommands(cmd), (sub) => sub.helpGroup() || "Commands:").forEach((commands, group) => {
			const commandList = commands.map((sub) => {
				return callFormatItem(helper.styleSubcommandTerm(helper.subcommandTerm(sub)), helper.styleSubcommandDescription(helper.subcommandDescription(sub)));
			});
			output = output.concat(this.formatItemList(group, commandList, helper));
		});
		return output.join("\n");
	}
	/**
	* Return display width of string, ignoring ANSI escape sequences. Used in padding and wrapping calculations.
	*
	* @param {string} str
	* @returns {number}
	*/
	displayWidth(str) {
		return stripVTControlCharacters(str).length;
	}
	/**
	* Style the title for displaying in the help. Called with 'Usage:', 'Options:', etc.
	*
	* @param {string} str
	* @returns {string}
	*/
	styleTitle(str) {
		return str;
	}
	styleUsage(str) {
		return str.split(" ").map((word) => {
			if (word === "[options]") return this.styleOptionText(word);
			if (word === "[command]") return this.styleSubcommandText(word);
			if (word[0] === "[" || word[0] === "<") return this.styleArgumentText(word);
			return this.styleCommandText(word);
		}).join(" ");
	}
	styleCommandDescription(str) {
		return this.styleDescriptionText(str);
	}
	styleOptionDescription(str) {
		return this.styleDescriptionText(str);
	}
	styleSubcommandDescription(str) {
		return this.styleDescriptionText(str);
	}
	styleArgumentDescription(str) {
		return this.styleDescriptionText(str);
	}
	styleDescriptionText(str) {
		return str;
	}
	styleOptionTerm(str) {
		return this.styleOptionText(str);
	}
	styleSubcommandTerm(str) {
		return str.split(" ").map((word) => {
			if (word === "[options]") return this.styleOptionText(word);
			if (word[0] === "[" || word[0] === "<") return this.styleArgumentText(word);
			return this.styleSubcommandText(word);
		}).join(" ");
	}
	styleArgumentTerm(str) {
		return this.styleArgumentText(str);
	}
	styleOptionText(str) {
		return str;
	}
	styleArgumentText(str) {
		return str;
	}
	styleSubcommandText(str) {
		return str;
	}
	styleCommandText(str) {
		return str;
	}
	/**
	* Calculate the pad width from the maximum term length.
	*
	* @param {Command} cmd
	* @param {Help} helper
	* @returns {number}
	*/
	padWidth(cmd, helper) {
		return Math.max(helper.longestOptionTermLength(cmd, helper), helper.longestGlobalOptionTermLength(cmd, helper), helper.longestSubcommandTermLength(cmd, helper), helper.longestArgumentTermLength(cmd, helper));
	}
	/**
	* Detect manually wrapped and indented strings by checking for line break followed by whitespace.
	*
	* @param {string} str
	* @returns {boolean}
	*/
	preformatted(str) {
		return /\n[^\S\r\n]/.test(str);
	}
	/**
	* Format the "item", which consists of a term and description. Pad the term and wrap the description, indenting the following lines.
	*
	* So "TTT", 5, "DDD DDDD DD DDD" might be formatted for this.helpWidth=17 like so:
	*   TTT  DDD DDDD
	*        DD DDD
	*
	* @param {string} term
	* @param {number} termWidth
	* @param {string} description
	* @param {Help} helper
	* @returns {string}
	*/
	formatItem(term, termWidth, description, helper) {
		const itemIndent = 2;
		const itemIndentStr = " ".repeat(itemIndent);
		if (!description) return itemIndentStr + term;
		const paddedTerm = term.padEnd(termWidth + term.length - helper.displayWidth(term));
		const spacerWidth = 2;
		const remainingWidth = (this.helpWidth ?? 80) - termWidth - spacerWidth - itemIndent;
		let formattedDescription;
		if (remainingWidth < this.minWidthToWrap || helper.preformatted(description)) formattedDescription = description;
		else formattedDescription = helper.boxWrap(description, remainingWidth).replace(/\n/g, "\n" + " ".repeat(termWidth + spacerWidth));
		return itemIndentStr + paddedTerm + " ".repeat(spacerWidth) + formattedDescription.replace(/\n/g, `\n${itemIndentStr}`);
	}
	/**
	* Wrap a string at whitespace, preserving existing line breaks.
	* Wrapping is skipped if the width is less than `minWidthToWrap`.
	*
	* @param {string} str
	* @param {number} width
	* @returns {string}
	*/
	boxWrap(str, width) {
		if (width < this.minWidthToWrap) return str;
		const rawLines = str.split(/\r\n|\n/);
		const chunkPattern = /[\s]*[^\s]+/g;
		const wrappedLines = [];
		rawLines.forEach((line) => {
			const chunks = line.match(chunkPattern);
			if (chunks === null) {
				wrappedLines.push("");
				return;
			}
			let sumChunks = [chunks.shift()];
			let sumWidth = this.displayWidth(sumChunks[0]);
			chunks.forEach((chunk) => {
				const visibleWidth = this.displayWidth(chunk);
				if (sumWidth + visibleWidth <= width) {
					sumChunks.push(chunk);
					sumWidth += visibleWidth;
					return;
				}
				wrappedLines.push(sumChunks.join(""));
				const nextChunk = chunk.trimStart();
				sumChunks = [nextChunk];
				sumWidth = this.displayWidth(nextChunk);
			});
			wrappedLines.push(sumChunks.join(""));
		});
		return wrappedLines.join("\n");
	}
};
//#endregion
//#region ../../node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/option.js
var Option = class {
	/**
	* Initialize a new `Option` with the given `flags` and `description`.
	*
	* @param {string} flags
	* @param {string} [description]
	*/
	constructor(flags, description) {
		this.flags = flags;
		this.description = description || "";
		this.required = flags.includes("<");
		this.optional = flags.includes("[");
		this.variadic = /\w\.\.\.[>\]]$/.test(flags);
		this.mandatory = false;
		const optionFlags = splitOptionFlags(flags);
		this.short = optionFlags.shortFlag;
		this.long = optionFlags.longFlag;
		this.negate = false;
		if (this.long) this.negate = this.long.startsWith("--no-");
		this.defaultValue = void 0;
		this.defaultValueDescription = void 0;
		this.presetArg = void 0;
		this.envVar = void 0;
		this.parseArg = void 0;
		this.hidden = false;
		this.argChoices = void 0;
		this.conflictsWith = [];
		this.implied = void 0;
		this.helpGroupHeading = void 0;
	}
	/**
	* Set the default value, and optionally supply the description to be displayed in the help.
	*
	* @param {*} value
	* @param {string} [description]
	* @return {Option}
	*/
	default(value, description) {
		this.defaultValue = value;
		this.defaultValueDescription = description;
		return this;
	}
	/**
	* Preset to use when option used without option-argument, especially optional but also boolean and negated.
	* The custom processing (parseArg) is called.
	*
	* @example
	* new Option('--color').default('GREYSCALE').preset('RGB');
	* new Option('--donate [amount]').preset('20').argParser(parseFloat);
	*
	* @param {*} arg
	* @return {Option}
	*/
	preset(arg) {
		this.presetArg = arg;
		return this;
	}
	/**
	* Add option name(s) that conflict with this option.
	* An error will be displayed if conflicting options are found during parsing.
	*
	* @example
	* new Option('--rgb').conflicts('cmyk');
	* new Option('--js').conflicts(['ts', 'jsx']);
	*
	* @param {(string | string[])} names
	* @return {Option}
	*/
	conflicts(names) {
		this.conflictsWith = this.conflictsWith.concat(names);
		return this;
	}
	/**
	* Specify implied option values for when this option is set and the implied options are not.
	*
	* The custom processing (parseArg) is not called on the implied values.
	*
	* @example
	* program
	*   .addOption(new Option('--log', 'write logging information to file'))
	*   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
	*
	* @param {object} impliedOptionValues
	* @return {Option}
	*/
	implies(impliedOptionValues) {
		let newImplied = impliedOptionValues;
		if (typeof impliedOptionValues === "string") newImplied = { [impliedOptionValues]: true };
		this.implied = Object.assign(this.implied || {}, newImplied);
		return this;
	}
	/**
	* Set environment variable to check for option value.
	*
	* An environment variable is only used if when processed the current option value is
	* undefined, or the source of the current value is 'default' or 'config' or 'env'.
	*
	* @param {string} name
	* @return {Option}
	*/
	env(name) {
		this.envVar = name;
		return this;
	}
	/**
	* Set the custom handler for processing CLI option arguments into option values.
	*
	* @param {Function} [fn]
	* @return {Option}
	*/
	argParser(fn) {
		this.parseArg = fn;
		return this;
	}
	/**
	* Whether the option is mandatory and must have a value after parsing.
	*
	* @param {boolean} [mandatory=true]
	* @return {Option}
	*/
	makeOptionMandatory(mandatory = true) {
		this.mandatory = !!mandatory;
		return this;
	}
	/**
	* Hide option in help.
	*
	* @param {boolean} [hide=true]
	* @return {Option}
	*/
	hideHelp(hide = true) {
		this.hidden = !!hide;
		return this;
	}
	/**
	* @package
	*/
	_collectValue(value, previous) {
		if (previous === this.defaultValue || !Array.isArray(previous)) return [value];
		previous.push(value);
		return previous;
	}
	/**
	* Only allow option value to be one of choices.
	*
	* @param {string[]} values
	* @return {Option}
	*/
	choices(values) {
		this.argChoices = values.slice();
		this.parseArg = (arg, previous) => {
			if (!this.argChoices.includes(arg)) throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
			if (this.variadic) return this._collectValue(arg, previous);
			return arg;
		};
		return this;
	}
	/**
	* Return option name.
	*
	* @return {string}
	*/
	name() {
		if (this.long) return this.long.replace(/^--/, "");
		return this.short.replace(/^-/, "");
	}
	/**
	* Return option name, in a camelcase format that can be used
	* as an object attribute key.
	*
	* @return {string}
	*/
	attributeName() {
		if (this.negate) return camelcase(this.name().replace(/^no-/, ""));
		return camelcase(this.name());
	}
	/**
	* Set the help group heading.
	*
	* @param {string} heading
	* @return {Option}
	*/
	helpGroup(heading) {
		this.helpGroupHeading = heading;
		return this;
	}
	/**
	* Check if `arg` matches the short or long flag.
	*
	* @param {string} arg
	* @return {boolean}
	* @package
	*/
	is(arg) {
		return this.short === arg || this.long === arg;
	}
	/**
	* Return whether a boolean option.
	*
	* Options are one of boolean, negated, required argument, or optional argument.
	*
	* @return {boolean}
	* @package
	*/
	isBoolean() {
		return !this.required && !this.optional && !this.negate;
	}
};
/**
* This class is to make it easier to work with dual options, without changing the existing
* implementation. We support separate dual options for separate positive and negative options,
* like `--build` and `--no-build`, which share a single option value. This works nicely for some
* use cases, but is tricky for others where we want separate behaviours despite
* the single shared option value.
*/
var DualOptions = class {
	/**
	* @param {Option[]} options
	*/
	constructor(options) {
		this.positiveOptions = /* @__PURE__ */ new Map();
		this.negativeOptions = /* @__PURE__ */ new Map();
		this.dualOptions = /* @__PURE__ */ new Set();
		options.forEach((option) => {
			if (option.negate) this.negativeOptions.set(option.attributeName(), option);
			else this.positiveOptions.set(option.attributeName(), option);
		});
		this.negativeOptions.forEach((value, key) => {
			if (this.positiveOptions.has(key)) this.dualOptions.add(key);
		});
	}
	/**
	* Did the value come from the option, and not from possible matching dual option?
	*
	* @param {*} value
	* @param {Option} option
	* @returns {boolean}
	*/
	valueFromOption(value, option) {
		const optionKey = option.attributeName();
		if (!this.dualOptions.has(optionKey)) return true;
		const preset = this.negativeOptions.get(optionKey).presetArg;
		const negativeValue = preset !== void 0 ? preset : false;
		return option.negate === (negativeValue === value);
	}
};
/**
* Convert string from kebab-case to camelCase.
*
* @param {string} str
* @return {string}
* @private
*/
function camelcase(str) {
	return str.split("-").reduce((str, word) => {
		return str + word[0].toUpperCase() + word.slice(1);
	});
}
/**
* Split the short and long flag out of something like '-m,--mixed <value>'
*
* @private
*/
function splitOptionFlags(flags) {
	let shortFlag;
	let longFlag;
	const shortFlagExp = /^-[^-]$/;
	const longFlagExp = /^--[^-]/;
	const flagParts = flags.split(/[ |,]+/).concat("guard");
	if (shortFlagExp.test(flagParts[0])) shortFlag = flagParts.shift();
	if (longFlagExp.test(flagParts[0])) longFlag = flagParts.shift();
	if (!shortFlag && shortFlagExp.test(flagParts[0])) shortFlag = flagParts.shift();
	if (!shortFlag && longFlagExp.test(flagParts[0])) {
		shortFlag = longFlag;
		longFlag = flagParts.shift();
	}
	if (flagParts[0].startsWith("-")) {
		const unsupportedFlag = flagParts[0];
		const baseError = `option creation failed due to '${unsupportedFlag}' in option flags '${flags}'`;
		if (/^-[^-][^-]/.test(unsupportedFlag)) throw new Error(`${baseError}
- a short flag is a single dash and a single character
  - either use a single dash and a single character (for a short flag)
  - or use a double dash for a long option (and can have two, like '--ws, --workspace')`);
		if (shortFlagExp.test(unsupportedFlag)) throw new Error(`${baseError}
- too many short flags`);
		if (longFlagExp.test(unsupportedFlag)) throw new Error(`${baseError}
- too many long flags`);
		throw new Error(`${baseError}
- unrecognised flag format`);
	}
	if (shortFlag === void 0 && longFlag === void 0) throw new Error(`option creation failed due to no flags found in '${flags}'.`);
	return {
		shortFlag,
		longFlag
	};
}
//#endregion
//#region ../../node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/suggestSimilar.js
const maxDistance = 3;
function editDistance(a, b) {
	if (Math.abs(a.length - b.length) > maxDistance) return Math.max(a.length, b.length);
	const d = [];
	for (let i = 0; i <= a.length; i++) d[i] = [i];
	for (let j = 0; j <= b.length; j++) d[0][j] = j;
	for (let j = 1; j <= b.length; j++) for (let i = 1; i <= a.length; i++) {
		let cost;
		if (a[i - 1] === b[j - 1]) cost = 0;
		else cost = 1;
		d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
		if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
	}
	return d[a.length][b.length];
}
/**
* Find close matches, restricted to same number of edits.
*
* @param {string} word
* @param {string[]} candidates
* @returns {string}
*/
function suggestSimilar(word, candidates) {
	if (!candidates || candidates.length === 0) return "";
	candidates = Array.from(new Set(candidates));
	const searchingOptions = word.startsWith("--");
	if (searchingOptions) {
		word = word.slice(2);
		candidates = candidates.map((candidate) => candidate.slice(2));
	}
	let similar = [];
	let bestDistance = maxDistance;
	const minSimilarity = .4;
	candidates.forEach((candidate) => {
		if (candidate.length <= 1) return;
		const distance = editDistance(word, candidate);
		const length = Math.max(word.length, candidate.length);
		if ((length - distance) / length > minSimilarity) {
			if (distance < bestDistance) {
				bestDistance = distance;
				similar = [candidate];
			} else if (distance === bestDistance) similar.push(candidate);
		}
	});
	similar.sort((a, b) => a.localeCompare(b));
	if (searchingOptions) similar = similar.map((candidate) => `--${candidate}`);
	if (similar.length > 1) return `\n(Did you mean one of ${similar.join(", ")}?)`;
	if (similar.length === 1) return `\n(Did you mean ${similar[0]}?)`;
	return "";
}
//#endregion
//#region ../../node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js
var Command = class Command extends EventEmitter {
	/**
	* Initialize a new `Command`.
	*
	* @param {string} [name]
	*/
	constructor(name) {
		super();
		/** @type {Command[]} */
		this.commands = [];
		/** @type {Option[]} */
		this.options = [];
		this.parent = null;
		this._allowUnknownOption = false;
		this._allowExcessArguments = false;
		/** @type {Argument[]} */
		this.registeredArguments = [];
		this._args = this.registeredArguments;
		/** @type {string[]} */
		this.args = [];
		this.rawArgs = [];
		this.processedArgs = [];
		this._scriptPath = null;
		this._name = name || "";
		this._optionValues = {};
		this._optionValueSources = {};
		this._storeOptionsAsProperties = false;
		this._actionHandler = null;
		this._executableHandler = false;
		this._executableFile = null;
		this._executableDir = null;
		this._defaultCommandName = null;
		this._exitCallback = null;
		this._aliases = [];
		this._combineFlagAndOptionalValue = true;
		this._description = "";
		this._summary = "";
		this._argsDescription = void 0;
		this._enablePositionalOptions = false;
		this._passThroughOptions = false;
		this._lifeCycleHooks = {};
		/** @type {(boolean | string)} */
		this._showHelpAfterError = false;
		this._showSuggestionAfterError = true;
		this._savedState = null;
		this._outputConfiguration = {
			writeOut: (str) => process$1.stdout.write(str),
			writeErr: (str) => process$1.stderr.write(str),
			outputError: (str, write) => write(str),
			getOutHelpWidth: () => process$1.stdout.isTTY ? process$1.stdout.columns : void 0,
			getErrHelpWidth: () => process$1.stderr.isTTY ? process$1.stderr.columns : void 0,
			getOutHasColors: () => useColor() ?? (process$1.stdout.isTTY && process$1.stdout.hasColors?.()),
			getErrHasColors: () => useColor() ?? (process$1.stderr.isTTY && process$1.stderr.hasColors?.()),
			stripColor: (str) => stripVTControlCharacters(str)
		};
		this._hidden = false;
		/** @type {(Option | null | undefined)} */
		this._helpOption = void 0;
		this._addImplicitHelpCommand = void 0;
		/** @type {Command} */
		this._helpCommand = void 0;
		this._helpConfiguration = {};
		/** @type {string | undefined} */
		this._helpGroupHeading = void 0;
		/** @type {string | undefined} */
		this._defaultCommandGroup = void 0;
		/** @type {string | undefined} */
		this._defaultOptionGroup = void 0;
	}
	/**
	* Copy settings that are useful to have in common across root command and subcommands.
	*
	* (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
	*
	* @param {Command} sourceCommand
	* @return {Command} `this` command for chaining
	*/
	copyInheritedSettings(sourceCommand) {
		this._outputConfiguration = sourceCommand._outputConfiguration;
		this._helpOption = sourceCommand._helpOption;
		this._helpCommand = sourceCommand._helpCommand;
		this._helpConfiguration = sourceCommand._helpConfiguration;
		this._exitCallback = sourceCommand._exitCallback;
		this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
		this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
		this._allowExcessArguments = sourceCommand._allowExcessArguments;
		this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
		this._showHelpAfterError = sourceCommand._showHelpAfterError;
		this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
		return this;
	}
	/**
	* @returns {Command[]}
	* @private
	*/
	_getCommandAndAncestors() {
		const result = [];
		for (let command = this; command; command = command.parent) result.push(command);
		return result;
	}
	/**
	* Define a command.
	*
	* There are two styles of command: pay attention to where to put the description.
	*
	* @example
	* // Command implemented using action handler (description is supplied separately to `.command`)
	* program
	*   .command('clone <source> [destination]')
	*   .description('clone a repository into a newly created directory')
	*   .action((source, destination) => {
	*     console.log('clone command called');
	*   });
	*
	* // Command implemented using separate executable file (description is second parameter to `.command`)
	* program
	*   .command('start <service>', 'start named service')
	*   .command('stop [service]', 'stop named service, or all if no name supplied');
	*
	* @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
	* @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
	* @param {object} [execOpts] - configuration options (for executable)
	* @return {Command} returns new command for action handler, or `this` for executable command
	*/
	command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
		let desc = actionOptsOrExecDesc;
		let opts = execOpts;
		if (typeof desc === "object" && desc !== null) {
			opts = desc;
			desc = null;
		}
		opts = opts || {};
		const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
		const cmd = this.createCommand(name);
		if (desc) {
			cmd.description(desc);
			cmd._executableHandler = true;
		}
		if (opts.isDefault) this._defaultCommandName = cmd._name;
		cmd._hidden = !!(opts.noHelp || opts.hidden);
		cmd._executableFile = opts.executableFile || null;
		if (args) cmd.arguments(args);
		this._registerCommand(cmd);
		cmd.parent = this;
		cmd.copyInheritedSettings(this);
		if (desc) return this;
		return cmd;
	}
	/**
	* Factory routine to create a new unattached command.
	*
	* See .command() for creating an attached subcommand, which uses this routine to
	* create the command. You can override createCommand to customise subcommands.
	*
	* @param {string} [name]
	* @return {Command} new command
	*/
	createCommand(name) {
		return new Command(name);
	}
	/**
	* You can customise the help with a subclass of Help by overriding createHelp,
	* or by overriding Help properties using configureHelp().
	*
	* @return {Help}
	*/
	createHelp() {
		return Object.assign(new Help(), this.configureHelp());
	}
	/**
	* You can customise the help by overriding Help properties using configureHelp(),
	* or with a subclass of Help by overriding createHelp().
	*
	* @param {object} [configuration] - configuration options
	* @return {(Command | object)} `this` command for chaining, or stored configuration
	*/
	configureHelp(configuration) {
		if (configuration === void 0) return this._helpConfiguration;
		this._helpConfiguration = configuration;
		return this;
	}
	/**
	* The default output goes to stdout and stderr. You can customise this for special
	* applications. You can also customise the display of errors by overriding outputError.
	*
	* The configuration properties are all functions:
	*
	*     // change how output being written, defaults to stdout and stderr
	*     writeOut(str)
	*     writeErr(str)
	*     // change how output being written for errors, defaults to writeErr
	*     outputError(str, write) // used for displaying errors and not used for displaying help
	*     // specify width for wrapping help
	*     getOutHelpWidth()
	*     getErrHelpWidth()
	*     // color support, currently only used with Help
	*     getOutHasColors()
	*     getErrHasColors()
	*     stripColor() // used to remove ANSI escape codes if output does not have colors
	*
	* @param {object} [configuration] - configuration options
	* @return {(Command | object)} `this` command for chaining, or stored configuration
	*/
	configureOutput(configuration) {
		if (configuration === void 0) return this._outputConfiguration;
		this._outputConfiguration = {
			...this._outputConfiguration,
			...configuration
		};
		return this;
	}
	/**
	* Display the help or a custom message after an error occurs.
	*
	* @param {(boolean|string)} [displayHelp]
	* @return {Command} `this` command for chaining
	*/
	showHelpAfterError(displayHelp = true) {
		if (typeof displayHelp !== "string") displayHelp = !!displayHelp;
		this._showHelpAfterError = displayHelp;
		return this;
	}
	/**
	* Display suggestion of similar commands for unknown commands, or options for unknown options.
	*
	* @param {boolean} [displaySuggestion]
	* @return {Command} `this` command for chaining
	*/
	showSuggestionAfterError(displaySuggestion = true) {
		this._showSuggestionAfterError = !!displaySuggestion;
		return this;
	}
	/**
	* Add a prepared subcommand.
	*
	* See .command() for creating an attached subcommand which inherits settings from its parent.
	*
	* @param {Command} cmd - new subcommand
	* @param {object} [opts] - configuration options
	* @return {Command} `this` command for chaining
	*/
	addCommand(cmd, opts) {
		if (!cmd._name) throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
		opts = opts || {};
		if (opts.isDefault) this._defaultCommandName = cmd._name;
		if (opts.noHelp || opts.hidden) cmd._hidden = true;
		this._registerCommand(cmd);
		cmd.parent = this;
		cmd._checkForBrokenPassThrough();
		return this;
	}
	/**
	* Factory routine to create a new unattached argument.
	*
	* See .argument() for creating an attached argument, which uses this routine to
	* create the argument. You can override createArgument to return a custom argument.
	*
	* @param {string} name
	* @param {string} [description]
	* @return {Argument} new argument
	*/
	createArgument(name, description) {
		return new Argument(name, description);
	}
	/**
	* Define argument syntax for command.
	*
	* The default is that the argument is required, and you can explicitly
	* indicate this with <> around the name. Put [] around the name for an optional argument.
	*
	* @example
	* program.argument('<input-file>');
	* program.argument('[output-file]');
	*
	* @param {string} name
	* @param {string} [description]
	* @param {(Function|*)} [parseArg] - custom argument processing function or default value
	* @param {*} [defaultValue]
	* @return {Command} `this` command for chaining
	*/
	argument(name, description, parseArg, defaultValue) {
		const argument = this.createArgument(name, description);
		if (typeof parseArg === "function") argument.default(defaultValue).argParser(parseArg);
		else argument.default(parseArg);
		this.addArgument(argument);
		return this;
	}
	/**
	* Define argument syntax for command, adding multiple at once (without descriptions).
	*
	* See also .argument().
	*
	* @example
	* program.arguments('<cmd> [env]');
	*
	* @param {string} names
	* @return {Command} `this` command for chaining
	*/
	arguments(names) {
		names.trim().split(/ +/).forEach((detail) => {
			this.argument(detail);
		});
		return this;
	}
	/**
	* Define argument syntax for command, adding a prepared argument.
	*
	* @param {Argument} argument
	* @return {Command} `this` command for chaining
	*/
	addArgument(argument) {
		const previousArgument = this.registeredArguments.slice(-1)[0];
		if (previousArgument?.variadic) throw new Error(`only the last argument can be variadic '${previousArgument.name()}'`);
		if (argument.required && argument.defaultValue !== void 0 && argument.parseArg === void 0) throw new Error(`a default value for a required argument is never used: '${argument.name()}'`);
		this.registeredArguments.push(argument);
		return this;
	}
	/**
	* Customise or override default help command. By default a help command is automatically added if your command has subcommands.
	*
	* @example
	*    program.helpCommand('help [cmd]');
	*    program.helpCommand('help [cmd]', 'show help');
	*    program.helpCommand(false); // suppress default help command
	*    program.helpCommand(true); // add help command even if no subcommands
	*
	* @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
	* @param {string} [description] - custom description
	* @return {Command} `this` command for chaining
	*/
	helpCommand(enableOrNameAndArgs, description) {
		if (typeof enableOrNameAndArgs === "boolean") {
			this._addImplicitHelpCommand = enableOrNameAndArgs;
			if (enableOrNameAndArgs && this._defaultCommandGroup) this._initCommandGroup(this._getHelpCommand());
			return this;
		}
		const [, helpName, helpArgs] = (enableOrNameAndArgs ?? "help [command]").match(/([^ ]+) *(.*)/);
		const helpDescription = description ?? "display help for command";
		const helpCommand = this.createCommand(helpName);
		helpCommand.helpOption(false);
		if (helpArgs) helpCommand.arguments(helpArgs);
		if (helpDescription) helpCommand.description(helpDescription);
		this._addImplicitHelpCommand = true;
		this._helpCommand = helpCommand;
		if (enableOrNameAndArgs || description) this._initCommandGroup(helpCommand);
		return this;
	}
	/**
	* Add prepared custom help command.
	*
	* @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
	* @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
	* @return {Command} `this` command for chaining
	*/
	addHelpCommand(helpCommand, deprecatedDescription) {
		if (typeof helpCommand !== "object") {
			this.helpCommand(helpCommand, deprecatedDescription);
			return this;
		}
		this._addImplicitHelpCommand = true;
		this._helpCommand = helpCommand;
		this._initCommandGroup(helpCommand);
		return this;
	}
	/**
	* Lazy create help command.
	*
	* @return {(Command|null)}
	* @package
	*/
	_getHelpCommand() {
		if (this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"))) {
			if (this._helpCommand === void 0) this.helpCommand(void 0, void 0);
			return this._helpCommand;
		}
		return null;
	}
	/**
	* Add hook for life cycle event.
	*
	* @param {string} event
	* @param {Function} listener
	* @return {Command} `this` command for chaining
	*/
	hook(event, listener) {
		const allowedValues = [
			"preSubcommand",
			"preAction",
			"postAction"
		];
		if (!allowedValues.includes(event)) throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
		if (this._lifeCycleHooks[event]) this._lifeCycleHooks[event].push(listener);
		else this._lifeCycleHooks[event] = [listener];
		return this;
	}
	/**
	* Register callback to use as replacement for calling process.exit.
	*
	* @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
	* @return {Command} `this` command for chaining
	*/
	exitOverride(fn) {
		if (fn) this._exitCallback = fn;
		else this._exitCallback = (err) => {
			if (err.code !== "commander.executeSubCommandAsync") throw err;
		};
		return this;
	}
	/**
	* Call process.exit, and _exitCallback if defined.
	*
	* @param {number} exitCode exit code for using with process.exit
	* @param {string} code an id string representing the error
	* @param {string} message human-readable description of the error
	* @return never
	* @private
	*/
	_exit(exitCode, code, message) {
		if (this._exitCallback) this._exitCallback(new CommanderError(exitCode, code, message));
		process$1.exit(exitCode);
	}
	/**
	* Register callback `fn` for the command.
	*
	* @example
	* program
	*   .command('serve')
	*   .description('start service')
	*   .action(function() {
	*      // do work here
	*   });
	*
	* @param {Function} fn
	* @return {Command} `this` command for chaining
	*/
	action(fn) {
		const listener = (args) => {
			const expectedArgsCount = this.registeredArguments.length;
			const actionArgs = args.slice(0, expectedArgsCount);
			if (this._storeOptionsAsProperties) actionArgs[expectedArgsCount] = this;
			else actionArgs[expectedArgsCount] = this.opts();
			actionArgs.push(this);
			return fn.apply(this, actionArgs);
		};
		this._actionHandler = listener;
		return this;
	}
	/**
	* Factory routine to create a new unattached option.
	*
	* See .option() for creating an attached option, which uses this routine to
	* create the option. You can override createOption to return a custom option.
	*
	* @param {string} flags
	* @param {string} [description]
	* @return {Option} new option
	*/
	createOption(flags, description) {
		return new Option(flags, description);
	}
	/**
	* Wrap parseArgs to catch 'commander.invalidArgument'.
	*
	* @param {(Option | Argument)} target
	* @param {string} value
	* @param {*} previous
	* @param {string} invalidArgumentMessage
	* @private
	*/
	_callParseArg(target, value, previous, invalidArgumentMessage) {
		try {
			return target.parseArg(value, previous);
		} catch (err) {
			if (err.code === "commander.invalidArgument") {
				const message = `${invalidArgumentMessage} ${err.message}`;
				this.error(message, {
					exitCode: err.exitCode,
					code: err.code
				});
			}
			throw err;
		}
	}
	/**
	* Check for option flag conflicts.
	* Register option if no conflicts found, or throw on conflict.
	*
	* @param {Option} option
	* @private
	*/
	_registerOption(option) {
		const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
		if (matchingOption) {
			const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
			throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
		}
		this._initOptionGroup(option);
		this.options.push(option);
	}
	/**
	* Check for command name and alias conflicts with existing commands.
	* Register command if no conflicts found, or throw on conflict.
	*
	* @param {Command} command
	* @private
	*/
	_registerCommand(command) {
		const knownBy = (cmd) => {
			return [cmd.name()].concat(cmd.aliases());
		};
		const alreadyUsed = knownBy(command).find((name) => this._findCommand(name));
		if (alreadyUsed) {
			const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
			const newCmd = knownBy(command).join("|");
			throw new Error(`cannot add command '${newCmd}' as already have command '${existingCmd}'`);
		}
		this._initCommandGroup(command);
		this.commands.push(command);
	}
	/**
	* Add an option.
	*
	* @param {Option} option
	* @return {Command} `this` command for chaining
	*/
	addOption(option) {
		this._registerOption(option);
		const oname = option.name();
		const name = option.attributeName();
		if (option.defaultValue !== void 0) this.setOptionValueWithSource(name, option.defaultValue, "default");
		const handleOptionValue = (val, invalidValueMessage, valueSource) => {
			if (val == null && option.presetArg !== void 0) val = option.presetArg;
			const oldValue = this.getOptionValue(name);
			if (val !== null && option.parseArg) val = this._callParseArg(option, val, oldValue, invalidValueMessage);
			else if (val !== null && option.variadic) val = option._collectValue(val, oldValue);
			if (val == null) {
				if (option.negate) val = false;
				else if (option.isBoolean() || option.optional) val = true;
				else val = "";
			}
			this.setOptionValueWithSource(name, val, valueSource);
		};
		this.on("option:" + oname, (val) => {
			const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
			handleOptionValue(val, invalidValueMessage, "cli");
		});
		if (option.envVar) this.on("optionEnv:" + oname, (val) => {
			const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
			handleOptionValue(val, invalidValueMessage, "env");
		});
		return this;
	}
	/**
	* Internal implementation shared by .option() and .requiredOption()
	*
	* @return {Command} `this` command for chaining
	* @private
	*/
	_optionEx(config, flags, description, fn, defaultValue) {
		if (typeof flags === "object" && flags instanceof Option) throw new Error("To add an Option object use addOption() instead of option() or requiredOption()");
		const option = this.createOption(flags, description);
		option.makeOptionMandatory(!!config.mandatory);
		if (typeof fn === "function") option.default(defaultValue).argParser(fn);
		else if (fn instanceof RegExp) {
			const regex = fn;
			fn = (val, def) => {
				const m = regex.exec(val);
				return m ? m[0] : def;
			};
			option.default(defaultValue).argParser(fn);
		} else option.default(fn);
		return this.addOption(option);
	}
	/**
	* Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
	*
	* The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
	* option-argument is indicated by `<>` and an optional option-argument by `[]`.
	*
	* See the README for more details, and see also addOption() and requiredOption().
	*
	* @example
	* program
	*     .option('-p, --pepper', 'add pepper')
	*     .option('--pt, --pizza-type <TYPE>', 'type of pizza') // required option-argument
	*     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
	*     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
	*
	* @param {string} flags
	* @param {string} [description]
	* @param {(Function|*)} [parseArg] - custom option processing function or default value
	* @param {*} [defaultValue]
	* @return {Command} `this` command for chaining
	*/
	option(flags, description, parseArg, defaultValue) {
		return this._optionEx({}, flags, description, parseArg, defaultValue);
	}
	/**
	* Add a required option which must have a value after parsing. This usually means
	* the option must be specified on the command line. (Otherwise the same as .option().)
	*
	* The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
	*
	* @param {string} flags
	* @param {string} [description]
	* @param {(Function|*)} [parseArg] - custom option processing function or default value
	* @param {*} [defaultValue]
	* @return {Command} `this` command for chaining
	*/
	requiredOption(flags, description, parseArg, defaultValue) {
		return this._optionEx({ mandatory: true }, flags, description, parseArg, defaultValue);
	}
	/**
	* Alter parsing of short flags with optional values.
	*
	* @example
	* // for `.option('-f,--flag [value]'):
	* program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
	* program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
	*
	* @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
	* @return {Command} `this` command for chaining
	*/
	combineFlagAndOptionalValue(combine = true) {
		this._combineFlagAndOptionalValue = !!combine;
		return this;
	}
	/**
	* Allow unknown options on the command line.
	*
	* @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
	* @return {Command} `this` command for chaining
	*/
	allowUnknownOption(allowUnknown = true) {
		this._allowUnknownOption = !!allowUnknown;
		return this;
	}
	/**
	* Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
	*
	* @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
	* @return {Command} `this` command for chaining
	*/
	allowExcessArguments(allowExcess = true) {
		this._allowExcessArguments = !!allowExcess;
		return this;
	}
	/**
	* Enable positional options. Positional means global options are specified before subcommands which lets
	* subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
	* The default behaviour is non-positional and global options may appear anywhere on the command line.
	*
	* @param {boolean} [positional]
	* @return {Command} `this` command for chaining
	*/
	enablePositionalOptions(positional = true) {
		this._enablePositionalOptions = !!positional;
		return this;
	}
	/**
	* Pass through options that come after command-arguments rather than treat them as command-options,
	* so actual command-options come before command-arguments. Turning this on for a subcommand requires
	* positional options to have been enabled on the program (parent commands).
	* The default behaviour is non-positional and options may appear before or after command-arguments.
	*
	* @param {boolean} [passThrough] for unknown options.
	* @return {Command} `this` command for chaining
	*/
	passThroughOptions(passThrough = true) {
		this._passThroughOptions = !!passThrough;
		this._checkForBrokenPassThrough();
		return this;
	}
	/**
	* @private
	*/
	_checkForBrokenPassThrough() {
		if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) throw new Error(`passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`);
	}
	/**
	* Whether to store option values as properties on command object,
	* or store separately (specify false). In both cases the option values can be accessed using .opts().
	*
	* @param {boolean} [storeAsProperties=true]
	* @return {Command} `this` command for chaining
	*/
	storeOptionsAsProperties(storeAsProperties = true) {
		if (this.options.length) throw new Error("call .storeOptionsAsProperties() before adding options");
		if (Object.keys(this._optionValues).length) throw new Error("call .storeOptionsAsProperties() before setting option values");
		this._storeOptionsAsProperties = !!storeAsProperties;
		return this;
	}
	/**
	* Retrieve option value.
	*
	* @param {string} key
	* @return {object} value
	*/
	getOptionValue(key) {
		if (this._storeOptionsAsProperties) return this[key];
		return this._optionValues[key];
	}
	/**
	* Store option value.
	*
	* @param {string} key
	* @param {object} value
	* @return {Command} `this` command for chaining
	*/
	setOptionValue(key, value) {
		return this.setOptionValueWithSource(key, value, void 0);
	}
	/**
	* Store option value and where the value came from.
	*
	* @param {string} key
	* @param {object} value
	* @param {string} source - expected values are default/config/env/cli/implied
	* @return {Command} `this` command for chaining
	*/
	setOptionValueWithSource(key, value, source) {
		if (this._storeOptionsAsProperties) this[key] = value;
		else this._optionValues[key] = value;
		this._optionValueSources[key] = source;
		return this;
	}
	/**
	* Get source of option value.
	* Expected values are default | config | env | cli | implied
	*
	* @param {string} key
	* @return {string}
	*/
	getOptionValueSource(key) {
		return this._optionValueSources[key];
	}
	/**
	* Get source of option value. See also .optsWithGlobals().
	* Expected values are default | config | env | cli | implied
	*
	* @param {string} key
	* @return {string}
	*/
	getOptionValueSourceWithGlobals(key) {
		let source;
		this._getCommandAndAncestors().forEach((cmd) => {
			if (cmd.getOptionValueSource(key) !== void 0) source = cmd.getOptionValueSource(key);
		});
		return source;
	}
	/**
	* Get user arguments from implied or explicit arguments.
	* Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
	*
	* @private
	*/
	_prepareUserArgs(argv, parseOptions) {
		if (argv !== void 0 && !Array.isArray(argv)) throw new Error("first parameter to parse must be array or undefined");
		parseOptions = parseOptions || {};
		if (argv === void 0 && parseOptions.from === void 0) {
			if (process$1.versions?.electron) parseOptions.from = "electron";
			const execArgv = process$1.execArgv ?? [];
			if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) parseOptions.from = "eval";
		}
		if (argv === void 0) argv = process$1.argv;
		this.rawArgs = argv.slice();
		let userArgs;
		switch (parseOptions.from) {
			case void 0:
			case "node":
				this._scriptPath = argv[1];
				userArgs = argv.slice(2);
				break;
			case "electron":
				if (process$1.defaultApp) {
					this._scriptPath = argv[1];
					userArgs = argv.slice(2);
				} else userArgs = argv.slice(1);
				break;
			case "user":
				userArgs = argv.slice(0);
				break;
			case "eval":
				userArgs = argv.slice(1);
				break;
			default: throw new Error(`unexpected parse option { from: '${parseOptions.from}' }`);
		}
		if (!this._name && this._scriptPath) this.nameFromFilename(this._scriptPath);
		this._name = this._name || "program";
		return userArgs;
	}
	/**
	* Parse `argv`, setting options and invoking commands when defined.
	*
	* Use parseAsync instead of parse if any of your action handlers are async.
	*
	* Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
	*
	* Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
	* - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
	* - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
	* - `'user'`: just user arguments
	*
	* @example
	* program.parse(); // parse process.argv and auto-detect electron and special node flags
	* program.parse(process.argv); // assume argv[0] is app and argv[1] is script
	* program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
	*
	* @param {string[]} [argv] - optional, defaults to process.argv
	* @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
	* @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
	* @return {Command} `this` command for chaining
	*/
	parse(argv, parseOptions) {
		this._prepareForParse();
		const userArgs = this._prepareUserArgs(argv, parseOptions);
		this._parseCommand([], userArgs);
		return this;
	}
	/**
	* Parse `argv`, setting options and invoking commands when defined.
	*
	* Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
	*
	* Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
	* - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
	* - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
	* - `'user'`: just user arguments
	*
	* @example
	* await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
	* await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
	* await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
	*
	* @param {string[]} [argv]
	* @param {object} [parseOptions]
	* @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
	* @return {Promise}
	*/
	async parseAsync(argv, parseOptions) {
		this._prepareForParse();
		const userArgs = this._prepareUserArgs(argv, parseOptions);
		await this._parseCommand([], userArgs);
		return this;
	}
	_prepareForParse() {
		if (this._savedState === null) {
			this.options.filter((option) => option.negate && option.defaultValue === void 0 && this.getOptionValue(option.attributeName()) === void 0).forEach((option) => {
				const positiveLongFlag = option.long.replace(/^--no-/, "--");
				if (!this._findOption(positiveLongFlag)) this.setOptionValueWithSource(option.attributeName(), true, "default");
			});
			this.saveStateBeforeParse();
		} else this.restoreStateBeforeParse();
	}
	/**
	* Called the first time parse is called to save state and allow a restore before subsequent calls to parse.
	* Not usually called directly, but available for subclasses to save their custom state.
	*
	* This is called in a lazy way. Only commands used in parsing chain will have state saved.
	*/
	saveStateBeforeParse() {
		this._savedState = {
			_name: this._name,
			_optionValues: { ...this._optionValues },
			_optionValueSources: { ...this._optionValueSources }
		};
	}
	/**
	* Restore state before parse for calls after the first.
	* Not usually called directly, but available for subclasses to save their custom state.
	*
	* This is called in a lazy way. Only commands used in parsing chain will have state restored.
	*/
	restoreStateBeforeParse() {
		if (this._storeOptionsAsProperties) throw new Error(`Can not call parse again when storeOptionsAsProperties is true.
- either make a new Command for each call to parse, or stop storing options as properties`);
		this._name = this._savedState._name;
		this._scriptPath = null;
		this.rawArgs = [];
		this._optionValues = { ...this._savedState._optionValues };
		this._optionValueSources = { ...this._savedState._optionValueSources };
		this.args = [];
		this.processedArgs = [];
	}
	/**
	* Throw if expected executable is missing. Add lots of help for author.
	*
	* @param {string} executableFile
	* @param {string} executableDir
	* @param {string} subcommandName
	*/
	_checkForMissingExecutable(executableFile, executableDir, subcommandName) {
		if (fs.existsSync(executableFile)) return;
		const executableMissing = `'${executableFile}' does not exist
 - if '${subcommandName}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory"}`;
		throw new Error(executableMissing);
	}
	/**
	* Execute a sub-command executable.
	*
	* @private
	*/
	_executeSubCommand(subcommand, args) {
		args = args.slice();
		const sourceExt = [
			".js",
			".ts",
			".tsx",
			".mjs",
			".cjs"
		];
		function findFile(baseDir, baseName) {
			const localBin = path.resolve(baseDir, baseName);
			if (fs.existsSync(localBin)) return localBin;
			if (sourceExt.includes(path.extname(baseName))) return void 0;
			const foundExt = sourceExt.find((ext) => fs.existsSync(`${localBin}${ext}`));
			if (foundExt) return `${localBin}${foundExt}`;
		}
		this._checkForMissingMandatoryOptions();
		this._checkForConflictingOptions();
		let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
		let executableDir = this._executableDir || "";
		if (this._scriptPath) {
			let resolvedScriptPath;
			try {
				resolvedScriptPath = fs.realpathSync(this._scriptPath);
			} catch {
				resolvedScriptPath = this._scriptPath;
			}
			executableDir = path.resolve(path.dirname(resolvedScriptPath), executableDir);
		}
		if (executableDir) {
			let localFile = findFile(executableDir, executableFile);
			if (!localFile && !subcommand._executableFile && this._scriptPath) {
				const legacyName = path.basename(this._scriptPath, path.extname(this._scriptPath));
				if (legacyName !== this._name) localFile = findFile(executableDir, `${legacyName}-${subcommand._name}`);
			}
			executableFile = localFile || executableFile;
		}
		const launchWithNode = sourceExt.includes(path.extname(executableFile));
		let proc;
		if (process$1.platform !== "win32") {
			if (launchWithNode) {
				args.unshift(executableFile);
				args = incrementNodeInspectorPort(process$1.execArgv).concat(args);
				proc = childProcess.spawn(process$1.argv[0], args, { stdio: "inherit" });
			} else proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
		} else {
			this._checkForMissingExecutable(executableFile, executableDir, subcommand._name);
			args.unshift(executableFile);
			args = incrementNodeInspectorPort(process$1.execArgv).concat(args);
			proc = childProcess.spawn(process$1.execPath, args, { stdio: "inherit" });
		}
		if (!proc.killed) [
			"SIGUSR1",
			"SIGUSR2",
			"SIGTERM",
			"SIGINT",
			"SIGHUP"
		].forEach((signal) => {
			process$1.on(signal, () => {
				if (proc.killed === false && proc.exitCode === null) proc.kill(signal);
			});
		});
		const exitCallback = this._exitCallback;
		proc.on("close", (code) => {
			code = code ?? 1;
			if (!exitCallback) process$1.exit(code);
			else exitCallback(new CommanderError(code, "commander.executeSubCommandAsync", "(close)"));
		});
		proc.on("error", (err) => {
			if (err.code === "ENOENT") this._checkForMissingExecutable(executableFile, executableDir, subcommand._name);
			else if (err.code === "EACCES") throw new Error(`'${executableFile}' not executable`);
			if (!exitCallback) process$1.exit(1);
			else {
				const wrappedError = new CommanderError(1, "commander.executeSubCommandAsync", "(error)");
				wrappedError.nestedError = err;
				exitCallback(wrappedError);
			}
		});
		this.runningCommand = proc;
	}
	/**
	* @private
	*/
	_dispatchSubcommand(commandName, operands, unknown) {
		const subCommand = this._findCommand(commandName);
		if (!subCommand) this.help({ error: true });
		subCommand._prepareForParse();
		let promiseChain;
		promiseChain = this._chainOrCallSubCommandHook(promiseChain, subCommand, "preSubcommand");
		promiseChain = this._chainOrCall(promiseChain, () => {
			if (subCommand._executableHandler) this._executeSubCommand(subCommand, operands.concat(unknown));
			else return subCommand._parseCommand(operands, unknown);
		});
		return promiseChain;
	}
	/**
	* Invoke help directly if possible, or dispatch if necessary.
	* e.g. help foo
	*
	* @private
	*/
	_dispatchHelpCommand(subcommandName) {
		if (!subcommandName) this.help();
		const subCommand = this._findCommand(subcommandName);
		if (subCommand && !subCommand._executableHandler) subCommand.help();
		return this._dispatchSubcommand(subcommandName, [], [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]);
	}
	/**
	* Check this.args against expected this.registeredArguments.
	*
	* @private
	*/
	_checkNumberOfArguments() {
		this.registeredArguments.forEach((arg, i) => {
			if (arg.required && this.args[i] == null) this.missingArgument(arg.name());
		});
		if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) return;
		if (this.args.length > this.registeredArguments.length) this._excessArguments(this.args);
	}
	/**
	* Process this.args using this.registeredArguments and save as this.processedArgs!
	*
	* @private
	*/
	_processArguments() {
		const myParseArg = (argument, value, previous) => {
			let parsedValue = value;
			if (value !== null && argument.parseArg) {
				const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
				parsedValue = this._callParseArg(argument, value, previous, invalidValueMessage);
			}
			return parsedValue;
		};
		this._checkNumberOfArguments();
		const processedArgs = [];
		this.registeredArguments.forEach((declaredArg, index) => {
			let value = declaredArg.defaultValue;
			if (declaredArg.variadic) {
				if (index < this.args.length) {
					value = this.args.slice(index);
					if (declaredArg.parseArg) value = value.reduce((processed, v) => {
						return myParseArg(declaredArg, v, processed);
					}, declaredArg.defaultValue);
				} else if (value === void 0) value = [];
			} else if (index < this.args.length) {
				value = this.args[index];
				if (declaredArg.parseArg) value = myParseArg(declaredArg, value, declaredArg.defaultValue);
			}
			processedArgs[index] = value;
		});
		this.processedArgs = processedArgs;
	}
	/**
	* Once we have a promise we chain, but call synchronously until then.
	*
	* @param {(Promise|undefined)} promise
	* @param {Function} fn
	* @return {(Promise|undefined)}
	* @private
	*/
	_chainOrCall(promise, fn) {
		if (promise?.then && typeof promise.then === "function") return promise.then(() => fn());
		return fn();
	}
	/**
	*
	* @param {(Promise|undefined)} promise
	* @param {string} event
	* @return {(Promise|undefined)}
	* @private
	*/
	_chainOrCallHooks(promise, event) {
		let result = promise;
		const hooks = [];
		this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== void 0).forEach((hookedCommand) => {
			hookedCommand._lifeCycleHooks[event].forEach((callback) => {
				hooks.push({
					hookedCommand,
					callback
				});
			});
		});
		if (event === "postAction") hooks.reverse();
		hooks.forEach((hookDetail) => {
			result = this._chainOrCall(result, () => {
				return hookDetail.callback(hookDetail.hookedCommand, this);
			});
		});
		return result;
	}
	/**
	*
	* @param {(Promise|undefined)} promise
	* @param {Command} subCommand
	* @param {string} event
	* @return {(Promise|undefined)}
	* @private
	*/
	_chainOrCallSubCommandHook(promise, subCommand, event) {
		let result = promise;
		if (this._lifeCycleHooks[event] !== void 0) this._lifeCycleHooks[event].forEach((hook) => {
			result = this._chainOrCall(result, () => {
				return hook(this, subCommand);
			});
		});
		return result;
	}
	/**
	* Process arguments in context of this command.
	* Returns action result, in case it is a promise.
	*
	* @private
	*/
	_parseCommand(operands, unknown) {
		const parsed = this.parseOptions(unknown);
		this._parseOptionsEnv();
		this._parseOptionsImplied();
		operands = operands.concat(parsed.operands);
		unknown = parsed.unknown;
		this.args = operands.concat(unknown);
		if (operands && this._findCommand(operands[0])) return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
		if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) return this._dispatchHelpCommand(operands[1]);
		if (this._defaultCommandName) {
			this._outputHelpIfRequested(unknown);
			return this._dispatchSubcommand(this._defaultCommandName, operands, unknown);
		}
		if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) this.help({ error: true });
		this._outputHelpIfRequested(parsed.unknown);
		this._checkForMissingMandatoryOptions();
		this._checkForConflictingOptions();
		const checkForUnknownOptions = () => {
			if (parsed.unknown.length > 0) this.unknownOption(parsed.unknown[0]);
		};
		const commandEvent = `command:${this.name()}`;
		if (this._actionHandler) {
			checkForUnknownOptions();
			this._processArguments();
			let promiseChain;
			promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
			promiseChain = this._chainOrCall(promiseChain, () => this._actionHandler(this.processedArgs));
			if (this.parent) promiseChain = this._chainOrCall(promiseChain, () => {
				this.parent.emit(commandEvent, operands, unknown);
			});
			promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
			return promiseChain;
		}
		if (this.parent?.listenerCount(commandEvent)) {
			checkForUnknownOptions();
			this._processArguments();
			this.parent.emit(commandEvent, operands, unknown);
		} else if (operands.length) {
			if (this._findCommand("*")) return this._dispatchSubcommand("*", operands, unknown);
			if (this.listenerCount("command:*")) this.emit("command:*", operands, unknown);
			else if (this.commands.length) this.unknownCommand();
			else {
				checkForUnknownOptions();
				this._processArguments();
			}
		} else if (this.commands.length) {
			checkForUnknownOptions();
			this.help({ error: true });
		} else {
			checkForUnknownOptions();
			this._processArguments();
		}
	}
	/**
	* Find matching command.
	*
	* @private
	* @return {Command | undefined}
	*/
	_findCommand(name) {
		if (!name) return void 0;
		return this.commands.find((cmd) => cmd._name === name || cmd._aliases.includes(name));
	}
	/**
	* Return an option matching `arg` if any.
	*
	* @param {string} arg
	* @return {Option}
	* @package
	*/
	_findOption(arg) {
		return this.options.find((option) => option.is(arg));
	}
	/**
	* Display an error message if a mandatory option does not have a value.
	* Called after checking for help flags in leaf subcommand.
	*
	* @private
	*/
	_checkForMissingMandatoryOptions() {
		this._getCommandAndAncestors().forEach((cmd) => {
			cmd.options.forEach((anOption) => {
				if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === void 0) cmd.missingMandatoryOptionValue(anOption);
			});
		});
	}
	/**
	* Display an error message if conflicting options are used together in this.
	*
	* @private
	*/
	_checkForConflictingLocalOptions() {
		const definedNonDefaultOptions = this.options.filter((option) => {
			const optionKey = option.attributeName();
			if (this.getOptionValue(optionKey) === void 0) return false;
			return this.getOptionValueSource(optionKey) !== "default";
		});
		definedNonDefaultOptions.filter((option) => option.conflictsWith.length > 0).forEach((option) => {
			const conflictingAndDefined = definedNonDefaultOptions.find((defined) => option.conflictsWith.includes(defined.attributeName()));
			if (conflictingAndDefined) this._conflictingOption(option, conflictingAndDefined);
		});
	}
	/**
	* Display an error message if conflicting options are used together.
	* Called after checking for help flags in leaf subcommand.
	*
	* @private
	*/
	_checkForConflictingOptions() {
		this._getCommandAndAncestors().forEach((cmd) => {
			cmd._checkForConflictingLocalOptions();
		});
	}
	/**
	* Parse options from `argv` removing known options,
	* and return argv split into operands and unknown arguments.
	*
	* Side effects: modifies command by storing options. Does not reset state if called again.
	*
	* Examples:
	*
	*     argv => operands, unknown
	*     --known kkk op => [op], []
	*     op --known kkk => [op], []
	*     sub --unknown uuu op => [sub], [--unknown uuu op]
	*     sub -- --unknown uuu op => [sub --unknown uuu op], []
	*
	* @param {string[]} args
	* @return {{operands: string[], unknown: string[]}}
	*/
	parseOptions(args) {
		const operands = [];
		const unknown = [];
		let dest = operands;
		function maybeOption(arg) {
			return arg.length > 1 && arg[0] === "-";
		}
		const negativeNumberArg = (arg) => {
			if (!/^-(\d+|\d*\.\d+)(e[+-]?\d+)?$/.test(arg)) return false;
			return !this._getCommandAndAncestors().some((cmd) => cmd.options.map((opt) => opt.short).some((short) => /^-\d$/.test(short)));
		};
		let activeVariadicOption = null;
		let activeGroup = null;
		let i = 0;
		while (i < args.length || activeGroup) {
			const arg = activeGroup ?? args[i++];
			activeGroup = null;
			if (arg === "--") {
				if (dest === unknown) dest.push(arg);
				dest.push(...args.slice(i));
				break;
			}
			if (activeVariadicOption && (!maybeOption(arg) || negativeNumberArg(arg))) {
				this.emit(`option:${activeVariadicOption.name()}`, arg);
				continue;
			}
			activeVariadicOption = null;
			if (maybeOption(arg)) {
				const option = this._findOption(arg);
				if (option) {
					if (option.required) {
						const value = args[i++];
						if (value === void 0) this.optionMissingArgument(option);
						this.emit(`option:${option.name()}`, value);
					} else if (option.optional) {
						let value = null;
						if (i < args.length && (!maybeOption(args[i]) || negativeNumberArg(args[i]))) value = args[i++];
						this.emit(`option:${option.name()}`, value);
					} else this.emit(`option:${option.name()}`);
					activeVariadicOption = option.variadic ? option : null;
					continue;
				}
			}
			if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
				const option = this._findOption(`-${arg[1]}`);
				if (option) {
					if (option.required || option.optional && this._combineFlagAndOptionalValue) this.emit(`option:${option.name()}`, arg.slice(2));
					else {
						this.emit(`option:${option.name()}`);
						activeGroup = `-${arg.slice(2)}`;
					}
					continue;
				}
			}
			if (/^--[^=]+=/.test(arg)) {
				const index = arg.indexOf("=");
				const option = this._findOption(arg.slice(0, index));
				if (option && (option.required || option.optional)) {
					this.emit(`option:${option.name()}`, arg.slice(index + 1));
					continue;
				}
			}
			if (dest === operands && maybeOption(arg) && !(this.commands.length === 0 && negativeNumberArg(arg))) dest = unknown;
			if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
				if (this._findCommand(arg)) {
					operands.push(arg);
					unknown.push(...args.slice(i));
					break;
				} else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
					operands.push(arg, ...args.slice(i));
					break;
				} else if (this._defaultCommandName) {
					unknown.push(arg, ...args.slice(i));
					break;
				}
			}
			if (this._passThroughOptions) {
				dest.push(arg, ...args.slice(i));
				break;
			}
			dest.push(arg);
		}
		return {
			operands,
			unknown
		};
	}
	/**
	* Return an object containing local option values as key-value pairs.
	*
	* @return {object}
	*/
	opts() {
		if (this._storeOptionsAsProperties) {
			const result = {};
			const len = this.options.length;
			for (let i = 0; i < len; i++) {
				const key = this.options[i].attributeName();
				result[key] = key === this._versionOptionName ? this._version : this[key];
			}
			return result;
		}
		return this._optionValues;
	}
	/**
	* Return an object containing merged local and global option values as key-value pairs.
	*
	* @return {object}
	*/
	optsWithGlobals() {
		return this._getCommandAndAncestors().reduce((combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()), {});
	}
	/**
	* Display error message and exit (or call exitOverride).
	*
	* @param {string} message
	* @param {object} [errorOptions]
	* @param {string} [errorOptions.code] - an id string representing the error
	* @param {number} [errorOptions.exitCode] - used with process.exit
	*/
	error(message, errorOptions) {
		this._outputConfiguration.outputError(`${message}\n`, this._outputConfiguration.writeErr);
		if (typeof this._showHelpAfterError === "string") this._outputConfiguration.writeErr(`${this._showHelpAfterError}\n`);
		else if (this._showHelpAfterError) {
			this._outputConfiguration.writeErr("\n");
			this.outputHelp({ error: true });
		}
		const config = errorOptions || {};
		const exitCode = config.exitCode || 1;
		const code = config.code || "commander.error";
		this._exit(exitCode, code, message);
	}
	/**
	* Apply any option related environment variables, if option does
	* not have a value from cli or client code.
	*
	* @private
	*/
	_parseOptionsEnv() {
		this.options.forEach((option) => {
			if (option.envVar && option.envVar in process$1.env) {
				const optionKey = option.attributeName();
				if (this.getOptionValue(optionKey) === void 0 || [
					"default",
					"config",
					"env"
				].includes(this.getOptionValueSource(optionKey))) {
					if (option.required || option.optional) this.emit(`optionEnv:${option.name()}`, process$1.env[option.envVar]);
					else this.emit(`optionEnv:${option.name()}`);
				}
			}
		});
	}
	/**
	* Apply any implied option values, if option is undefined or default value.
	*
	* @private
	*/
	_parseOptionsImplied() {
		const dualHelper = new DualOptions(this.options);
		const hasCustomOptionValue = (optionKey) => {
			return this.getOptionValue(optionKey) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
		};
		this.options.filter((option) => option.implied !== void 0 && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(this.getOptionValue(option.attributeName()), option)).forEach((option) => {
			Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
				this.setOptionValueWithSource(impliedKey, option.implied[impliedKey], "implied");
			});
		});
	}
	/**
	* Argument `name` is missing.
	*
	* @param {string} name
	* @private
	*/
	missingArgument(name) {
		const message = `error: missing required argument '${name}'`;
		this.error(message, { code: "commander.missingArgument" });
	}
	/**
	* `Option` is missing an argument.
	*
	* @param {Option} option
	* @private
	*/
	optionMissingArgument(option) {
		const message = `error: option '${option.flags}' argument missing`;
		this.error(message, { code: "commander.optionMissingArgument" });
	}
	/**
	* `Option` does not have a value, and is a mandatory option.
	*
	* @param {Option} option
	* @private
	*/
	missingMandatoryOptionValue(option) {
		const message = `error: required option '${option.flags}' not specified`;
		this.error(message, { code: "commander.missingMandatoryOptionValue" });
	}
	/**
	* `Option` conflicts with another option.
	*
	* @param {Option} option
	* @param {Option} conflictingOption
	* @private
	*/
	_conflictingOption(option, conflictingOption) {
		const findBestOptionFromValue = (option) => {
			const optionKey = option.attributeName();
			const optionValue = this.getOptionValue(optionKey);
			const negativeOption = this.options.find((target) => target.negate && optionKey === target.attributeName());
			const positiveOption = this.options.find((target) => !target.negate && optionKey === target.attributeName());
			if (negativeOption && (negativeOption.presetArg === void 0 && optionValue === false || negativeOption.presetArg !== void 0 && optionValue === negativeOption.presetArg)) return negativeOption;
			return positiveOption || option;
		};
		const getErrorMessage = (option) => {
			const bestOption = findBestOptionFromValue(option);
			const optionKey = bestOption.attributeName();
			if (this.getOptionValueSource(optionKey) === "env") return `environment variable '${bestOption.envVar}'`;
			return `option '${bestOption.flags}'`;
		};
		const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
		this.error(message, { code: "commander.conflictingOption" });
	}
	/**
	* Unknown option `flag`.
	*
	* @param {string} flag
	* @private
	*/
	unknownOption(flag) {
		if (this._allowUnknownOption) return;
		let suggestion = "";
		if (flag.startsWith("--") && this._showSuggestionAfterError) {
			let candidateFlags = [];
			let command = this;
			do {
				const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
				candidateFlags = candidateFlags.concat(moreFlags);
				command = command.parent;
			} while (command && !command._enablePositionalOptions);
			suggestion = suggestSimilar(flag, candidateFlags);
		}
		const message = `error: unknown option '${flag}'${suggestion}`;
		this.error(message, { code: "commander.unknownOption" });
	}
	/**
	* Excess arguments, more than expected.
	*
	* @param {string[]} receivedArgs
	* @private
	*/
	_excessArguments(receivedArgs) {
		if (this._allowExcessArguments) return;
		const expected = this.registeredArguments.length;
		const s = expected === 1 ? "" : "s";
		const received = receivedArgs.length;
		const message = `error: too many arguments${this.parent ? ` for '${this.name()}'` : ""}. Expected ${expected} argument${s} but got ${received}: ${receivedArgs.join(", ")}.`;
		this.error(message, { code: "commander.excessArguments" });
	}
	/**
	* Unknown command.
	*
	* @private
	*/
	unknownCommand() {
		const unknownName = this.args[0];
		let suggestion = "";
		if (this._showSuggestionAfterError) {
			const candidateNames = [];
			this.createHelp().visibleCommands(this).forEach((command) => {
				candidateNames.push(command.name());
				if (command.alias()) candidateNames.push(command.alias());
			});
			suggestion = suggestSimilar(unknownName, candidateNames);
		}
		const message = `error: unknown command '${unknownName}'${suggestion}`;
		this.error(message, { code: "commander.unknownCommand" });
	}
	/**
	* Get or set the program version.
	*
	* This method auto-registers the "-V, --version" option which will print the version number.
	*
	* You can optionally supply the flags and description to override the defaults.
	*
	* @param {string} [str]
	* @param {string} [flags]
	* @param {string} [description]
	* @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
	*/
	version(str, flags, description) {
		if (str === void 0) return this._version;
		this._version = str;
		flags = flags || "-V, --version";
		description = description || "output the version number";
		const versionOption = this.createOption(flags, description);
		this._versionOptionName = versionOption.attributeName();
		this._registerOption(versionOption);
		this.on("option:" + versionOption.name(), () => {
			this._outputConfiguration.writeOut(`${str}\n`);
			this._exit(0, "commander.version", str);
		});
		return this;
	}
	/**
	* Set the description.
	*
	* @param {string} [str]
	* @param {object} [argsDescription]
	* @return {(string|Command)}
	*/
	description(str, argsDescription) {
		if (str === void 0 && argsDescription === void 0) return this._description;
		this._description = str;
		if (argsDescription) this._argsDescription = argsDescription;
		return this;
	}
	/**
	* Set the summary. Used when listed as subcommand of parent.
	*
	* @param {string} [str]
	* @return {(string|Command)}
	*/
	summary(str) {
		if (str === void 0) return this._summary;
		this._summary = str;
		return this;
	}
	/**
	* Set an alias for the command.
	*
	* You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
	*
	* @param {string} [alias]
	* @return {(string|Command)}
	*/
	alias(alias) {
		if (alias === void 0) return this._aliases[0];
		/** @type {Command} */
		let command = this;
		if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) command = this.commands[this.commands.length - 1];
		if (alias === command._name) throw new Error("Command alias can't be the same as its name");
		const matchingCommand = this.parent?._findCommand(alias);
		if (matchingCommand) {
			const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
			throw new Error(`cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`);
		}
		command._aliases.push(alias);
		return this;
	}
	/**
	* Set aliases for the command.
	*
	* Only the first alias is shown in the auto-generated help.
	*
	* @param {string[]} [aliases]
	* @return {(string[]|Command)}
	*/
	aliases(aliases) {
		if (aliases === void 0) return this._aliases;
		aliases.forEach((alias) => this.alias(alias));
		return this;
	}
	/**
	* Set / get the command usage `str`.
	*
	* @param {string} [str]
	* @return {(string|Command)}
	*/
	usage(str) {
		if (str === void 0) {
			if (this._usage) return this._usage;
			const args = this.registeredArguments.map((arg) => {
				return humanReadableArgName(arg);
			});
			return [].concat(this.options.length || this._helpOption !== null ? "[options]" : [], this.commands.length ? "[command]" : [], this.registeredArguments.length ? args : []).join(" ");
		}
		this._usage = str;
		return this;
	}
	/**
	* Get or set the name of the command.
	*
	* @param {string} [str]
	* @return {(string|Command)}
	*/
	name(str) {
		if (str === void 0) return this._name;
		this._name = str;
		return this;
	}
	/**
	* Set/get the help group heading for this subcommand in parent command's help.
	*
	* @param {string} [heading]
	* @return {Command | string}
	*/
	helpGroup(heading) {
		if (heading === void 0) return this._helpGroupHeading ?? "";
		this._helpGroupHeading = heading;
		return this;
	}
	/**
	* Set/get the default help group heading for subcommands added to this command.
	* (This does not override a group set directly on the subcommand using .helpGroup().)
	*
	* @example
	* program.commandsGroup('Development Commands:);
	* program.command('watch')...
	* program.command('lint')...
	* ...
	*
	* @param {string} [heading]
	* @returns {Command | string}
	*/
	commandsGroup(heading) {
		if (heading === void 0) return this._defaultCommandGroup ?? "";
		this._defaultCommandGroup = heading;
		return this;
	}
	/**
	* Set/get the default help group heading for options added to this command.
	* (This does not override a group set directly on the option using .helpGroup().)
	*
	* @example
	* program
	*   .optionsGroup('Development Options:')
	*   .option('-d, --debug', 'output extra debugging')
	*   .option('-p, --profile', 'output profiling information')
	*
	* @param {string} [heading]
	* @returns {Command | string}
	*/
	optionsGroup(heading) {
		if (heading === void 0) return this._defaultOptionGroup ?? "";
		this._defaultOptionGroup = heading;
		return this;
	}
	/**
	* @param {Option} option
	* @private
	*/
	_initOptionGroup(option) {
		if (this._defaultOptionGroup && !option.helpGroupHeading) option.helpGroup(this._defaultOptionGroup);
	}
	/**
	* @param {Command} cmd
	* @private
	*/
	_initCommandGroup(cmd) {
		if (this._defaultCommandGroup && !cmd.helpGroup()) cmd.helpGroup(this._defaultCommandGroup);
	}
	/**
	* Set the name of the command from script filename, such as process.argv[1],
	* or import.meta.filename.
	*
	* (Used internally and public although not documented in README.)
	*
	* @example
	* program.nameFromFilename(import.meta.filename);
	*
	* @param {string} filename
	* @return {Command}
	*/
	nameFromFilename(filename) {
		this._name = path.basename(filename, path.extname(filename));
		return this;
	}
	/**
	* Get or set the directory for searching for executable subcommands of this command.
	*
	* @example
	* program.executableDir(import.meta.dirname);
	* // or
	* program.executableDir('subcommands');
	*
	* @param {string} [path]
	* @return {(string|null|Command)}
	*/
	executableDir(path) {
		if (path === void 0) return this._executableDir;
		this._executableDir = path;
		return this;
	}
	/**
	* Return program help documentation.
	*
	* @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
	* @return {string}
	*/
	helpInformation(contextOptions) {
		const helper = this.createHelp();
		const context = this._getOutputContext(contextOptions);
		helper.prepareContext({
			error: context.error,
			helpWidth: context.helpWidth,
			outputHasColors: context.hasColors
		});
		const text = helper.formatHelp(this, helper);
		if (context.hasColors) return text;
		return this._outputConfiguration.stripColor(text);
	}
	/**
	* @typedef HelpContext
	* @type {object}
	* @property {boolean} error
	* @property {number} helpWidth
	* @property {boolean} hasColors
	* @property {function} write - includes stripColor if needed
	*
	* @returns {HelpContext}
	* @private
	*/
	_getOutputContext(contextOptions) {
		contextOptions = contextOptions || {};
		const error = !!contextOptions.error;
		let baseWrite;
		let hasColors;
		let helpWidth;
		if (error) {
			baseWrite = (str) => this._outputConfiguration.writeErr(str);
			hasColors = this._outputConfiguration.getErrHasColors();
			helpWidth = this._outputConfiguration.getErrHelpWidth();
		} else {
			baseWrite = (str) => this._outputConfiguration.writeOut(str);
			hasColors = this._outputConfiguration.getOutHasColors();
			helpWidth = this._outputConfiguration.getOutHelpWidth();
		}
		const write = (str) => {
			if (!hasColors) str = this._outputConfiguration.stripColor(str);
			return baseWrite(str);
		};
		return {
			error,
			write,
			hasColors,
			helpWidth
		};
	}
	/**
	* Output help information for this command.
	*
	* Outputs built-in help, and custom text added using `.addHelpText()`.
	*
	* @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
	*/
	outputHelp(contextOptions) {
		let deprecatedCallback;
		if (typeof contextOptions === "function") {
			deprecatedCallback = contextOptions;
			contextOptions = void 0;
		}
		const outputContext = this._getOutputContext(contextOptions);
		/** @type {HelpTextEventContext} */
		const eventContext = {
			error: outputContext.error,
			write: outputContext.write,
			command: this
		};
		this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", eventContext));
		this.emit("beforeHelp", eventContext);
		let helpInformation = this.helpInformation({ error: outputContext.error });
		if (deprecatedCallback) {
			helpInformation = deprecatedCallback(helpInformation);
			if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) throw new Error("outputHelp callback must return a string or a Buffer");
		}
		outputContext.write(helpInformation);
		if (this._getHelpOption()?.long) this.emit(this._getHelpOption().long);
		this.emit("afterHelp", eventContext);
		this._getCommandAndAncestors().forEach((command) => command.emit("afterAllHelp", eventContext));
	}
	/**
	* You can pass in flags and a description to customise the built-in help option.
	* Pass in false to disable the built-in help option.
	*
	* @example
	* program.helpOption('-?, --help' 'show help'); // customise
	* program.helpOption(false); // disable
	*
	* @param {(string | boolean)} flags
	* @param {string} [description]
	* @return {Command} `this` command for chaining
	*/
	helpOption(flags, description) {
		if (typeof flags === "boolean") {
			if (flags) {
				if (this._helpOption === null) this._helpOption = void 0;
				if (this._defaultOptionGroup) this._initOptionGroup(this._getHelpOption());
			} else this._helpOption = null;
			return this;
		}
		this._helpOption = this.createOption(flags ?? "-h, --help", description ?? "display help for command");
		if (flags || description) this._initOptionGroup(this._helpOption);
		return this;
	}
	/**
	* Lazy create help option.
	* Returns null if has been disabled with .helpOption(false).
	*
	* @returns {(Option | null)} the help option
	* @package
	*/
	_getHelpOption() {
		if (this._helpOption === void 0) this.helpOption(void 0, void 0);
		return this._helpOption;
	}
	/**
	* Supply your own option to use for the built-in help option.
	* This is an alternative to using helpOption() to customise the flags and description etc.
	*
	* @param {Option} option
	* @return {Command} `this` command for chaining
	*/
	addHelpOption(option) {
		this._helpOption = option;
		this._initOptionGroup(option);
		return this;
	}
	/**
	* Output help information and exit.
	*
	* Outputs built-in help, and custom text added using `.addHelpText()`.
	*
	* @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
	*/
	help(contextOptions) {
		this.outputHelp(contextOptions);
		let exitCode = Number(process$1.exitCode ?? 0);
		if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) exitCode = 1;
		this._exit(exitCode, "commander.help", "(outputHelp)");
	}
	/**
	* // Do a little typing to coordinate emit and listener for the help text events.
	* @typedef HelpTextEventContext
	* @type {object}
	* @property {boolean} error
	* @property {Command} command
	* @property {function} write
	*/
	/**
	* Add additional text to be displayed with the built-in help.
	*
	* Position is 'before' or 'after' to affect just this command,
	* and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
	*
	* @param {string} position - before or after built-in help
	* @param {(string | Function)} text - string to add, or a function returning a string
	* @return {Command} `this` command for chaining
	*/
	addHelpText(position, text) {
		const allowedValues = [
			"beforeAll",
			"before",
			"after",
			"afterAll"
		];
		if (!allowedValues.includes(position)) throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
		const helpEvent = `${position}Help`;
		this.on(helpEvent, (context) => {
			let helpStr;
			if (typeof text === "function") helpStr = text({
				error: context.error,
				command: context.command
			});
			else helpStr = text;
			if (helpStr) context.write(`${helpStr}\n`);
		});
		return this;
	}
	/**
	* Output help information if help flags specified
	*
	* @param {Array} args - array of options to search for help flags
	* @private
	*/
	_outputHelpIfRequested(args) {
		const helpOption = this._getHelpOption();
		if (helpOption && args.find((arg) => helpOption.is(arg))) {
			this.outputHelp();
			this._exit(0, "commander.helpDisplayed", "(outputHelp)");
		}
	}
};
/**
* Scan arguments and increment port number for inspect calls (to avoid conflicts when spawning new command).
*
* @param {string[]} args - array of arguments from node.execArgv
* @returns {string[]}
* @private
*/
function incrementNodeInspectorPort(args) {
	return args.map((arg) => {
		if (!arg.startsWith("--inspect")) return arg;
		let debugOption;
		let debugHost = "127.0.0.1";
		let debugPort = "9229";
		let match;
		if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) debugOption = match[1];
		else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
			debugOption = match[1];
			if (/^\d+$/.test(match[3])) debugPort = match[3];
			else debugHost = match[3];
		} else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
			debugOption = match[1];
			debugHost = match[3];
			debugPort = match[4];
		}
		if (debugOption && debugPort !== "0") return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
		return arg;
	});
}
/**
* Exported for using from tests, not otherwise used outside this file.
*
* @returns {boolean | undefined}
* @package
*/
function useColor() {
	if (process$1.env.NO_COLOR || process$1.env.FORCE_COLOR === "0" || process$1.env.FORCE_COLOR === "false") return false;
	if (process$1.env.FORCE_COLOR || process$1.env.CLICOLOR_FORCE !== void 0) return true;
}
new Command();
//#endregion
//#region ../../node_modules/.pnpm/cyber-mux@0.8.0_typescript@7.0.2/node_modules/cyber-mux/dist/worktree-Bj6IgHv7.mjs
const nodeExec = (cmd, args) => {
	try {
		const out = execFileSync(cmd, args, {
			encoding: "utf8",
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			]
		}).trim();
		nodeExec.lastError = void 0;
		return out;
	} catch (err) {
		const stderr = err.stderr;
		nodeExec.lastError = String(stderr ?? "").trim() || void 0;
		return null;
	}
};
/**
* A failure message carrying the runner's reason for it, when there is one. The backend's own words
* verbatim — never a paraphrase, and never a guess: a refused split may be a region too small, or a
* server that is simply gone, and only the backend knows which.
*/
function withReason(exec, message) {
	return exec.lastError ? `${message} — ${exec.lastError}` : message;
}
const nodeWorktreeFs = {
	exists: existsSync,
	realpath: (path) => realpathSync.native(path)
};
/**
* This module's own refusals and failures — plain cyber-mux prose, never a dependency's raw words.
* `reportWorktreeFailure` (`cli.ts`) forwards a `WorktreeGitError`'s message onto stdout verbatim
* because it is safe to: everything thrown here is this CLI's own text. Anything else that reaches
* that catch-all (a `session.tmux.ts`/`session.herdr.ts` throw, which embeds the backend's own name
* and its raw stderr via `withReason`) is a different case and is translated, not forwarded.
*/
var WorktreeGitError = class extends Error {};
/**
* Resolve the primary checkout's root regardless of whether the caller's cwd is the primary
* checkout or a linked worktree — `--git-common-dir` always points at the main repo's `.git`.
*/
function resolvePrimaryRoot(exec) {
	const commonDir = exec("git", [
		"rev-parse",
		"--path-format=absolute",
		"--git-common-dir"
	]);
	if (!commonDir) throw new WorktreeGitError("cannot resolve the primary checkout — not inside a git repository");
	return dirname(commonDir);
}
/**
* The single normalization point for every path that gets MATCHED against another — a multiplexer
* reports its own checkout paths, and those only line up with git's if both sides are resolved the
* same way (a symlinked repo, or macOS's `/tmp` → `/private/tmp`, otherwise silently fails to
* match). Falls back to `resolve` for a path that isn't on disk, where there is no link to follow.
*/
function normalizeWorktreePath(path, fs = nodeWorktreeFs) {
	try {
		return fs.realpath(path);
	} catch {
		return resolve(path);
	}
}
//#endregion
//#region ../../node_modules/.pnpm/cyber-mux@0.8.0_typescript@7.0.2/node_modules/cyber-mux/dist/backend-Dg5JGbd3.mjs
/**
* The launch-line fallbacks — the compensations for what a creating route could not set natively.
*
* Two things a caller can ask for may have no native flag on the verb that opens a pane: the env the
* pane starts with, and the directory it starts in. Both are then delivered the only way left, by
* composing them onto the command line the pane runs — an `env K=V` prefix, a `cd <dir> &&` prefix,
* or both. They compose in ONE order (`cd '/x' && env K=V cmd`, the env INSIDE the `&&`), because the
* other order sets the variables on `cd` and leaves the command without them.
*
* The routes that lose env are herdr's worktree `create`/`open` (0.7.4 answers `--env` with `unknown
* option`) and every cmux and otty creating verb. The routes that lose cwd are cmux's `new-pane` and
* otty's `tab new`. Each adapter's header records what it found; this module only composes.
*
* The env prefix is a LAST resort — the values land in `ps` output and the pane's shell history — and
* it only works when there IS a command to ride; with none, the honest outcome is to warn, never to
* drop silently. A `cd` needs no command to ride, so a route with a cwd and no launch still lands in
* the right directory.
*
* This lives in one module, called by every route that can lose either, so the rule cannot be wired
* on one and forgotten on another — and so the ordering the two must agree about is written once.
* Only a route that actually lost the native flag may call it: prefixing over a natively-set value
* would push it into `ps` and shell history on every route, the exact cost these prefixes exist to
* pay only when they must.
*/
/**
* Single-quote a value for a shell command line. Everything is literal inside single quotes, so the
* only escape needed is for a single quote itself: end the quoting, emit an escaped `'`, reopen.
* Without this a value carrying a space or a quote would split into extra words, or unbalance the
* line outright.
*/
function shellQuote(value) {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}
/** `env K=V …` with a trailing space, ready to prepend to a command line. Values are shell-quoted. */
function envPrefix(env) {
	return `env ${Object.entries(env).map(([key, value]) => `${key}=${shellQuote(value)}`).join(" ")} `;
}
/**
* Given the env a route could not carry and the command (if any) that would run in the opened pane,
* decide how env rides in. With a command, env is prefixed onto it and the pane carries the value;
* with none, env is dropped and the caller warns. No env (or an empty map) is `carried` unchanged, so
* a caller on the losing route can call this unconditionally and get the right command back.
*/
function envFallback(env, command) {
	if (env === void 0 || Object.keys(env).length === 0) return {
		kind: "carried",
		command
	};
	if (command === void 0) return {
		kind: "dropped",
		variables: Object.keys(env)
	};
	return {
		kind: "carried",
		command: `${envPrefix(env)}${command}`
	};
}
/**
* The floating-pane refusal — the `'pane:float'` placement's answer on a backend that has no
* floating-pane concept (wezterm, herdr).
*
* Its own module rather than a member of `mux.ts` for the reason every other seam type is not a
* class: `mux.ts` is the CONTRACT and carries no runtime value, so putting the one class the
* contract's refusal needs there would make every consumer of the types import a value too. It is
* the core-surface parallel of `CaptureUnsupportedError` (`template-capture.ts`) and
* `AgentLifecycleUnsupportedError` (`agent.ts`), and it rides the `.` barrel rather than a subpath
* because the verb it refuses — `open` — is on the surface everybody gets.
*/
/**
* A floating pane asked of a backend that cannot open one (`open` with `at: 'pane:float'` on wezterm
* or herdr). A refusal, never a substitution: the nearest thing those backends could open is a tiled
* split, which takes a share of the region and resizes its other panes — exactly the property a float
* exists to avoid — so a caller would get back a pane whose id satisfies them and whose behavior does
* not. There is no truthful degrade, so there is no degrade.
*
* PORTABLE and exit-code-free by design, the exact mirror of `AgentLifecycleUnsupportedError`. The
* DECISION to refuse is the library's, made inside each adapter's `open` — the one place that sees
* both the backend and the requested placement. How the refusal SURFACES (the exit code, the fix
* hint, the exact sentence) is the CLI's, which catches this and re-raises its own
* `backend-unsupported` error. `backend` names the backend so a caller composes the message without
* re-deriving it; the terse `message` is a factual log line.
*/
var FloatingPanesUnsupportedError = class extends Error {
	backend;
	constructor(backend) {
		super(`${backend} cannot open a floating pane`);
		this.backend = backend;
		this.name = "FloatingPanesUnsupportedError";
	}
};
/**
* Refuse a `'pane:float'` open on the backend named — the single spelling of the refusal, called by
* every adapter that lacks the capability so the two cannot drift into two different messages.
*
* Takes the NAME rather than the adapter: it is called from inside `open`, where the adapter object is
* still being constructed on some backends, and the name is the only thing the error carries anyway.
*/
function refuseFloatingPane(backend) {
	throw new FloatingPanesUnsupportedError(backend);
}
/**
* The seam's own precondition on a wait pattern: EXACTLY ONE of `match`/`regex`, and a `regex` that
* compiles.
*
* Enforced here, at the seam, rather than per adapter, for `assertRatioInRange`'s reason — it is a
* universal property of what a wait pattern IS, true on every backend, not a per-backend policy. Both
* halves matter for portability in different ways: the one-of rule is refusable by herdr's CLI and by
* nothing at all on a polling backend, so leaving it to the backend would make the same call fail on
* one and silently pick a winner on another; and compiling the source turns a MALFORMED pattern into
* the same loud failure everywhere, instead of a herdr refusal on one backend and a poll that throws
* on its first read somewhere else.
*
* What it deliberately does NOT check is dialect: a pattern using ECMAScript-only syntax compiles here
* and is then herdr's own to accept or refuse (see `MuxWaitOptions.regex`). Validating against the
* intersection of two regex engines would mean shipping a third one.
*/
function assertWaitPattern(opts) {
	const hasMatch = opts.match != null;
	const hasRegex = opts.regex != null;
	if (hasMatch && hasRegex) throw new Error("wait pattern must be one of match or regex — got both");
	if (!hasMatch && !hasRegex) throw new Error("wait pattern must be one of match or regex — got neither");
	if (opts.match != null && opts.match === "") throw new Error("wait pattern match must not be empty");
	if (opts.regex != null) try {
		new RegExp(opts.regex);
	} catch (err) {
		throw new Error(`wait pattern regex is not a valid expression: ${opts.regex} — ${err.message}`);
	}
}
/**
* Whether `output` satisfies the pattern, and the single line to point at when it does.
*
* The match runs against the WHOLE snapshot, not line by line, so a regex that spans a newline still
* hits — that is why `matchedLine` is derived separately and left absent when no single line carries
* the match on its own. Pure, so the tricky half is testable with no multiplexer at all, exactly as
* `template-capture`'s geometry derivation is.
*/
function matchWaitPattern(output, opts) {
	assertWaitPattern(opts);
	const hit = (text) => opts.match != null ? text.includes(opts.match) : new RegExp(opts.regex).test(text);
	if (!hit(output)) return {
		matched: false,
		output
	};
	const line = output.split("\n").find(hit);
	return {
		matched: true,
		output,
		...line != null ? { matchedLine: line } : {}
	};
}
/**
* `waitForOutput` for a backend with NO native wait — poll its own `read` until the pattern matches or
* the deadline passes. tmux, WezTerm and Zellij all route their seam method straight through here, so
* the three share one cadence, one deadline rule and one liveness rule rather than three copies that
* can drift; herdr overrides it with its native primitive.
*
* **Reads first, sleeps second.** The snapshot on screen when the call arrives is searched before any
* sleeping, so a pattern already printed returns immediately — the seam's stated "existing output
* counts" rule, and the same order herdr's native wait documents for itself.
*
* **A gone pane throws instead of timing out**, which is `nudge`'s rule for the same reason: a dead
* pane and a quiet one both read back empty, so without the liveness probe every dead peer would be
* reported as a timeout — a shape the caller reads as "still working" — and the real cause would be
* buried. Probed BEFORE the first read (so a pane that was already gone fails at once rather than
* after the full timeout) and again after the deadline (so a pane that died mid-wait is not reported as
* one that merely stayed quiet). Never probed per poll: that would double every backend's query load
* for a fact that only changes the verdict at the end.
*/
async function pollForOutput(adapter, exec, target, opts) {
	assertWaitPattern(opts);
	const pollMs = opts.pollMs ?? 150;
	const now = opts.now ?? (() => Date.now());
	const sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
	const readOpts = opts.lines != null ? { lines: opts.lines } : void 0;
	assertPaneLive(adapter, exec, target);
	const deadline = now() + opts.timeoutMs;
	let output = "";
	for (;;) {
		output = adapter.read(exec, target, readOpts).text;
		const result = matchWaitPattern(output, opts);
		if (result.matched) return result;
		if (now() >= deadline) break;
		await sleep(pollMs);
	}
	assertPaneLive(adapter, exec, target);
	return {
		matched: false,
		output
	};
}
/** The liveness probe both ends of a poll share, throwing `nudge`'s named failure rather than letting a
* dead pane be reported as a quiet one. */
function assertPaneLive(adapter, exec, target) {
	if (!adapter.paneExists(exec, target)) throw new Error(`wait failed: pane ${target.id} no longer exists — the pane is gone, not quiet.`);
}
/**
* The seam's own precondition on `MuxOpenOptions.ratio`: a fraction STRICTLY between 0 and 1.
*
* `ratio` is the fraction kept by the ORIGINAL pane. Outside `0 < ratio < 1` there is no split it can
* name: `1 - ratio` goes negative above 1 (tmux `-l -50%` / wezterm `--percent -50`), and 0 or 1 hands
* one side the whole region and the other nothing — a mistake, never an intent worth honoring. Left
* unrendered these produce a silently broken split, not an error, which is the exact silent-wrong
* output this seam's loud-over-quiet preference exists to refuse.
*
* Enforced HERE, at the seam, rather than left to each caller, because the invariant is a universal
* property of what a ratio IS — true on every backend — not a per-caller policy. (The DEGRADE policy —
* what a caller does when a backend cannot size a split at all — genuinely stays the caller's, unchanged;
* range validity and degrade policy are different questions.) A caller cannot reach an adapter with an
* out-of-range ratio and have it silently rendered; `template`'s schema still refuses one earlier, per
* node, with a path-qualified message, so the two layers do different jobs and the seam is the backstop.
*
* The guard lives WITH the rendering: it is called by each backend's size render helper, so a backend
* that cannot size a split (zellij) renders no ratio and so never reaches this guard — a dropped value
* is never checked, valid or not, which is the same as the even-default degrade its callers already take.
*/
function assertRatioInRange(ratio) {
	if (!Number.isFinite(ratio) || ratio <= 0 || ratio >= 1) throw new Error(`ratio must be strictly between 0 and 1 — got ${ratio}`);
}
/**
* The READ WINDOW: how much of a pane a capture asks for, and whether rows sat above what came back.
*
* Both halves live here because they are one question. A capture is bounded — by the caller's `lines`,
* or by the backend's own default (the viewport on all four) — and "was anything dropped" is a
* property of that bound. Unbind the window (`lines: 'all'`) and the answer is `false` by
* construction, with no probe to spend.
*
* The truncation rule itself is shared by every adapter so the four backends answer
* `MuxReadResult.truncated` by one definition rather than four that can drift — the same reason
* `pollForOutput` owns one poll cadence for the three polling backends.
*
* Pure, and deliberately so: the tricky half of the answer is a row count, testable with no
* multiplexer at all (`template-capture`'s geometry derivation is the precedent). Each adapter owns
* only the one thing that genuinely differs — how its backend spells "one row deeper".
*/
/**
* How many terminal ROWS a capture carries.
*
* A trailing newline is a terminator, not an empty row: `capture-pane` and `dump-screen` both end
* their output with one, so counting it would make every capture look one row longer than the screen
* and — worse — would compare unequal against a probe that happened not to end with one. An empty
* capture is zero rows, not one.
*/
function capturedRows(text) {
	if (text === "") return 0;
	return (text.endsWith("\n") ? text.slice(0, -1) : text).split("\n").length;
}
/**
* Whether `capture` omitted older rows, judged against `deeper` — the SAME read taken one row further
* back.
*
* More rows in the deeper read means there was output above the captured window that the caller did
* not receive. An equal (or smaller) count means the deeper read had nothing more to give: the
* backend clamped at the top of what it holds, so the caller has everything there is.
*
* Row counts, not text equality, because the two reads are not required to render the shared rows
* identically — herdr's deeper probe reads a different `--source`, and a backend may re-wrap. What
* both reads DO agree on is how many rows they returned, and that is the whole question.
*/
function isReadTruncated(capture, deeper) {
	return capturedRows(deeper) > capturedRows(capture);
}
/**
* The row count that stands in for "the whole scrollback" on a backend whose read takes a NUMBER and
* has no all-history token of its own (WezTerm's `--start-line`, herdr's `--lines`) — tmux (`-S -`)
* and Zellij (`--full`) say it exactly and never reach for this.
*
* A million rows is past any real pane's history (tmux's own `history-limit` defaults to 2000) and
* both backends CLAMP an over-deep window to what they hold rather than failing, so this reads as
* "everything" without pretending to be a precise number. It stays under a u32, which is what herdr's
* CLI parses `--lines` as.
*/
const FULL_SCROLLBACK_LINES = 1e6;
const right = (rect) => rect.x + rect.width;
const bottom = (rect) => rect.y + rect.height;
const HORIZONTAL = {
	direction: "right",
	start: (r) => r.x,
	end: right
};
const VERTICAL = {
	direction: "down",
	start: (r) => r.y,
	end: bottom
};
/**
* The lowest cut on this axis that separates the panes cleanly, or `undefined` if none does.
*
* Taking the LOWEST rather than any is what produces a right-comb for an n-ary row: three panes side
* by side cut first into `[a][b c]`, then `[b][c]` — the exact tree `desugar`'s `comb` emits for
* `arrange: even-horizontal`, reached from the opposite direction.
*
* A candidate is any pane's start edge. It separates cleanly when every pane lies wholly before it
* or wholly after it, and both sides have something in them.
*/
function findCut(panes, axis) {
	const candidates = [...new Set(panes.map((p) => axis.start(p.rect)))].sort((a, b) => a - b);
	for (const at of candidates) {
		const first = panes.filter((p) => axis.end(p.rect) <= at);
		const second = panes.filter((p) => axis.start(p.rect) >= at);
		if (first.length === 0 || second.length === 0) continue;
		if (first.length + second.length !== panes.length) continue;
		return {
			direction: axis.direction,
			ratio: ratioOf(panes, second, axis),
			first,
			second
		};
	}
}
/**
* The fraction of the split region kept by `first` — the schema's `ratio`.
*
* Measured as the COMPLEMENT of what `second` occupies, over the whole region: `1 - second/total`.
* The obvious `first / (first + second)` is subtly wrong on any backend that draws a divider, and
* the arithmetic says why — tmux splitting a 50-row region reports 34 + 15, with the 51st row eaten
* by the divider. `first / (first + second)` reads 34/49 = 0.69; the true split was 0.7, and the
* divider row belongs to neither pane's height while still costing the region a row.
*
* Taking the complement puts that row back where the backend's own arithmetic puts it: tmux's `-l`
* sizes the NEW pane, so `second` is exactly the fraction asked for and `first` keeps the rest,
* divider included. That reads 1 - 15/50 = 0.7 — the number the split was actually made with. On a
* backend with no divider (herdr) the two formulas agree, so nothing is traded for the fix.
*
* Both checked against live binaries: this recovers tmux's `-l 40%`/`-l 30%` splits as 0.6/0.7
* exactly, and reproduces herdr's to within the cell it rounds to.
*/
function ratioOf(all, second, axis) {
	const total = extent(all, axis);
	if (total <= 0) return .5;
	return 1 - extent(second, axis) / total;
}
/** How far a group of panes reaches along an axis — its bounding box on that axis. */
function extent(panes, axis) {
	const starts = panes.map((p) => axis.start(p.rect));
	const ends = panes.map((p) => axis.end(p.rect));
	return Math.max(...ends) - Math.min(...starts);
}
/**
* Cut the region into a binary tree, recursively.
*
* **`right` is tried before `down`, and the order is load-bearing on a grid.** A 2x2 is genuinely
* ambiguous — cutting it vertically first and horizontally first both describe the same screen, and
* neither is more true. Columns-then-rows is the tie-break because that is what `desugar`'s `tiled`
* emits, so a tiled pool exports back as the tree it was built from rather than its transpose.
*
* A region no cut separates cannot come out of a multiplexer: both backends build regions BY
* splitting, so every region they can report is guillotine-cuttable by construction. Reaching the
* throw means the geometry did not come from where we think it did — which is worth saying loudly
* rather than papering over with a tree that misplaces the user's panes.
*/
function partition(panes) {
	if (panes.length === 1) return {
		type: "pane",
		pane: panes[0]
	};
	const cut = findCut(panes, HORIZONTAL) ?? findCut(panes, VERTICAL);
	if (!cut) throw new Error(`this region's panes do not form a splittable tree (${panes.length} panes: ${panes.map((p) => p.id).join(", ")}) — export can only capture a region built by splitting`);
	return {
		type: "split",
		direction: cut.direction,
		ratio: cut.ratio,
		first: partition(cut.first),
		second: partition(cut.second)
	};
}
/**
* The split a pane sits DIRECTLY inside, with the numbers a resize needs — or `undefined` when the
* region has no split at all (a single-pane region: nothing to take a fraction of).
*
* **The target is always one WHOLE side of the split it encloses.** That falls out of the guillotine
* derivation rather than being asserted: a leaf's parent is the last cut before it, so whichever side
* of that cut the target lands on holds the target and nothing else. The OTHER side may be a group of
* panes, which is why it is reported as an extent rather than a pane — a backend sizes the target, and
* the group on the far side takes what is left.
*
* **Extents, not ratios alone, because the backends need different arithmetic.** tmux's
* `resize-pane -x/-y` takes CELLS, so it needs the split region's extent to turn a fraction into one;
* herdr's `pane resize --amount` takes a ratio DELTA, so it needs the fraction the split is at now.
* Reporting both raw facts keeps the per-backend conversion in the adapter that owns it — the same
* split `MuxOpenOptions.ratio` already makes, where the seam's number is one thing and each backend's
* rendering of it is another.
*
* **`extent` includes the divider a backend draws.** It is the split region's own span, so on tmux
* `targetExtent + otherExtent` falls one short of it and on herdr the two add up exactly. Neither
* adapter hard-codes which: the divider is `extent - targetExtent - otherExtent`, measured from the
* rects the backend just reported.
*/
function enclosingSplit(panes, paneId) {
	if (!panes.some((p) => p.id === paneId)) throw new Error(`pane ${paneId} is not in the region described (${panes.map((p) => p.id).join(", ")})`);
	let node = partition(panes);
	while (node.type === "split") {
		const split = node;
		const targetIsFirst = holds(split.first, paneId);
		const side = targetIsFirst ? split.first : split.second;
		const other = targetIsFirst ? split.second : split.first;
		if (side.type !== "pane") {
			node = side;
			continue;
		}
		const axis = split.direction === "right" ? HORIZONTAL : VERTICAL;
		return {
			direction: split.direction,
			targetIsFirst,
			firstRatio: split.ratio,
			extent: extent(leaves(split), axis),
			targetExtent: extent([side.pane], axis),
			otherExtent: extent(leaves(other), axis)
		};
	}
}
/** Whether `paneId` is somewhere under `node`. */
function holds(node, paneId) {
	return leaves(node).some((p) => p.id === paneId);
}
/** Every pane under `node`, in order. */
function leaves(node) {
	return node.type === "pane" ? [node.pane] : [...leaves(node.first), ...leaves(node.second)];
}
/**
* herdr backend — detected via `$HERDR_ENV`. herdr (https://herdr.dev) is an agent-aware terminal
* multiplexer that also reports real busy-state (working / idle / blocked / done); this adapter
* only drives its pane lifecycle, not the state feed. Talks to herdr's own CLI (`herdr pane ...`)
* rather than its Unix-socket API, so it composes with this codebase's synchronous `Exec`
* convention exactly like the tmux adapter — no new client/transport needed.
*
* The pane lifecycle (split/run/read/close) is verified against a live herdr binary; `pane split`
* returns a JSON `pane_info` envelope whose id is extracted in `parsePaneId`.
*
* **Verified against 0.8.2** (protocol 20), re-probed against a live server by re-running
* `mux.herdr.integration.test.ts` — the real-boundary suite, not a hand check. Everything this
* adapter drives held: the split/read/run/send-keys lifecycle, `pane wait-output`'s success and
* error envelopes, `pane list`/`get`/`layout`, `workspace create`/`tab create`, and the `env` and
* worktree parameter sets below. The per-claim markers that follow name the version each was LAST
* established against — a claim still reading 0.7.4/0.7.5/0.8.0 is one a later release gave no
* occasion to re-measure (no attached client, or no live agent in the pane), not one that failed.
*
* What 0.8.2 did NOT re-establish, stated so the claim above is not read wider than it is: the two
* current-pane-context opens (`at:'tab'`, `at:'pane:right'`) skip when the suite runs INSIDE a herdr
* pane, and they are the only cases that exercise `--current`. 0.8.2 fixed `pane current`, `pane
* get`, and `pane layout --current` to resolve the CALLING pane rather than another client's focused
* pane (herdr #2297, #2298) — but that fix names none of `pane split`, which is where this file's one
* `--current` sits. So the 0.7.4 caveat on it below stands, unmeasured against 0.8.2 rather than
* re-confirmed.
*/
const herdrMuxAdapter = {
	name: "herdr",
	canSizeSplits: true,
	/**
	* Every creating verb this adapter issues carries `--no-focus`, so no open moves the user.
	*
	* `workspace create` and `tab create` have carried it from the start. `pane split` did NOT, and
	* measuring it against a live 0.8.2 is what settled whether that was a hole: with the client
	* focused on the pane being split, a bare `herdr pane split` left focus exactly where it was, and
	* so did the same command with `--no-focus`. herdr's split simply does not activate what it
	* creates. So the flag added there is a measured NO-OP today, and it is passed anyway — the seam
	* now DECLARES this property, and a declaration backed by a backend default is one a future herdr
	* release can falsify without anything here having to be wrong first. Every route saying what it
	* wants is what makes the boolean above enforceable rather than incidental.
	*
	* No focus move to undo on top of that: `pane split <id>` names its target directly, so herdr
	* never has to VISIT a pane to choose which one gets split.
	*/
	/**
	* `true` — `herdr pane zoom <PANE_ID> --on|--off`, the one backend on this seam whose native verb is
	* already ABSOLUTE rather than a toggle. Driven live on 0.9.0, and pinned to the 0.8.0 CI pin from
	* that binary's OWN bundled schema rather than from a version guess: `herdr api schema --json` on
	* 0.8.0 (protocol 19) carries `pane.zoom` with `PaneZoomParams { mode, pane_id }`, and its
	* `PaneLayoutSnapshot` REQUIRES both `zoomed: boolean` and `focused_pane_id: string` — the two
	* fields `isPaneZoomed` composes. So neither half of this member depends on a herdr newer than the
	* one `pull-request.yml` drives. (0.8.0 could not be driven directly here: it answers a 0.9.0
	* server with `protocol_mismatch`, and herdr has no throwaway-server mode to start an old one
	* beside it.)
	*/
	canZoomPanes: true,
	/**
	* `true` for both, and herdr is the one backend that spells them as a SINGLE verb: `herdr pane
	* move <PANE_ID>`, whose own usage prints three mutually exclusive forms —
	* `--tab <id> --split right|down [--target-pane <id>]`, `--new-tab [--workspace <id>]`, and
	* `--new-workspace`. Driven live on 0.9.0 in a throwaway workspace for all three.
	*
	* Pinned to the 0.8.0 CI pin against that binary directly rather than by a version guess: the
	* v0.8.0 release binary's `pane move --help` lists exactly the same option set (`--tab --split
	* --target-pane --ratio --new-tab --workspace --new-workspace --label --tab-label
	* --focus --no-focus`), so neither member depends on a herdr newer than the one
	* `pull-request.yml` drives.
	*/
	canMovePanes: true,
	canBreakPanes: true,
	/**
	* `'preserved'`: `--no-focus` is a real flag on `workspace create`, `tab create` and `pane split`,
	* and every route passes it. `pane split --pane` names the anchor directly, so no route has to
	* focus a pane in order to choose one — there is nothing to undo on top of the suppression.
	*/
	focusOnOpen: "preserved",
	open(exec, opts) {
		const at = opts.at ?? "tab";
		const label = opts.label ? ["--label", opts.label] : [];
		const env = envFlags(opts.env);
		let opened;
		if (at === "workspace") {
			const out = exec("herdr", [
				"workspace",
				"create",
				"--cwd",
				opts.cwd,
				...label,
				...env,
				"--no-focus"
			]);
			if (!out) throw new Error(withReason(exec, "herdr workspace create failed"));
			opened = parseRootPaneId(out, "herdr workspace create");
		} else if (at === "tab") {
			const out = exec("herdr", [
				"tab",
				"create",
				...opts.within ? ["--workspace", opts.within] : [],
				"--cwd",
				opts.cwd,
				...label,
				...env,
				"--no-focus"
			]);
			if (!out) throw new Error(withReason(exec, "herdr tab create failed"));
			opened = parseRootPaneId(out, "herdr tab create");
		} else if (at === "pane:float") refuseFloatingPane(herdrMuxAdapter.name);
		else {
			const direction = at === "pane:down" ? "down" : "right";
			const from = opts.from ? [opts.from.id] : ["--current"];
			const size = opts.ratio != null ? ["--ratio", toHerdrRatio(opts.ratio)] : [];
			const out = exec("herdr", [
				"pane",
				"split",
				...from,
				"--direction",
				direction,
				"--cwd",
				opts.cwd,
				...size,
				...env,
				"--no-focus"
			]);
			if (!out) throw new Error(withReason(exec, "herdr pane split failed"));
			opened = parsePaneId(out);
			if (opts.label) herdrMuxAdapter.rename(exec, opened, "pane", opts.label);
		}
		if (opts.launch) herdrMuxAdapter.submit(exec, opened, opts.launch);
		return opened;
	},
	rename(exec, target, tier, name) {
		exec("herdr", [
			tier,
			"rename",
			target.id,
			name
		]);
	},
	group() {},
	worktree: herdrWorktreeCapability(),
	sendText(exec, target, text) {
		exec("herdr", [
			"pane",
			"send-text",
			target.id,
			text
		]);
	},
	sendKeys(exec, target, keys) {
		exec("herdr", [
			"pane",
			"send-keys",
			target.id,
			...keys
		]);
	},
	submit(exec, target, text) {
		if (!text) {
			exec("herdr", [
				"pane",
				"send-keys",
				target.id,
				"Enter"
			]);
			return;
		}
		exec("herdr", [
			"pane",
			"run",
			target.id,
			text
		]);
	},
	/**
	* 0.8.0 added a `truncated` boolean to the read result, and it is REQUIRED in the socket schema's
	* `PaneReadResult` — but it is not reachable from here, and that is a fact about the CLI rather than
	* a choice: `herdr pane read` prints the pane's bare TEXT, no envelope, and its only 0.8.0 additions
	* are `--format`/`--ansi`/`--raw`, which select the text's escaping. There is no `--json`. So the
	* flag rides the socket API this adapter deliberately does not speak, and the one CLI surface that
	* does hand back the envelope is `pane wait-output` (`.result.read.truncated` — seen live on 0.8.0).
	* Surfacing truncation therefore costs a return-shape change, not a flag; see issue #100, which owns
	* it across all four backends. Noted here so the next reader does not re-derive the dead end.
	*/
	read(exec, target, opts) {
		if (opts?.lines === "all") {
			const text = paneRead(exec, target, "recent", FULL_SCROLLBACK_LINES);
			return opts.truncation ? {
				text,
				truncated: false
			} : { text };
		}
		const text = paneRead(exec, target, "visible", opts?.lines);
		if (!opts?.truncation) return { text };
		return {
			text,
			truncated: isReadTruncated(text, paneRead(exec, target, "recent", capturedRows(text) + 1))
		};
	},
	/**
	* The one backend with a NATIVE wait: `pane wait-output` blocks in herdr itself (arrived in 0.7.5,
	* still native in 0.8.0), so no poll loop is run here and no snapshot is pulled across the CLI
	* boundary on every tick.
	*
	* `--source visible` is pinned rather than left to herdr's own default (`recent_unwrapped`, verified
	* against 0.7.5 — the help still says `recent` in 0.8.0). The seam's rule is that a wait searches exactly what
	* `read` returns, and `read` pins `visible` here; taking the default would make the same wait mean a
	* different snapshot on this backend than on every polling one.
	*
	* Telling a TIMEOUT (an answer) from a broken wait (a failure) is the whole difficulty, because herdr
	* spells both the same way: exit 1 with an error envelope on stderr, so `Exec` yields `null` for
	* either. Two tiers answer it, in order:
	*
	* 1. **The envelope's `code`**, when the runner captured stderr into `lastError` (re-verified against
	*    0.8.0: `{"error":{"code":"timeout",…}}` vs `{"error":{"code":"pane_not_found",…}}`). Exact.
	* 2. **A live pane that actually consumed the deadline**, when it did not. `Exec.lastError` is
	*    specified as a diagnostic and NEVER a control-flow signal — a runner that discards stderr must
	*    still work — so the code cannot be the only answer. Liveness alone is not enough either, and the
	*    reason is a whole released version of the backend: herdr 0.7.4 has no `pane wait-output` at all,
	*    so it answers with clap's usage text (not an envelope) INSTANTLY, and a liveness-only rule reads
	*    that as "timed out" — a silently wrong answer for a wait that never ran. Elapsed time is the fact
	*    that separates them and needs no stderr: a wait that returns in a fraction of its own timeout did
	*    not wait. Both must hold — the pane is live AND the deadline was spent — or this throws.
	*
	* A timeout costs ONE extra `read`, because herdr's timeout envelope carries no snapshot and the seam
	* promises the caller the evidence its verdict was reached on. It is taken at the deadline, so it is
	* the same "last look at the pane" a polling backend returns, one poll interval later.
	*/
	async waitForOutput(exec, target, opts) {
		assertWaitPattern(opts);
		const now = opts.now ?? (() => Date.now());
		const pattern = opts.match != null ? ["--match", opts.match] : ["--regex", opts.regex];
		const args = [
			"pane",
			"wait-output",
			target.id,
			"--source",
			"visible",
			"--timeout",
			String(opts.timeoutMs)
		];
		args.push(...pattern);
		if (opts.lines != null) args.push("--lines", String(opts.lines));
		const started = now();
		const out = exec("herdr", args);
		if (out == null) {
			if (!isHerdrWaitTimeout(exec, target, opts.timeoutMs, now() - started)) throw new Error(withReason(exec, `herdr pane wait-output failed for pane ${target.id}`));
			const readOpts = opts.lines != null ? { lines: opts.lines } : void 0;
			return {
				matched: false,
				output: herdrMuxAdapter.read(exec, target, readOpts).text
			};
		}
		return parseWaitOutput(out);
	},
	focus(exec, target) {
		const { workspaceId, tabId } = parsePaneLocation$2(exec("herdr", [
			"pane",
			"get",
			target.id
		]), target.id);
		exec("herdr", [
			"workspace",
			"focus",
			workspaceId
		]);
		exec("herdr", [
			"tab",
			"focus",
			tabId
		]);
	},
	teardown(exec, target) {
		exec("herdr", [
			"pane",
			"close",
			target.id
		]);
	},
	paneExists(exec, target) {
		return exec("herdr", [
			"pane",
			"read",
			target.id,
			"--source",
			"visible"
		]) !== null;
	},
	isPaneFocused(exec, target) {
		const out = exec("herdr", [
			"pane",
			"get",
			target.id
		]);
		if (out == null) return void 0;
		try {
			const focused = JSON.parse(out)?.result?.pane?.focused;
			return typeof focused === "boolean" ? focused : void 0;
		} catch {
			return;
		}
	},
	/**
	* `pane zoom <id> --on|--off` — herdr is the only backend here whose own verb is absolute, so no
	* toggle has to be composed. It is idempotent too: a second `--on` on an already-zoomed pane
	* answered `{"changed":false,"focus_changed":false}` on a live 0.9.0.
	*
	* **The guard is still not optional, and this is the backend that proves why.** herdr's zoom is a
	* TAB-tier fact — `pane layout` reports one `zoomed` for the whole tab — and `--off` names the pane
	* to FOCUS, not the pane to unzoom. Measured on 0.9.0 in a throwaway workspace: with p2 zoomed,
	* `herdr pane zoom p3 --off` unzoomed **p2** and moved focus to p3. So an unguarded
	* `setPaneZoom(p3, false)` — a request that asks for nothing, since p3 was never zoomed — would
	* silently unzoom a pane the caller never named. Reading first turns that into the no-op the seam
	* promises.
	*
	* `--on` moves focus to the pane (`focus_changed: true` on the same probe), which
	* `MuxAdapter.setPaneZoom` declares rather than compensates; `--off` on the zoomed pane moves
	* nothing, since that pane already holds the focus.
	*/
	setPaneZoom(exec, target, zoomed) {
		if (herdrMuxAdapter.isPaneZoomed(exec, target) === zoomed) return;
		if (exec("herdr", [
			"pane",
			"zoom",
			target.id,
			zoomed ? "--on" : "--off"
		]) == null) throw new Error(withReason(exec, `herdr could not ${zoomed ? "zoom" : "unzoom"} pane ${target.id}`));
	},
	/**
	* `pane layout --pane <id>`, whose payload carries `zoomed` for the TAB plus `focused_pane_id` —
	* so the per-pane answer the seam promises is the conjunction, tmux's shape under different key
	* names. Verified live on 0.9.0.
	*
	* `pane list` is deliberately NOT the source, and its absence is why `LivePane` grew no `zoomed`
	* column: a live 0.9.0 `herdr pane list` carries no zoom key on any record at all, so the only
	* read herdr has costs one call PER TAB. See `MuxAdapter.isPaneZoomed`.
	*
	* Parsed defensively, exactly as `isPaneFocused` is: null output, an error envelope, a missing or
	* non-boolean `zoomed`, or a parse failure all fold to `undefined` rather than a false `false`.
	*/
	isPaneZoomed(exec, target) {
		const out = exec("herdr", [
			"pane",
			"layout",
			"--pane",
			target.id
		]);
		if (out == null) return void 0;
		try {
			const layout = JSON.parse(out)?.result?.layout;
			if (typeof layout?.zoomed !== "boolean") return void 0;
			return layout.zoomed === true && layout.focused_pane_id === target.id;
		} catch {
			return;
		}
	},
	/**
	* `pane move <src> --tab <dst tab> --split <side> --target-pane <dst> --no-focus`.
	*
	* The DESTINATION PANE's tab has to be resolved first, because `--tab` is not optional: herdr
	* refuses the command outright without it (its usage line is `move <pane_id> --tab <tab_id>
	* --split right|down …`, and the flagless form printed usage and did nothing on 0.9.0). The seam's
	* destination is a pane, so `pane get <dst>` supplies the tab and the pane rides along as
	* `--target-pane` — which is what makes the placement the caller's rather than herdr's, since
	* `--tab` alone splits whichever pane that tab happens to have focused.
	*
	* `--no-focus` for the reason every other route here passes it: a driver moving a pane should not
	* drag the human's view along. Measured on 0.9.0 — the destination tab's own focused pane was
	* unchanged afterwards.
	*
	* herdr NO-OPS a move into the tab the pane is already in, `--target-pane` or not
	* (`{"changed":false}` on 0.9.0, with the pane left exactly where it was). That is reported as it
	* happened: the returned `OpenedPane` is the pane's real, unchanged location rather than the one
	* the caller asked for.
	*/
	movePane(exec, target, destination, side) {
		const { tabId } = parsePaneRecord(exec("herdr", [
			"pane",
			"get",
			destination.id
		]));
		if (!tabId) throw new Error(`herdr could not resolve the tab of destination pane ${destination.id}`);
		const out = exec("herdr", [
			"pane",
			"move",
			target.id,
			"--tab",
			tabId,
			"--split",
			side,
			"--target-pane",
			destination.id,
			"--no-focus"
		]);
		if (!out) throw new Error(withReason(exec, `herdr could not move pane ${target.id} to ${destination.id}`));
		return parseMovedPane(out, "herdr pane move");
	},
	/**
	* `pane move <src> --new-tab|--new-workspace --no-focus` — the same verb as `movePane`, a disjoint
	* flag set, which is why the seam keeps them as two members rather than one.
	*
	* **`--new-workspace` REWRITES THE PANE ID**, and this is the backend that forced `breakPane` to
	* return an `OpenedPane` at all: herdr ids are workspace-scoped, so on 0.9.0 `pane move wRT:p2
	* --new-workspace` answered with the same terminal carrying the id `wRV:p1`. The old id keeps
	* resolving as an alias and disappears from `pane list` — see `parseMovedPane`. `--new-tab` keeps
	* the id and changes only the tab.
	*
	* Both forms mint a fresh space even when the pane is ALREADY alone in its tab — measured, a
	* second `--new-tab` moved `wRD:t3` to `wRD:t4` — which is where herdr differs from tmux's no-op,
	* a difference `MuxAdapter.breakPane` declares rather than hides.
	*/
	breakPane(exec, target, at) {
		const out = exec("herdr", [
			"pane",
			"move",
			target.id,
			at === "workspace" ? "--new-workspace" : "--new-tab",
			"--no-focus"
		]);
		if (!out) throw new Error(withReason(exec, `herdr could not break out pane ${target.id} into its own ${at}`));
		return parseMovedPane(out, "herdr pane move");
	},
	listPanes(exec) {
		const out = exec("herdr", ["pane", "list"]);
		if (!out) return [];
		let panes;
		try {
			panes = JSON.parse(out)?.result?.panes;
		} catch {
			return [];
		}
		if (!Array.isArray(panes)) return [];
		return panes.filter((p) => typeof p?.pane_id === "string").map((p) => {
			const harness = p.agent || void 0;
			const label = p.label || void 0;
			const agentStatus = toAgentStatus(p.agent_status);
			return {
				id: p.pane_id,
				mux: "herdr",
				floating: false,
				...harness !== void 0 ? { harness } : {},
				...agentStatus !== void 0 ? { agentStatus } : {},
				...p.cwd !== void 0 ? { cwd: p.cwd } : {},
				...label !== void 0 ? { label } : {}
			};
		});
	},
	regions: {
		describeRegion(exec, target) {
			return herdrRegionPanes(exec, target.id, herdrPaneDetails(exec));
		},
		/**
		* `pane resize --direction <d> --amount <f>` — a signed DELTA on the enclosing split's ratio,
		* which is why the current ratio has to be read first. herdr's `--direction` names where the
		* DIVIDER moves, not which pane grows: `right`/`down` raise the split's ratio and `left`/`up`
		* lower it, whichever side of it the `--pane` sits on. So the target's side never enters the
		* direction — only the sign of the delta does.
		*
		* The current ratio is derived from the RECTS, not read off `layout.splits[].ratio`, for
		* `describeRegion`'s reason exactly: the splits array is flat and its parent links live only in
		* an undocumented id convention (`split_1_0`), so matching a pane to its split there would bet on
		* a spelling herdr never promised. The rects say the same thing in a fact it does promise.
		*
		* Verified against a live herdr 0.8.2 (`mux.herdr.integration.test.ts`), which is also where the
		* `--direction` semantics above were established: `--direction right --amount 0.1` moved a 0.5
		* split to 0.6 whether the `--pane` was the left one or the right one, and on a nested region
		* `--direction down` resized the enclosing stacked split rather than the outer one.
		*/
		resizePane(exec, target, ratio) {
			const split = enclosingSplit(herdrRegionPanes(exec, target.id, herdrPaneDetails(exec)), target.id);
			if (!split) throw new Error(`herdr pane ${target.id} is the only pane in its region — there is no split to resize`);
			const delta = toHerdrResizeDelta(split, ratio);
			if (delta === 0) return;
			const direction = herdrResizeDirection(split.direction, delta);
			if (exec("herdr", [
				"pane",
				"resize",
				"--pane",
				target.id,
				"--direction",
				direction,
				"--amount",
				String(Math.abs(delta))
			]) === null) throw new Error(withReason(exec, `herdr could not resize pane ${target.id}`));
		},
		/**
		* herdr HAS a workspace tier, so the workspace is a fact the backend holds rather than one
		* cyber-mux has to reconstruct: the caller's pane names its `workspace_id`, `tab list --workspace`
		* enumerates that workspace's tabs, and `pane list --workspace` hands back every pane already
		* stamped with the tab it sits in. No grouping tag is read here and none is written — the tier IS
		* the group, which is exactly why `open` ignores `workspaceGroup` on this backend.
		*
		* The one indirection: geometry is per-PANE (`pane layout --pane`), never per-tab, so each tab's
		* rects are fetched through any one pane that sits in it. That is safe and race-free, and both
		* halves were established against 0.7.4: `pane layout` reports live geometry for an UNFOCUSED tab
		* in a DIFFERENT workspace, so nothing has to be focused first and nothing moves while this runs.
		*
		* herdr's own native per-tab layout export would be the obvious road — it takes a `tab_id` — but
		* `layout` is still NOT a CLI verb in 0.8.0 (its top-level help lists no such subcommand); it is
		* socket-API-only, and this adapter speaks the CLI by design (so it composes with the synchronous
		* `Exec` seam). The road is closed, hence the pane indirection.
		*/
		describeWorkspace(exec, target) {
			const { workspaceId } = parsePaneRecord(exec("herdr", [
				"pane",
				"get",
				target.id
			]));
			if (!workspaceId) throw new Error(withReason(exec, `herdr could not resolve the workspace around pane ${target.id}`));
			const out = exec("herdr", [
				"tab",
				"list",
				"--workspace",
				workspaceId
			]);
			if (!out) throw new Error(withReason(exec, `herdr could not enumerate the tabs of workspace ${workspaceId}`));
			let reported;
			try {
				reported = JSON.parse(out)?.result?.tabs;
			} catch {
				throw new Error(`herdr tab list returned unparseable output: ${out.slice(0, 200)}`);
			}
			if (!Array.isArray(reported) || reported.length === 0) throw new Error(`herdr reported no tabs in workspace ${workspaceId}: ${out.slice(0, 200)}`);
			const details = herdrPaneDetails(exec, workspaceId);
			const tabs = [];
			for (const reportedTab of reported) {
				if (typeof reportedTab?.tab_id !== "string") continue;
				const tabId = reportedTab.tab_id;
				const anchor = [...details].find(([, detail]) => detail.tab === tabId)?.[0];
				if (!anchor) throw new Error(`herdr reported no panes in tab ${tabId} of workspace ${workspaceId}`);
				const tab = {
					id: tabId,
					panes: herdrRegionPanes(exec, anchor, details)
				};
				if (typeof reportedTab.label === "string" && reportedTab.label !== "") tab.label = reportedTab.label;
				tabs.push(tab);
			}
			if (tabs.length === 0) throw new Error(`herdr reported no usable tabs in workspace ${workspaceId}: ${out.slice(0, 200)}`);
			return tabs;
		}
	},
	agentLifecycle: { waitForState(exec, target, opts) {
		const until = opts.until ?? [];
		const status = parseReachedAgentStatus(exec("herdr", [
			"agent",
			"wait",
			target.id,
			...until.flatMap((state) => ["--until", state]),
			...opts.timeoutMs != null ? ["--timeout", String(opts.timeoutMs)] : []
		]));
		if (!status) throw new Error(withReason(exec, `herdr agent wait reported no reached agent_status for pane ${target.id}`));
		return status;
	} }
};
/**
* The set of `agent_status` values herdr reports — unchanged through 0.8.0, whose socket schema still
* declares `AgentStatus` as exactly this enum, and whose `agent wait --until` still lists exactly these
* five values. The runtime witness of the `AgentStatus`
* type, so a string read off a herdr envelope can be NARROWED to it rather than cast. A value outside
* this set is treated as absent (the feed said something this build does not model), never forced into
* the type.
*/
const AGENT_STATUSES = [
	"idle",
	"working",
	"blocked",
	"done",
	"unknown"
];
/** A value narrowed to `AgentStatus`, or `undefined` for anything else (a non-string, an empty string,
* or a status this build does not model) — the normalization both the listing and the wait share. */
function toAgentStatus(value) {
	return typeof value === "string" && AGENT_STATUSES.includes(value) ? value : void 0;
}
/**
* The `AgentStatus` a `herdr agent wait` run reached, read defensively from its JSON envelope —
* `{"result":{"agent":{…,"agent_status":"idle",…},"type":"agent_info"}}` (verified against 0.7.5), so
* the reached status lives at `.result.agent.agent_status`. Every unresolvable shape — `out` is null
* (an Exec failure), the JSON does not parse, or the field is missing/empty/unmodeled — folds to
* `undefined`, exactly as `parsePaneRecord`/`isPaneFocused` fold, so the caller states its own failure.
*/
function parseReachedAgentStatus(out) {
	if (out == null) return void 0;
	try {
		return toAgentStatus(JSON.parse(out)?.result?.agent?.agent_status);
	} catch {
		return;
	}
}
/**
* The rects of the region `paneId` sits in, joined with the cwd/label half.
*
* Two sources, because herdr splits the answer across two verbs: `pane layout` reports the region's
* rects (`layout.panes[].rect`) but carries no cwd and no label, while `pane list` carries both and
* no geometry. Neither alone can build a template — hence `details` is passed IN, so a caller reading
* many tabs pays for that list once rather than once per tab.
*
* `layout.splits[]` is deliberately ignored even though it reports `direction` and `ratio` outright.
* It is FLAT — `[{id:"split_0_root",...},{id:"split_1_0",...}]` — so the tree is recoverable only by
* parsing the parent out of that id string, a convention herdr's CLI help never documents and could
* respell without warning. The rects say the same thing in a fact herdr does promise, so the
* derivation runs off those; see `RegionInspector.describeRegion` in `mux.ts`.
*/
function herdrRegionPanes(exec, paneId, details) {
	const out = exec("herdr", [
		"pane",
		"layout",
		"--pane",
		paneId
	]);
	if (!out) throw new Error(withReason(exec, `herdr could not describe the region around pane ${paneId}`));
	let reported;
	try {
		reported = JSON.parse(out)?.result?.layout?.panes;
	} catch {
		throw new Error(`herdr pane layout returned unparseable output: ${out.slice(0, 200)}`);
	}
	if (!Array.isArray(reported) || reported.length === 0) throw new Error(`herdr pane layout reported no panes for ${paneId}: ${out.slice(0, 200)}`);
	return reported.filter((p) => typeof p?.pane_id === "string").map((p) => {
		const detail = details.get(p.pane_id);
		const pane = {
			id: p.pane_id,
			rect: {
				x: p.rect?.["x"] ?? 0,
				y: p.rect?.["y"] ?? 0,
				width: p.rect?.["width"] ?? 0,
				height: p.rect?.["height"] ?? 0
			}
		};
		if (detail?.cwd) pane.cwd = detail.cwd;
		if (detail?.label) pane.label = detail.label;
		return pane;
	});
}
/**
* Each pane's cwd, label and tab, keyed by pane id — the half `pane layout` does not report.
*
* `workspace` scopes the list to one workspace when the caller has one to scope by; omitting it lists
* every pane herdr can see, which is what a single-region read wants (it keys by pane id and never
* cares which workspace a pane came from).
*/
function herdrPaneDetails(exec, workspace) {
	const details = /* @__PURE__ */ new Map();
	const out = exec("herdr", [
		"pane",
		"list",
		...workspace ? ["--workspace", workspace] : []
	]);
	if (!out) return details;
	let panes;
	try {
		panes = JSON.parse(out)?.result?.panes;
	} catch {
		return details;
	}
	if (!Array.isArray(panes)) return details;
	for (const pane of panes) {
		if (typeof pane?.pane_id !== "string") continue;
		details.set(pane.pane_id, {
			cwd: pane.cwd,
			label: pane.label,
			tab: pane.tab_id
		});
	}
	return details;
}
/**
* herdr's repeatable `--env KEY=VALUE` — spelled the same way by exactly three verbs: `pane split`,
* `workspace create` and `tab create`, each backed by a native `env` Record in the socket schema
* (protocol 16).
*
* `worktree create`/`worktree open` are deliberately NOT in that list: their params are
* `[base, branch, cwd, focus, label, path, workspace_id]` and
* `[branch, cwd, focus, label, path, workspace_id]` — no `env` — and herdr rejects the flag with
* `unknown option: --env`. A caller needing env on that route uses the command-prefix fallback.
* Re-verified against 0.8.0: both param sets are unchanged in protocol 19's schema, and a live
* `worktree create --env` there still answers `unknown option: --env`.
*/
function envFlags(env) {
	return env ? Object.entries(env).flatMap(([k, v]) => ["--env", `${k}=${v}`]) : [];
}
/**
* The seam's `ratio` as the SIGNED delta `pane resize --amount` wants, in the same fraction-of-the-
* split-region units herdr's own `--ratio` uses at birth.
*
* Both numbers are the FIRST side's fraction, so the target's side is folded in here (`1 - ratio` when
* the target is the second side) and the direction below reads only the sign. Measured against the
* split's current ratio as `region-tree.ts` derives it, never against `layout.splits[].ratio` — one
* definition of "what this split is at" seam-wide is what makes a resize to the ratio a region was
* just described at a no-op.
*/
function toHerdrResizeDelta(split, ratio) {
	assertRatioInRange(ratio);
	const delta = (split.targetIsFirst ? ratio : 1 - ratio) - split.firstRatio;
	return Math.round(delta * 1e6) / 1e6;
}
/**
* Which way herdr moves the divider for a delta of this sign, on a split of this axis.
*
* `right`/`down` RAISE the enclosing split's ratio and `left`/`up` lower it — established against a
* live 0.8.2 rather than read off `--help`, which lists the four values and says nothing about what
* they move. The axis picks the pair because herdr resolves `--direction` against the nearest ancestor
* split on that axis: asking `right` of a pane inside a stacked split walks past it to the outer one,
* which would resize a split the caller never named.
*/
function herdrResizeDirection(axis, delta) {
	if (axis === "right") return delta > 0 ? "right" : "left";
	return delta > 0 ? "down" : "up";
}
/**
* `--ratio` takes the seam's number VERBATIM — herdr sizes the ORIGINAL pane, so no inversion, unlike
* tmux's `-l` and wezterm's `--percent`. The guard is the same one those two render helpers call: the
* seam refuses an out-of-range ratio here rather than pass `--ratio 5` (or `0`) through to a split herdr
* would then size wrong.
*/
function toHerdrRatio(ratio) {
	assertRatioInRange(ratio);
	return String(ratio);
}
/**
* Launch a command in a worktree's root pane, carrying env the worktree verb could not set at birth.
* The prefix-or-warn rule is the seam's (`env-fallback.ts`); this is the one route that invokes it,
* because it is the one route that loses env. With a command, env rides in as a prefix; with none and
* env asked for, it warns to stderr (stdout stays machine-readable) rather than dropping in silence.
*/
function carryLaunch(exec, target, env, launch) {
	const fallback = envFallback(env, launch);
	if (fallback.kind === "dropped") {
		process.stderr.write(`env (${fallback.variables.join(", ")}) could not be set on this worktree's workspace and no command was given to carry it — herdr worktree create/open take no env parameter
`);
		return;
	}
	if (fallback.command !== void 0) herdrMuxAdapter.submit(exec, target, fallback.command);
}
/**
* `herdr pane split` emits a JSON envelope, not a bare id:
* `{"id":"cli:pane:split","result":{"pane":{"pane_id":"w3:pB", ...},"type":"pane_info"}}`.
* The pane id herdr's other `pane` subcommands accept lives at `.result.pane.pane_id`. Extract it —
* passing the whole blob downstream lands it in a filename and blows the path length limit.
*/
function parsePaneId(out) {
	return parseOpenedPane(out, "herdr pane split", "pane");
}
/**
* `herdr pane get <id>` emits `{"result":{"pane":{"workspace_id":...,"tab_id":...,...}}}`, or an
* error envelope when the id no longer names a live pane. Every unresolvable shape — `out` is null
* (an Exec failure), the JSON does not parse, or a field is missing/empty/not a string — folds to the
* field simply being absent, so each caller states its OWN failure rather than inheriting one
* phrased for somebody else's verb.
*/
function parsePaneRecord(out) {
	if (out == null) return {};
	try {
		const pane = JSON.parse(out)?.result?.pane;
		return {
			workspaceId: nonEmpty(pane?.workspace_id),
			tabId: nonEmpty(pane?.tab_id)
		};
	} catch {
		return {};
	}
}
function nonEmpty(value) {
	return typeof value === "string" && value !== "" ? value : void 0;
}
/**
* The `code` of a herdr error envelope, when the runner captured one — how a wait's TIMEOUT (an answer)
* is told from any other failure (a throw). Read from `Exec.lastError` because that is where herdr's
* envelope lands: it is written to stderr with exit 1, so stdout is `null` for every failure alike and
* the code is the only thing that separates them. Defensive throughout — no reason, unparseable JSON, or
* a missing/non-string code all answer `undefined`, which routes to the throw rather than to a silent
* "timed out" the backend never said.
*/
/**
* How much of its own timeout a wait must actually spend before a failure is believed to BE that
* timeout. A fraction rather than the whole, because process start-up and clock granularity make an
* exact-or-greater comparison flaky on a real runner; wide enough that the case it exists to catch — a
* herdr with no `wait-output` subcommand, which returns in milliseconds — is nowhere near it.
*/
const HERDR_WAIT_ELAPSED_RATIO = .9;
/**
* Whether a failed `pane wait-output` was the DEADLINE passing rather than the wait breaking — the
* two-tier rule `waitForOutput` documents, kept out of the method so the tiers read as one decision.
*
* The envelope's code answers when the runner captured one. Otherwise the answer needs two facts, and
* neither alone is enough: the pane must be LIVE (a gone pane is a failure, `pollForOutput`'s rule) and
* the call must have SPENT the deadline (a wait that returned instantly never ran — herdr 0.7.4, whose
* usage text for an unknown subcommand is not an envelope to read a code from).
*/
function isHerdrWaitTimeout(exec, target, timeoutMs, elapsedMs) {
	const code = herdrErrorCode(exec.lastError);
	if (code != null) return code === "timeout";
	if (elapsedMs < timeoutMs * HERDR_WAIT_ELAPSED_RATIO) return false;
	return herdrMuxAdapter.paneExists(exec, target);
}
function herdrErrorCode(reason) {
	if (!reason) return void 0;
	try {
		return nonEmpty(JSON.parse(reason)?.error?.code);
	} catch {
		return;
	}
}
/**
* A successful `pane wait-output` envelope: the snapshot it matched in, and the line it matched on.
*
* `matched` is `true` by construction — herdr exits 0 only on a match, so reaching here IS the match;
* the parse only fills in the evidence. Defensive for the same reason `parsePaneRecord` is: a herdr
* build that reshapes the envelope degrades to a match with no snapshot, never to a failed wait.
*/
function parseWaitOutput(out) {
	let text;
	let line;
	try {
		const result = JSON.parse(out)?.result;
		text = nonEmpty(result?.read?.text);
		line = nonEmpty(result?.matched_line);
	} catch {}
	return {
		matched: true,
		output: text ?? "",
		...line != null ? { matchedLine: line } : {}
	};
}
/**
* The pane's workspace and tab, or a throw — so `focus` never issues a workspace/tab switch against a
* pane it couldn't actually resolve.
*/
function parsePaneLocation$2(out, id) {
	const { workspaceId, tabId } = parsePaneRecord(out);
	if (!workspaceId || !tabId) throw new Error(`peer's pane ${id} could not be resolved to beam to`);
	return {
		workspaceId,
		tabId
	};
}
/**
* herdr binds a git worktree to a workspace as a first-class record, and that binding is what its UI
* groups a repo's checkouts by. Only `worktree create`/`worktree open` produce it: `git worktree add`
* followed by `workspace create --cwd <checkout>` yields a workspace herdr does not know is a
* worktree at all, left out of the group. Hence this capability — see `WorktreeWorkspaceCapability`
* for what it deliberately does not own.
*
* Every call pins the source repo with `--cwd <primaryRoot>` rather than relying on the caller's
* ambient process cwd (matching how the git adapter always passes `-C <primaryRoot>`), and opens
* with `--no-focus` so spawning never steals the caller's attention.
*/
function herdrWorktreeCapability() {
	return {
		createInWorkspace(exec, opts) {
			const args = [
				"worktree",
				"create",
				"--cwd",
				opts.primaryRoot,
				"--branch",
				opts.branch,
				"--path",
				opts.path
			];
			if (opts.base) args.push("--base", opts.base);
			if (opts.label) args.push("--label", opts.label);
			args.push("--no-focus");
			const out = exec("herdr", args);
			if (!out) throw new Error(withReason(exec, "herdr worktree create failed"));
			const created = parseWorktreeWorkspace(out, "herdr worktree create");
			carryLaunch(exec, created.target, opts.env, opts.launch);
			return created;
		},
		openInWorkspace(exec, opts) {
			const args = [
				"worktree",
				"open",
				"--cwd",
				opts.primaryRoot,
				"--path",
				opts.path
			];
			if (opts.label) args.push("--label", opts.label);
			args.push("--no-focus");
			const out = exec("herdr", args);
			if (!out) throw new Error(withReason(exec, "herdr worktree open failed"));
			const opened = parseWorktreeWorkspace(out, "herdr worktree open");
			carryLaunch(exec, opened.target, opts.env, opts.launch);
			return opened;
		},
		bindings(exec, opts) {
			return parseWorktreeBindings(exec("herdr", [
				"worktree",
				"list",
				"--cwd",
				opts.primaryRoot
			]));
		},
		releaseWorkspace(exec, workspace, opts) {
			if (opts?.group === false) {
				exec("herdr", [
					"workspace",
					"close",
					workspace
				]);
				return;
			}
			if (exec("herdr", [
				"workspace",
				"close",
				workspace,
				"--group"
			]) !== null) return;
			exec("herdr", [
				"workspace",
				"close",
				workspace
			]);
		}
	};
}
/**
* `herdr workspace create` and `herdr tab create` both emit their new root pane at
* `.result.root_pane.pane_id` (a different path than `pane split`'s `.result.pane.pane_id`).
* `label` names the command in error messages (e.g. "herdr workspace create").
*/
function parseRootPaneId(out, label) {
	return parseOpenedPane(out, label, "root_pane");
}
/**
* Every pane herdr emits carries its own `workspace_id` alongside its `pane_id`, on EVERY route —
* `workspace create` (which reports the workspace it just made), `tab create` (the workspace the tab
* was created in), and `pane split` (the workspace the split landed in, i.e. the caller's). Re-verified
* against herdr 0.8.0. That is why the workspace costs no extra call: it rides in on the same output
* the pane id is already read from, so probing for it separately would buy nothing and cost a round
* trip per open.
*
* The pane id is required — a route that cannot name its pane has failed. The workspace is NOT: it
* is read opportunistically and left absent when missing rather than throwing, so a herdr build that
* stops emitting it degrades to "cannot say" instead of breaking `open` outright. Absent is a
* meaning this seam already has (`OpenedPane.workspace`); a hard failure here would be inventing a
* new one for a field no caller is required to use.
*/
function parseOpenedPane(out, label, key) {
	let pane;
	try {
		pane = JSON.parse(out)?.result?.[key];
	} catch {
		throw new Error(`${label} returned unparseable output: ${out.slice(0, 200)}`);
	}
	return openedPaneFromRecord(pane, out, label, key);
}
/**
* The `OpenedPane` inside one herdr pane record, split out of `parseOpenedPane` so the relocation
* routes can reuse the validation without reusing the PATH: `pane move` reports its pane one level
* deeper (`result.move_result.pane`) than every creating route does. `path` names where the record
* came from so a failure says which field was missing, and `out` is carried only to quote the
* envelope back.
*/
function openedPaneFromRecord(pane, out, label, path) {
	const paneId = pane?.pane_id;
	if (typeof paneId !== "string" || paneId === "") throw new Error(`${label} output had no result.${path}.pane_id: ${out.slice(0, 200)}`);
	const tab = pane?.tab_id;
	if (typeof tab !== "string" || tab === "") throw new Error(`${label} output had no result.${path}.tab_id: ${out.slice(0, 200)}`);
	const workspace = pane?.workspace_id;
	return typeof workspace === "string" && workspace !== "" ? {
		id: paneId,
		tab,
		workspace
	} : {
		id: paneId,
		tab
	};
}
/**
* The pane a `herdr pane move` answers with, at `result.move_result.pane` — the relocated pane's
* CURRENT identity, which on herdr is not always the one that went in.
*
* Reading it is not bookkeeping: herdr pane ids are WORKSPACE-SCOPED, so a move that crosses a
* workspace boundary rewrites the id (measured live on 0.9.0 — `pane move wRE:p1 --tab wRD:t1`
* answered `wRD:p4`). The old id still RESOLVES afterwards, as an alias that reports the new one, so
* a caller holding it is not obviously broken — it is simply absent from `pane list` (measured),
* which is what makes a stale handle fail silently rather than loudly. This envelope is the only
* place the new id appears.
*/
function parseMovedPane(out, label) {
	let pane;
	try {
		pane = JSON.parse(out)?.result?.move_result?.pane;
	} catch {
		throw new Error(`${label} returned unparseable output: ${out.slice(0, 200)}`);
	}
	return openedPaneFromRecord(pane, out, label, "move_result.pane");
}
/**
* `herdr worktree create` and `herdr worktree open` emit the same envelope: the root pane at
* `.result.root_pane.pane_id` (as `workspace create` does), the checkout at
* `.result.worktree.{path,branch}`, and the bound workspace at `.result.workspace.workspace_id`.
* That workspace id IS the binding — the whole reason to route through these instead of plain git.
* `label` names the command in error messages (e.g. "herdr worktree create").
*
* The root pane is read through `parseOpenedPane`, NOT re-parsed here: `root_pane` is the same record
* `workspace create` emits, so it carries the same `tab_id`, and one spelling is what keeps the two
* routes from disagreeing about a field both report. That tab is the region's root tab — what lets a
* caller handed this workspace group or rename it without reaching for the pane id, which would be
* green on tmux and silently broken on herdr.
*/
function parseWorktreeWorkspace(out, label) {
	let parsed;
	try {
		parsed = JSON.parse(out);
	} catch {
		throw new Error(`${label} returned unparseable output: ${out.slice(0, 200)}`);
	}
	const result = parsed?.result;
	const target = parseOpenedPane(out, label, "root_pane");
	const workspace = result?.workspace?.workspace_id;
	const path = result?.worktree?.path;
	const branch = result?.worktree?.branch;
	if (typeof path !== "string" || path === "" || typeof branch !== "string" || branch === "") throw new Error(`${label} output had no result.worktree.{path,branch}: ${out.slice(0, 200)}`);
	if (typeof workspace !== "string" || workspace === "") throw new Error(`${label} output had no result.workspace.workspace_id: ${out.slice(0, 200)}`);
	return {
		target,
		worktree: {
			root: resolve(path),
			branch
		},
		workspace
	};
}
/**
* `herdr worktree list` reports every worktree of the repo, each carrying `open_workspace_id` ONLY
* while a workspace is currently open on it. Everything else it reports (branch, linked, prunable)
* is herdr re-reading git — deliberately ignored here; git answers those for every backend.
* Defensive like `listPanes`: a query that cannot be read reports nothing rather than throwing.
*/
function parseWorktreeBindings(out) {
	const bindings = /* @__PURE__ */ new Map();
	if (!out) return bindings;
	let parsed;
	try {
		parsed = JSON.parse(out);
	} catch {
		return bindings;
	}
	const worktrees = parsed?.result?.worktrees ?? [];
	if (!Array.isArray(worktrees)) return bindings;
	for (const entry of worktrees) {
		const path = entry?.path;
		const workspace = entry?.open_workspace_id;
		if (typeof path === "string" && path !== "" && typeof workspace === "string" && workspace !== "") bindings.set(normalizeWorktreePath(path), workspace);
	}
	return bindings;
}
/**
* One spelling of `pane read`, taken by `read` for the snapshot AND for its truncation probe — so the
* two differ only in the source and depth they are meant to differ in. `lines` omitted takes herdr's
* own default window for the source.
*/
function paneRead(exec, target, source, lines) {
	const args = [
		"pane",
		"read",
		target.id,
		"--source",
		source
	];
	if (lines != null) args.push("--lines", String(lines));
	return exec("herdr", args) ?? "";
}
/**
* The tmux window user option `MuxOpenOptions.workspaceGroup` is stored in. A user option (the
* `@` prefix) is tmux's own mechanism for a value it stores but never interprets, so tmux carries
* the tag without cyber-mux teaching it anything: it survives a window rename, and `list-windows`
* both reads it back (`#{@cm_ws}`) and filters on it server-side (`-f '#{==:#{@cm_ws},<id>}'`).
*
* Named here rather than spelled at each use so the write side and every read side cannot drift.
* Server-lifetime, like every window: it dies with the tmux server, along with the windows it tags.
*/
const TMUX_WORKSPACE_GROUP_OPTION = "@cm_ws";
/**
* The tmux window user option a grouped window's OWN name is stored in — the name the caller gave the
* tab, beside the group id, because tmux's single `window_name` field no longer holds it.
*
* tmux has ONE name field per space. A caller that composes a display name out of a tab's name
* (`pool - editor`) has destroyed `editor`, and there is no sound way back: splitting on the separator
* is ambiguous (`acme - beta - main` reads two legal ways), and reading the display name verbatim
* re-prefixes it on every round trip (`pool - pool - editor`). So the original is stored here and read
* back from here — the same rule the group id follows, one tier down. The display name is a human's to
* read; this is what a machine reads.
*
* A user option (the `@` prefix) for `TMUX_WORKSPACE_GROUP_OPTION`'s reasons exactly: tmux stores it
* without interpreting it, it survives a window rename, and `list-windows` reads it back
* (`#{@cm_tab}`). Named here rather than spelled at each use so the write side and every read side
* cannot drift.
*/
const TMUX_TAB_NAME_OPTION = "@cm_tab";
/**
* `-u`, led on EVERY tmux invocation this adapter makes.
*
* tmux(1): "-u  Write UTF-8 output to the terminal even if the first environment variable of LC_ALL,
* LC_CTYPE, or LANG that is set does not contain \"UTF-8\" or \"UTF8\"." Without it — and a substring
* test on those three variables is the whole of tmux's decision — the command client is not UTF-8, and
* tmux SANITIZES what it prints: every byte outside printable ASCII becomes a literal `_`.
*
* That is not a cosmetic loss, it is this adapter's parser. The listing formats separate their fields
* with a TAB, and a tab is 0x09. Measured on 3.7c, one binary, one isolated `-L` socket, only the
* environment differing:
*
*     env -i PATH=… HOME=… tmux -L p list-panes -a -F '#{pane_id}<TAB>#{window_id}' | cat -A  ->  %0_@0
*     env -i PATH=… HOME=… LANG=C.UTF-8 tmux …                                      | cat -A  ->  %0^I@0
*     env -i PATH=… HOME=… tmux -u -L p list-panes …                                | cat -A  ->  %0^I@0
*
* So a caller with no locale — a systemd unit, a cron job, a container entrypoint, a non-interactive
* ssh session — got N panes collapsed into ONE record whose id was the whole line. Not a throw and not
* an empty result: a plausible wrong answer, which anything culling or reconciling on the listing then
* acted on (#177).
*
* Uniform rather than scoped to the `-F` calls, for two reasons. The mangling is a whole CLASS, not
* one separator: measured, EVERY byte below 0x20, plus 0x7f, plus every non-ASCII byte, comes back as
* `_` — so `#{pane_title}` and `#{pane_current_path}` lose their non-ASCII content too, and a fix that
* only re-picked the separator would leave that half of the bug standing. And a flag that is on some
* invocations and not others is a flag someone eventually forgets; one choke point cannot be bypassed
* by adding a call site.
*
* Chosen over pinning a locale on the child environment, which was the other candidate. `LC_ALL=C`
* does NOT fix it (measured: still `_` — tmux wants the string "UTF-8", not any valid locale), so a
* pin has to name a UTF-8 locale that the host actually has, and `C.UTF-8` is a glibc spelling that
* macOS does not ship. It would also mean widening `Exec` to carry an environment, which it does not
* do today. `-u` is tmux's own answer to exactly this question and needs neither.
*
* rmux was measured too and is NOT affected — it emits a real tab under `env -i` — so `mux.rmux.ts` is
* deliberately left alone. See the `177-locale-safe-tmux-output` ADR.
*/
function runTmux(exec, args) {
	return exec("tmux", ["-u", ...args]);
}
/** tmux backend — detected via `$TMUX`. */
const tmuxMuxAdapter = {
	name: "tmux",
	canSizeSplits: true,
	/**
	* `new-pane` opens a floating pane — tmux 3.7's own new command ("Add floating panes. These are
	* panes which sit above the layout ('tiled panes') like popups but unlike popups are not modal and
	* behave like panes", CHANGES 3.6b → 3.7), bound to `*` by default.
	*
	* Declared UNCONDITIONALLY rather than probed off `tmux -V`, and that is deliberate: this adapter
	* takes no version reading anywhere (its `-l`, `-e` and `@`-option paths are all declared the same
	* way), and a version probe would cost an exec on every resolution to pre-empt a failure tmux
	* already reports precisely. On tmux ≤ 3.6 the command does not exist and `new-pane` fails with
	* tmux's own `unknown command` — surfaced by the `withReason` throw in `open`, which names the
	* command that failed. A silent wrong-pane is the failure mode worth engineering against, and this
	* has none: there is nothing for an absent `new-pane` to be mistaken for.
	*
	* Both sides of this placement are now pinned against a real 3.7c binary — the read side by
	* `#{pane_floating_flag}`, the create side by the `new-pane` rows in `mux.tmux.integration.test.ts`.
	* The branch below was originally written off tmux's CHANGES file, because the tmux installed when
	* it landed was 3.6b and had no `new-pane` to run it against.
	*/
	canFloatPanes: true,
	/**
	* `true` — `resize-pane -Z`, and it is one of the oldest things tmux does. Verified live on 3.7c:
	* `list-commands` reports `resize-pane (resizep) [-DLMRTUZ] …`, and driving `-Z` against a
	* three-pane window flipped `#{window_zoomed_flag}` and grew `#{pane_width}` from 40 to 80.
	*
	* Declared even though the verb is a TOGGLE and the seam's is absolute: what this flag answers is
	* whether the backend can be made to honor `setPaneZoom` at all, and tmux can, because it also
	* reports the state the toggle has to be guarded by (`isPaneZoomed`). A backend with the toggle and
	* no read would have to omit this — that is otty's position, not tmux's.
	*/
	canZoomPanes: true,
	/**
	* `true` for both, against two commands tmux has had for as long as it has had windows. Verified
	* live on 3.7c in a throwaway server: `move-pane -d -h -s %2 -t %1` carried %2 out of window @0
	* and left it at `l=101` in @1 — to the RIGHT of %1, which is what makes `-h` the `'right'` side —
	* and `break-pane -d -s %1 -P -F` answered `@2 %1` with %1 gone from @0.
	*
	* Neither verb has the ACTIVE-pane trap `setPaneZoom` had to work around: `-s` is honored as
	* given. Measured, not assumed — with %0 active, `move-pane -s %1` moved %1 and left %0 where it
	* was, and `break-pane -s %1` broke out %1 rather than the active pane.
	*/
	canMovePanes: true,
	canBreakPanes: true,
	/**
	* Every route passes `-d`, so no open moves the attached client. tmux is the backend where this
	* cost the most to make true: `-d` was already on `new-window`, but `split-window` and `new-pane`
	* were issuing it nowhere, and both ACTIVATE what they create. Measured on 3.7c rather than read
	* off the man page — a bare `split-window` in a session focused on %0 left %1 active, and a bare
	* `new-pane` did the same for the float; with `-d` each left focus on %0 and still printed the new
	* id through `-P -F`. So the flag costs the id report nothing, which is what makes it free to add.
	*
	* There is no focus move to undo on top of that, unlike zellij: `-t` targets the pane to split
	* directly, so tmux never has to VISIT a pane to choose it.
	*/
	focusOnOpen: "preserved",
	open(exec, opts) {
		const at = opts.at ?? "tab";
		const window = at === "workspace" || at === "tab";
		const env = opts.env ? Object.entries(opts.env).flatMap(([k, v]) => ["-e", `${k}=${v}`]) : [];
		const group = window && opts.workspaceGroup != null;
		const format = "#{pane_id}	#{window_id}";
		let args;
		if (at === "pane:float") args = [
			"new-pane",
			"-d",
			...opts.from ? ["-t", opts.from.id] : [],
			...env,
			"-c",
			opts.cwd,
			"-P",
			"-F",
			format
		];
		else if (window) args = [
			"new-window",
			"-d",
			...env,
			"-c",
			opts.cwd,
			"-P",
			"-F",
			format
		];
		else {
			const from = opts.from ? ["-t", opts.from.id] : [];
			const size = opts.ratio != null ? ["-l", toTmuxSize(opts.ratio)] : [];
			args = [
				"split-window",
				"-d",
				at === "pane:down" ? "-v" : "-h",
				...from,
				...size,
				...env,
				"-c",
				opts.cwd,
				"-P",
				"-F",
				format
			];
		}
		if (window && opts.label) args.splice(1, 0, "-n", opts.label);
		const out = runTmux(exec, args);
		if (!out) throw new Error(withReason(exec, `tmux ${args[0]} failed`));
		const [pane, windowId] = splitOpenReport(out, args[0]);
		const target = {
			id: pane,
			tab: windowId
		};
		if (group && windowId) tmuxMuxAdapter.group(exec, { id: windowId }, opts.workspaceGroup);
		if (!window && opts.label) tmuxMuxAdapter.rename(exec, target, "pane", opts.label);
		if (opts.launch) tmuxMuxAdapter.submit(exec, target, opts.launch);
		return target;
	},
	rename(exec, target, tier, name) {
		if (tier === "tab") {
			runTmux(exec, [
				"rename-window",
				"-t",
				target.id,
				name
			]);
			return;
		}
		runTmux(exec, [
			"select-pane",
			"-t",
			target.id,
			"-T",
			name
		]);
	},
	group(exec, target, group, name) {
		runTmux(exec, [
			"set-option",
			"-w",
			"-t",
			target.id,
			TMUX_WORKSPACE_GROUP_OPTION,
			group
		]);
		if (name !== void 0) runTmux(exec, [
			"set-option",
			"-w",
			"-t",
			target.id,
			TMUX_TAB_NAME_OPTION,
			name
		]);
	},
	sendText(exec, target, text) {
		runTmux(exec, [
			"send-keys",
			"-t",
			target.id,
			"-l",
			text
		]);
	},
	sendKeys(exec, target, keys) {
		runTmux(exec, [
			"send-keys",
			"-t",
			target.id,
			...keys.map(toTmuxKey)
		]);
	},
	submit(exec, target, text) {
		if (!text) {
			runTmux(exec, [
				"send-keys",
				"-t",
				target.id,
				"Enter"
			]);
			return;
		}
		tmuxMuxAdapter.sendText(exec, target, text);
		runTmux(exec, [
			"send-keys",
			"-t",
			target.id,
			"Enter"
		]);
	},
	read(exec, target, opts) {
		const text = capturePane(exec, target, opts?.lines);
		if (!opts?.truncation) return { text };
		if (opts.lines === "all") return {
			text,
			truncated: false
		};
		return {
			text,
			truncated: isReadTruncated(text, capturePane(exec, target, (opts.lines ?? 0) + 1))
		};
	},
	waitForOutput(exec, target, opts) {
		return pollForOutput(tmuxMuxAdapter, exec, target, opts);
	},
	focus(exec, target) {
		const { sessionName, windowId } = parsePaneLocation(runTmux(exec, [
			"list-panes",
			"-a",
			"-F",
			"#{pane_id} #{session_name} #{window_id}"
		]), target.id);
		runTmux(exec, [
			"switch-client",
			"-t",
			sessionName
		]);
		runTmux(exec, [
			"select-window",
			"-t",
			windowId
		]);
		runTmux(exec, [
			"select-pane",
			"-t",
			target.id
		]);
	},
	teardown(exec, target) {
		runTmux(exec, [
			"kill-pane",
			"-t",
			target.id
		]);
	},
	paneExists(exec, target) {
		if (runTmux(exec, [
			"has-session",
			"-t",
			target.id
		]) !== null) return true;
		return (runTmux(exec, [
			"list-panes",
			"-a",
			"-F",
			"#{pane_id}"
		]) ?? "").split("\n").includes(target.id);
	},
	isPaneFocused(exec, target) {
		const out = runTmux(exec, [
			"list-panes",
			"-a",
			"-F",
			"#{pane_id} #{pane_active} #{window_active} #{session_attached}"
		]);
		if (!out) return void 0;
		const line = out.split("\n").find((l) => l.split(" ")[0] === target.id);
		if (!line) return void 0;
		const [, paneActive, windowActive, sessionAttached] = line.split(" ");
		if (paneActive === void 0 || windowActive === void 0 || sessionAttached === void 0) return void 0;
		return paneActive === "1" && windowActive === "1" && sessionAttached !== "0";
	},
	/**
	* `resize-pane -Z`, which is a TOGGLE — the seam's member is absolute, so the state is read first
	* and the toggle issued only when it differs (`isPaneZoomed` below). All of it verified live on
	* tmux 3.7c.
	*
	* **`select-pane` before `-Z`, and it is not redundant.** `resize-pane -Z -t <pane>` on a window
	* that is ALREADY zoomed on a DIFFERENT pane does not transfer the zoom — it just unzooms, leaving
	* the other pane active and nothing zoomed (measured: with %1 zoomed, `-Z -t %2` left `z=0` on
	* every pane and %1 still active). Naming the pane is not enough on tmux; the zoom follows the
	* ACTIVE pane. `select-pane -t <pane>` fixes both halves at once — it unzooms the window as a side
	* effect of moving the active pane, and it makes the target the pane `-Z` will zoom.
	*
	* That `select-pane` is also why zooming MOVES FOCUS here, which `MuxAdapter.setPaneZoom`
	* declares rather than compensates. It is not a cost this adapter chose: a bare `-Z -t <pane>` on
	* an unfocused pane already makes that pane active on tmux, so there is no focus-preserving
	* spelling to prefer.
	*
	* Unzooming needs no `select-pane`: the guard has already established that THIS pane is the zoomed
	* one, so it is already the active pane and a bare `-Z` restores it in place, moving nothing.
	*/
	setPaneZoom(exec, target, zoomed) {
		if (tmuxMuxAdapter.isPaneZoomed(exec, target) === zoomed) return;
		if (zoomed && runTmux(exec, [
			"select-pane",
			"-t",
			target.id
		]) === null) throw new Error(withReason(exec, `tmux could not select pane ${target.id}`));
		if (runTmux(exec, [
			"resize-pane",
			"-Z",
			"-t",
			target.id
		]) === null) throw new Error(withReason(exec, `tmux could not ${zoomed ? "zoom" : "unzoom"} pane ${target.id}`));
	},
	/**
	* `#{window_zoomed_flag}` AND `#{pane_active}`, because tmux's flag is per WINDOW: it reads `1` on
	* every pane of a zoomed window, including the small ones behind the zoomed one (verified live on
	* 3.7c — with %1 zoomed, all three panes reported `z=1`). The pane that is actually big is the
	* window's ACTIVE pane, so the per-pane answer the seam promises is the conjunction.
	*
	* Read out of `list-panes -a`, the same server-wide listing `isPaneFocused` uses, rather than
	* `display-message -p -t <pane>`: display-message answers a pane that no longer exists with a blank
	* line and exit code 0 (measured on 3.7c), which is indistinguishable from a real answer whose
	* fields did not expand. A missing LINE is unambiguous, and `undefined` is then the honest report
	* rather than a false `false`.
	*
	* `#{session_attached}` is deliberately NOT part of this, unlike `isPaneFocused`'s answer: a pane
	* is zoomed in its window whether or not any client is looking, and a detached session's zoom is
	* still there when a client attaches.
	*/
	isPaneZoomed(exec, target) {
		const out = runTmux(exec, [
			"list-panes",
			"-a",
			"-F",
			"#{pane_id} #{window_zoomed_flag} #{pane_active}"
		]);
		if (!out) return void 0;
		const line = out.split("\n").find((l) => l.split(" ")[0] === target.id);
		if (!line) return void 0;
		const [, zoomedFlag, paneActive] = line.split(" ");
		return zoomedFlag === "1" && paneActive === "1";
	},
	/**
	* `move-pane -s <src> -t <dst>`, with `-h`/`-v` choosing the side. Measured on 3.7c: `-h` lands the
	* moved pane to the RIGHT of the destination (`l=101` beside a destination at `l=0 w=100`) and
	* `-v` lands it BELOW, which is the mapping this member's `'right'`/`'down'` takes.
	*
	* `-d` is not decoration: without it tmux SELECTS the destination window and makes the moved pane
	* active, dragging an attached client to a window the caller never asked to look at (measured —
	* a bare `move-pane` left the client on @1 with %1 active there). With it the client stays put and
	* the destination's own active pane is untouched.
	*
	* The re-read afterwards is what turns tmux's `void` command into the seam's `OpenedPane`.
	* `move-pane` has no `-P`/`-F` at all — unlike `break-pane` below — so the window the pane landed
	* in has to be asked for, and asking doubles as the confirmation that the pane survived the move.
	* No `workspace`: tmux has no such tier, and `open` reports none either.
	*/
	movePane(exec, target, destination, side) {
		if (runTmux(exec, [
			"move-pane",
			"-d",
			side === "down" ? "-v" : "-h",
			"-s",
			target.id,
			"-t",
			destination.id
		]) === null) throw new Error(withReason(exec, `tmux could not move pane ${target.id} to ${destination.id}`));
		return tmuxPaneLocation(exec, target.id, "move");
	},
	/**
	* `break-pane -s <src> -P -F`, which reports the pane and its NEW window in the same call — so
	* unlike `movePane` this needs no second read. Driven on 3.7c: with %0 active, `break-pane -d -s
	* %1` answered `@2 %1` and left %0 alone in @0.
	*
	* `at` is ignored, and that is the tier collapse `open` already makes rather than a member
	* ignoring its argument: tmux has no workspace tier, so `'tab'` and `'workspace'` are both a new
	* Window here, exactly as `MuxPlacement`'s two space placements both are. The returned
	* `OpenedPane` carries no `workspace`, which is how a caller sees the collapse rather than being
	* told a false one.
	*
	* `-d` for `movePane`'s reason. Breaking out a pane that is already alone in its window is a
	* no-op that reports its existing window (measured on 3.7c) — the seam declares that rather than
	* spending a read to normalize it.
	*/
	breakPane(exec, target, _at) {
		const out = runTmux(exec, [
			"break-pane",
			"-d",
			"-s",
			target.id,
			"-P",
			"-F",
			"#{pane_id} #{window_id}"
		]);
		if (!out) throw new Error(withReason(exec, `tmux could not break out pane ${target.id}`));
		const [pane, window] = out.trim().split(" ");
		if (!pane || !window) throw new Error(`tmux break-pane did not report the pane and window of ${target.id}`);
		return {
			id: pane,
			tab: window
		};
	},
	/**
	* Tab-separated, not space — the same rule `describeTmuxRegion` follows, and for the same reason:
	* `pane_current_path` and `pane_title` can both contain spaces. The old space-separated format
	* recovered the cwd by rejoining everything after the command, which works only while the cwd is
	* the LAST field. A label is a human's and may hold anything, so appending one to that format would
	* make both fields unrecoverable — `my worker` and `/repo/my dir` cannot be told apart by a space.
	* A tab can appear in neither id nor command, and the two free-text fields are separated by one.
	*/
	listPanes(exec) {
		const out = runTmux(exec, [
			"list-panes",
			"-a",
			"-F",
			"#{pane_id}	#{pane_current_command}	#{pane_current_path}	#{pane_title}	#{host}	#{pane_floating_flag}"
		]);
		if (!out) return [];
		return out.split("\n").filter(Boolean).map((line) => {
			const [id, , cwd, title, host, floating] = line.split("	");
			const pane = {
				id: id ?? "",
				mux: "tmux",
				floating: floating === "1"
			};
			if (cwd) pane.cwd = cwd;
			const label = paneLabel(title, host);
			if (label) pane.label = label;
			return pane;
		}).filter((p) => p.id !== "");
	},
	regions: {
		describeRegion(exec, target) {
			return describeTmuxRegion(exec, target.id);
		},
		/**
		* `resize-pane -x/-y` in CELLS, never `-x <percent>`, and the difference is not cosmetic: tmux
		* takes a percentage of the WINDOW, while the seam's `ratio` is a fraction of the pane's own
		* SPLIT REGION. Those are the same number only in a two-pane window, so a nested layout would be
		* sized against the wrong denominator — silently, and only for the users with more than one
		* split. Cells computed from the rects tmux just reported are exact at every depth.
		*
		* Verified against a live tmux 3.7c (`mux.tmux.integration.test.ts`): `-x` sizes the target pane
		* and its sibling absorbs the difference, `-y` does the same on a stacked split, and a resize
		* inside a nested region leaves the outer divider where it was.
		*/
		resizePane(exec, target, ratio) {
			const split = enclosingSplit(describeTmuxRegion(exec, target.id), target.id);
			if (!split) throw new Error(`tmux pane ${target.id} is the only pane in its region — there is no split to resize`);
			const flag = split.direction === "right" ? "-x" : "-y";
			const cells = toTmuxResizeCells(split, ratio);
			if (runTmux(exec, [
				"resize-pane",
				"-t",
				target.id,
				flag,
				String(cells)
			]) === null) throw new Error(withReason(exec, `tmux could not resize pane ${target.id}`));
		},
		/**
		* tmux has NO workspace tier — `workspace` and `tab` both collapse onto a Window — so a workspace
		* is not a fact this backend holds. What it holds is the grouping TAG the walk wrote
		* (`MuxOpenOptions.workspaceGroup`, stored in a window user option), so the read here is
		* literally *"which windows carry this group id"*.
		*
		* The tag, never the label. `list-windows -a` spans SESSIONS, so a bare name match would
		* over-collect a same-named window from another session, and taking the workspace off a
		* `<workspace> - <tab>` label is unsound in the first place (`acme - beta - main` splits two ways,
		* both legal). `-f '#{==:#{@cm_ws},<id>}'` keys on what actually identifies the group, filtered
		* server-side — the tag survives a window rename, which a name-encoded grouping does not.
		*
		* A window with NO tag is a workspace of ONE: the honest answer for a window nobody grouped, and
		* it costs no further call — the caller's own window is the whole workspace.
		*/
		describeWorkspace(exec, target) {
			const out = runTmux(exec, [
				"display-message",
				"-p",
				"-t",
				target.id,
				`#{window_id}\t#{${TMUX_WORKSPACE_GROUP_OPTION}}\t#{${TMUX_TAB_NAME_OPTION}}\t#{window_name}`
			]);
			if (!out) throw new Error(withReason(exec, `tmux could not resolve the workspace around pane ${target.id}`));
			const [windowId, group, ownName, ...nameParts] = out.split("\n")[0].split("	");
			if (!windowId) throw new Error(`tmux did not report the window around pane ${target.id}`);
			if (!group) return [tmuxTab(exec, windowId, ownName, nameParts.join("	"))];
			const listed = runTmux(exec, [
				"list-windows",
				"-a",
				"-F",
				`#{window_id}\t#{${TMUX_TAB_NAME_OPTION}}\t#{window_name}`,
				"-f",
				`#{==:#{${TMUX_WORKSPACE_GROUP_OPTION}},${group}}`
			]);
			if (!listed) throw new Error(withReason(exec, `tmux could not enumerate the windows grouped as ${group}`));
			const tabs = listed.split("\n").filter(Boolean).map((line) => line.split("	")).filter(([id]) => Boolean(id)).map(([id, own, ...rest]) => tmuxTab(exec, id, own, rest.join("	")));
			if (tabs.length === 0) throw new Error(`tmux reported no windows grouped as ${group}`);
			return tabs;
		}
	}
};
/**
* One window, read as a tab: its id, the tab's OWN name, and its region's geometry.
*
* `ownName` is what `group` stored (`TMUX_TAB_NAME_OPTION`) and it WINS, because `windowName` is the
* display name — on a grouped window that is the composed `pool - editor`, whose `editor` tmux's
* single name field no longer holds. Reporting the display name instead would compound the prefix on
* every capture/apply round trip (`pool - pool - editor`), and splitting it back apart is the unsound
* parse the option exists to refuse.
*
* The window name is the FALLBACK, not a second guess: a window carrying no stored name is one nobody
* composed a display name for, so its name already IS its own name. That covers the untagged window —
* a workspace of one — and any window a caller grouped without naming.
*/
function tmuxTab(exec, windowId, ownName, windowName) {
	const tab = {
		id: windowId,
		panes: describeTmuxRegion(exec, windowId)
	};
	const label = ownName || windowName;
	if (label) tab.label = label;
	return tab;
}
/**
* Every pane of the region `id` names, with its rectangle. `id` is a pane id (that pane's own window)
* or a window id (that window) — `list-panes -t` resolves both, which is what lets the region read and
* the workspace read share one query instead of two that could drift apart.
*
* `-t` scopes `list-panes` to ONE window — the region tier, which is what capture captures. Without
* `-a`, so this never reaches the panes of some other window.
*
* `#{pane_left}`/`#{pane_top}` are window-relative, and the widths exclude the divider column tmux
* draws between panes (a 200-wide window split side by side reports 119 + 80, not 200) — both are
* exactly what `RegionPane.rect` documents, so nothing is adjusted here.
*
* Tab-separated, not space: `pane_current_path` and `pane_title` can both contain spaces, and
* splitting a path on spaces is how a directory with one in it silently becomes the wrong pane.
*/
function describeTmuxRegion(exec, id) {
	const out = runTmux(exec, [
		"list-panes",
		"-t",
		id,
		"-F",
		"#{pane_id}	#{pane_left}	#{pane_top}	#{pane_width}	#{pane_height}	#{pane_current_path}	#{pane_title}	#{host}"
	]);
	if (!out) throw new Error(withReason(exec, `tmux could not describe the region around pane ${id}`));
	const panes = [];
	for (const line of out.split("\n").filter(Boolean)) {
		const [paneId, left, top, width, height, cwd, title, host] = line.split("	");
		if (!paneId) continue;
		const pane = {
			id: paneId,
			rect: {
				x: Number(left),
				y: Number(top),
				width: Number(width),
				height: Number(height)
			}
		};
		if (cwd) pane.cwd = cwd;
		const label = paneLabel(title, host);
		if (label) pane.label = label;
		panes.push(pane);
	}
	if (panes.length === 0) throw new Error(`tmux reported no panes in the region around pane ${id}`);
	return panes;
}
/**
* A tmux pane's label — its title, unless that title is the hostname tmux handed it.
*
* **tmux has no "unset title"**: it defaults `pane_title` to the hostname, so a pane nobody ever named
* reports a name nobody chose, and every pane in an untouched session reports the SAME one. Exporting
* that would label them all `zeta`, and `zeta` would then resolve to every pane in the session —
* ambiguity manufactured out of nothing. A title that differs from the host is one someone set
* (cyber-mux's own `select-pane -T` among them), so it is the author's and survives.
*
* One home for the rule, called by BOTH reads — `listPanes` (which a name resolves against) and
* `describeTmuxRegion` (which a capture exports). Two spellings of a heuristic this load-bearing is
* how the listing and the capture come to disagree about which panes are named.
*
* The comparison is the workaround, not the shape of the thing: herdr has the honest primitive and
* omits the key outright until a pane is renamed, so it needs no rule at all.
*/
function paneLabel(title, host) {
	return title && title !== host ? title : void 0;
}
/**
* The `-P -F '#{pane_id}\t#{window_id}'` report EVERY open asks for, split back into its two ids.
* Tab-separated because neither id can contain a tab.
*
* A report that does not carry both throws rather than returning half an answer: the window is the
* pane's tab, which `OpenedPane.tab` promises is always present, and it is also what a grouping open
* tags. Guessing either would be worse than failing — a caller would name or group nothing and never
* learn it.
*/
function splitOpenReport(out, command) {
	const [pane, windowId] = out.split("	");
	if (!pane || !windowId) throw new Error(`tmux ${command} did not report the new pane's id and window id`);
	return [pane, windowId];
}
/**
* Where a pane lives NOW, as the `OpenedPane` a relocation has to answer with — the read `move-pane`
* cannot give, because it has no `-P`/`-F` to report through.
*
* Server-wide `list-panes -a` rather than `display-message -p -t <pane>`, for `isPaneZoomed`'s
* reason: display-message answers a pane that no longer exists with a blank line and exit code 0, so
* a move that silently lost its pane would read as a successful one. A missing LINE is unambiguous,
* and here it means the relocation did not land — which throws rather than reporting a false success.
*
* No `workspace` on the result: tmux has no such tier, so a relocation reports none exactly as an
* `open` does.
*/
function tmuxPaneLocation(exec, id, verb) {
	const line = (runTmux(exec, [
		"list-panes",
		"-a",
		"-F",
		"#{pane_id} #{window_id}"
	]) ?? "").split("\n").find((l) => l.split(" ")[0] === id);
	if (!line) throw new Error(`tmux could not resolve pane ${id} after the ${verb}`);
	const [, windowId] = line.split(" ");
	if (!windowId) throw new Error(`tmux did not report a window for pane ${id} after the ${verb}`);
	return {
		id,
		tab: windowId
	};
}
/**
* The seam's `ratio` as the CELL count `resize-pane -x/-y` wants for the target pane.
*
* Computed through the SECOND side rather than the target directly, because that is the definition
* `ratioOf` (`region-tree.ts`) reads a live split back with, and a write that used the other formula
* would not round-trip: tmux eats a column for the divider, so `first / (first + second)` and
* `1 - second / total` disagree by exactly that column. Going through the second side means a region
* described at 0.6 and resized to 0.6 is a no-op, which is the property a caller restoring a drifted
* layout depends on.
*
* The divider is MEASURED (`extent - targetExtent - otherExtent`) rather than assumed to be one
* column: it is the same arithmetic on a backend that draws no divider, so nothing here is tmux-shaped
* beyond the flag it renders into.
*/
function toTmuxResizeCells(split, ratio) {
	assertRatioInRange(ratio);
	const second = Math.round((split.targetIsFirst ? 1 - ratio : ratio) * split.extent);
	if (!split.targetIsFirst) return second;
	const divider = split.extent - split.targetExtent - split.otherExtent;
	return split.extent - divider - second;
}
/**
* `ratio` is the fraction kept by the ORIGINAL pane; tmux's `-l` sizes the NEW one. So this INVERTS
* — `1 - ratio` — where herdr's `--ratio` passes the same number through untouched. The two backends
* genuinely convert in opposite directions, and applying the inversion to both (or to neither) is
* the way this gets silently backwards: a 0.333 template would size the original pane at 67%.
*
* Percent rather than cells: tmux takes `-l` as either, and a percentage is the only form that means
* the same thing without first querying the region's size.
*/
function toTmuxSize(ratio) {
	assertRatioInRange(ratio);
	return `${Math.round((1 - ratio) * 100)}%`;
}
/**
* The core vocabulary's tmux spelling. Exactly one member differs — probed, not read off tmux(1):
* tmux has no `Backspace` key name, so it would *type* the word (its unrecognized-token fallback);
* its name for that key is `BSpace` (tmux(1): "the following special key names are accepted: Up,
* Down, Left, Right, BSpace, BTab, DC ..."). Every other core key — `Up` `Down` `Left` `Right`
* `Enter` `Escape` `Tab` `Space` `C-c` `F1`-`F12` — is already tmux's own name for it.
*
* Deliberately a rename table, NOT a validation table: a token outside the core is forwarded
* verbatim (the contract), so this must not reject what it does not recognize. Keeping a full tmux
* key list here would make the passthrough a second vocabulary to maintain.
*/
const TMUX_KEY_RENAMES = { Backspace: "BSpace" };
/**
* One spelling of the capture, taken by `read` for the snapshot AND for the one-row-deeper truncation
* probe — so the two differ in exactly the number they disagree about and nothing else. `lines`
* omitted is tmux's own default window: the visible screen, with no `-S` at all.
*/
function capturePane(exec, target, lines) {
	const args = [
		"capture-pane",
		"-p",
		"-t",
		target.id
	];
	if (lines === "all") args.push("-S", "-");
	else if (lines != null) args.push("-S", `-${lines}`);
	return runTmux(exec, args) ?? "";
}
function toTmuxKey(key) {
	return TMUX_KEY_RENAMES[key] ?? key;
}
/**
* `tmux list-panes -a -F '#{pane_id} #{session_name} #{window_id}'` lists every pane server-wide.
* Resolving fails — no line's pane id matches `id` — when the pane no longer exists in the backend,
* and that must throw so `focus` never issues a switch-client/select-window against a pane it
* couldn't actually resolve.
*/
function parsePaneLocation(out, id) {
	const line = (out ?? "").split("\n").find((l) => l.split(" ")[0] === id);
	if (!line) throw new Error(`peer's pane ${id} could not be resolved to beam to`);
	const [, sessionName, windowId] = line.split(" ");
	return {
		sessionName,
		windowId
	};
}
const KNOWN_MUX = [
	"tmux",
	"rmux",
	"herdr",
	"wezterm",
	"zellij",
	"cmux",
	"otty",
	"screen",
	"none"
];
function isKnownMux(v) {
	return v != null && KNOWN_MUX.includes(v);
}
/**
* The single source of the mux → per-pane-env-var mapping. tmux exports `$TMUX_PANE`; herdr exports
* `$HERDR_PANE_ID` (both in the same `wX:pY`-style namespace); WezTerm exports `$WEZTERM_PANE` in
* every pane (its own bare-integer id) — per the issue that requested that backend (#47), the same
* fast-path extension `$TMUX_PANE`/`$HERDR_PANE_ID` already get; Zellij exports `$ZELLIJ_PANE_ID` in
* every terminal pane (its own `terminal_N`/bare-`N` id) — per the issue that requested this backend
* (#46); cmux exports `$CMUX_SURFACE_ID` in every terminal (its surface ref, e.g. `surface:7`) — per
* the issue that requested this backend (#48); otty exports `$OTTY_PANE_ID` in every pane, which is
* also its only "inside otty" signal, so it doubles as the ancestry fallback's hint the way
* `$WEZTERM_PANE` does. screen carries no per-pane env var. Both the ancestry
* probe and the `currentPane` self-identity helper read the pane through this table so the two never
* diverge on which env var a given mux uses.
*
* **rmux is the one entry whose ORDER against another matters**, and the reason is not cosmetic: an
* rmux pane exports `$RMUX_PANE` AND `$TMUX_PANE`, both holding the same `%N` id, because rmux
* reimplements the tmux command language and keeps tmux's env contract for anything that reads it
* (probed live on rmux 0.10.0 — a pane's env carried `RMUX=<socket>,<pid>,<session>`,
* `RMUX_PANE=%1`, `TMUX=<the same triple>`, `TMUX_PANE=%1`, `TERM_PROGRAM=rmux`). So `$TMUX_PANE`
* is NOT evidence of tmux, and every read that walks this table must ask rmux BEFORE tmux, or an
* rmux session self-identifies as tmux and gets driven with the wrong binary. The table itself is
* unordered — `currentPane` and `discoverByAncestry` below each carry the ordering, and each says so.
*/
const PANE_ENV = {
	tmux: (env) => env["TMUX_PANE"],
	rmux: (env) => env["RMUX_PANE"],
	herdr: (env) => env["HERDR_PANE_ID"],
	wezterm: (env) => env["WEZTERM_PANE"],
	zellij: (env) => env["ZELLIJ_PANE_ID"],
	cmux: (env) => env["CMUX_SURFACE_ID"],
	otty: (env) => env["OTTY_PANE_ID"]
};
/**
* Resolve THIS session's own pane from env alone (no `ps` walk): the `$CYBER_MUX_PANE` fast-path a
* spawn propagates → `$RMUX_PANE` (rmux) → `$TMUX_PANE` (tmux) → `$HERDR_PANE_ID` (herdr) →
* `$WEZTERM_PANE` (wezterm) → `$ZELLIJ_PANE_ID` (zellij) → `$CMUX_SURFACE_ID` (cmux) →
* `$OTTY_PANE_ID` (otty). Returns the pane tagged with its multiplexer, or undefined when the
* session is in no pane-carrying multiplexer. This is the mux-agnostic self-identity key.
*
* **rmux is asked before tmux, and that order is load-bearing** — an rmux pane sets `$TMUX_PANE`
* too (see `PANE_ENV`), so the tmux question is not a question rmux answers `no` to. The reverse
* order would report every rmux pane as tmux and hand `resolveMuxAdapter` the wrong binary.
*/
function currentPane(env) {
	if (env["CYBER_MUX_PANE"]) return {
		mux: env["CYBER_MUX"] === "rmux" ? "rmux" : env["CYBER_MUX"] === "herdr" ? "herdr" : env["CYBER_MUX"] === "wezterm" ? "wezterm" : env["CYBER_MUX"] === "zellij" ? "zellij" : env["CYBER_MUX"] === "cmux" ? "cmux" : env["CYBER_MUX"] === "otty" ? "otty" : "tmux",
		pane: env["CYBER_MUX_PANE"]
	};
	const rmux = PANE_ENV.rmux(env);
	if (rmux) return {
		mux: "rmux",
		pane: rmux
	};
	const tmux = PANE_ENV.tmux(env);
	if (tmux) return {
		mux: "tmux",
		pane: tmux
	};
	const herdr = PANE_ENV.herdr(env);
	if (herdr) return {
		mux: "herdr",
		pane: herdr
	};
	const wezterm = PANE_ENV.wezterm(env);
	if (wezterm) return {
		mux: "wezterm",
		pane: wezterm
	};
	const zellij = PANE_ENV.zellij(env);
	if (zellij) return {
		mux: "zellij",
		pane: zellij
	};
	const cmux = PANE_ENV.cmux(env);
	if (cmux) return {
		mux: "cmux",
		pane: cmux
	};
	const otty = PANE_ENV.otty(env);
	if (otty) return {
		mux: "otty",
		pane: otty
	};
}
/**
* Two-mode multiplexer detection.
*
* Fast-path: `$CYBER_MUX` (tmux | rmux | herdr | wezterm | zellij | cmux | otty | screen | none) is
* trusted outright — this also serves as an OVERRIDE (`=none` forces no-mux even inside a real
* multiplexer).
* `$CYBER_MUX_PANE` carries the pane id alongside it. Detection RECOGNIZES `screen` (so an override
* pinning it, or a real screen ancestor, is reported truthfully rather than silently ignored), but
* `screen` is not a drivable backend — `resolveMuxAdapter` rejects it with a reason. Recognition is
* not support.
*
* Discovery (else): walk the process ancestry from `$$` via `ps -o ppid=,comm= -p <pid>`, since the
* tool's own shell may not be the human's pane. `$RMUX`/`$TMUX`/`$HERDR_ENV` are NOT trusted alone —
* they are used only as a fast-positive hint the ancestry walk falls back to when the walk itself is
* inconclusive (e.g. `ps` unavailable), never as a substitute for it.
*/
function probeMultiplexer(exec, env, opts = {}) {
	const prefix = opts.envPrefix ?? "CYBER_MUX";
	const override = env[prefix];
	const pane = env[`${prefix}_PANE`];
	if (isKnownMux(override)) return {
		mux: override,
		...pane ? { pane } : {},
		via: "env"
	};
	if (opts.discover === false) return {
		mux: "none",
		via: "ancestry"
	};
	return discoverByAncestry(exec, env);
}
const MUX_COMM = [
	{
		re: /^tmux(:|$)/,
		mux: "tmux"
	},
	{
		re: /^rmux(-daemon|-server)?(:|$)/,
		mux: "rmux"
	},
	{
		re: /^herdr(:|$)/,
		mux: "herdr"
	},
	{
		re: /^wezterm(-gui|-mux-server)?(:|$)/,
		mux: "wezterm"
	},
	{
		re: /^zellij(:|$)/,
		mux: "zellij"
	},
	{
		re: /^screen(:|$)/,
		mux: "screen"
	}
];
/** Narrows a `Mux` to a `PaneMux` by ASKING `PANE_ENV`, so membership has exactly one definition. */
function isPaneMux(mux) {
	return Object.hasOwn(PANE_ENV, mux);
}
/**
* The per-pane env var for a mux, via the shared `PANE_ENV` table; undefined for screen/none.
*
* The guard is "does `PANE_ENV` have a row for this mux?", NOT a second hand-written list of the
* muxes that have one. The hand-written list is what #169 was: `otty` had a `PANE_ENV` row and a
* `discoverByAncestry` hint, but was missing from the list here, so an ancestry-discovered otty
* session reported no pane while `$OTTY_PANE_ID` sat in its env, readable. `screen` and `none` still
* answer undefined — now because they are genuinely absent from the table, which is the same reason
* they were meant to answer undefined before.
*/
function paneFor(mux, env) {
	return isPaneMux(mux) ? PANE_ENV[mux](env) : void 0;
}
/**
* An ancestry-discovered probe, OMITTING `pane` when the mux carries none — never carrying it as an
* explicit `undefined`, so `MuxProbe.pane` stays an absent-or-present field (the same conditional
* shape the `$CYBER_MUX_PANE` fast-path uses above).
*/
function ancestryProbe(mux, env) {
	const pane = paneFor(mux, env);
	return {
		mux,
		...pane !== void 0 ? { pane } : {},
		via: "ancestry"
	};
}
const MAX_ANCESTORS = 32;
function walkAncestry(exec, env) {
	let pid = process.pid;
	const seen = /* @__PURE__ */ new Set();
	for (let i = 0; i < MAX_ANCESTORS; i++) {
		if (seen.has(pid)) break;
		seen.add(pid);
		const line = exec("ps", [
			"-o",
			"ppid=,comm=",
			"-p",
			String(pid)
		]);
		if (!line) break;
		const trimmed = line.trim();
		const spaceIdx = trimmed.indexOf(" ");
		const ppidStr = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
		const comm = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim();
		const ppid = Number.parseInt(ppidStr, 10);
		for (const entry of MUX_COMM) if (entry.re.test(comm)) return ancestryProbe(entry.mux, env);
		if (!Number.isFinite(ppid) || ppid <= 1) break;
		pid = ppid;
	}
}
function discoverByAncestry(exec, env) {
	const found = walkAncestry(exec, env);
	if (found) return found;
	if (env["RMUX"]) return ancestryProbe("rmux", env);
	if (env["TMUX"]) return ancestryProbe("tmux", env);
	if (env["HERDR_ENV"]) return ancestryProbe("herdr", env);
	if (env["WEZTERM_PANE"]) return ancestryProbe("wezterm", env);
	if (env["ZELLIJ"]) return ancestryProbe("zellij", env);
	if (env["CMUX_WORKSPACE_ID"]) return ancestryProbe("cmux", env);
	if (env["OTTY_PANE_ID"]) return ancestryProbe("otty", env);
	return {
		mux: "none",
		via: "ancestry"
	};
}
//#endregion
//#region ../../node_modules/.pnpm/cyberlegion@1.3.0_typescript@7.0.2/node_modules/cyberlegion/dist/index.mjs
/**
* Transitional env-normalization seam (mux.feature: "a pane carrying only the legacy fast-path vars
* is still honored"). cyber-mux's own fast-path reads `$CYBER_MUX`/`$CYBER_MUX_PANE` — its
* `currentPane` hardcodes those names (no `envPrefix` override), and `probeMultiplexer`'s `envPrefix`
* option renames the WHOLE pair together, so neither can be steered to fall back onto a
* differently-named legacy pair. Every call into cyber-mux that reads the fast-path
* (`probeMultiplexer`, `currentPane`, `callerPane`, `resolveMuxAdapter`) must be handed this seam's
* output instead of the raw env.
*
* When `$CYBER_MUX`/`$CYBER_MUX_PANE` are both absent and either legacy `$CYBERLEGION_MUX`/
* `$CYBERLEGION_MUX_PANE` var is present, copies the legacy pair onto the current names. Never
* overwrites an already-set current var — the current pair always wins outright the moment either
* half of it is set, exactly matching the frozen precedence chain (mux.feature: "the current
* fast-path vars win over the legacy pair when both are set").
*
* Transitional — deleted once no pre-migration pane (one that only ever exported the legacy pair) is
* still alive.
*/
function normalizeMuxEnv(env) {
	const hasCurrent = env.CYBER_MUX !== void 0 || env.CYBER_MUX_PANE !== void 0;
	const hasLegacy = env.CYBERLEGION_MUX !== void 0 || env.CYBERLEGION_MUX_PANE !== void 0;
	if (hasCurrent || !hasLegacy) return env;
	return {
		...env,
		CYBER_MUX: env.CYBERLEGION_MUX,
		CYBER_MUX_PANE: env.CYBERLEGION_MUX_PANE
	};
}
/** The tracked marker file that makes a hub root initialized (see ensureMarker). */
const MARKER_FILE = "config.json";
/** Walk up from `cwd` to the nearest git repo root; fall back to `cwd`. */
function projectRoot(cwd = process.cwd()) {
	let dir = resolve(cwd);
	for (;;) {
		if (existsSync(join(dir, ".git"))) return dir;
		const parent = dirname(dir);
		if (parent === dir) return resolve(cwd);
		dir = parent;
	}
}
/**
* Resolve the cyberlegion hub root. Precedence: explicit --root/--space, then `$CYBERLEGION_ROOT`,
* then the GLOBAL hub `~/.agents/cyberlegion` (addressable across every project and worktree
* boundary — identity/mail/registry state lives here by default; `--space` isolates it), falling
* back to a project-local `.agents/cyberlegion` only when no home directory is resolvable.
*/
function resolveRoot(opts = {}) {
	const env = opts.env ?? process.env;
	const explicit = opts.root ?? opts.space ?? env.CYBERLEGION_ROOT;
	if (explicit) return resolve(explicit);
	const home = homedir();
	if (home) return join(home, ".agents", "cyberlegion");
	return join(projectRoot(opts.cwd), ".agents", "cyberlegion");
}
/**
* Create the tracked `config.json` marker at `root` (a hub root) if it does not already exist.
* Callers pass the root under which the marker should be created/ensured; this mkdir's it as
* needed. Idempotent — never overwrites an existing marker.
*/
function ensureMarker(root) {
	mkdirSync(root, { recursive: true });
	const marker = join(root, MARKER_FILE);
	if (!existsSync(marker)) writeFileSync(marker, `${JSON.stringify({ version: 1 }, null, 2)}\n`);
}
/**
* Thrown when an agent/message id destined to become a filename PATH SEGMENT fails
* `assertSafeId` — see that function's doc for why this rejects rather than encodes.
*/
var InvalidIdError = class extends Error {
	kind;
	value;
	constructor(kind, value) {
		super(`invalid ${kind} ${JSON.stringify(value)} — must not be empty, ".", "..", or contain a path separator`);
		this.kind = kind;
		this.value = value;
		this.name = "InvalidIdError";
	}
};
const UNSAFE_ID = /[\\/\0]/;
/**
* Filename-safety guard for any id that becomes a bare PATH SEGMENT under the hub root — agent ids
* (`agentFile`/`inboxDir`/`dataDir`/`briefFile`) and message ids (`messageFile`). Both are
* effectively user/peer-controlled: an agent id round-trips a caller-supplied `--handle`-adjacent
* value in some flows, and nothing upstream of the store validates it before it reaches a `join()`.
*
* REJECT, don't encode: unlike `sanitizePane` (which deliberately encodes, because a tmux/herdr pane
* locator is an opaque, internally-produced token that only needs to survive as a *lookup key*, not
* round-trip as an identity), an agent/message id is a PRIMARY KEY — `getAgent(id)` must return
* exactly what `putAgent` stored under that same `id`. Silently encoding two different malformed ids
* onto the same sanitized filename would let one caller's write silently clobber or read another's
* record — a worse failure than a loud, immediate refusal. So: empty, `.`, `..`, and any embedded
* path separator (POSIX `/`, Windows `\`) or NUL byte are rejected outright, which also rejects an
* absolute path outright (an absolute path always contains a separator).
*/
function assertSafeId(id, kind) {
	if (!id || id === "." || id === ".." || UNSAFE_ID.test(id)) throw new InvalidIdError(kind, id);
	return id;
}
const paths = {
	agentsDir: (root) => join(root, "agents"),
	agentFile: (root, id) => join(root, "agents", `${assertSafeId(id, "agent id")}.json`),
	panesDir: (root) => join(root, "panes"),
	paneFile: (root, pane) => join(root, "panes", `${sanitizePane(pane)}.id`),
	inboxDir: (root, id) => join(root, "inbox", assertSafeId(id, "agent id")),
	inboxReadDir: (root, id) => join(root, "inbox", assertSafeId(id, "agent id"), "read"),
	dataDir: (root, id) => join(root, "data", assertSafeId(id, "agent id")),
	briefFile: (root, id) => join(root, "data", assertSafeId(id, "agent id"), "brief.md"),
	mainPaneFile: (root) => join(root, "main-pane.id"),
	projectsDir: (root) => join(root, "projects"),
	serviceLeaseFile: (root, project, service) => join(root, "services", assertSafeId(project, "project id"), `${assertSafeId(service, "service name")}.json`),
	projectFile: (root, id) => join(root, "projects", `${assertSafeId(id, "project id")}.json`),
	/** A message's file path within `toId`'s unread/read inbox dir, keyed by its own collision-free
	* id — validated the same as an agent id (it's the same class of risk: a peer- or CLI-controlled
	* string becoming a filename). */
	messageFile: (root, toId, msgId) => join(paths.inboxDir(root, toId), `${assertSafeId(msgId, "message id")}.json`),
	messageReadFile: (root, toId, msgId) => join(paths.inboxReadDir(root, toId), `${assertSafeId(msgId, "message id")}.json`)
};
/** tmux pane ids look like "%3"; make them filesystem-safe. */
function sanitizePane(pane) {
	return pane.replace(/[^A-Za-z0-9_-]/g, "_");
}
const realExec = nodeExec;
const nowIso = (ctx) => new Date(ctx.now?.() ?? Date.now()).toISOString();
function loadAgent(store, id) {
	return store.getAgent(id);
}
function saveAgent(store, rec) {
	store.putAgent(rec);
}
function listAgents(store) {
	return store.listAgents();
}
/**
* Recover the calling agent's own id, mux-agnostically. Inside any multiplexer pane (tmux or herdr)
* the pane index is authoritative — a pane with no pane entry is simply unregistered and must NOT
* adopt `$CYBERLEGION_AGENT_ID` (that env fallback applies ONLY when the session is in no
* multiplexer pane at all). There is no shared bare "self" file — self-id is always pane-keyed or
* explicit via the env var.
*/
function resolveSelfId(ctx) {
	const env = ctx.env ?? process.env;
	const cur = currentPane(normalizeMuxEnv(env));
	if (cur) return ctx.store.resolvePaneId(cur.pane);
	return env.CYBERLEGION_AGENT_ID || void 0;
}
/** Prefer a standing record over a plain session record when both match a handle — an owner
* report must land in the durable standing inbox, not a dying session's. */
function preferStanding(matches) {
	return matches.find((a) => a.kind === "standing") ?? matches[0];
}
/** Split a handle's matches into live and exited. An exited unit's pane is gone and its inbox has
* no reader, so a *name* must never resolve to one — a handle is reusable across units, and the
* dead holders of it outnumber the live one over time. Standing records never exit. An explicit id
* still resolves either way: naming a unit outright is a deliberate choice, unlike reaching for a
* handle and silently landing on a corpse. */
function matchHandle(agents, handle) {
	const matched = agents.filter((a) => a.handle === handle);
	return {
		live: matched.filter((a) => a.status !== "exited"),
		exited: matched.filter((a) => a.status === "exited")
	};
}
/** Fail loudly when a handle names only the dead — never fall through to a corpse. */
function unaddressable(ref, exited, tried) {
	if (exited.length > 0) {
		const dead = exited.map((a) => `${a.id.slice(0, 6)}${a.pane ? ` (${a.pane.id})` : ""}`).join(", ");
		return /* @__PURE__ */ new Error(`"${ref}" matches only exited unit(s) — ${dead} — which have no reader. Address a live unit ('cyberlegion unit who'), or run 'cyberlegion unit register --standing --handle ${ref}' for a durable inbox.`);
	}
	return /* @__PURE__ */ new Error(`no agent addressable as "${ref}" (tried ${tried})`);
}
/**
* Resolve a unit reference by id, handle, or its worktree branch (the unit↔CR join key: an
* `AgentRecord.worktree.branch` equals the SDD `<cr-ref>` it maps to, when spawned for one). Used
* by verbs that address "the unit working on CR X" as well as "the unit named X".
*/
function resolveAgent(store, ref) {
	const byId = loadAgent(store, ref);
	if (byId) return byId;
	const agents = listAgents(store);
	const { live, exited } = matchHandle(agents, ref);
	const byHandle = preferStanding(live);
	if (byHandle) return byHandle;
	const byBranchAll = agents.filter((a) => a.worktree?.branch === ref);
	const byBranch = byBranchAll.find((a) => a.status !== "exited");
	if (byBranch) return byBranch;
	throw unaddressable(ref, [...exited, ...byBranchAll.filter((a) => a.status === "exited")].filter((a, i, all) => all.findIndex((b) => b.id === a.id) === i), "id, handle, and worktree branch/CR");
}
function bumpLastSeen(ctx, id) {
	const rec = loadAgent(ctx.store, id);
	if (!rec) return;
	rec.lastSeen = nowIso(ctx);
	saveAgent(ctx.store, rec);
}
/** Refresh this session's own last-seen if it is registered — best-effort, never throws. */
function touch(ctx) {
	const id = resolveSelfId(ctx);
	if (id) bumpLastSeen(ctx, id);
}
/**
* Whether a unit's session is still there, as far as its backend can tell. "Cannot rule out alive"
* must never become grounds to replace an owner — the same fail-closed policy `store/lock.ts` takes
* on an ambiguous holder — so a session reads as gone only on positive evidence: its multiplexer
* answered with a pane list and the pane is not in it. A record with no pane cannot be probed, and a
* backend the caller cannot reach (a different server, no client, a failed query) answers with
* nothing; both read as live. `paneExists` is not used here because it collapses "unreachable" into
* "gone". An exited record is never live.
*/
function sessionLive(ctx, rec) {
	if (rec.status === "exited" || rec.status === "stopped") return false;
	if (!rec.pane) return true;
	const panes = PANE_ADAPTERS[rec.pane.mux].listPanes(ctx.exec ?? realExec);
	if (panes.length === 0) return true;
	const id = rec.pane.id;
	return panes.some((p) => p.id === id);
}
/** The per-mux session adapters `prune` consults for pane liveness — each answers with its own
* backend primitive so a herdr pane is never probed with a tmux query, and vice versa. */
const PANE_ADAPTERS = {
	tmux: tmuxMuxAdapter,
	herdr: herdrMuxAdapter
};
/**
* Backend selection via cyber-mux's two-mode mux probe, normalized through the transitional
* `$CYBERLEGION_MUX*` → `$CYBER_MUX*` env seam (`mux-env.ts`) — tmux/herdr map to their existing
* cyber-mux adapters.
*
* cyber-mux detects MORE backends than `unit/registry`'s `AgentRecord.pane` can carry a locator
* under (`'tmux' | 'herdr'` only). A DETECTED wezterm/zellij is refused HERE, before anything opens,
* naming the backend it found (mux.feature: "a detected backend a unit record cannot carry is
* refused before opening anything") — driving it would open a real pane no record could name,
* stranding a live session `prune` can never reap and no caller can nudge. Anything else (`none`,
* `screen`) falls through to the plain "no backend" refusal, unchanged from before the migration.
*/
function selectSessionAdapter(env, exec = realExec) {
	const probe = probeMultiplexer(exec, normalizeMuxEnv(env));
	if (probe.mux === "tmux") return tmuxMuxAdapter;
	if (probe.mux === "herdr") return herdrMuxAdapter;
	if (probe.mux === "wezterm" || probe.mux === "zellij") throw new Error(`spawn detected ${probe.mux}, a backend unit/registry cannot store a pane locator under (only tmux and herdr) — refusing before opening anything`);
	throw new Error("spawn requires a session backend — run inside tmux ($TMUX) or herdr ($HERDR_ENV=1)");
}
function stringifyCell(v) {
	if (v == null) return "";
	const s = String(v);
	return /[,\n"]/.test(s) ? `"${s.replace(/"/g, "\"\"")}"` : s;
}
/** One TOON-encoded object: `key: value` lines, blank/undefined fields dropped. */
function toonObject(fields) {
	return Object.entries(fields).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${v}`).join("\n");
}
/** One TOON-encoded list: a `name[N]{field,...}:` header plus one row per item, then an aggregate
* summary line. Definitive on empty — still emits `name[0]{...}:` plus the summary line. */
function toonList(name, items, fields, summary) {
	return [
		`${name}[${items.length}]{${fields.map((f) => f.key).join(",")}}:`,
		...items.map((item) => fields.map((f) => stringifyCell(f.get(item))).join(",")).map((r) => `  ${r}`),
		summary
	].join("\n");
}
/** Print a command's result to stdout in the requested format. */
function emit(format, payload) {
	if (format === "json") console.log(JSON.stringify(payload.json, null, 2));
	else console.log(payload.toon);
}
/**
* The canonical git common dir for `dir`, or undefined outside a repository. The common dir is the
* one path every checkout of a repository shares — the default checkout and each linked worktree
* all report the same `.git` — so it is what makes "same project from two worktrees" one reference.
* Realpath'd so a symlinked path to the same repository cannot mint a second id.
*/
function commonDirOf(exec, dir) {
	const out = exec("git", [
		"-C",
		dir,
		"rev-parse",
		"--path-format=absolute",
		"--git-common-dir"
	]);
	if (!out) return void 0;
	return realOrResolved(out);
}
/**
* Derive a project's stable reference from its canonical common dir. Deterministic rather than
* minted, so two worktrees registering the same project at the same instant converge on one id with
* no lock, and two unrelated repositories that merely share a directory name never collide.
*/
function projectIdOf(commonDir) {
	return `prj-${createHash("sha256").update(commonDir).digest("hex").slice(0, 16)}`;
}
function realOrResolved(path) {
	try {
		return realpathSync(path);
	} catch {
		return resolve(path);
	}
}
/**
* The default checkout's root, and whether that answer is authoritative. Asked from the default
* checkout itself (its git dir IS the common dir), `--show-toplevel` is exact wherever the git dir
* lives. Asked from a linked worktree, git has no pointer back to the default checkout when its git
* dir was separated (`git init --separate-git-dir`) — even `git worktree list` then reports the git
* dir — so the common dir's parent is only a guess.
*/
function defaultCheckoutOf(exec, dir, commonDir) {
	const gitDir = exec("git", [
		"-C",
		dir,
		"rev-parse",
		"--path-format=absolute",
		"--git-dir"
	]);
	const top = exec("git", [
		"-C",
		dir,
		"rev-parse",
		"--show-toplevel"
	]);
	if (gitDir && top && realOrResolved(gitDir) === commonDir) return {
		root: realOrResolved(top),
		exact: true
	};
	return {
		root: dirname(commonDir),
		exact: false
	};
}
/**
* Register (or idempotently refresh) the project containing `dir` — any checkout of it, default or
* linked. Keeps the first `registeredAt`, so re-registering from a worktree is a no-op in effect.
*/
function registerProject(ctx, input = {}) {
	const exec = ctx.exec ?? realExec;
	const dir = resolve(input.dir ?? process.cwd());
	const commonDir = commonDirOf(exec, dir);
	if (!commonDir) throw new Error(`cannot register a project at "${dir}" — not inside a git repository`);
	ctx.store.ensureMarker();
	const id = projectIdOf(commonDir);
	const existing = ctx.store.getProject(id);
	const checkout = defaultCheckoutOf(exec, dir, commonDir);
	const root = checkout.exact || !existing ? checkout.root : existing.root;
	const rec = {
		id,
		name: basename(root),
		root,
		commonDir,
		registeredAt: existing?.registeredAt ?? new Date(ctx.now?.() ?? Date.now()).toISOString()
	};
	ctx.store.putProject(rec);
	return rec;
}
function looksLikePath(ref) {
	return isAbsolute(ref) || ref.startsWith(".") || ref.includes(sep) || ref.includes("/");
}
function isDirectory(path) {
	return existsSync(path) && statSync(path).isDirectory();
}
/**
* Resolve a project from anywhere — by id, by a path inside any of its checkouts, or by name when
* exactly one registered project carries it. A path registers its project on first use: git has
* already confirmed it is a repository, and registering is idempotent, so there is nothing a typo
* could mint. A name never registers — nothing can be found by a name no checkout has reported —
* and an ambiguous name names its candidates rather than picking one.
*/
function resolveProject(ctx, ref) {
	const byId = ctx.store.getProject(ref);
	if (byId) return byId;
	const asPath = resolve(ref);
	if (looksLikePath(ref) && isDirectory(asPath)) return byPath(ctx, asPath);
	const named = ctx.store.listProjects().filter((p) => p.name === ref);
	if (named.length === 1) return named[0];
	if (named.length > 1) throw new Error(`project name "${ref}" is ambiguous — ${named.map((p) => `${p.id} (${p.root})`).join(", ")}; pass an id or a path`);
	if (isDirectory(asPath)) return byPath(ctx, asPath);
	throw new Error(`no registered project "${ref}" (tried id, path, and name) — pass a path inside the repository to register it`);
}
function byPath(ctx, dir) {
	const commonDir = commonDirOf(ctx.exec ?? realExec, dir);
	if (!commonDir) throw new Error(`"${dir}" is not inside a git repository`);
	return ctx.store.getProject(projectIdOf(commonDir)) ?? registerProject(ctx, { dir });
}
/** A refused ownership transition. `stale` means the caller's generation, token, or holder claim is
* not the current one — the caller is not (or no longer) the authority it claims to be. */
var ServiceOwnershipError = class extends Error {
	code;
	constructor(code, message) {
		super(message);
		this.code = code;
		this.name = "ServiceOwnershipError";
	}
};
const SERVICE_NAME = /^[a-z0-9][a-z0-9_-]{0,62}$/;
function assertServiceName(name) {
	if (!SERVICE_NAME.test(name)) throw new Error(`invalid service name "${name}" — use lowercase letters, digits, "-" or "_" (max 63)`);
}
function serviceEndpointId(projectId, name) {
	return `svc-${projectId}-${name}`;
}
const nowMs = (ctx) => ctx.now?.() ?? Date.now();
const iso = (ms) => new Date(ms).toISOString();
function lockName(projectId, name) {
	return `service-${projectId}-${name}`;
}
function isLive$1(ctx, unit) {
	if (unit.status === "exited") return false;
	return ctx.isLive ? ctx.isLive(unit) : sessionLive(ctx, unit);
}
function ensureEndpoint(ctx, project, name) {
	const id = serviceEndpointId(project.id, name);
	const existing = loadAgent(ctx.store, id);
	if (existing) return existing;
	ctx.store.ensureMarker();
	const ts = iso(nowMs(ctx));
	const rec = {
		id,
		handle: `${name}@${project.name}`,
		kind: "service",
		service: {
			project: project.id,
			name
		},
		cwd: project.root,
		pane: null,
		status: "active",
		createdAt: ts,
		lastSeen: ts
	};
	saveAgent(ctx.store, rec);
	return rec;
}
function view(ctx, project, endpoint, lease) {
	const base = {
		project,
		endpoint,
		lease
	};
	if (lease.state === "vacant") return {
		...base,
		health: "vacant",
		control: "none"
	};
	if (lease.state === "reserved") {
		const expired = nowMs(ctx) > Date.parse(lease.reservation?.expiresAt ?? "");
		return {
			...base,
			health: expired ? "expired" : "starting",
			control: "none",
			...expired ? { note: "the reservation expired without a bound owner; the next acquire takes over" } : {}
		};
	}
	const owner = lease.holder ? loadAgent(ctx.store, lease.holder) : void 0;
	if (!owner) return {
		...base,
		health: "unhealthy",
		control: "none",
		note: "the owner has no unit record"
	};
	const control = owner.pane || ctx.store.findPaneByAgentId(owner.id) ? "pane" : "none";
	const controlNote = control === "none" ? "the owner resolves, but its session control is not recoverable from here (no multiplexer pane — e.g. a native subagent only its parent can drive)" : void 0;
	if (!isLive$1(ctx, owner)) return {
		...base,
		owner,
		health: "unhealthy",
		control,
		note: "the owner session is gone"
	};
	return {
		...base,
		owner,
		health: "healthy",
		control,
		...controlNote ? { note: controlNote } : {}
	};
}
function vacantLease(ctx, projectId, name) {
	return {
		project: projectId,
		service: name,
		endpoint: serviceEndpointId(projectId, name),
		generation: 0,
		state: "vacant",
		updatedAt: iso(nowMs(ctx))
	};
}
/** Load the project, service endpoint, and lease — creating the endpoint and a vacant lease when
* `create` is set, else throwing for a service that was never started. */
function load(ctx, projectRef, name, create) {
	assertServiceName(name);
	const project = resolveProject(ctx, projectRef);
	const lease = ctx.store.getServiceLease(project.id, name);
	const endpoint = loadAgent(ctx.store, serviceEndpointId(project.id, name));
	if (lease && endpoint) return {
		project,
		endpoint,
		lease
	};
	if (!create) throw new Error(`no service "${name}" in project ${project.name} (${project.id})`);
	return {
		project,
		endpoint: ensureEndpoint(ctx, project, name),
		lease: lease ?? vacantLease(ctx, project.id, name)
	};
}
function stale(message) {
	return new ServiceOwnershipError("stale", message);
}
/** Read a service's ownership without changing anything. Throws for a service never started. */
function resolveService(ctx, projectRef, name) {
	const { project, endpoint, lease } = load(ctx, projectRef, name, false);
	return view(ctx, project, endpoint, lease);
}
/**
* The fencing check: succeed only when `unit` owns the service at exactly `generation`. A runtime
* calls this before acting as the service's authority; a stale runtime — replaced, handed off, or
* recovered past — is refused.
*/
function verifyOwnership(ctx, projectRef, name, input) {
	const { project, endpoint, lease } = load(ctx, projectRef, name, false);
	if (lease.state !== "active" || lease.holder !== input.unit || lease.generation !== input.generation) throw stale(`"${input.unit}" at generation ${input.generation} is not the owner (now ${lease.state}${lease.holder ? ` by ${lease.holder}` : ""} at ${lease.generation})`);
	return view(ctx, project, endpoint, lease);
}
/**
* Run `fn` as the verified owner, holding the service lock so no transition can interleave between
* the check and the act. For short critical sections only — the lock is bounded-wait for everyone
* else — and never reentrant: `fn` must not call another service transition on the same service.
*/
function withOwnership(ctx, projectRef, name, input, fn) {
	assertServiceName(name);
	const project = resolveProject(ctx, projectRef);
	return ctx.store.withLock(lockName(project.id, name), () => fn(verifyOwnership(ctx, project.id, name, input)));
}
/** A record file exists but its content didn't parse as JSON — a torn write (crash mid-`writeFileSync`,
* pre-atomic-write code path) or on-disk tampering. Carries the file path and the original parse
* error so a caller can report exactly what's broken and where, rather than "Unexpected token" with
* no location. */
var CorruptRecordError = class extends Error {
	file;
	constructor(file, cause) {
		super(`corrupt record at "${file}": ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
		this.file = file;
		this.name = "CorruptRecordError";
	}
};
/**
* Probe whether `pid` is alive using `process.kill(pid, 0)` — the POSIX "does this process exist"
* idiom; it sends no signal, it only tests deliverability. `ESRCH` (no such process) is the only
* errno that means "definitely dead". Every other errno — `EPERM` above all, common under sandboxes
* and containers where a genuinely live process can be unsignalable by this one, or any process
* owned by a different uid — reads as `'unknown'`, never `'dead'`: collapsing `EPERM` into "dead" is
* exactly the defect this three-state return exists to make structurally impossible to reintroduce
* at a new call site. Same-pid is trivially `'alive'` (a process checking its own prior identity,
* e.g. after a crash-and-restart that reused nothing).
*/
function probeProcess(pid) {
	if (pid === process.pid) return "alive";
	try {
		process.kill(pid, 0);
		return "alive";
	} catch (err) {
		return err.code === "ESRCH" ? "dead" : "unknown";
	}
}
var LockTimeoutError = class extends Error {
	name;
	constructor(name) {
		super(`timed out waiting for lock "${name}"`);
		this.name = name;
		this.name = "LockTimeoutError";
	}
};
function locksDir(root) {
	return join(root, "locks");
}
function lockDirFor(root, name) {
	return join(locksDir(root), `${name}.lock`);
}
/** Read a lock dir's recorded holder. Absent/corrupt/mid-acquire (holder.json not written yet) all
* read as "unknown" — never grounds to steal. An ambiguous read must never look like a green light. */
function readHolder(dir) {
	try {
		return JSON.parse(readFileSync(join(dir, "holder.json"), "utf8"));
	} catch {
		return;
	}
}
/** Locking's policy on `probeProcess`'s `'unknown'` state: treat it exactly like `'alive'` — i.e.
* NOT `'dead'`. The one invariant that must never break here is stealing a lock a live holder still
* holds, and `'unknown'` means "cannot rule out alive", so it can only ever be safe to fold it into
* the "do not steal" side. This is a local policy decision, not `probeProcess`'s — a different call
* site (a staleness reaper, say) folding `'unknown'` into "not provably alive" instead would be
* reading the SAME three states toward the opposite default, which is exactly the bug class this
* three-state type exists to force each call site to decide explicitly (see process-liveness.ts). */
function heldByLiveOrUnknownPid(pid) {
	return probeProcess(pid) !== "dead";
}
function sleepSync(ms) {
	if (ms <= 0) return;
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
/**
* Attempt to reclaim an abandoned lock dir without ever discarding a LIVE one out from under its
* holder — the exact defect agmsg/firstmate's lock suites exist to catch (evidence.md items 3-4).
*
* `mkdirSync` on the lock path itself already arbitrates ordinary contention (EEXIST = someone else
* got there first); the harder race is a STEAL: two processes independently deciding the same lock
* looks dead. `renameSync` gives the same exclusivity `mkdirSync` gives for a fresh path, but for an
* EXISTING one — of any number of processes racing to rename the SAME source path away, exactly one
* succeeds and the rest get ENOENT. So the rename-away is the sole arbiter of "who gets to attempt
* the steal", not the earlier staleness read.
*
* That still leaves one race: the content we read as stale might not be the content we actually
* capture, if the true holder released and a NEW, live holder re-acquired at this same path between
* our staleness read and our rename. So after winning the rename, re-check the pid we ACTUALLY
* captured (not the one from the earlier read) — if it's alive, this was a live lock we grabbed by
* accident; put it back immediately (best-effort — if a third party has since re-mkdir'd the path,
* the invariant we're protecting already holds, so just drop our capture) and refuse to finalize.
*/
function tryReclaimStale(dir) {
	const grave = `${dir}.stale-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	try {
		renameSync(dir, grave);
	} catch (err) {
		if (err.code === "ENOENT") return false;
		throw err;
	}
	const captured = readHolder(grave);
	if (captured && heldByLiveOrUnknownPid(captured.pid)) {
		try {
			renameSync(grave, dir);
		} catch {
			rmSync(grave, {
				recursive: true,
				force: true
			});
		}
		return false;
	}
	rmSync(grave, {
		recursive: true,
		force: true
	});
	return true;
}
/**
* Acquire an advisory, mkdir-based lock at `root/locks/<name>.lock`. mkdir (not O_EXCL on a file) is
* the primitive here because a lock also needs to carry its holder metadata (pid + timestamp) for
* staleness detection, and a directory gives that a natural home (`holder.json` inside it) without a
* second file to keep in sync; `mkdirSync` on a non-existent path is exactly as atomic as an
* exclusive file create on every filesystem this tool targets (POSIX; NTFS via Node's Win32 mkdir).
*
* Blocks (busy-retries) until acquired or `timeoutMs` elapses, reclaiming a dead holder's lock along
* the way (see `tryReclaimStale`) but NEVER a live one — contention with a live holder always waits
* it out or times out, never steals.
*/
function acquireLock(root, name, opts = {}) {
	const retryDelayMs = opts.retryDelayMs ?? 20;
	const timeoutMs = opts.timeoutMs ?? 5e3;
	const dir = lockDirFor(root, name);
	mkdirSync(locksDir(root), { recursive: true });
	const deadline = Date.now() + timeoutMs;
	for (;;) try {
		mkdirSync(dir);
		writeFileSync(join(dir, "holder.json"), JSON.stringify({
			pid: process.pid,
			acquiredAt: Date.now()
		}));
		return { release: () => rmSync(dir, {
			recursive: true,
			force: true
		}) };
	} catch (err) {
		if (err.code !== "EEXIST") throw err;
		const holder = readHolder(dir);
		if (holder && !heldByLiveOrUnknownPid(holder.pid) && tryReclaimStale(dir)) continue;
		if (Date.now() > deadline) throw new LockTimeoutError(name);
		sleepSync(retryDelayMs);
	}
}
/** Acquire `name`, run `fn`, and always release — the shape every genuine read-modify-write in the
* store should use (`setMainPane`, `identity.ts`'s `claimPresence`/`clearPresence` today). */
function withLock(root, name, fn, opts) {
	const handle = acquireLock(root, name, opts);
	try {
		return fn();
	} finally {
		handle.release();
	}
}
/** Parse a record file's content, wrapping a `JSON.parse` failure in a typed, file-named
* `CorruptRecordError` instead of letting a bare `SyntaxError` bubble up from deep inside
* `listInbox`/`listAgents`/`getAgent` with no indication of WHICH file broke. A file that doesn't
* exist is a caller error — callers check existence first, so this only ever sees files known to
* be present but possibly torn (a crash mid-write predating the atomic-write fix, or on-disk
* tampering) — see evidence.md item 5, "no silent success on a broken store". */
function readJsonRecord(file) {
	const raw = readFileSync(file, "utf8");
	try {
		return JSON.parse(raw);
	} catch (err) {
		throw new CorruptRecordError(file, err);
	}
}
function readMessages(dir) {
	if (!existsSync(dir)) return [];
	return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => readJsonRecord(join(dir, f)));
}
/** Write `data` to `file` crash-safely: write to a sibling temp file first, then `renameSync` into
* place. `rename` is atomic within a filesystem (POSIX guarantees this; Node's Win32 rename is too
* for same-volume paths, which every path here is — always under the same store root), so any
* reader either sees the OLD complete content or the NEW complete content, never a truncated
* in-between. Before this fix, `putMessage`/`putAgent`/`putPaneIndex`/`setMainPane` called
* `writeFileSync` directly on the final path — only `ackMessage`'s move (a rename of an already-
* complete file) was atomic. A process crashing mid-`writeFileSync`, or a reader racing a writer on
* a large record, could hand `JSON.parse` a truncated file and throw an uncaught `SyntaxError` deep
* inside `listInbox`/`listAgents`/`getAgent`.
*
* Deliberately no `fsync` before the rename: this tool defends against a process CRASHING mid-write
* (the actual, observed risk in a daemonless multi-process CLI), where the page cache alone is
* sufficient, not against a power-loss/OS-crash losing unflushed pages, which cyberlegion doesn't
* claim to survive today (no writer here holds data the user can't just re-send). Add fsync if that
* durability bar ever changes.
*
* The temp name embeds pid + a counter so two writers to the SAME final path never collide on their
* own temp files mid-write (each writer's temp file is unique to it). */
let tmpCounter = 0;
function writeFileAtomic(file, data) {
	mkdirSync(dirname(file), { recursive: true });
	const tmp = `${file}.${process.pid}.${tmpCounter++}.tmp`;
	writeFileSync(tmp, data);
	renameSync(tmp, file);
}
function writeJson(file, data) {
	writeFileAtomic(file, `${JSON.stringify(data, null, 2)}\n`);
}
function writeText(file, text) {
	writeFileAtomic(file, text);
}
/** Build a path via `build()` for a READ-only lookup, treating a syntactically-invalid id
* (`InvalidIdError`) the same as "not found" rather than throwing. Reads are the wrong place to
* enforce id-shape: `resolveAgent`/`resolveRecipient` (identity.ts) speculatively probe an arbitrary
* ref — which may legitimately be a worktree BRANCH NAME containing `/` — as a candidate id before
* falling back to handle/branch lookup, so `getAgent('cyberlegion/unit-abc')` must fail soft, not
* throw, or that fallback chain breaks. The traversal risk this guards against (an id escaping the
* store root) only bites on a WRITE — nothing is ever created or overwritten by a probe that finds
* nothing — so a hard reject stays reserved for the write paths below (`putAgent`, `putMessage`,
* `putPaneIndex`, `writeBrief`), where a malformed id would otherwise put a stray file wherever it
* pointed. */
function readPathOrUndefined(build) {
	try {
		return build();
	} catch (err) {
		if (err instanceof InvalidIdError) return void 0;
		throw err;
	}
}
/** The on-disk `Store` implementation — current per-writer sharded `.json` layout (ADR-0020):
* one file per message/agent, collision-free filenames, ack = atomic rename into `read/`. */
var FileStore = class {
	root;
	constructor(root) {
		this.root = root;
	}
	ensureMarker() {
		ensureMarker(this.root);
	}
	putMessage(toId, msg) {
		writeFileAtomic(paths.messageFile(this.root, toId, msg.id), `${JSON.stringify(msg, null, 2)}\n`);
	}
	listInbox(id) {
		const inbox = readPathOrUndefined(() => paths.inboxDir(this.root, id));
		const read = readPathOrUndefined(() => paths.inboxReadDir(this.root, id));
		return {
			unread: inbox ? readMessages(inbox) : [],
			read: read ? readMessages(read) : []
		};
	}
	ackMessage(id, msgId) {
		const src = readPathOrUndefined(() => paths.messageFile(this.root, id, msgId));
		if (!src || !existsSync(src)) throw new Error(`"${msgId}" is not an unread message in this inbox`);
		const msg = readJsonRecord(src);
		const dest = paths.messageReadFile(this.root, id, msgId);
		mkdirSync(dirname(dest), { recursive: true });
		renameSync(src, dest);
		return msg;
	}
	removeMessage(id, msgId) {
		const unreadFile = readPathOrUndefined(() => paths.messageFile(this.root, id, msgId));
		if (unreadFile && existsSync(unreadFile)) {
			rmSync(unreadFile);
			return;
		}
		const readFile = readPathOrUndefined(() => paths.messageReadFile(this.root, id, msgId));
		if (readFile && existsSync(readFile)) {
			rmSync(readFile);
			return;
		}
		throw new Error(`"${msgId}" is not a message in this inbox`);
	}
	removeMailbox(id) {
		rmSync(paths.inboxDir(this.root, id), {
			recursive: true,
			force: true
		});
	}
	putAgent(rec) {
		writeJson(paths.agentFile(this.root, rec.id), rec);
	}
	getAgent(id) {
		const file = readPathOrUndefined(() => paths.agentFile(this.root, id));
		if (!file || !existsSync(file)) return void 0;
		return readJsonRecord(file);
	}
	listAgents() {
		const dir = paths.agentsDir(this.root);
		if (!existsSync(dir)) return [];
		return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => readJsonRecord(join(dir, f))).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	}
	removeAgent(id) {
		rmSync(paths.agentFile(this.root, id), { force: true });
	}
	removeAgentData(id) {
		rmSync(paths.dataDir(this.root, id), {
			recursive: true,
			force: true
		});
	}
	putProject(rec) {
		writeJson(paths.projectFile(this.root, rec.id), rec);
	}
	getProject(id) {
		const file = readPathOrUndefined(() => paths.projectFile(this.root, id));
		if (!file || !existsSync(file)) return void 0;
		return readJsonRecord(file);
	}
	listProjects() {
		const dir = paths.projectsDir(this.root);
		if (!existsSync(dir)) return [];
		return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => readJsonRecord(join(dir, f))).sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
	}
	putServiceLease(lease) {
		writeJson(paths.serviceLeaseFile(this.root, lease.project, lease.service), lease);
	}
	getServiceLease(project, service) {
		const file = readPathOrUndefined(() => paths.serviceLeaseFile(this.root, project, service));
		if (!file || !existsSync(file)) return void 0;
		return readJsonRecord(file);
	}
	putPaneIndex(pane, agentId) {
		writeText(paths.paneFile(this.root, pane), agentId);
	}
	resolvePaneId(pane) {
		const file = paths.paneFile(this.root, pane);
		return existsSync(file) ? readFileSync(file, "utf8").trim() : void 0;
	}
	findPaneByAgentId(agentId) {
		const dir = paths.panesDir(this.root);
		if (!existsSync(dir)) return void 0;
		for (const f of readdirSync(dir)) {
			if (!f.endsWith(".id")) continue;
			if (readFileSync(join(dir, f), "utf8").trim() === agentId) return f.slice(0, -3);
		}
	}
	removePaneIndex(pane) {
		rmSync(paths.paneFile(this.root, pane), { force: true });
	}
	writeBrief(agentId, text) {
		writeText(paths.briefFile(this.root, agentId), text);
	}
	readBrief(agentId) {
		const file = readPathOrUndefined(() => paths.briefFile(this.root, agentId));
		return file && existsSync(file) ? readFileSync(file, "utf8") : void 0;
	}
	setMainPane(pane) {
		withLock(this.root, "main-pane", () => {
			const file = paths.mainPaneFile(this.root);
			if (pane) {
				writeText(file, pane);
				return;
			}
			rmSync(file, { force: true });
		});
	}
	getMainPane() {
		const file = paths.mainPaneFile(this.root);
		return existsSync(file) ? readFileSync(file, "utf8").trim() : void 0;
	}
	withLock(name, fn) {
		return withLock(this.root, name, fn);
	}
};
//#endregion
//#region src/captain.ts
const CAPTAIN_SERVICE = "captain";
/**
* Where the project's Captain stands, read-only: no claim, no start. A project whose Captain was
* never started reads as `vacant` at generation 0.
*/
function showCaptain(ctx, projectRef) {
	const project = resolveProject(ctx, projectRef);
	const exec = ctx.exec ?? realExec;
	const branches = {
		homeBranch: exec("git", [
			"-C",
			project.root,
			"branch",
			"--show-current"
		]) || void 0,
		defaultBranch: exec("git", [
			"-C",
			project.root,
			"symbolic-ref",
			"--short",
			"refs/remotes/origin/HEAD"
		])?.replace(/^origin\//, "")
	};
	const base = {
		project: project.id,
		name: project.name,
		home: project.root,
		...branches
	};
	let view;
	try {
		view = resolveService(ctx, project.id, CAPTAIN_SERVICE);
	} catch {
		return {
			...base,
			health: "vacant",
			generation: 0,
			control: "none",
			note: "no Captain has been started"
		};
	}
	return {
		...base,
		health: view.health,
		generation: view.lease.generation,
		owner: view.lease.holder,
		ownerHandle: view.owner?.handle,
		control: view.control,
		note: view.note
	};
}
/**
* Record `captain` as the one owner of `pod`. The pod must run in its own worktree of this project —
* not the Captain's home, not another project's checkout. Rebinding the same owner is a no-op; a pod
* another Captain generation owns is refused (recover it with `adoptPod`).
*/
function bindPod(ctx, act) {
	const podProject = podProjectOf(ctx, act.pod);
	return fenced(ctx, act, (view) => {
		if (podProject.id !== view.project.id) throw new Error(`pod "${act.pod}" runs in another project's checkout (${podProject.name}), not ${view.project.name}`);
		if (podProject.worktree === view.project.root) throw new Error(`pod "${act.pod}" sits in the Captain's home; a pod needs its own worktree`);
		const existing = readBinding(ctx, act.pod);
		if (existing?.state === "retired") throw new Error(`pod "${act.pod}" is already retired`);
		if (existing) {
			if (existing.captain === act.captain && existing.generation === act.generation) return existing;
			throw new Error(`pod "${act.pod}" is owned by ${existing.captain} at generation ${existing.generation}; adopt it to take it over`);
		}
		return writeBinding(ctx, {
			pod: act.pod,
			project: view.project.id,
			captain: act.captain,
			generation: act.generation,
			...act.mission ? { mission: act.mission } : {},
			state: "active",
			boundAt: now(ctx)
		});
	});
}
/**
* Explicit recovery: the current Captain takes over a pod whose owner is no longer the current
* generation. Ownership never moves by a session merely contacting the Captain or reading its mail.
*/
function adoptPod(ctx, act) {
	return fenced(ctx, act, (view) => {
		const existing = activeBinding(ctx, act.pod, view);
		if (existing.generation === act.generation && existing.captain === act.captain) throw new Error(`${act.captain} already owns pod "${act.pod}" at generation ${act.generation}`);
		return writeBinding(ctx, {
			...existing,
			captain: act.captain,
			generation: act.generation,
			previous: [...existing.previous ?? [], {
				captain: existing.captain,
				generation: existing.generation
			}]
		});
	});
}
/**
* Retire a pod once its work is merged or abandoned — exactly once, and only by the Captain that
* owns it now. The pod's unit is torn down separately (`cyberlegion unit close`).
*/
function retirePod(ctx, act) {
	return fenced(ctx, act, (view) => {
		const existing = activeBinding(ctx, act.pod, view);
		if (existing.captain !== act.captain || existing.generation !== act.generation) throw new Error(`pod "${act.pod}" is owned by ${existing.captain} at generation ${existing.generation}; adopt it before retiring it`);
		return writeBinding(ctx, {
			...existing,
			state: "retired",
			retiredAt: now(ctx)
		});
	});
}
/** Every recorded pod — of one project, or of all — with where its ownership stands now. */
function listPods(ctx, projectRef) {
	const key = projectRef === void 0 ? void 0 : resolveProject(ctx, projectRef).id;
	const views = /* @__PURE__ */ new Map();
	const viewOf = (project) => {
		if (!views.has(project)) try {
			views.set(project, resolveService(ctx, project, CAPTAIN_SERVICE));
		} catch {
			views.set(project, void 0);
		}
		return views.get(project);
	};
	return readBindings(ctx).filter((b) => key === void 0 || b.project === key).map((b) => {
		const unit = ctx.store.getAgent(b.pod);
		return {
			...b,
			handle: unit?.handle,
			branch: unit?.worktree?.branch,
			live: unit ? isLive(ctx, unit) : false,
			owner: ownerState(b, viewOf(b.project))
		};
	});
}
function ownerState(b, view) {
	if (b.state === "retired") return "retired";
	if (!view || view.lease.generation !== b.generation || view.lease.holder !== b.captain) return "orphaned";
	return view.lease.state === "active" && view.health === "healthy" ? "current" : "unavailable";
}
/** The registry's view of a pod's session; `cyberlegion unit show` probes its multiplexer. */
function isLive(ctx, unit) {
	if (unit.status === "exited" || unit.status === "stopped") return false;
	return ctx.isLive ? ctx.isLive(unit) : true;
}
function fenced(ctx, act, fn) {
	return withOwnership(ctx, act.project, CAPTAIN_SERVICE, {
		unit: act.captain,
		generation: act.generation
	}, fn);
}
function activeBinding(ctx, pod, view) {
	const existing = readBinding(ctx, pod);
	if (!existing || existing.project !== view.project.id) throw new Error(`pod "${pod}" is not bound in ${view.project.name}`);
	if (existing.state === "retired") throw new Error(`pod "${pod}" is already retired`);
	return existing;
}
function podProjectOf(ctx, pod) {
	const unit = ctx.store.getAgent(pod);
	if (!unit) throw new Error(`no unit "${pod}"`);
	if (!unit.worktree?.root) throw new Error(`pod "${pod}" has no worktree; a pod runs in its own project worktree`);
	const worktree = existsSync(unit.worktree.root) ? realpathSync(unit.worktree.root) : unit.worktree.root;
	return {
		...resolveProject(ctx, unit.worktree.root),
		worktree
	};
}
const now = (ctx) => new Date(ctx.now?.() ?? Date.now()).toISOString();
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
function podsDir(ctx) {
	return join(ctx.store.root, "cyberfleet", "pods");
}
function bindingFile(ctx, pod) {
	if (!SAFE_ID.test(pod)) throw new Error(`invalid pod id "${pod}"`);
	return join(podsDir(ctx), `${pod}.json`);
}
function readBinding(ctx, pod) {
	const file = bindingFile(ctx, pod);
	return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : void 0;
}
function readBindings(ctx) {
	const dir = podsDir(ctx);
	if (!existsSync(dir)) return [];
	return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
}
function writeBinding(ctx, binding) {
	const file = bindingFile(ctx, binding.pod);
	mkdirSync(podsDir(ctx), { recursive: true });
	const tmp = `${file}.${process.pid}.tmp`;
	writeFileSync(tmp, `${JSON.stringify(binding, null, "	")}\n`);
	renameSync(tmp, file);
	return binding;
}
//#endregion
//#region src/sdd/hal.ts
/**
* Infer whether a CR's persisted gate lines show a self-assertion the run-level leash did not
* cover.
*
* Truth table (leash × any self-asserted `by: "agent"` gate):
*
* | leash        | spec gate by:agent | impl gate by:agent | aboveLeash |
* |--------------|---------------------|----------------------|------------|
* | auto-none    | —                   | —                    | false      |
* | auto-none    | yes                 | —                    | **true**   |
* | auto-none    | —                   | yes                  | **true**   |
* | auto-spec    | yes                 | —                    | false      |
* | auto-spec    | —                   | yes                  | **true**   |
* | auto-all     | yes                 | yes                  | false      |
* | (no leash line recorded) | —/yes    | —/yes                | false (cannot infer) |
*
* `auto-none` covers no gate, so ANY self-assert is above leash. `auto-spec` covers only the spec
* gate, so a self-asserted impl gate is above leash (a spec-gate self-assert is within). `auto-all`
* covers both, so self-assertion is never above leash. With no leash line at all there is nothing
* to compare against — this returns false rather than guessing (an unearned HAL flash would be
* worse than a missed one, per the ADR's "rare, earned signal" framing).
*/
function inferHal(ledger) {
	if (!ledger.leash) return false;
	const specSelfAsserted = ledger.gates.spec?.by === "agent";
	const implSelfAsserted = ledger.gates.impl?.by === "agent";
	switch (ledger.leash.leash) {
		case "auto-none": return specSelfAsserted || implSelfAsserted;
		case "auto-spec": return implSelfAsserted;
		case "auto-all": return false;
		default: return false;
	}
}
/**
* "Who needs the Council's hands" (ADR-0022 decision 10) — true when any of:
*   - a gate line's verdict is `"pause"` (the conductor stopped and is waiting), or
*   - the CR's combat log has a `halt` line (a mid-flight stop, not at a gate), or
*   - any gate line is still self-asserted (`by: "agent"`) — provisional, awaiting a human's
*     ratification into the ledger (the relayed-ratification seam — see `gate approve`).
*/
function computeNeedsCouncil(ledger, hasHaltLine) {
	if (hasHaltLine) return true;
	for (const gate of [ledger.gates.spec, ledger.gates.impl]) {
		if (!gate) continue;
		if (gate.verdict === "pause") return true;
		if (gate.by === "agent") return true;
	}
	return false;
}
//#endregion
//#region src/sdd/read.ts
/**
* Locate every project's ledger sibling dir under the three SDD spec conventions this reader
* supports: `.agents/specs/<project>/` (multi-project) and `.agents/spec/` (single-project, named
* `"repo"`). Never throws; an absent `.agents/specs` or `.agents/spec` simply contributes nothing.
*/
function discoverProjectLedgerLocations(agentsRoot) {
	const out = [];
	const specsDir = join(agentsRoot, ".agents", "specs");
	if (existsSync(specsDir)) try {
		for (const e of readdirSync(specsDir, { withFileTypes: true })) if (e.isDirectory()) out.push({
			project: e.name,
			dir: join(specsDir, e.name)
		});
	} catch {}
	const singleDir = join(agentsRoot, ".agents", "spec");
	if (existsSync(singleDir)) out.push({
		project: "repo",
		dir: singleDir
	});
	return out;
}
function parseJsonlFile(file, project) {
	let text;
	try {
		text = readFileSync(file, "utf8");
	} catch {
		return [];
	}
	const lines = [];
	for (const raw of text.split("\n")) {
		const s = raw.trim();
		if (!s) continue;
		try {
			lines.push({
				project,
				...JSON.parse(s)
			});
		} catch {}
	}
	return lines;
}
/**
* Glob every ledger line across every discovered project: `<project>/ledger/*.jsonl` (ADR-0020
* shards, sorted for stable but not authoritative-across-shards order) plus each project's
* legacy single-file `<project>/ledger.jsonl` (pre-shard corpora, ADR-0020's tolerated legacy
* form). Never throws.
*/
function readAllLedgerLines(agentsRoot) {
	const out = [];
	for (const { project, dir } of discoverProjectLedgerLocations(agentsRoot)) {
		const legacy = join(dir, "ledger.jsonl");
		if (existsSync(legacy)) out.push(...parseJsonlFile(legacy, project));
		const shardsDir = join(dir, "ledger");
		if (!existsSync(shardsDir)) continue;
		let files = [];
		try {
			files = readdirSync(shardsDir).filter((f) => f.endsWith(".jsonl"));
		} catch {
			files = [];
		}
		for (const f of files.sort()) out.push(...parseJsonlFile(join(shardsDir, f), project));
	}
	return out;
}
/** Read the latest `gate`/`leash` ledger lines for one CR ref across every discovered project. */
function readLedgerState(agentsRoot, cr) {
	const lines = readAllLedgerLines(agentsRoot).filter((l) => l.cr === cr);
	const gates = {
		spec: null,
		impl: null
	};
	let leash = null;
	let project = null;
	for (const l of lines) {
		project ??= l.project;
		if (l.kind === "gate" && (l.gate === "spec" || l.gate === "impl") && l.verdict && l.by) gates[l.gate] = {
			gate: l.gate,
			verdict: l.verdict,
			by: l.by
		};
		else if (l.kind === "leash" && l.leash && l.by) leash = {
			leash: l.leash,
			by: l.by
		};
	}
	return {
		project,
		gates,
		leash
	};
}
/**
* True when the CR's combat log (`.agents/plans/<cr>.log.jsonl`, sibling to its plan brief) has
* any `halt` line — a mid-flight stop not at a gate (see combat-log-governance). The combat log
* may be absent even for a real mission (not every mission writes one); absence is not an error.
*/
function hasHalt(agentsRoot, cr) {
	const file = join(agentsRoot, ".agents", "plans", `${cr}.log.jsonl`);
	if (!existsSync(file)) return false;
	let text;
	try {
		text = readFileSync(file, "utf8");
	} catch {
		return false;
	}
	for (const raw of text.split("\n")) {
		const s = raw.trim();
		if (!s) continue;
		try {
			if (JSON.parse(s).kind === "halt") return true;
		} catch {}
	}
	return false;
}
/** The first content line of the `## NEXT` resume anchor, or '' when there is none. */
function nextLead(text) {
	const lines = text.split("\n");
	const i = lines.findIndex((l) => /^##\s+NEXT\b/i.test(l.trim()));
	if (i === -1) return "";
	for (let j = i + 1; j < lines.length; j++) {
		const l = lines[j].replace(/\r$/, "").trim();
		if (l === "") continue;
		if (l.startsWith("#")) return "";
		return l.replace(/^[-*]\s+/, "").replace(/\*\*/g, "").trim();
	}
	return "";
}
function unquote(v) {
	return v.replace(/^["']|["']$/g, "");
}
/**
* Parse `.agents/plans/<cr>.plan.md`'s frontmatter (dispatch `status` + the `todos:` tally) plus
* its `## NEXT` lead line. Returns null when the plan brief is absent or has no frontmatter block
* (mirrors discover-plans.mts: a `*.plan.md` with no frontmatter is a stray, not a brief).
*/
function readPlanBrief(agentsRoot, cr) {
	const file = join(agentsRoot, ".agents", "plans", `${cr}.plan.md`);
	if (!existsSync(file)) return null;
	let text;
	try {
		text = readFileSync(file, "utf8");
	} catch {
		return null;
	}
	const m = /^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(text);
	if (!m) return null;
	let status = "active";
	let total = 0;
	let completed = 0;
	let inTodos = false;
	for (const raw of m[1].split("\n")) {
		const line = raw.replace(/\r$/, "");
		if (line.trim() === "" || line.trim().startsWith("#")) continue;
		const indent = line.length - line.trimStart().length;
		const trimmed = line.trim();
		if (indent === 0) {
			inTodos = false;
			const [key, ...rest] = trimmed.split(":");
			const value = unquote(rest.join(":").trim());
			if (key === "status" && value !== "") status = value;
			else if (key === "todos") inTodos = true;
			continue;
		}
		if (inTodos) {
			const sm = /^(?:-\s+)?status:\s*(.+)$/.exec(trimmed);
			if (sm) {
				total++;
				if (unquote(sm[1].trim()) === "completed") completed++;
			}
		}
	}
	return {
		status,
		total,
		completed,
		next: nextLead(text)
	};
}
/**
* Parse one project's `spec.md` frontmatter `status` only (never the body). Tries the multi-
* project convention (`.agents/specs/<project>/spec.md`) first, falling back to the single-
* project convention (`.agents/spec/spec.md`, used when `project` is `"repo"` or unresolved).
* Returns null when neither exists or the frontmatter has no `status`.
*/
function readSpecStatus(agentsRoot, project) {
	const candidates = project === "repo" ? [join(agentsRoot, ".agents", "spec", "spec.md")] : [join(agentsRoot, ".agents", "specs", project, "spec.md")];
	for (const file of candidates) {
		if (!existsSync(file)) continue;
		let text;
		try {
			text = readFileSync(file, "utf8");
		} catch {
			continue;
		}
		const m = /^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(text);
		if (!m) continue;
		for (const raw of m[1].split("\n")) {
			const line = raw.replace(/\r$/, "");
			if (line.length - line.trimStart().length !== 0) continue;
			const [key, ...rest] = line.trim().split(":");
			if (key === "status") {
				const value = unquote(rest.join(":").trim());
				return value === "" ? null : value;
			}
		}
	}
	return null;
}
//#endregion
//#region src/missions.ts
/**
* Resolve the root under which `.agents/` lives — the primary checkout (so `missions` sees the
* whole fleet's SDD state regardless of which ship's worktree it is invoked from), falling back to
* this project root when not inside a git repository at all.
*/
function resolveAgentsRoot(exec, cwd) {
	try {
		return resolvePrimaryRoot(exec);
	} catch {
		return projectRoot(cwd);
	}
}
/**
* Derive one ship's mission row. The ship↔CR join key is `AgentRecord.worktree.branch` — this
* repo's convention is that a ship's worktree branch equals the `<cr-ref>` its plan brief and
* ledger shards are filed under (e.g. branch `add-fleet-comms` ↔ `add-fleet-comms.plan.md` ↔
* ledger shard prefix `add-fleet-comms.*`). A ship with no worktree/branch (not yet spawned into
* one, or standalone) joins to nothing — every SDD-derived field is null, never thrown.
*/
function buildMissionRow(agentsRoot, agent) {
	const branch = agent.worktree?.branch ?? null;
	const base = {
		handle: agent.handle,
		id: agent.id,
		worktreeRoot: agent.worktree?.root ?? null,
		branch,
		status: agent.status
	};
	if (!branch) return {
		...base,
		cr: null,
		mission: null,
		spec: null,
		gate: {
			spec: null,
			impl: null
		},
		leash: null,
		needsCouncil: false,
		hal: false
	};
	const cr = branch;
	const ledger = readLedgerState(agentsRoot, cr);
	const plan = readPlanBrief(agentsRoot, cr);
	const specStatus = ledger.project ? readSpecStatus(agentsRoot, ledger.project) : null;
	const halt = hasHalt(agentsRoot, cr);
	return {
		...base,
		cr,
		mission: plan ? {
			status: plan.status,
			completed: plan.completed,
			total: plan.total,
			next: plan.next
		} : null,
		spec: specStatus ? { status: specStatus } : null,
		gate: {
			spec: ledger.gates.spec ? {
				verdict: ledger.gates.spec.verdict,
				by: ledger.gates.spec.by
			} : null,
			impl: ledger.gates.impl ? {
				verdict: ledger.gates.impl.verdict,
				by: ledger.gates.impl.by
			} : null
		},
		leash: ledger.leash?.leash ?? null,
		needsCouncil: computeNeedsCouncil(ledger, halt),
		hal: inferHal(ledger)
	};
}
/** Derive the mission row set for every ship in the fleet registry. */
function buildMissions(agentsRoot, agents) {
	return agents.map((a) => buildMissionRow(agentsRoot, a));
}
//#endregion
//#region src/cli.ts
function ctxOf(opts) {
	return {
		store: new FileStore(resolveRoot({
			root: opts.root,
			space: opts.space
		})),
		env: process.env
	};
}
function formatOf(opts) {
	return opts.format === "json" ? "json" : "toon";
}
/**
* Pause a unit's mission — a cyberfleet-level marker on its `AgentRecord.status` only. Not
* exported by cyberlegion (fleet-specific concept), so it stays here — a thin write through the
* shared `Store` seam. This is NOT a bridge to SDD's `pause-mission` checkpoint (which rewrites the
* plan brief's todos/## NEXT anchor) — that gap is flagged, not silently papered over: a caller who
* wants the actual mission checkpoint must run `sdd:pause-mission` in-session.
*/
function pauseAgent(ctx, id) {
	const rec = ctx.store.getAgent(id);
	if (!rec) throw new Error(`no agent "${id}"`);
	rec.status = "paused";
	ctx.store.putAgent(rec);
	return rec;
}
const rootOpts = (cmd) => cmd.option("--root <path>", "cyberlegion hub root (overrides the global hub / $CYBERLEGION_ROOT)").option("--space <path>", "alias for --root").addOption(new Option("--format <format>", "output format").choices(["toon", "json"]).default("toon"));
const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const program = new Command();
program.name("cyberfleet").description("Fleet layer over cyberlegion — ships, missions, and the Council view").version(version);
rootOpts(program.command("missions")).description("who needs the Council's hands — ships × mission × gate × leash, derived from SDD state").option("--agents-root <path>", "override the root under which .agents/ is resolved (default: the primary checkout)").action((opts) => {
	const ctx = ctxOf(opts);
	touch(ctx);
	const rows = buildMissions(opts.agentsRoot ?? resolveAgentsRoot(realExec), listAgents(ctx.store).filter((a) => a.status !== "exited"));
	emit(formatOf(opts), {
		toon: toonList("missions", rows, [
			{
				key: "handle",
				get: (r) => r.handle
			},
			{
				key: "branch",
				get: (r) => r.branch ?? "-"
			},
			{
				key: "status",
				get: (r) => r.status
			},
			{
				key: "mission",
				get: (r) => r.mission ? `${r.mission.status} ${r.mission.completed}/${r.mission.total}` : "-"
			},
			{
				key: "spec",
				get: (r) => r.spec?.status ?? "-"
			},
			{
				key: "gate:spec",
				get: (r) => r.gate.spec ? `${r.gate.spec.verdict}(${r.gate.spec.by})` : "-"
			},
			{
				key: "gate:impl",
				get: (r) => r.gate.impl ? `${r.gate.impl.verdict}(${r.gate.impl.by})` : "-"
			},
			{
				key: "leash",
				get: (r) => r.leash ?? "-"
			},
			{
				key: "council",
				get: (r) => r.needsCouncil ? "yes" : "-"
			},
			{
				key: "hal",
				get: (r) => r.hal ? "!" : ""
			}
		], `${rows.length} ships`),
		json: rows
	});
});
rootOpts(program.command("jump")).description("select/focus a ship's session (tmux pane), or print its worktree path to cd into").argument("<peer>", "handle, id, or worktree branch/CR ref").action((peer, opts) => {
	const ctx = ctxOf(opts);
	touch(ctx);
	const agent = resolveAgent(ctx.store, peer);
	const pane = agent.pane?.id ?? ctx.store.findPaneByAgentId(agent.id);
	if (pane) try {
		selectSessionAdapter(ctx.env ?? process.env).focus(realExec, { id: pane });
		emit(formatOf(opts), {
			toon: toonObject({
				jumped: agent.handle,
				pane
			}),
			json: {
				jumped: agent.handle,
				pane
			}
		});
		return;
	} catch {}
	console.log(agent.worktree?.root ?? agent.cwd);
});
rootOpts(program.command("pause")).description("pause a ship's mission — a cyberfleet-level status marker only (see note)").argument("<peer>", "handle, id, or worktree branch/CR ref").action((peer, opts) => {
	const ctx = ctxOf(opts);
	const rec = pauseAgent(ctx, resolveAgent(ctx.store, peer).id);
	emit(formatOf(opts), {
		toon: toonObject({
			paused: rec.handle,
			status: rec.status
		}),
		json: rec
	});
	process.stderr.write("note: this only flips the cyberfleet ship record to status:paused — it is NOT a bridge to SDD's pause-mission checkpoint (which rewrites the plan brief's todos/## NEXT anchor). Run `sdd:pause-mission` in-session for the actual mission checkpoint (flagged gap).\n");
});
rootOpts(program.command("captain")).description("show a project's Captain — its home checkout, owner, generation, and health (read-only; starts nothing)").argument("[project]", "project key, a path in any of its checkouts, or its unique name (default: here)").action((project, opts) => {
	const view = showCaptain(ctxOf(opts), project ?? process.cwd());
	emit(formatOf(opts), {
		toon: toonObject({ ...view }),
		json: view
	});
});
rootOpts(program.command("pods")).description("list the pods each Captain owns, and where that ownership stands (current/unavailable/orphaned/retired)").argument("[project]", "project key, a path in any of its checkouts, or its unique name (default: every project)").action((project, opts) => {
	const rows = listPods(ctxOf(opts), project);
	emit(formatOf(opts), {
		toon: toonList("pods", rows, [
			{
				key: "pod",
				get: (r) => r.handle ?? r.pod
			},
			{
				key: "branch",
				get: (r) => r.branch ?? "-"
			},
			{
				key: "live",
				get: (r) => r.live ? "yes" : "no"
			},
			{
				key: "captain",
				get: (r) => `${r.captain}@${r.generation}`
			},
			{
				key: "owner",
				get: (r) => r.owner
			},
			{
				key: "mission",
				get: (r) => r.mission ?? "-"
			}
		], `${rows.length} pods`),
		json: rows
	});
});
const podCmd = program.command("pod").description("a Captain's record of the pods it owns — every change fenced by its generation");
const podAct = (cmd) => rootOpts(cmd).argument("<pod>", "the pod unit (handle or id)").requiredOption("--generation <n>", "the Captain service generation the caller owns (from `cyberfleet captain`)").option("--project <ref>", "project key, path, or unique name (default: here)").option("--captain <ref>", "the acting Captain unit (default: this session)");
function actOf(ctx, pod, opts) {
	const captain = opts.captain ? resolveAgent(ctx.store, opts.captain).id : resolveSelfId(ctx);
	if (!captain) throw new Error("no session identity — run as a registered unit, or pass --captain");
	const generation = Number(opts.generation);
	if (!Number.isInteger(generation) || generation < 0) throw new Error("--generation must be a non-negative integer");
	return {
		project: opts.project ?? process.cwd(),
		captain,
		generation,
		pod: resolveAgent(ctx.store, pod).id
	};
}
podAct(podCmd.command("bind")).description("record this Captain as the one owner of a pod in its own project worktree").option("--mission <ref>", "the mission the pod runs").action((pod, opts) => {
	const ctx = ctxOf(opts);
	const binding = bindPod(ctx, {
		...actOf(ctx, pod, opts),
		...opts.mission ? { mission: opts.mission } : {}
	});
	emit(formatOf(opts), {
		toon: toonObject({
			...binding,
			previous: void 0
		}),
		json: binding
	});
});
podAct(podCmd.command("adopt")).description("explicit recovery: take over a pod whose Captain generation was replaced").action((pod, opts) => {
	const ctx = ctxOf(opts);
	const binding = adoptPod(ctx, actOf(ctx, pod, opts));
	emit(formatOf(opts), {
		toon: toonObject({
			...binding,
			previous: void 0
		}),
		json: binding
	});
});
podAct(podCmd.command("retire")).description("retire a pod once — only its current owner can; close its unit separately").action((pod, opts) => {
	const ctx = ctxOf(opts);
	const binding = retirePod(ctx, actOf(ctx, pod, opts));
	emit(formatOf(opts), {
		toon: toonObject({
			...binding,
			previous: void 0
		}),
		json: binding
	});
});
rootOpts(program.command("gate").description("SDD gate operations").command("approve")).description("Council ratification of a gate — STUBBED, not safely relayable through this CLI (see note)").argument("<cr>", "CR ref").argument("<gateName>", "spec | impl").action((cr, gateName, _opts) => {
	if (gateName !== "spec" && gateName !== "impl") throw new Error("<gateName> must be spec | impl");
	const wouldWrite = {
		kind: "gate",
		cr,
		gate: gateName,
		verdict: "approve",
		by: process.env.SDD_HANDLE ?? realExec("git", ["config", "user.name"]) ?? realExec("git", [
			"log",
			"-1",
			"--format=%an"
		]) ?? "<unknown>"
	};
	process.stderr.write(`cyberfleet gate approve is NOT implemented — a human ratification into the SDD ledger cannot be safely relayed through this CLI without running in-session with the SDD schema in force (the relayed-ratification seam). It would have written:
  ${JSON.stringify(wouldWrite)}\nRatify this gate via the SDD spec-gate skill, in-session, instead. Flagging for the Council.
`);
	process.exitCode = 1;
});
program.parseAsync(process.argv).catch((err) => {
	process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
	process.exit(1);
});
//#endregion
export {};
