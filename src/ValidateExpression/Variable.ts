class Variable {
    name: string;
    trueName: string;
    psmName: string;
    valueType: string;
    variableType: string;
    constructor(name: string, valueType: string, variableType: string = "Parameter") {
        //名称
        this.name = name;
        //短名称
        // this.shortName = name;
        //名称
        this.trueName = name;
        //Psm名称
        this.psmName = name;
        //"String","Date","Time","Number","Bool"
        this.valueType = valueType;
        //"Parameter","FieldAlias","Field","Field_Xid","Function","Operator","Exective"
        this.variableType = variableType;

    }
}
export default Variable;