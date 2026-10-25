<script setup lang="ts">
import { ref } from 'vue';
import { VdFlowchart, type VdFlowchartDocument, type VdFlowchartExposed } from '@vanduo-oss/vd3-flowchart';
import '@vanduo-oss/vd3-flowchart/css';
const editor = ref<VdFlowchartExposed | null>(null);
const readonly = ref(false);
const document = ref<VdFlowchartDocument>({
  nodes: [{ id: 'start', text: 'Start', x: 40, y: 100 }, { id: 'end', text: 'End', x: 300, y: 100 }],
  edges: [{ id: 'next', from: { nodeId: 'start', port: 'right' }, to: { nodeId: 'end', port: 'left' } }],
});
</script>
<template>
  <button type="button" @click="readonly = !readonly">Toggle read-only</button>
  <button type="button" :disabled="readonly" @click="editor?.undo()">Undo</button>
  <button type="button" @click="editor?.fitNode('start')">Frame start</button>
  <VdFlowchart ref="editor" :data="document" :readonly="readonly"
    :min-scale="0.05" :max-scale="20" :min-node-size="6" :max-node-size="4800"
    auto-fit style="height: 560px" @change="document = $event.document" />
</template>
