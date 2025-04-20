declare module '@langchain/langgraph/web' {
  export const START: unique symbol;
  export const END: unique symbol;
  
  export class StateGraph<T = any> {
    constructor(state: any);
    addNode(name: string, nodeFunction: Function): this;
    addEdge(source: string | symbol, target: string | symbol): this;
    addConditionalEdges(
      source: string,
      condition: (state: any) => string,
      edges: Record<string, string | symbol>
    ): this;
    compile(options?: any): any;
  }

  export const Annotation: {
    Root: <T = any>(schema: T) => { State: T };
    <T>(options?: { reducer?: (a: T, b: T) => T }): any;
  };
} 