import TreeNode from "./TreeNode";
import Variable from "./Variable";


interface parameterType {
    valueType: string;
    description: string;
    isField?: boolean;
    isExecutive?: boolean;
    isDataSet?: boolean

}
interface useTypeType {
    returnParameterType: number;
    returnValueType: string;
    parameters: Array<parameterType>;

}
interface funcType {
    name: string;
    className: string,
    category: string;
    description: string;
    useTypes: Array<useTypeType>;
}
class ExpressionTreeNode extends TreeNode {
    startIndex: number;
    valueType: string;
    variable: Variable | null;
    isFunction: boolean;
    function: funcType | null;
    useType: useTypeType | null;
    isBracket: boolean;
    children: ExpressionTreeNode[]
    constructor(text = "") {
        super(text);
        this.startIndex = -1;
        this.valueType = ""
        this.variable = null

        this.isFunction = false;
        this.function = null
        this.useType = null
        this.isBracket = false;
        this.parent = null;
        this.children = [];
    }
}
export type { funcType, useTypeType, parameterType }
export default ExpressionTreeNode;