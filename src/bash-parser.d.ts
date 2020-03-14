declare module 'bash-parser' {
  export default parse;

  function parse(code: string, options?: ParserOptions): PosixAST;

  export interface PosixAST {
    type: 'Script';
    commands: AST_CommandSeries[];
  }

  type AST_CommandSeries =
    | AST_LogicalExpressionCommand
    | AST_PipelineCommand
    | AST_CommandCommand
    | AST_FunctionCommand
    | AST_SubshellCommand
    | AST_ForCommand
    | AST_CaseCommand
    | AST_IfCommand
    | AST_WhileCommand
    | AST_UntilCommand;

  export interface AST_LogicalExpressionCommand {
    type: 'LogicalExpression';
    op: string;
    left: AST_CommandSeries[];
    right: AST_CommandSeries[];
  }

  export interface AST_PipelineCommand {
    type: 'Pipeline';
    commands: AST_CommandSeries[];
  }

  export interface AST_CommandCommand {
    type: 'Command';
    name?: AST_Word;
    prefix?: Array<AST_AssignmentWord | AST_Redirect>;
    suffix?: Array<AST_Word | AST_Redirect>;
  }

  // TODO
  export interface AST_FunctionCommand {
    type: 'Function';
    name: AST_Name;
    redirections?: AST_Redirect[];
    body: AST_CompoundList;
  }

  export interface AST_CompoundList {
    type: 'CompoundList';
    commands: AST_CommandSeries[];
    redirections?: AST_Redirect[];
  }

  export interface AST_SubshellCommand {
    type: 'Subshell';
    list: AST_CompoundList;
  }

  export interface AST_ForCommand {
    type: 'For';
    name: AST_Name;
    wordlist: AST_Word[];
    do: AST_CompoundList;
  }

  export interface AST_CaseCommand {
    type: 'if';
    clause: AST_Word;
    case: AST_CaseItem;
  }

  export interface AST_CaseItem {
    type: 'CaseItem';
    pattern: AST_Word[];
    body: AST_CompoundList;
  }

  export interface AST_IfCommand {
    type: 'If';
    clause: AST_CompoundList;
    then: AST_CompoundList;
    else: AST_CompoundList;
  }

  export interface AST_WhileCommand {
    type: 'While';
    clause: AST_CompoundList;
    do: AST_CompoundList;
  }

  export interface AST_UntilCommand {
    type: 'Until';
    clause: AST_CompoundList;
    do: AST_CompoundList;
  }

  export interface AST_Loc {
    start: number;
    end: number;
  }

  export interface AST_Name {
    type: 'Name';
    text: string;
  }

  export interface AST_Redirect {
    type: 'Redirect';
    op: string;
    file: AST_Word;
    numberIo: number;
  }

  export interface AST_Word {
    type: 'Word';
    text: string;
    expansion?: Array<AST_ArithmeticExpansion | AST_CommandExpansion | AST_ParameterExpansion>;
  }

  export interface AST_AssignmentWord {
    type: 'AssignmentWord';
    text: string;
    expansion?: Array<AST_ArithmeticExpansion | AST_CommandExpansion | AST_ParameterExpansion>;
  }

  export interface AST_ArithmeticExpansion {
    type: 'ArithmeticExpansion';
    expression: string;
    resolved: boolean;
    arithmeticAST: Object;
    loc: AST_Loc;
  }

  export interface AST_CommandExpansion {
    type: 'CommandExpansion';
    command: string;
    resolved: boolean;
    commandAST: Object;
    loc: AST_Loc;
  }

  export interface AST_ParameterExpansion {
    type: 'ParameterExpansion';
    parameter: string;
    kind?: string;
    word?: string;
    op?: string;
    loc: AST_Loc;
  }

  export interface ParserOptions {
    /** Which mode plugin to use. Default: posix */
    mode?: 'posix' | 'bash' | 'word-expansion';
    /** if true, includes lines and columns information in the source file. */
    insertLOC?: boolean;
    /**
     * a callback to resolve shell alias. If specified, the parser call it whenever it need to
     * resolve an alias. It should return the resolved code if the alias exists, otherwise null.
     * If the option is not specified, the parser won't try to resolve any alias.
     */
    resolveAlias?: (name: string) => String;
    /**
     * a callback to resolve environment variables. If specified, the parser call it whenever it
     * need to resolve an environment variable. It should return the value if the variable is
     * defined, otherwise null. If the option is not specified, the parser won't try to resolve
     * any environment variable.
     */
    resolveEnv?: (name: string) => string;
    /**
     * a callback to resolve path globbing. If specified, the parser call it whenever it need to
     * resolve a path globbing. It should return the value if the expanded variable. If the
     * option is not specified, the parser won't try to resolve any path globbing.
     */
    resolvePath?: (name: string) => string;
    /**
     * a callback to resolve users home directories. If specified, the parser call it whenever it
     * need to resolve a tilde expansion. If the option is not specified, the parser won't try to
     * resolve any tilde expansion. When the callback is called with a null value for username,
     * the callbackshould return the current user home directory.
     */
    resolveHomeUser?: (username: string) => string;
    /**
     * a callback to resolve parameter expansion. If specified, the parser call it whenever it need
     * to resolve a parameter expansion. It should return the result of the expansion. If the
     * option is not specified, the parser won't try to resolve any parameter expansion.
     */
    resolveParameter?: (parameterAST: Object) => string;
    /**
     * a callback to execute a simple_command. If specified, the parser call it whenever it need to
     * resolve a command substitution. It receive as argument the AST of a simple_command node, and
     * shall return the output of the command. If the option is not specified, the parser won't try
     * to resolve any command substitution.
     */
    execCommand?: (cmdAST: Object) => string;
    /**
     * a callback to execute a complete_command in a new shell process. If specified, the parser
     * call it whenever it need to resolve a subshell statement. It receive as argument the AST of
     * a complete_command node, and shall return the output of the command. If the option is not
     * specified, the parser won't try to resolve any subshell statement.
     */
    execShellScript?: (cmdAST: Object) => string;
    /**
     * a callback to execute an arithmetic_expansion. If specified, the parser call it whenever it
     * need to resolve an arithmetic substitution. It receive as argument the AST of a
     * arithmetic_expansion node, and shall return the result of the calculation. If the option is
     * not specified, the parser won't try to resolve any arithmetic_expansion substitution.
     * Please note that the aritmethic expression AST is built using babylon, you cand find there
     * it's AST specification.
     */
    runArithmeticExpression?: (arithmeticAST: Object) => string;
  }
}
