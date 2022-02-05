<script setup lang="ts">
import feather from "feather-icons";
import { useRouter } from "vue-router";
import { useStore } from "../store";

const store = useStore();
const router = useRouter();

const logout = () => {
    store.dispatch("clearSpotifyData");
    router.push({ name: "Home" });
};
</script>

<template>
    <button type="button" @click="logout">
        <span v-html="feather.icons['log-out'].toSvg()" />
    </button>
</template>
