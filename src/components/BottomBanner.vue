<script setup lang="ts">
import feather from "feather-icons";

const props = defineProps<{ selectedTrackLength: number }>();
const emit = defineEmits<{
    (e: "move", direction: "up" | "down"): void;
    (e: "clear"): void;
}>();
</script>

<template>
    <div class="fixed bottom-0 inset-x-0 pb-2 sm:pb-5">
        <div class="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
            <div
                class="p-2 rounded-lg bg-gray-200 dark:bg-gray-900 shadow-lg sm:p-3"
            >
                <div class="flex items-center justify-between flex-wrap">
                    <div class="flex-1 flex items-center py-2 md:py-0">
                        <p
                            class="ml-3 font-medium text-black dark:text-white truncate"
                        >
                            {{ props.selectedTrackLength }} track{{
                                props.selectedTrackLength === 1 ? "" : "s"
                            }}
                            selected
                        </p>
                    </div>
                    <div class="mt-2 mr-3 sm:mt-0 w-auto space-x-6">
                        <button
                            type="button"
                            class="text-black dark:text-white hover:bg-gray-400 dark:hover:bg-gray-600 rounded-full md:p-1"
                            v-html="feather.icons['arrow-down'].toSvg()"
                            @click="$emit('move', 'down')"
                        />

                        <button
                            type="button"
                            class="text-black dark:text-white hover:bg-gray-400 dark:hover:bg-gray-600 rounded-full md:p-1"
                            v-html="feather.icons['arrow-up'].toSvg()"
                            @click="$emit('move', 'up')"
                        />

                        <button
                            type="button"
                            class="hover:bg-gray-400 dark:hover:bg-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white md:p-1"
                            @click="$emit('clear')"
                        >
                            <span class="sr-only">Deselect all</span>
                            <span v-html="feather.icons.x.toSvg()" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
