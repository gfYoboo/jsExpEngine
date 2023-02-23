import Variable from "./Variable";
import ExpressionTreeNode from "./ExpressionTreeNode";
import type { funcType, useTypeType, parameterType } from "./ExpressionTreeNode"

const ExpressionValueType: Record<string, string> = {
    ",": "Comma",
    "*": "MultiplyDivide",
    "^": "MultiplyDivide",
    "/": "MultiplyDivide",
    "\\": "MultiplyDivide",
    "+": "Plus",
    "-": "Minus",
    ">": "WhetherEqual",
    "<": "WhetherEqual",
    "=": "EqualUnequal",
    "<>": "EqualUnequal",
    ">=": "WhetherEqual",
    "<=": "WhetherEqual",
    "LIKE": "EqualUnequal",
    "AND": "AndOr",
    "OR": "AndOr",
    "TRUE": "Bool",
    "FALSE": "Bool",
    "NULL": "NullValue",
    "(": "Error",
    ")": "Error"
}
const ExpressionOperators = Object.keys(ExpressionValueType);
const BracketFunctions = ["Not", "IsNull", "Abs", "Ceiling", "Floor", "Round", "Left", "Right", "Stuff", "SubString", "Lower", "Upper", "Replace", "Trim", "SysDate", "SysTime", "To_Number", "To_Date", "To_Time", "To_Char", "IIF", "WinValue", "ParentValue", "PreWinValue", "Sys", "sum"];


const FunctionCollection: Record<string, funcType> = {
    "sum": {
        name: "sum",
        className: "",
        category: "数学",
        description: "合计",
        useTypes: [
            {
                returnParameterType: -1,
                returnValueType: "Number",
                parameters: [
                    { valueType: "Number", description: "数字类型" },
                    { valueType: "Number", description: "数字类型" }
                ]
            }]
    }
}
const funcExpressionVariables: Record<string, Variable> = {
    "sum": {
        name: "sum",
        trueName: "sum",
        psmName: "sum",
        valueType: "Error",
        variableType: "Function"
    }
}

const OperatorsPreAndNextExpression: Record<string, Array<string>> = {
    "MultiplyDivide": ["Number"],
    "Minus": ["Number", "AndOr", "Comma", "EqualUnequal", "Null", "WhetherEqual"],
    "Plus": ["Number", "String"],
    "WhetherEqual": ["Number", "Date", "String", "Time"],
    "EqualUnequal": ["Number", "Date", "String", "Time", "NullValue"],
    "AndOr": ["Bool"],
    "Bool": ["AndOr", "Comma", "Null"],
    "Comma": ["Bool", "Date", "Number", "String", "Time", "NullValue"],
    "Date": ["Comma", "WhetherEqual", "Null", "AndOr", "EqualUnequal"],
    "String": ["Comma", "Plus", "Null", "AndOr", "EqualUnequal"],
    "Time": ["Comma", "WhetherEqual", "Null", "AndOr", "EqualUnequal"],
    "Number": ["Comma", "MultiplyDivide", "Minus", "Plus", "WhetherEqual", "Null", "AndOr", "EqualUnequal"],
    "NullValue": ["Comma", "AndOr", "EqualUnequal", "Null"]
}


class ValidateExpression {
    ExpressionTreeRoot: ExpressionTreeNode;
    ExpressionWords: string[];
    ExpressionWordPositions: number[];
    ErrorTreeNodes: Map<ExpressionTreeNode, string>;
    ErrorCollection: string[];
    UsedParameters: any[];
    UsedVariables: any[];
    NeedReturnType: string[];
    AllDataSet: any[];
    ExpressionVariables: Record<string, Variable>;
    constructor() {
        this.ExpressionTreeRoot = new ExpressionTreeNode();
        //表达式分解成词
        this.ExpressionWords = [];
        //表达式分解成词
        this.ExpressionWordPositions = [];

        this.ErrorTreeNodes = new Map();
        //记录所有错误
        this.ErrorCollection = [];

        this.UsedParameters = [];
        this.UsedVariables = [];
        this.NeedReturnType = [];
        this.ExpressionVariables = {};
        this.AllDataSet = []

        for (let p in funcExpressionVariables) {
            this.ExpressionVariables[p] = funcExpressionVariables[p];
        }
    }
    Validate(expression: string, needReturnType: string[], parameters: Array<Variable>, allDataSet: any[]): boolean {
        if (expression) {
            for (let p of parameters) {
                this.ExpressionVariables[p.name] = p;
            }
            this.AllDataSet = allDataSet;
            this.NeedReturnType = needReturnType;

            this.SeparateExpressionString(expression);
            this.BuildTree(this.ExpressionTreeRoot, 0, this.ExpressionWords.length);
            this.AndOrAnalysis(this.ExpressionTreeRoot)
            this.ValidateFromRoot();
            this.CheckPreviousAndNext();
        }
        return this.IsLegalExpression();
    }
    //表达式是否有错误
    IsLegalExpression() {
        let CurrentNode: ExpressionTreeNode | null = this.ExpressionTreeRoot;
        if (CurrentNode.children.length != 0) {
            while (CurrentNode != null) {
                if ((CurrentNode != this.ExpressionTreeRoot) && (CurrentNode.valueType == "Error")) {
                    this.AddExpressionError(CurrentNode.text + " 错误.", CurrentNode);
                }
                if (CurrentNode.children.length != 0) {
                    CurrentNode = CurrentNode.children[0] as ExpressionTreeNode;
                }
                else {
                    if (CurrentNode.nextNode() != null) {
                        CurrentNode = CurrentNode.nextNode() as ExpressionTreeNode;
                    }
                    else {
                        while ((CurrentNode.parent != this.ExpressionTreeRoot) && (CurrentNode.parent?.nextNode() == null)) {
                            CurrentNode = CurrentNode.parent as ExpressionTreeNode;
                        }
                        if (CurrentNode.parent == this.ExpressionTreeRoot) {
                            CurrentNode = null;
                        }
                        else {
                            CurrentNode = CurrentNode.parent?.nextNode() as ExpressionTreeNode;
                        }
                    }
                }
            }
        }
        if (this.ErrorCollection.length == 0) {
            if (this.NeedReturnType != null) {
                for (let type of this.NeedReturnType) {
                    if (type == this.ExpressionTreeRoot.valueType) {
                        return true;
                    }
                }
            }

            if (this.ExpressionTreeRoot.valueType == "Null") {
                return true;
            }
            else {
                this.AddExpressionError("返回值类型错误", this.ExpressionTreeRoot);
                return false;
            }
        }
        else {
            return false;
        }
    }

    //判断是不是操作符
    IsOperator(operatorString: string, hasBlankSplit: boolean) {
        if (ExpressionOperators.includes(operatorString)) {
            return true;
            //return !op.MustBlankSplit || hasBlankSplit;
        }
        else {
            return false;
        }
    }
    //判断是不是函数（函数后面都跟括号）
    IsBracketFunction(FunctionString: string) {
        FunctionString = FunctionString.toLowerCase();
        return BracketFunctions.includes(FunctionString);
    }

    RememberThisWord(word: string, position: number) {
        if (word.toString().trim().length != 0) {
            this.ExpressionWords.push(word.toString().trim());
            this.ExpressionWordPositions.push(position);
        }
    }


    //分解表达式到词
    SeparateExpressionString(expressionString: string) {
        let Expression = expressionString || "";
        let word = []
        let i = 0;
        let StringBegin = false;
        let ExpressionLength = Expression.length;
        let tempString = "";
        let IsSubString = false;

        while (i < ExpressionLength) {
            if (!IsSubString) {
                let hasBlankSplit = false;
                //两个运算符号
                if (i < ExpressionLength - 1) {
                    tempString = (Expression.at(i) || "") + (Expression.at(i + 1) || "");
                    hasBlankSplit = ((i == 0 || Expression[i - 1] == ' ') && (i == ExpressionLength - 2 || Expression.at(i + 2) == ' '));
                    if (this.IsOperator(tempString, hasBlankSplit)) {
                        this.RememberThisWord(word.join(""), i - word.length);
                        this.RememberThisWord(tempString, i);
                        //ExpressionWords.push(tempString);
                        i = i + 2;
                        word.length = 0;
                        continue;
                    }
                }

                //一个运算符号
                tempString = Expression.at(i) as string;
                hasBlankSplit = ((i == 0 || Expression.at(i - 1) == ' ') && (i == ExpressionLength - 1 || Expression.at(i + 1) == ' '));
                if (this.IsOperator(tempString, hasBlankSplit)) {
                    this.RememberThisWord(word.join(""), i - word.length);
                    this.RememberThisWord(tempString, i);
                    //ExpressionWords.Add(tempString);
                    i++;
                    word.length = 0;
                    continue;
                }

                tempString = Expression.at(i) as string;
                //空格
                if ((tempString == " ") || (tempString == "\n")) {
                    this.RememberThisWord(word.join(""), i - word.length);
                    i++;
                    word.length = 0;
                    continue;
                }

                //字符串开始
                tempString = Expression.at(i) as string;
                if (tempString == "'") {
                    IsSubString = true;
                    this.RememberThisWord(word.join(""), i - word.length);
                    word.length = 0
                    word.push(Expression.at(i));
                    i++;
                    StringBegin = !StringBegin;
                    continue;
                }
                //一般字符
                word.push(Expression.at(i));
                i++;
            }
            else {
                //字符串
                tempString = Expression.at(i) as string;
                if (tempString == "'") {
                    let nextString = (i + 1 >= ExpressionLength) ? "" : Expression.at(i + 1);
                    if ((StringBegin) && (nextString == "'")) {
                        word.push(Expression.at(i));
                        word.push(Expression.at(i + 1));
                        i++;
                        i++;
                    }
                    else {
                        IsSubString = false;
                        word.push(Expression.at(i));
                        StringBegin = !StringBegin;
                        this.RememberThisWord(word.join(""), i - word.length);
                        i++;
                        word.length = 0;
                    }
                    continue;
                }

                //一般字符
                word.push(Expression.at(i));
                i++;
            }
        }
        if (StringBegin) {
            throw new Error("最后字符串没有闭合");
        }
        //记录最后一个Word
        this.RememberThisWord(word.join(""), i - word.length);
    }

    //获取与此"("搭配的")"
    GetBracketEndIndex(StartIndex: number) {
        let i = StartIndex + 1;
        let Number = 1;
        let EndIndex = -1;
        let length = this.ExpressionWords.length;

        while (i < length) {
            let CurrentString = this.ExpressionWords[i];
            if (CurrentString === "(") {
                Number++;
            }
            if (CurrentString === ")") {
                Number--;
            }
            if (Number == 0) {
                EndIndex = i;
                i = length;
            }
            i++;
        }
        return EndIndex;
    }
    //根据字符串，获取表达式类型
    GetExpressionValueType(ExpressionString: string, Position: number, node: ExpressionTreeNode) {
        let type = ExpressionValueType[ExpressionString.trim().toUpperCase()];
        let valueType = type || "Error";
        if (valueType == "Error") {
            let variable = this.ExpressionVariables[ExpressionString];
            node.variable = variable;
            if (variable) {
                valueType = variable.valueType;
            }
        }
        return valueType;
    }

    BuildTree(Root: ExpressionTreeNode, StartIndex: number, EndIndex: number) {
        let Previous = null;
        let i = StartIndex;
        while (i < EndIndex) {
            if (this.ExpressionWords[i] == "(") {
                let node = new ExpressionTreeNode();
                node.text = "()";
                node.valueType = "Error";
                if ((Previous != null) && (this.IsBracketFunction(Previous.text))) {
                    //Previous.addNode(node);
                    node = Previous;
                }
                else {
                    Root.addNode(node);
                    Previous = node;
                }
                let ThisEndIndex = this.GetBracketEndIndex(i);
                if (ThisEndIndex == -1) {
                    return;
                }
                this.BuildTree(node, i + 1, ThisEndIndex);
                i = ThisEndIndex + 1;
            }
            else {
                let node = new ExpressionTreeNode();
                let ThisExpString = this.ExpressionWords[i];
                node.startIndex = this.ExpressionWordPositions[i];
                node.text = ThisExpString;

                node.valueType = this.GetExpressionValueType(ThisExpString, i, node);
                Root.addNode(node);
                Previous = node;
                i++;
            }
        }
    }

    AndOrAnalysis(ParentNode: ExpressionTreeNode) {
        let ChildrenNodes = ParentNode.children;
        let i = 0;
        if (ParentNode.children.length != 0) {
            for (let Node of ChildrenNodes) {
                if (Node.valueType == "AndOr") {
                    i++;
                }
                this.AndOrAnalysis(Node);
            }
            if (i != 0) {

                let TempNode: ExpressionTreeNode | null = ParentNode.children[0];
                let NewParentNode = new ExpressionTreeNode("()");
                NewParentNode.valueType = "Error";
                ParentNode.insertNodeAt(0, NewParentNode);
                let AndOrNode = null;
                while (TempNode != null) {
                    let NextNode = TempNode.nextNode();
                    if (TempNode.valueType == "AndOr"
                        || TempNode.valueType == "Comma") {
                        AndOrNode = TempNode;
                        NewParentNode = new ExpressionTreeNode("()");
                        NewParentNode.valueType = "Error";
                        ParentNode.insertNodeAt(AndOrNode.index + 1, NewParentNode);
                    }
                    else {
                        TempNode.remove();
                        NewParentNode.addNode(TempNode);
                    }
                    TempNode = NextNode as ExpressionTreeNode;
                }
            }
        }
    }
    //验证括号内的内容是否合法
    ValidateFromRoot() {
        let thisExpressionType = this.GetBracketType(this.ExpressionTreeRoot);
        this.ExpressionTreeRoot.valueType = thisExpressionType;
    }
    GetBracketType(ParentNode: ExpressionTreeNode) {
        ParentNode.isBracket = true;
        if (ParentNode.children.length == 0)
            return "Error";
        for (let node of ParentNode.children) {
            if (node.valueType == "Error") {
                this.CheckChildren(node);
            }
            if (this.IsBracketFunction(node.text)) {
                this.ValidateFunction(node);
            }
        }
        // 验证不等式等式正确与否
        let boolCondition = false;
        for (let node of ParentNode.children) {
            switch (node.valueType) {
                case "EqualUnequal":
                case "WhetherEqual":
                case "Bool":
                    if (boolCondition) {
                        return "Error";
                    }
                    else {
                        boolCondition = true;
                    }
                    break;
                case "AndOr":
                    if (boolCondition) {
                        boolCondition = false;
                    }
                    else {
                        return "Error";
                    }
                    break;
            }
        }

        for (let node of ParentNode.children) {
            if (node.valueType == "Comma") {
                return "Error";
            }
        }
        for (let node of ParentNode.children) {
            let type = node.valueType;
            if ((type == "AndOr")
                || (type == "Bool")
                || (type == "WhetherEqual")
                || (type == "EqualUnequal")) {
                return "Bool";
            }
        }
        for (let node of ParentNode.children) {
            let type = node.valueType;
            if (type == "Date") {
                return "Date";
            }
            if (type == "NullValue") {
                return "NullValue";
            }
            if (type == "Time") {
                return "Time";
            }

            if (type == "String") {
                return "String";
            }

            if (type == "Number") {
                return "Number";
            }
        }
        return "Error";
    }
    //验证所有子节点
    CheckChildren(ParentNode: ExpressionTreeNode) {
        let NodeText = ParentNode.text;
        if (NodeText == "()") {
            //察看括号内的类型
            ParentNode.valueType = this.GetBracketType(ParentNode);
        }
        else {
            if ((NodeText.substring(0, 1) == "'") && (NodeText.substring(NodeText.length - 1, 1) == "'")) {
                //字符串常量
                ParentNode.valueType = "String";
            }
            else {
                let TempInt = 0;
                try {
                    TempInt = Number(NodeText)
                } catch (e) {

                }
                if (!isNaN(TempInt)) {
                    ParentNode.valueType = "Number";
                }
                else {
                    let NodeType = this.GetExpressionValueType(NodeText, 0, ParentNode);
                    if (NodeType == "Error") {
                        ParentNode.valueType = "Error";
                    }
                    else {
                        ParentNode.valueType = NodeType;
                    }
                }
            }
        }
    }
    //验证此函数是否合法，判断参数格式，个数等
    ValidateFunction(ParentNode: ExpressionTreeNode) {
        //  判断是否可以在指定环境下运行此函数

        let CommaCount = 0;
        for (let node of ParentNode.children) {
            if (node.text == "()") {
                //察看括号内的类型
                node.valueType = this.GetBracketType(node);
            }
            if (node.valueType == "Comma") {
                CommaCount++;
            }
            if (node.valueType == "Error") {
                this.CheckChildren(node);
            }
            if (this.IsBracketFunction(node.text)) {
                this.ValidateFunction(node);
            }
        }

        let thisFunctionSetting = FunctionCollection[ParentNode.text.toLowerCase()];

        ParentNode.function = thisFunctionSetting;

        let UseTypeCount = thisFunctionSetting.useTypes.length;
        for (let useType of thisFunctionSetting.useTypes) {
            if (ParentNode.valueType == "Error") {
                if (useType.parameters.length !== (((ParentNode.children.length == 0) ? 0 : (CommaCount + 1)))) {
                    continue;
                }
                let ParamIndex = 0;
                if (useType.parameters.length !== 0) {
                    //记录各个参数的起止位置
                    let CommaIndexes = [];
                    let index = 0;
                    for (let node of ParentNode.children) {
                        if (node.valueType == "Comma") {
                            CommaIndexes[index] = node.index;
                            index++;
                        }
                    }
                    CommaIndexes[index] = ParentNode.children.length;
                    let Succeed = true;
                    for (let i = 0; i < CommaCount + 1; i++) {
                        let begin = (i == 0) ? 0 : CommaIndexes[i - 1] + 1;
                        let end = CommaIndexes[i] - 1;
                        Succeed = this.ValidateParam(useType, ParentNode, i, begin, end) && Succeed;

                        if ((UseTypeCount == 1) && (!Succeed)) {
                            let UserIndex = index + 1;
                            let node = ParentNode.children[begin];
                            if (node != null) {
                                this.AddExpressionError("函数 " + ParentNode.text + " 的第 " + UserIndex.toString() + " 个参数错误", node);
                            }
                            else {
                                this.AddExpressionError("函数 " + ParentNode.text + " 没有设置第 " + UserIndex.toString() + " 个参数", ParentNode);
                            }
                        }
                    }
                    if (Succeed) {
                        ParentNode.useType = useType;
                        if (useType.returnParameterType == -1) {
                            ParentNode.valueType = useType.returnValueType;
                        }
                        else {
                            this.ConfirmFunctionNodeTypeAtLast(ParentNode, useType.returnParameterType);
                        }
                        return;
                    }
                }
                else {
                    ParentNode.useType = useType;
                    ParentNode.valueType = useType.returnValueType;
                    return;
                }
            }
        }
        this.AddExpressionError(ParentNode.text + "参数设置错误", ParentNode);
    }
    //需要根据参数类型确定其函数返回值类型的函数
    ConfirmFunctionNodeTypeAtLast(Node: ExpressionTreeNode, ParameterIndex: number) {
        if (Node.children.length > 0) {
            let TempNode = Node.children[0];
            let i = 0;
            while ((TempNode != null) && (i < ParameterIndex)) {
                if (TempNode.valueType == "Comma") {
                    i++;
                }
                if (i < ParameterIndex) {
                    TempNode = TempNode.nextNode() as ExpressionTreeNode;
                }
            }
            Node.valueType = (i == ParameterIndex) ? TempNode.valueType : "Error";
        }
    }
    //验证这个函数的第i个参数是否合法
    ValidateParam(UseType: useTypeType, ParentNode: ExpressionTreeNode, ParamIndex: number, begin: number, end: number) {
        if (end < begin) {
            ParentNode.valueType = "Error";
            this.AddExpressionError(ParentNode.text + "逗号前参数不能为空.", ParentNode);
            return false;
        }
        let ThisType = "Error";
        for (let i = begin; i <= end; i++) {
            let node = ParentNode.children[i];
            let type = node.valueType;
            if ((type == "AndOr")
                || (type == "Bool")
                || (type == "WhetherEqual")
                || (type == "EqualUnequal")) {
                ThisType = "Bool";
            }
        }
        if (ThisType == "Error") {
            for (let i = begin; i <= end; i++) {
                let type = ParentNode.children[i].valueType;
                if (type == "NullValue") {
                    ThisType = "NullValue";
                }
                if (type == "Date") {
                    ThisType = "Date";
                }
                if (type == "Time") {
                    ThisType = "Time";
                }

                if (type == "String") {
                    ThisType = "String";
                }

                if (type == "Number") {
                    ThisType = "Number";
                }
            }
        }

        /////////////////////////////////////////////////
        //////////////////////////////////////
        //是不是个字段
        let IsAField = (end != begin) ? false : this.IsField(ParentNode.children[begin].text);

        let IsDataSetName = this.IsDataSet(ParentNode.children[begin].text);


        let flag = false;
        if (ParamIndex < UseType.parameters.length) {
            flag = (ThisType == UseType.parameters[ParamIndex].valueType) && ((UseType.parameters[ParamIndex].isField) ? IsAField : true) && ((UseType.parameters[ParamIndex].isDataSet) ? IsDataSetName : true);
        }

        if (!flag) {
            ParentNode.valueType = "Error";
            let ShowParamIndex = ParamIndex + 1;
            //AddExpressionError(ParentNode.Text + " 第 " + ShowParamIndex.ToString() + "个参数类型不正确.");
            return false;
        }
        //判断是否为Field类型的参数
        if (UseType.parameters[ParamIndex].isField) {
            let NodeText = ParentNode.children[begin].text;
            if (!this.CheckDatabaseUnit(end - begin + 1, NodeText)) {
                ParentNode.valueType = "Error";
                return false;
            }
        }

        //判断是否为处理功能名称
        if (UseType.parameters[ParamIndex].isExecutive) {
            let nodeText = ParentNode.children[begin].text;
            if (!this.IsExecutive(nodeText)) {
                ParentNode.valueType = "Error";
                this.AddExpressionError("函数 " + ParentNode.text + " 的第 " + ParamIndex.toString() + " 个参数必须为处理功能的名称", ParentNode);
                return false;
            }
        }
        return true;
    }
    IsStaticString(NodeText: string) {
        return (NodeText[0].toString() == "'" && NodeText[NodeText.length - 1].toString() == "'");
    }
    IsDataSet(NodeText: string) {
        if (this.IsStaticString(NodeText)) {
            if (this.AllDataSet != null) {
                for (let panDataSet of this.AllDataSet) {
                    if (panDataSet != null) {
                        if (panDataSet.name == NodeText.substring(1, NodeText.length - 2)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    IsField(NodeText: string) {
        let variable = this.ExpressionVariables[NodeText];
        return (variable) && ((variable.variableType == "Field") || (variable.variableType == "Field_Xid"));
    }
    CheckDatabaseUnit(NodeCount: number, NodeText: string) {
        if (NodeCount == 1) {
            return this.IsField(NodeText);
        }
        return false;
    }
    IsExecutive(nodeText: string) {
        if (nodeText.length > 2) {
            if (nodeText.startsWith("'") && nodeText.endsWith("'")) {
                let executiveName = nodeText.substring(1, nodeText.length - 2);
                // switch (RunType) {
                //   case PanExpressionRunType.Client:
                //     return ClientExecutiveList.Contains(executiveName);
                //   case PanExpressionRunType.Server:
                //     return ServerExecutiveList.Contains(executiveName);
                //   default:
                //     return false;
                // }
            }
        }
        return false;
    }
    CheckPreviousAndNext() {
        this.CheckChildrenPreAndNext(this.ExpressionTreeRoot);
    }
    CheckChildrenPreAndNext(ParentNode: ExpressionTreeNode) {
        for (let node of ParentNode.children) {
            let PreType = (node.prevNode() == null) ? "Null" : (node.prevNode() as ExpressionTreeNode)?.valueType;
            let NextType = (node.nextNode() == null) ? "Null" : (node.nextNode() as ExpressionTreeNode)?.valueType;
            let ThisType = node.valueType;
            if (!this.ValidatePreAndNext(ThisType, PreType, NextType)) {
                ParentNode.valueType = "Error";
                this.AddExpressionError(node.text + " 前后参数类型错误.", node);
                return;
            }
            if ((node.children.length != 0) && (node.valueType != "Error")) {
                this.CheckChildrenPreAndNext(node);
            }
        }
    }
    //根据本节点和前后节点，判断此节点是否合法
    ValidatePreAndNext(ThisExp: string, PreExp: string, NextExp: string) {
        let ThisExpPreNext = OperatorsPreAndNextExpression[ThisExp];
        if (ThisExpPreNext) {
            //bool PreAndNextEqualType = false;
            //表示可以和NullValue相邻，但是除了NullValue外，其它情况下两端必须类型一致
            //bool PreAndNextNullValueType = false;
            switch (ThisExp) {
                //case PanExpressionValueType.AndOrExpression:
                case "MultiplyDivide":
                case "Plus":
                case "WhetherEqual":
                    return this.HasThisExpType(PreExp, ThisExpPreNext) && (PreExp == NextExp);
                case "EqualUnequal":
                    return this.HasThisExpType(PreExp, ThisExpPreNext)
                        && this.HasThisExpType(NextExp, ThisExpPreNext)
                        && ((PreExp == NextExp) || (PreExp == "NullValue") || (NextExp == "NullValue"));
                case "Minus":
                    return (NextExp == "Number")
                        && ((PreExp == "Number")
                            || (PreExp == "Null")
                            || (PreExp == "AndOr")
                            || (PreExp == "Comma")
                            || (PreExp == "EqualUnequal")
                            || (PreExp == "WhetherEqual"));
                default:
                    return this.HasThisExpType(PreExp, ThisExpPreNext) && this.HasThisExpType(NextExp, ThisExpPreNext);
            }
        }
        return false;
    }
    //CheckedExp是否在LegalExps内
    HasThisExpType(CheckedExp: string, LegalExps: string[]) {
        return LegalExps.includes(CheckedExp)
        // if (LegalExps != null) {
        //   let Count = LegalExps.length;
        //   for (let i = 0; i < Count; i++) {
        //     if (CheckedExp == LegalExps[i]) {
        //       return true;
        //     }
        //   }
        // }
        // return false;
    }
    AddExpressionError(ErrorString: string, ErrorNode: ExpressionTreeNode) {
        if (!this.ErrorTreeNodes.has(ErrorNode)) {
            let error = ErrorNode.startIndex + ": " + ErrorString;
            this.ErrorCollection.push(error);
            this.ErrorTreeNodes.set(ErrorNode, ErrorString);
        }
    }



    ToExpression() {
        let str: string[] = [];
        this.ToExpressionNode(this.ExpressionTreeRoot, str);
        return str.join("");
    }
    ToExpressionNode(ParentNode: ExpressionTreeNode, str: string[]) {
        let Count = ParentNode.children.length;
        if (Count != 0) {
            this.ToExpressionNodePos(ParentNode, str, 0, Count - 1);
        }
    }
    ToExpressionNodePos(ParentNode: ExpressionTreeNode, str: string[], Begin: number, End: number) {
        let ChildrenNodes = ParentNode.children;
        if (ChildrenNodes != null) {
            for (let node of ChildrenNodes) {
                if ((node.index >= Begin) && (node.index <= End)) {
                    str.push("");
                    //if (!this.ConvertSpecialFunction(node, str)) {
                    let variable = this.ExpressionVariables[node.text];
                    if (variable) {
                        if (variable.variableType == "Parameter") {
                            this.AddUsedParameter(variable.name);
                        }
                        this.AddUsedVariable(variable);

                        str.push(this.ConvertToRunString(variable));
                        let function1 = FunctionCollection[node.text.toLowerCase()];
                        if (function1) {
                            str.push("(");
                            this.ToExpressionNode(node, str);
                            str.push(")");
                        }
                    }
                    else {

                        if (node.text == "()") {
                            str.push("(");
                            this.ToExpressionNode(node, str);
                            str.push(")");
                        }
                        else {
                            let NodeText = node.text;
                            str.push(NodeText);
                        }
                    }
                    //}
                }
            }
        }
    }
    ConvertSpecialFunction(ParentNode: ExpressionTreeNode, ExpressionString: string[]) {
        // let NodeText = ParentNode.text;
        // if (this.IsBracketFunction(NodeText)) {
        //     ExpressionString.push(FunctionCollection[NodeText.toLowerCase()].name);
        //     ExpressionString.push("(");
        //     GenerateSQLString(node);
        //     ExpressionString.push(")");
        // }
    }
    AddUsedParameter(NewParameter: string) {
        let NewValue = NewParameter.trim();
        if (!this.UsedParameters.includes(NewValue)) {
            this.UsedParameters.push(NewValue)
        }
    }
    AddUsedVariable(variable: Variable) {
        for (let UsedVariable of this.UsedVariables) {
            if (UsedVariable == variable) {
                return;
            }
        }
        this.UsedVariables.push(variable);
    }

    //转换为表达式
    ConvertToRunString(variable: Variable) {
        switch (variable.variableType) {
            case "Field":
            case "Field_Xid":
                return variable.psmName;
            default:
                return variable.trueName;
        }
    }


    ToExpressionWithFieldSpecialProcess() {
        return this.ToExpressionWithFieldSpecialProcessNode(this.ExpressionTreeRoot);
    }
    ToExpressionWithFieldSpecialProcessNode(parentNode: ExpressionTreeNode): string {
        let exp = [];
        for (let node of parentNode.children) {
            let variable = node.variable;
            if (variable) {
                switch (variable.variableType) {
                    case "Field":
                    case "Field_Xid":
                        exp.push("this.GetFieldValue(rowId, \"" + variable.trueName + "\")");
                        break;
                    case "Parameter":
                        exp.push("this.GetParameterValue(\"" + variable.trueName + "\")");
                        break;
                    case "Operator":
                        if (variable.name == "<>") {
                            exp.push("!=");
                        }
                        else {
                            exp.push(this.ToExpressionWithFieldSpecialProcessNode(node));
                        }
                        break;
                    default:
                        exp.push(this.ToExpressionWithFieldSpecialProcessNode(node));
                        break;
                }

                if (variable.variableType == "Parameter") {
                    this.AddUsedParameter(variable.name);
                }
                this.AddUsedVariable(variable);

            }
            else {
                exp.push(this.ToExpressionWithFieldSpecialProcessNode(node));
            }
        }
        if (parentNode.variable && parentNode.variable.variableType == "Function") {
            // let className = parentNode.function?.className || "";
            //return "(new " + className + "(cardWindowId, rowId))." + parentNode.variable.name + "(" + exp.join("") + ")";
            return "GlobalUtils." + parentNode.variable.name + "(" + exp.join("") + ")";
        }
        else if (parentNode.text == "()") {
            return "(" + exp.join("") + ")";
        }
        else if (parentNode.children.length > 0) {
            return exp.join("");
        }
        else {
            switch (parentNode.text.toLowerCase()) {
                case "=":
                    return "==";
                case "<>":
                    return "!=";
                case "and":
                    return "&&";
                case "or":
                    return "||";
                default:
                    return parentNode.text;
            }
        }
    }
    GetParameter(): Array<{ name: string, fieldName: string, type: string }> {
        let obj = [];
        for (let UsedVariable of this.UsedVariables) {
            switch (UsedVariable.variableType) {
                case "Field":
                case "Field_Xid":
                case "Parameter":
                    {
                        let ParamName = this.ConvertToRunString(UsedVariable);
                        let FieldName = this.GetFieldName(UsedVariable);
                        let TypeName = "";
                        switch (UsedVariable.valueType) {
                            case "Bool":
                                TypeName = "bool";
                                break;
                            case "String":
                                TypeName = "string";
                                break;
                            case "Number":
                                TypeName = "decimal";
                                break;
                            case "Date":
                                TypeName = "date";
                                break;
                            case "Time":
                                TypeName = "time";
                                break;
                        }
                        obj.push({ name: ParamName, fieldName: FieldName, type: TypeName })

                    }
                    break;
            }
        }
        return obj;
    }
    //如果是字段,获取字段名,不带表名
    GetFieldName(UsedVariable: Variable) {
        let FieldName = "";
        if ((UsedVariable.variableType == "Field") || (UsedVariable.variableType == "Field_Xid")) {
            let TempValues = UsedVariable.trueName.split('.');
            FieldName = TempValues[1];
        }
        return FieldName;
    }
    //获取用过的字段(真实字段名)
    GetUsedFieldTrueNames() {
        let usedFieldNames = [];
        for (let UsedVariable of this.UsedVariables) {
            if (UsedVariable.variableType == "Field"
                || UsedVariable.variableType == "Field_Xid") {
                usedFieldNames.push(UsedVariable.trueName);
            }
        }
        return usedFieldNames;
    }
    GetUsedParameterTrueNames() {
        let usedParameterNames = [];
        for (let item of this.UsedVariables) {
            if (item.variableType == "Parameter") {
                usedParameterNames.push(item.trueName);
            }
        }
        return usedParameterNames;
    }

}

export default ValidateExpression;
