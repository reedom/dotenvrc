// [Bash man page of export]
// Syntax
// export [-fn] [name[=value]]
//
// export -p
//
// Options
// -f   The names refer to shell functions;
// otherwise the names refer to shell variables.
//
//   value   The value of the variable is set to value.
//
// -n   No longer mark each name for export.
//
// -p   Print a list of all the names exported in this shell.
//   This is also the default action if no name is given.

import { createContext, expandValue, ExpandValueContext } from './expandValue';
import parse, {
  AST_AssignmentWord,
  AST_CommandCommand,
  AST_ParameterExpansion,
  AST_Redirect,
  AST_Word
} from 'bash-parser';
import ProcessEnv = NodeJS.ProcessEnv;

export interface EnvContentParserOptions {
  /** If true, `parseEnvContent` returns variables defined by `export var=val` expression.
   *  Otherwise it returns `var=val` variables, too. */
  exportedOnly: boolean;
  /** `parseEnvContent` replaces `$PWD` with this value. */
  cwd: string;
  /** If defined, all variables in `predefined` exceeds over ones in the context.
   *  For instance, if a content has a line `var1=10` but `predefined` has `{var1: 20}`,
   *  `var1` will have `20` in the result. */
  predefined?: ProcessEnv;
}

/**
 * Parse env file's content and return zero or more of extracted variables.
 */
export function parseEnvContent(code: string, options: EnvContentParserOptions): ProcessEnv {
  const { exportedOnly, cwd, predefined } = options;
  const context = createContext({ cwd, predefined });

  const ast = parse(code);
  console.log(JSON.stringify(ast, null, 2));
  ast.commands.filter(command => {
    return command.type === 'Command';
  })
    .forEach(command => {
      parseTopLevelCommand(context, command as AST_CommandCommand)
    });

  return exportedOnly ? context.exported : context.internal;
}

function parseTopLevelCommand(context: ExpandValueContext, command: AST_CommandCommand): void {
  if (!command.name) {
    // There are one or more assignment but no commands exists
    // so that it should be assigned to `context.internal`.
    // E.g.
    // var1=val
    // var2=x  var3=y
    parseLocalVariableAssignments(context, command.prefix);
    return;
  }

  if (command.name?.text === 'export') {
    parseExportCommand(context, command);
  }
}

/**
 * Parse nodes that are possibly local variable assignments and store them to `context.internal`.
 *
 * Might looks like:
 * ```
 * var1=val
 * var2=x  var3=y
 * ```
 */
function parseLocalVariableAssignments(
  context: ExpandValueContext,
  nodes: Array<AST_AssignmentWord | AST_Redirect> | undefined
) {
  if (!nodes) return;
  const assignmentPrefixes = collectAssignmentNodes(nodes);
  parseTemporalAssignments(context, assignmentPrefixes);
  Object.entries(context.temporal)
    .forEach(([key, value]) => assignToInternal(context, key, value as string));
}

function collectAssignmentNodes(
  nodes: Array<AST_AssignmentWord | AST_Word | AST_Redirect> | undefined
): Array<AST_AssignmentWord | AST_Word> {
  if (!nodes) return [];

  return nodes
    .filter(node => isKindOfAssignmentNode(node)) as Array<AST_AssignmentWord | AST_Word>;
}

function isKindOfAssignmentNode(
  node: AST_AssignmentWord | AST_Word | AST_Redirect
): boolean {
  if (node.type === 'AssignmentWord') return true;
  return node.type === 'Word' && /^\w+=/.test(node.text);
}

function extractAssignment(
  context: ExpandValueContext,
  node: AST_AssignmentWord | AST_Word
): [string, string | undefined] {
  const { text } = node;
  const pos = text.indexOf('=');
  if (pos < 0) {
    // e.g.  [export] var1
    return [text, undefined];
  }
  if (pos === text.length - 1) {
    // e.g. [export] var1=
    return [text.slice(0, text.length - 1), ''];
  }

  // e.g. [export] var1=val
  const paramExpansions = collectParamExpansions(node);
  const expanded = expandValue(text, pos + 1, paramExpansions, context);
  return [expanded.slice(0, pos), expanded.slice(pos + 1)];
}

/**
 * Parse `key=value` expression and populate `context.temporal` with them.
 */
function parseTemporalAssignments(
  context: ExpandValueContext,
  assignmentPrefixes: Array<AST_AssignmentWord | AST_Word>
) {
  context.temporal = {};
  assignmentPrefixes.forEach(node => {
    let [key, value] = extractAssignment(context, node);
    if (typeof value !== 'undefined') {
      context.temporal[key] = value;
    }
  });
}

function parseExportCommand(context: ExpandValueContext, command: AST_CommandCommand): void {
  // If `command.prefix` contains one more assignments,
  // the export command line looks like:
  //    var1=x var2=y export ...
  // and life of each of prefix assignments is conditional:
  //   - If the `context` already has the variable, or following `export` exports it,
  //     then it goes into context.
  //   - Otherwise it is temporal.
  //
  // For instance, if in the context of `context.exported = {var1: 10}` and then
  // the following line comes:
  //   var1=20 export var2=30
  // it results: `context.exported = {var1: 20, var2: 30}`.
  const assignmentPrefixes = collectAssignmentNodes(command.prefix);
  parseTemporalAssignments(context, assignmentPrefixes);
  Object.entries(context.temporal)
    .forEach(([key, value]) => assignToContextIfExists(context, key, value as string));

  if (!command.suffix?.length) return;

  // [hasUnset]
  // `export -n` means "un-export", remove specified variable(s) from `context.export`.
  // Example:
  //   export -n var1=50 var2
  //   ↑ this means both `var1` and `var2` will be removed from `context.export`,
  //     and in `context.internal` `var1` has now `50`.
  let hasUnset = false;

  command.suffix
    .filter(node => node.type === 'Word')
    .map(node => node as AST_Word)
    .forEach((word: AST_Word) => {
      if (word.text === '-n') {
        hasUnset = true;
        return;
      }
      if (word.text === '-f') {
        // This module does not support this flag (export function[s]).
        return;
      }
      if (!isKindOfAssignmentNode(word)) return;

      const [key, value] = extractAssignment(context, word);
      if (hasUnset) {
        unsetExport(context, key, value);
      } else {
        assignToExport(context, key, value);
      }
    });
}

function collectParamExpansions(word: AST_Word | AST_AssignmentWord): AST_ParameterExpansion[] {
  if (!word.expansion) return [];
  return word.expansion
    .filter(e => e.type === 'ParameterExpansion' && 0 <= e.loc.start) as AST_ParameterExpansion[];
}

function assignToExport(context: ExpandValueContext, key: string, value: string | undefined) {
  // e.g. `export var1=10`
  if (typeof value !== 'undefined') {
    context.exported[key] = value;
    context.internal[key] = value;
    return;
  }

  // e.g. `export var1`
  if (Object.prototype.hasOwnProperty.call(context.internal, key)) {
    context.exported[key] = context.internal[key];
  } else if (Object.prototype.hasOwnProperty.call(context.temporal, key)) {
    context.exported[key] = context.temporal[key];
  }
}

function assignToInternal(context: ExpandValueContext, key: string, value: string) {
  context.internal[key] = value;
  // If the value has already been exported, assign the new value, too,
  // as `zsh` shows this behaviour.
  if (Object.prototype.hasOwnProperty.call(context.exported, key)) {
    context.exported[key] = value;
  }
}

function assignToContextIfExists(context: ExpandValueContext, key: string, value: string) {
  if (Object.prototype.hasOwnProperty.call(context.temporal, key)) {
    context.temporal[key] = value;
  }
  if (Object.prototype.hasOwnProperty.call(context.internal, key)) {
    context.internal[key] = value;
  }
  if (Object.prototype.hasOwnProperty.call(context.exported, key)) {
    context.exported[key] = value;
  }
}

/**
 * Unset a variable from `context.exported`.
 */
function unsetExport(context: ExpandValueContext, key: string, value: string | undefined) {
  delete context.exported[key];
  if (typeof value !== 'undefined') {
    // e.g.  export -n var1=60
    // In this case, assign affects to `internal` and `temporal`.
    assignToContextIfExists(context, key, value);
  }
}
