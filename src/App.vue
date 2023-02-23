<script setup lang="ts">
import { Setting } from "@element-plus/icons-vue";
import { ref } from 'vue'
import ValidateExpression from "./ValidateExpression/index"

let validateExp = new ValidateExpression();

let variables = [
  { name: "表1.字段1", trueName: "demo_table1.field1", psmName: "demo_table1.field1", valueType: "Number", variableType: "Parameter" },
  { name: "表1.字段2", trueName: "demo_table1.field2", psmName: "demo_table1.field2", valueType: "Number", variableType: "Parameter" }
]
let returnType = ["Bool"];
const pim = "sum(表1.字段1,表1.字段2)>100"
let res = validateExp.Validate(pim, returnType, variables, []);
let psm = validateExp.ToExpression();
let js = validateExp.ToExpressionWithFieldSpecialProcess();
let parameters = JSON.stringify(validateExp.GetParameter());
let usedFieldNames = JSON.stringify(validateExp.GetUsedFieldTrueNames());
let usedParameterNames = JSON.stringify(validateExp.GetUsedParameterTrueNames());
let err = JSON.stringify(validateExp.ErrorCollection);

console.log(res, psm, js, parameters, usedFieldNames, usedParameterNames);




</script>

<template>
  <el-input :modelValue="pim">
    <template #prepend> pim </template>
  </el-input>
  <el-input :modelValue="res">
    <template #prepend> res </template>
  </el-input>
  <el-input :modelValue="psm">
    <template #prepend> psm </template>
  </el-input>
  <el-input :modelValue="js">
    <template #prepend> js </template>
  </el-input>
  <el-input :modelValue="parameters">
    <template #prepend> parameters </template>
  </el-input>
  <el-input :modelValue="usedFieldNames">
    <template #prepend> usedFieldNames </template>
  </el-input>
  <el-input :modelValue="usedParameterNames">
    <template #prepend> usedParameterNames </template>
  </el-input>
  <el-input :modelValue="err">
    <template #prepend> err </template>
  </el-input>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
