class TreeNode {
    text: string;
    index: number;
    parent: TreeNode | null;
    children: TreeNode[];
    constructor(text: string) {
        this.text = text
        this.index = -1;

        this.parent = null;
        this.children = [];
    }
    addNode(node: TreeNode) {
        node.parent = this;
        node.index = this.children.length;
        this.children[node.index] = node;
        return node.index;
    }
    insertNodeAt(index: number, node: TreeNode) {
        node.parent = this;
        node.index = index;
        for (let num = this.children.length; num > index; num--) {
            (this.children[num] = this.children[num - 1]).index = num;
        }
        this.children[index] = node;
    }

    remove() {
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].remove();
        }
        if (this.parent != null) {
            for (let j = this.index; j < this.parent.children.length - 1; j++) {
                (this.parent.children[j] = this.parent.children[j + 1]).index = j;
            }
            this.parent.children.splice(this.index, 1)
            //this.parent.children[parent.children.length - 1] = null;
            this.parent = null;
        }
    }
    prevNode(): TreeNode | null {
        let num = this.index;
        let length = this.parent?.children.length || 0;
        if (num > 0 && num <= length) {
            return this.parent?.children[num - 1] || null;
        }
        return null;
    }
    nextNode(): TreeNode | null {
        if (this.index + 1 < (this.parent?.children.length || 0)) {
            return this.parent?.children[this.index + 1] || null;
        }
        return null;
    }
}
export default TreeNode;