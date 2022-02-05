<script setup lang="ts">
import { useRoute } from "vue-router";
import NavigationBar from "./components/NavigationBar.vue";

const route = useRoute();
</script>

<template>
    <NavigationBar />
    <div class="max-w-5xl mx-auto pt-6 px-8 md:px-0 pb-20">
        <router-view :key="route.query" />
    </div>
</template>
